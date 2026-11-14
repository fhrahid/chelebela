#!/usr/bin/env node
// Chhelebela Score — data-layer validator (zero dependencies).
// Run: node scripts/validate-data.mjs
// Checks JSON well-formedness plus the cross-file contracts the app will rely on:
//   memories ↔ categories / eras / vocabulary / references / review-flags.
// It intentionally does NOT implement full JSON-Schema evaluation; the schema files
// in data/schemas/ are the formal contract for future tooling (admin panel, CI).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");

const errors = [];
const warnings = [];
const notes = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);
const note = (msg) => notes.push(msg);

function load(name) {
  try {
    return JSON.parse(readFileSync(join(dataDir, name), "utf8"));
  } catch (e) {
    err(`${name}: cannot read/parse — ${e.message}`);
    return null;
  }
}

const memories = load("memories.json");
const categories = load("categories.json");
const eras = load("eras.json");
const vocabulary = load("vocabulary.json");
const references = load("references.json");
const flags = load("review-flags.json");
const scoring = load("scoring.config.json");
const eraQuotes = load("era-quotes.json");

const eraIds = new Set((eras?.eras ?? []).map((e) => e.era_id));
const categoryIds = new Set((categories?.categories ?? []).map((c) => c.category_id));
const refIds = new Set((references?.references ?? []).map((r) => r.ref_id));
const poolIds = new Set((references?.proposal_url_pool ?? []).map((p) => p.pool_id));
const flagIds = new Set((flags?.flags ?? []).map((f) => f.flag_id));
const items = memories?.items ?? [];

// ---------- memories.json ----------
const seenIds = new Set();
if (memories) {
  if (memories.count !== items.length) err(`memories.json: count (${memories.count}) != items.length (${items.length})`);

  for (const it of items) {
    const id = it.item_id ?? "(missing id)";

    if (!/^MEM_\d{3}$/.test(it.item_id ?? "")) err(`${id}: item_id must match MEM_###`);
    if (seenIds.has(id)) err(`${id}: duplicate item_id`);
    seenIds.add(id);

    for (const field of ["title_bn", "category_id", "era_tags", "setting_tags", "popularity_period_bd", "validation_status", "source_references"]) {
      if (it[field] === undefined || it[field] === null) err(`${id}: missing required field '${field}'`);
    }

    if (!categoryIds.has(it.category_id)) err(`${id}: unknown category_id '${it.category_id}'`);

    const tags = it.era_tags ?? [];
    if (tags.length === 0) err(`${id}: era_tags must not be empty`);
    for (const t of tags) if (!eraIds.has(t)) err(`${id}: unknown era tag '${t}'`);
    if (tags.includes("neutral") && tags.length > 1) err(`${id}: 'neutral' must be the sole era tag`);
    const order = ["80s", "90s", "2000s", "neutral"];
    const sorted = [...tags].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    if (JSON.stringify(tags) !== JSON.stringify(sorted)) err(`${id}: era_tags not in canonical order: ${JSON.stringify(tags)}`);

    const expectedScope = tags.length > 1 ? "multi" : "single";
    if (tags.length > 0 && tags[0] !== "neutral" && it.era_scope !== expectedScope)
      err(`${id}: era_scope '${it.era_scope}' inconsistent with ${tags.length} tag(s); expected '${expectedScope}'`);

    for (const s of it.setting_tags ?? []) {
      if (!vocabulary.setting_tags.allowed.includes(s)) err(`${id}: setting tag '${s}' not in vocabulary`);
      if (s === "unknown") warn(`${id}: temporary setting 'unknown' (FLG-DS-06)`);
    }

    if (!vocabulary.validation_status.allowed.includes(it.validation_status)) err(`${id}: invalid validation_status '${it.validation_status}'`);
    if (it.validation_status !== "verified") warn(`${id}: validation_status '${it.validation_status}' — not publish-ready (FLG-DS-01)`);

    if (typeof it.weight !== "number" || it.weight <= 0) err(`${id}: weight must be a positive number`);

    if (!it.popularity_period_bd?.label_bn) err(`${id}: popularity_period_bd.label_bn required`);
    if (it.origin_period && !it.origin_period.label_bn) err(`${id}: origin_period present but missing label_bn`);

    for (const r of it.source_references ?? []) if (!refIds.has(r)) err(`${id}: dangling reference '${r}'`);
    for (const f of it.flags ?? []) if (!flagIds.has(f)) err(`${id}: unknown flag '${f}'`);

    if (it.era_classification_eligible === false) note(`${id}: not era-classification-eligible (see FLG-DS-02)`);
  }
}

// ---------- categories / eras ----------
if (categories) {
  const orders = new Set();
  for (const c of categories.categories) {
    if (orders.has(c.display_order)) err(`categories.json: duplicate display_order ${c.display_order}`);
    orders.add(c.display_order);
    const declared = (c.item_count ?? 0);
    const actual = items.filter((i) => i.category_id === c.category_id).length;
    if (declared !== actual) err(`categories.json: ${c.category_id} item_count ${declared} != actual ${actual}`);
  }
}
if (eras) {
  for (const e of eras.eras) {
    if (e.era_id === "neutral") continue;
    const actual = items.filter((i) => i.era_tags?.includes(e.era_id)).length;
    if ((e.item_count ?? 0) !== actual) err(`eras.json: ${e.era_id} item_count ${e.item_count} != actual ${actual}`);
  }
}

