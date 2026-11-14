/**
 * Data-layer loader for the application.
 *
 * The JSON files in /data are the single source of truth (SRS NFR-009).
 * This module is the ONLY place the app touches them. Content edits happen
 * in /data, never in components. Structures are Zod-validated at module load
 * so a bad edit fails loudly and immediately (build/dev), not silently at runtime.
 *
 * Deliberately NOT imported into the client bundle: references.json and
 * review-flags.json (editorial files). Their cross-file integrity is checked by
 * `node scripts/validate-data.mjs` and by tests/dataset.test.ts instead.
 */
import { z } from "zod";
import memoriesJson from "@/data/memories.json";
import categoriesJson from "@/data/categories.json";
import erasJson from "@/data/eras.json";
import type { Category, Dataset, Era, MemoryItem } from "./types";

const periodSchema = z.object({
  from: z.string().nullable(),
  to: z.string().nullable(),
  label_bn: z.string().min(1),
});

const itemSchema = z
  .object({
    item_id: z.string().regex(/^MEM_\d{3}$/),
    title_bn: z.string().min(1),
    title_en: z.string().nullable(),
    description_bn: z.string().nullable(),
    category_id: z.string().min(1),
    era_tags: z.array(z.string().min(1)).min(1),
    era_scope: z.enum(["single", "multi"]),
    classification_confidence: z.enum(["verified", "probable", "uncertain"]),
    setting_tags: z.array(z.string().min(1)).min(1),
    origin_period: periodSchema.nullable(),
    popularity_period_bd: periodSchema,
    weight: z.number().positive(),
    era_classification_eligible: z.boolean(),
    validation_status: z.enum(["draft", "under_review", "verified", "disputed", "retired"]),
    last_reviewed: z.string().nullable(),
    source_references: z.array(z.string().min(1)),
    evidence_bn: z.string(),
    region_notes_bn: z.string(),
    review_notes_bn: z.string(),
    flags: z.array(z.string().min(1)),
  })
  .passthrough(); // tolerate new editorial fields without breaking the app

const memoriesSchema = z.object({
  schema_version: z.string(),
  dataset_version: z.string(),
  count: z.number().int(),
  items: z.array(itemSchema),
}).refine((m) => m.count === m.items.length, { message: "count does not match items.length" });

const categoriesSchema = z.object({
  categories: z.array(
    z
      .object({
        category_id: z.string().min(1),
        name_bn: z.string().min(1),
        name_en: z.string().min(1),
        display_order: z.number(),
        maps_from: z.array(z.string()),
        item_count: z.number(),
      })
      .passthrough(),
  ),
});

const erasSchema = z.object({
  eras: z.array(
    z
      .object({
        era_id: z.string().min(1),
        label_bn: z.string().min(1),
        label_en: z.string().min(1),
        range: z.string().nullable(),
        item_count: z.number(),
      })
      .passthrough(),
  ),
});

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`[${label}] dataset invalid — ${issues.join(" | ")} (run scripts/validate-data.mjs for details)`);
  }
  return result.data;
}

const memories = parseOrThrow(memoriesSchema, memoriesJson, "memories.json");
export const CATEGORIES: Category[] = parseOrThrow(categoriesSchema, categoriesJson, "categories.json").categories;
export const ERAS: Era[] = parseOrThrow(erasSchema, erasJson, "eras.json").eras;

/** Stable order: categories by display_order, items by item_id. Order matters: the
 *  comparison codec packs answers as a bitset in item order, so it must never drift. */
export const ITEMS: MemoryItem[] = [...memories.items].sort((a, b) => a.item_id.localeCompare(b.item_id));
export const SORTED_CATEGORIES: Category[] = [...CATEGORIES].sort((a, b) => a.display_order - b.display_order);

export const DATASET_VERSION: string = memories.dataset_version;
export const TOTAL_ITEMS = ITEMS.length;
export const ERA_LABELS: Record<string, string> = Object.fromEntries(ERAS.map((e) => [e.era_id, e.label_bn]));
/** Colloquial short names used inside result labels. */
export const ERA_SHORT_BN: Record<string, string> = {
  "80s": "আশি দশক",
  "90s": "নব্বই দশক",
  "2000s": "দুই হাজার দশক",
  neutral: "যুগ-নিরপেক্ষ",
};

export const DEFAULT_DATASET: Dataset = {
  items: ITEMS,
  categories: SORTED_CATEGORIES,
  eras: ERAS,
  dataset_version: DATASET_VERSION,
};

export function itemsByCategory(items: MemoryItem[], categories: Category[]): Array<{ category: Category; items: MemoryItem[] }> {
  return categories
    .map((category) => ({ category, items: items.filter((i) => i.category_id === category.category_id) }))
    .filter((g) => g.items.length > 0);
}
