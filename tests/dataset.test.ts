import { describe, expect, it } from "vitest";
import memories from "../data/memories.json";
import categories from "../data/categories.json";
import eras from "../data/eras.json";
import references from "../data/references.json";
import reviewFlags from "../data/review-flags.json";
import { DEFAULT_DATASET, ITEMS, SORTED_CATEGORIES } from "../lib/data";
import { computeResult } from "../lib/scoring";

/**
 * Guards the contract between /data and the app: importing lib/data already
 * Zod-validates structure (it would throw at import). These tests add the
 * cross-file integrity that the client bundle deliberately doesn't carry.
 */
describe("dataset integrity", () => {
  it("loads and validates the real dataset", () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(150);
    expect(ITEMS[0].item_id).toBe("MEM_001");
    expect(SORTED_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("has stable, unique, sorted item ids (comparison links depend on order)", () => {
    const ids = ITEMS.map((i) => i.item_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it("every item's category, era tags and setting tags exist in the vocabularies", () => {
    const catIds = new Set(categories.categories.map((c) => c.category_id));
    const eraIds = new Set(eras.eras.map((e) => e.era_id));
    const settings = new Set(["urban", "rural", "both", "context_specific", "unknown"]);
    for (const item of ITEMS) {
      expect(catIds.has(item.category_id), item.item_id).toBe(true);
      for (const t of item.era_tags) expect(eraIds.has(t), `${item.item_id} era ${t}`).toBe(true);
      for (const s of item.setting_tags) expect(settings.has(s), `${item.item_id} setting ${s}`).toBe(true);
    }
  });

  it("every item's references and flags resolve (no dangling ids)", () => {
    const refIds = new Set(references.references.map((r) => r.ref_id));
    const flagIds = new Set(reviewFlags.flags.map((f) => f.flag_id));
    for (const item of ITEMS) {
      for (const r of item.source_references) expect(refIds.has(r), `${item.item_id} ref ${r}`).toBe(true);
      for (const f of item.flags) expect(flagIds.has(f), `${item.item_id} flag ${f}`).toBe(true);
    }
  });

  it("category and era counts in metadata match reality", () => {
    for (const c of categories.categories) {
      expect(c.item_count).toBe(ITEMS.filter((i) => i.category_id === c.category_id).length);
    }
    for (const e of eras.eras) {
      expect(e.item_count).toBe(ITEMS.filter((i) => i.era_tags.includes(e.era_id)).length);
    }
  });

  it("era_tags are in canonical ascending order with consistent scope", () => {
    const order = ["80s", "90s", "2000s", "neutral"];
    for (const item of ITEMS) {
      const sorted = [...item.era_tags].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      expect(item.era_tags).toEqual(sorted);
      expect(item.era_scope).toBe(item.era_tags.length > 1 ? "multi" : "single");
    }
  });
});

describe("scoring on the real dataset", () => {
  it("computes a full-experience result without errors", () => {
    const all: Record<string, "experienced"> = Object.fromEntries(ITEMS.map((i) => [i.item_id, "experienced"]));
    const result = computeResult(all, DEFAULT_DATASET);
    expect(result.rawScore).toBe(100);
    expect(result.overallScore).toBeLessThan(100);
    expect(result.overallScore).toBeGreaterThan(90);
    expect(result.experiencedCount).toBe(ITEMS.length);
    expect(result.eraFallbackUsed).toBe(true); // FLG-DS-02: all items currently ineligible
    expect(result.label.title_bn.length).toBeGreaterThan(0);
  });

  it("computes an empty-experience result without errors", () => {
    const none: Record<string, "not_experienced"> = Object.fromEntries(ITEMS.map((i) => [i.item_id, "not_experienced"]));
    const result = computeResult(none, DEFAULT_DATASET);
    expect(result.overallScore).toBe(0);
    expect(result.eraProfile).toHaveLength(0);
    expect(result.label.sub_bn).toContain("কম সুন্দর ছেলেবেলা নয়"); // non-shaming rule
  });

  it("restricts every count to the asked items when askedItemIds is provided", () => {
    const asked = ITEMS.slice(0, 12).map((i) => i.item_id);
    const half: Record<string, "experienced" | "not_applicable"> = {};
    asked.forEach((id, i) => (half[id] = i < 6 ? "experienced" : "not_applicable"));
    const result = computeResult(half, DEFAULT_DATASET, { askedItemIds: asked });
    expect(result.totalItems).toBe(12);
    expect(result.applicableCount).toBe(6);
    expect(result.rawScore).toBe(100);
    expect(result.overallScore).toBeLessThan(100);
    // items outside the asked list must not leak into era/category stats
    const askedEras = new Set(ITEMS.slice(0, 12).flatMap((i) => i.era_tags));
    for (const e of result.eraProfile) expect(askedEras.has(e.era_id)).toBe(true);
  });
});