// ---------- references ----------
if (references) {
  const seenRefs = new Set();
  for (const r of references.references) {
    if (seenRefs.has(r.ref_id)) err(`references.json: duplicate ref_id ${r.ref_id}`);
    seenRefs.add(r.ref_id);
    if (r.candidate_pool_id && !poolIds.has(r.candidate_pool_id)) err(`references.json: ${r.ref_id} candidate_pool_id '${r.candidate_pool_id}' not in proposal_url_pool`);
  }
  const cited = new Set(items.flatMap((i) => i.source_references ?? []));
  for (const r of references.references) {
    if (!cited.has(r.ref_id)) warn(`references.json: ${r.ref_id} registered but never cited`);
    if (r.status === "unresolved" || r.status === "candidate_unconfirmed")
      warn(`references.json: ${r.ref_id} ${r.status} — not a confirmed citation (FLG-DS-03)`);
  }
}

// ---------- review-flags ----------
if (flags) {
  const vocab = vocabulary;
  const referenced = new Set(items.flatMap((i) => i.flags ?? []));
  for (const f of flags.flags) {
    if (!vocab.flag_severity.allowed.includes(f.severity)) err(`review-flags.json: ${f.flag_id} bad severity`);
    if (!vocab.flag_areas.allowed.includes(f.area)) err(`review-flags.json: ${f.flag_id} bad area`);
    if (!vocab.flag_status.allowed.includes(f.status)) err(`review-flags.json: ${f.flag_id} bad status`);
    if (f.scope === "item" && !seenIds.has(f.item_id)) err(`review-flags.json: ${f.flag_id} points at unknown item ${f.item_id}`);
    if (f.scope === "item" && !referenced.has(f.flag_id)) warn(`review-flags.json: ${f.flag_id} not referenced from any memory item`);
  }
  for (const id of referenced) if (!flagIds.has(id)) err(`memories.json: flag ${id} missing from register`);
  const bySev = { blocker: 0, warning: 0, info: 0 };
  for (const f of flags.flags) bySev[f.severity]++;
  const s = flags.summary;
  if (s && (s.total !== flags.flags.length || s.blockers !== bySev.blocker || s.warnings !== bySev.warning || s.info !== bySev.info))
    err(`review-flags.json: summary ${JSON.stringify(s)} != actual {total:${flags.flags.length},blockers:${bySev.blocker},warnings:${bySev.warning},info:${bySev.info}}`);
}

// ---------- scoring config ----------
if (scoring && scoring.status !== "approved") note(`scoring.config.json: status '${scoring.status}' — scores must not be presented as final.`);

// ---------- era quote bank ----------
if (eraQuotes) {
  const quoteIds = new Set();
  for (const quote of eraQuotes.quotes ?? []) {
    if (quoteIds.has(quote.quote_id)) err(`era-quotes.json: duplicate quote_id '${quote.quote_id}'`);
    quoteIds.add(quote.quote_id);
    if (!quote.text_bn || !quote.attribution_bn) err(`era-quotes.json: ${quote.quote_id} missing text or attribution`);
    if (!["original_caption", "public_domain_literature", "media_excerpt"].includes(quote.quote_type))
      err(`era-quotes.json: ${quote.quote_id} has invalid quote_type '${quote.quote_type}'`);
    if (quote.quote_type !== "original_caption" && !quote.source_url)
      err(`era-quotes.json: ${quote.quote_id} is sourced but has no source_url`);
  }
  for (const eraId of ["80s", "90s", "2000s"]) {
    const originals = (eraQuotes.quotes ?? []).filter((quote) =>
      quote.era_id === eraId && quote.quote_type === "original_caption"
    ).length;
    if (originals < 100) err(`era-quotes.json: ${eraId} has ${originals} original captions; minimum is 100`);
  }
}

// ---------- report ----------
const line = (t) => console.log(t);
line(`\nChhelebela Score data validation — ${new Date().toISOString().slice(0, 10)}`);
line(`Items: ${items.length} | Categories: ${categories?.categories?.length ?? "?"} | Eras: ${eras?.eras?.length ?? "?"} | References: ${references?.references?.length ?? "?"} | Flags: ${flags?.flags?.length ?? "?"}`);
line(`\nErrors (${errors.length}):`);       errors.forEach((m) => line(`  ✗ ${m}`));
line(`\nWarnings (${warnings.length}):`);   warnings.forEach((m) => line(`  ! ${m}`));
line(`\nNotes (${notes.length}):`);         notes.forEach((m) => line(`  · ${m}`));
line("");
if (errors.length) {
  line(`RESULT: FAIL — ${errors.length} error(s)`);
  process.exit(1);
}
line(`RESULT: PASS (errors: 0, warnings: ${warnings.length}, notes: ${notes.length})`);
process.exit(0);
