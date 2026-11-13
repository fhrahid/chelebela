#!/usr/bin/env node
/**
 * Ingest rows from the updated spreadsheet into data/memories.json.
 * Idempotent: existing item_ids (MEM_001–MEM_030, hand-curated in v1) are never
 * overwritten. New rows are normalized MECHANICALLY — raw values that fall
 * outside the controlled vocabularies are preserved (source_setting) and flagged
 * in review-flags.json; nothing is silently reclassified or invented.
 *
 * Input: flattened rows JSON produced by the PowerShell extractor:
 *   pwsh xlsx2json.ps1 -XlsxDir <extracted-xlsx> -OutPath rows.json
 *   node scripts/ingest-xlsx.mjs <rows.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rowsPath = process.argv[2];
if (!rowsPath) {
  console.error("usage: node scripts/ingest-xlsx.mjs <rows.json>");
  process.exit(1);
}

const HEAD = ["item_id","memory_item","category","era","era_role","setting","region_notes","reference","evidence","supported_period","validation_status","overall_score_weight","era_classification_eligible","review_notes"];
const CONTROLLED_SETTINGS = new Set(["both", "rural", "urban", "context_specific", "unknown"]);

// category: raw (lowercased) -> controlled id. Existing ids first, then new-batch
// additions (kept as their own categories pending OD-04 — no forced merging).
const CATEGORY_MAP = {
  tv: "tv", books: "books", play: "games", games: "games", food: "food",
  music: "music_eid", school: "school", tech: "tech_gaming", technology: "tech_gaming",
  family: "family_community",
  festival: "festival", festivals: "festival",
  collectibles: "collectibles",
  animals: "animals",
  culture: "culture",
  entertainment: "entertainment",
  nature: "nature", environment: "nature",
  communication: "communication",
  social: "social",
  sports: "sports",
  travel: "travel",
  lifestyle: "lifestyle",
};
const NEW_CATEGORY_META = {
  festival: { name_bn: "উৎসব", name_en: "Festivals" },
  collectibles: { name_bn: "সংগ্রহ", name_en: "Collectibles" },
  animals: { name_bn: "প্রাণী", name_en: "Animals" },
  culture: { name_bn: "সংস্কৃতি", name_en: "Culture" },
  entertainment: { name_bn: "বিনোদন", name_en: "Entertainment" },
  nature: { name_bn: "প্রকৃতি", name_en: "Nature" },
  communication: { name_bn: "যোগাযোগ", name_en: "Communication" },
  social: { name_bn: "সামাজিক জীবন", name_en: "Social" },
  sports: { name_bn: "খেলাধুলা", name_en: "Sports" },
  travel: { name_bn: "ভ্রমণ", name_en: "Travel" },
  lifestyle: { name_bn: "জীবনযাত্রা", name_en: "Lifestyle" },
};

// setting: raw value -> controlled tag. Location/access descriptors become
// context_specific (or urban/rural when the wording says so); original kept in
// source_setting on the item.
function mapSetting(raw) {
  const v = raw.trim();
  const low = v.toLowerCase();
  if (low === "both" || low === "both*") return { tag: "both" };
  if (low === "unknown" || v === "") return { tag: "unknown" };
  if (low.startsWith("urban") || low.includes("dhaka")) return { tag: "urban" };
  if (low.startsWith("rural")) return { tag: "rural" };
  return { tag: "context_specific" };
}

const rows = JSON.parse(readFileSync(rowsPath, "utf8"))
  .map((r) => { const o = {}; HEAD.forEach((h, i) => (o[h] = (r.cells[i] ?? "").toString().trim())); return o; })
  .filter((r) => r.item_id && r.item_id.toLowerCase() !== "item_id");

const memories = JSON.parse(readFileSync(join(root, "data/memories.json"), "utf8"));
const categoriesDoc = JSON.parse(readFileSync(join(root, "data/categories.json"), "utf8"));
const referencesDoc = JSON.parse(readFileSync(join(root, "data/references.json"), "utf8"));
const flagsDoc = JSON.parse(readFileSync(join(root, "data/review-flags.json"), "utf8"));

const existingIds = new Set(memories.items.map((i) => i.item_id));
const existingFlags = new Set(flagsDoc.flags.map((f) => f.flag_id));
const existingRefs = new Set(referencesDoc.references.map((r) => r.ref_id));
const citedBy = new Map(referencesDoc.references.map((r) => [r.ref_id, new Set(r.cited_by)]));

// ---- collect what to ingest ----
const toIngest = [];
const idRenumbers = [];
let nextId = 151;
for (const r of rows) {
  if (/^MEM_\d{3}$/.test(r.item_id)) {
    if (existingIds.has(r.item_id)) continue; // never overwrite curated items
    toIngest.push({ row: r, item_id: r.item_id, renumberedFrom: null });
  } else if (/^NEW_\d{3}$/.test(r.item_id)) {
    while (existingIds.has(`MEM_${String(nextId).padStart(3, "0")}`)) nextId++;
    const id = `MEM_${String(nextId).padStart(3, "0")}`;
    idRenumbers.push({ from: r.item_id, to: id });
    toIngest.push({ row: r, item_id: id, renumberedFrom: r.item_id });
    nextId++;
  } else {
    throw new Error(`unrecognized id pattern: ${r.item_id}`);
  }
}

// ---- normalize rows into items ----
const newItems = [];
const newFlags = [];
const usedNewCategories = new Set();
const touchedNewRefs = new Map(); // refId -> Set(itemId)

for (const { row, item_id, renumberedFrom } of toIngest) {
  const eraTags = row.era.split(";").map((s) => s.trim()).filter(Boolean)
    .map((t) => (t === "00s" ? "2000s" : t))
    .sort((a, b) => ["80s", "90s", "2000s", "neutral"].indexOf(a) - ["80s", "90s", "2000s", "neutral"].indexOf(b));

  const categoryKey = row.category.toLowerCase().trim();
  const categoryId = CATEGORY_MAP[categoryKey];
  if (!categoryId) throw new Error(`${item_id}: unknown category '${row.category}' — extend CATEGORY_MAP explicitly (do not auto-guess)`);
  const isNewCategory = Object.prototype.hasOwnProperty.call(NEW_CATEGORY_META, categoryId) ||
    (["tv","books","games","food","music_eid","school","tech_gaming","family_community","cricket_moments"].includes(categoryId) === false && usedNewCategories.has(categoryId));
  if (NEW_CATEGORY_META[categoryId]) usedNewCategories.add(categoryId);

  const { tag: settingTag } = mapSetting(row.setting);

  const refs = row.reference.split(";").map((s) => s.trim().replace(/^R(\d+)$/, "R$1")).filter((s) => /^R\d+$/.test(s));
  const surveyNeeded = row.reference.toLowerCase() === "survey needed";

  const item = {
    item_id,
    title_bn: row.memory_item,
    title_en: null,
    description_bn: null,
    category_id: categoryId,
    era_tags: eraTags,
    era_scope: eraTags.length > 1 ? "multi" : "single",
    classification_confidence: row.era_role === "Overlapping" ? "probable" : "uncertain",
    setting_tags: [settingTag],
    source_setting: row.setting, // preserved raw — the new batch used this column for locations
    origin_period: null,
    popularity_period_bd: { from: null, to: null, label_bn: row.supported_period },
    weight: Number(row.overall_score_weight) || 1.0,
    era_classification_eligible: row.era_classification_eligible.toLowerCase() === "yes",
    validation_status: row.validation_status.toLowerCase().replace(/ /g, "_") || "under_review",
    last_reviewed: null,
    source_references: refs,
    evidence_bn: row.evidence,
    region_notes_bn: row.region_notes,
    review_notes_bn: row.review_notes,
    flags: [],
  };

  const flags = [];
  const mkFlag = (n, area, severity, title, detail, action) => {
    const flagId = `FLG-MEM-${item.item_id.slice(4)}-${n}`;
    if (existingFlags.has(flagId)) return flagId;
    flags.push(flagId);
    newFlags.push({
      flag_id: flagId, scope: "item", item_id, area, severity, title, detail,
      recommended_action: action, status: "open",
    });
    return flagId;
  };

  mkFlag(1, "source", "warning",
    "New-batch item — not yet reviewed",
    renumberedFrom
      ? `Ingested from spreadsheet row ${renumberedFrom} (renumbered, see changelog). Part of the unreviewed 2026-11-14 batch.`
      : "Part of the unreviewed 2026-11-14 batch (MEM_031–MEM_150).",
    "Run the standard content review (evidence, era, setting) before launch.");

  if (surveyNeeded || refs.length === 0) {
    mkFlag(2, "source", "warning",
      "No reference — survey needed",
      "The spreadsheet lists this item's reference as 'Survey needed' (or empty). It cannot be verified without a source.",
      "Field-survey or source this item; exclude from the launch list until then (FLG-DS-19).");
  }
  if (eraTags.length === 3) {
    mkFlag(3, "era", "info",
      "Blanket tri-era tagging (80s;90s;00s)",
      "The row tags all three eras, which carries little era specificity; likely a bulk tag rather than researched classification.",
      "Narrow era_tags after verification (see FLG-DS-16).");
  }

  item.flags = flags;
  newItems.push(item);
  for (const ref of refs) {
    if (!touchedNewRefs.has(ref)) touchedNewRefs.set(ref, new Set());
    touchedNewRefs.get(ref).add(item_id);
  }
}

// ---- merge into memories.json ----
memories.items.push(...newItems);
memories.items.sort((a, b) => a.item_id.localeCompare(b.item_id));
memories.count = memories.items.length;
memories.dataset_version = "1.1.0";
memories.source.cleaned_on = "2026-11-14";

// ---- categories.json: update counts, add new categories ----
const itemsByCat = new Map();
for (const i of memories.items) itemsByCat.set(i.category_id, (itemsByCat.get(i.category_id) ?? 0) + 1);
let maxOrder = Math.max(...categoriesDoc.categories.map((c) => c.display_order));
for (const c of categoriesDoc.categories) c.item_count = itemsByCat.get(c.category_id) ?? 0;
for (const [id, meta] of Object.entries(NEW_CATEGORY_META)) {
  if (!categoriesDoc.categories.some((c) => c.category_id === id)) {
    maxOrder += 1;
    categoriesDoc.categories.push({
      category_id: id, name_bn: meta.name_bn, name_en: meta.name_en,
      display_order: maxOrder, maps_from: [], item_count: itemsByCat.get(id) ?? 0,
      note: "Added in the 2026-11-14 batch — category consolidation pending OD-04 (FLG-DS-17).",
    });
  }
}

// ---- references.json: register new R-ids, update cited_by ----
for (const [refId, citerSet] of touchedNewRefs) {
  const existing = referencesDoc.references.find((r) => r.ref_id === refId);
  if (existing) {
    for (const c of citerSet) existing.cited_by.push(c);
  } else {
    referencesDoc.references.push({
      ref_id: refId,
      cited_by: [...citerSet],
      publisher_hint: "(2026-11-14 batch — publisher not yet identified)",
      candidate_pool_id: null,
      match_confidence: null,
      status: "unresolved",
      needs: "Identify the actual source; like R1–R23 it is currently a dangling citation (FLG-DS-03).",
    });
  }
}
referencesDoc.references.sort((a, b) => Number(a.ref_id.slice(1)) - Number(b.ref_id.slice(1)));

// ---- eras.json counts ----
const erasDoc = JSON.parse(readFileSync(join(root, "data/eras.json"), "utf8"));
for (const e of erasDoc.eras) {
  e.item_count = e.era_id === "neutral"
    ? memories.items.filter((i) => i.era_tags.includes("neutral")).length
    : memories.items.filter((i) => i.era_tags.includes(e.era_id)).length;
}

// ---- dataset-level flags for this batch ----
const dsFlags = [
  {
    flag_id: "FLG-DS-15", scope: "dataset", area: "coverage", severity: "warning",
    title: "2026-11-14 batch: 150 new items ingested, all unreviewed",
    detail: "120 sourced-batch rows (MEM_031–MEM_150) plus 30 'survey needed' rows renumbered NEW_001–030 → MEM_151–MEM_180. All carry validation_status under_review with no review dates; references R24–R48 are as undefined as R1–R23.",
    recommended_action: "Full content review before launch; resolve reference identities.",
    status: "open",
  },
  {
    flag_id: "FLG-DS-16", scope: "dataset", area: "era", severity: "warning",
    title: "New batch era tags are coarse: 54 items carry blanket multi/tri-era tags",
    detail: "24 MEM items and all 30 NEW items are tagged 80s;90s;00s (or multi), which carries little era specificity. Era-based quiz sets therefore contain many low-specificity members.",
    recommended_action: "Narrow era_tags during review; era sets treat multi-era items as members of each tagged era (documented in lib/quiz.ts).",
    status: "open",
  },
  {
    flag_id: "FLG-DS-17", scope: "dataset", area: "category", severity: "warning",
    title: "11 new categories added mechanically (festival, collectibles, animals, culture, entertainment, nature, communication, social, sports, travel, lifestyle)",
    detail: "The batch used 29 raw category values (mixed case plus new concepts). Obvious synonyms were merged (TECH/Technology, PLAY/Games, NATURE/ENVIRONMENT, FESTIVAL/Festivals); genuinely new concepts were added as their own categories rather than force-filed. cricket_moments remains empty while 'sports' now exists.",
    recommended_action: "OD-04 consolidation pass: decide merges (e.g., cricket_moments into sports) and Bangla naming.",
    status: "open",
  },
  {
    flag_id: "FLG-DS-18", scope: "dataset", area: "setting", severity: "warning",
    title: "Setting column drifted to location/access descriptors (32 raw values)",
    detail: "Examples: 'Rooftop', 'Gulistan, Dhaka', 'TV access', 'School route'. Mapped mechanically to urban/rural/context_specific; originals preserved in each item's source_setting field.",
    recommended_action: "Re-tag settings with the controlled vocabulary during review.",
    status: "open",
  },
  {
    flag_id: "FLG-DS-19", scope: "dataset", area: "source", severity: "warning",
    title: "MEM_151–MEM_180 have no references ('Survey needed') — not launch-eligible",
    detail: "These 30 items were contributed as survey candidates with generic evidence text. They are in the dataset (as requested) but cannot ship until sourced.",
    recommended_action: "Run the planned district/village survey; add references; then review.",
    status: "open",
  },
  {
    flag_id: "FLG-DS-20", scope: "dataset", area: "structure", severity: "info",
    title: "NEW_001–030 renumbered to MEM_151–MEM_180",
    detail: "The app requires stable MEM_### ids (comparison codec order). Mapping is recorded in DATA-CHANGELOG.md.",
    recommended_action: "No action; keep ids stable from now on.",
    status: "open",
  },
];
for (const f of dsFlags) if (!existingFlags.has(f.flag_id)) flagsDoc.flags.push(f);

// per-item flags appended
flagsDoc.flags.push(...newFlags);

// recompute summary
const bySev = { blocker: 0, warning: 0, info: 0 };
for (const f of flagsDoc.flags) bySev[f.severity]++;
flagsDoc.summary = {
  total: flagsDoc.flags.length,
  blockers: bySev.blocker,
  warnings: bySev.warning,
  info: bySev.info,
  scope_dataset: flagsDoc.flags.filter((f) => f.scope === "dataset").length,
  scope_item: flagsDoc.flags.filter((f) => f.scope === "item").length,
};
flagsDoc.generated_on = "2026-11-14";

// ---- write everything ----
writeFileSync(join(root, "data/memories.json"), JSON.stringify(memories, null, 2) + "\n", "utf8");
writeFileSync(join(root, "data/categories.json"), JSON.stringify(categoriesDoc, null, 2) + "\n", "utf8");
writeFileSync(join(root, "data/references.json"), JSON.stringify(referencesDoc, null, 2) + "\n", "utf8");
writeFileSync(join(root, "data/eras.json"), JSON.stringify(erasDoc, null, 2) + "\n", "utf8");
writeFileSync(join(root, "data/review-flags.json"), JSON.stringify(flagsDoc, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  ingested: newItems.length,
  renumbered: idRenumbers.length,
  total_items: memories.items.length,
  new_flags: newFlags.length + dsFlags.length,
  era_counts: Object.fromEntries(erasDoc.eras.map((e) => [e.era_id, e.item_count])),
  category_counts: Object.fromEntries(categoriesDoc.categories.map((c) => [c.category_id, c.item_count])),
  renumber_map_first5: idRenumbers.slice(0, 5),
}, null, 2));
