import { describe, expect, it } from "vitest";
import { computeResult, wilsonLowerBound } from "../lib/scoring";
import type { Dataset, MemoryItem, Responses } from "../lib/types";

/** Synthetic dataset fixture — engine must be dataset-agnostic so rules can be unit-tested. */
function fixture(overrides: Partial<MemoryItem>[] = []): Dataset {
  const base: MemoryItem[] = [
    item("MEM_001", "tv", ["90s"], true),
    item("MEM_002", "tv", ["90s"], true),
    item("MEM_003", "games", ["80s"], true),
    item("MEM_004", "games", ["80s", "90s"], true), // multi-era
    item("MEM_005", "food", ["2000s"], true),
  ];
  for (const o of overrides) {
    const idx = base.findIndex((i) => i.item_id === o.item_id);
    if (idx >= 0) base[idx] = { ...base[idx], ...o };
  }
  return {
    items: base,
    categories: [
      cat("tv", "টিভি", 1),
      cat("games", "খেলা", 2),
      cat("food", "খাবার", 3),
    ],
    eras: [
      era("80s", "৮০-এর দশক"),
      era("90s", "৯০-এর দশক"),
      era("2000s", "২০০০-এর দশক"),
    ],
    dataset_version: "test-1.0.0",
  };
}

function item(item_id: string, category_id: string, era_tags: string[], eligible: boolean): MemoryItem {
  return {
    item_id,
    title_bn: `শিরোনাম ${item_id}`,
    title_en: null,
    description_bn: null,
    category_id,
    era_tags,
    era_scope: era_tags.length > 1 ? "multi" : "single",
    classification_confidence: "probable",
    setting_tags: ["both"],
    origin_period: null,
    popularity_period_bd: { from: null, to: null, label_bn: "টেস্ট" },
    weight: 1,
    era_classification_eligible: eligible,
    validation_status: "under_review",
    last_reviewed: null,
    source_references: [],
    evidence_bn: "",
    region_notes_bn: "",
    review_notes_bn: "",
    flags: [],
  };
}
const cat = (category_id: string, name_bn: string, display_order: number) => ({
  category_id, name_bn, name_en: category_id, display_order, maps_from: [], item_count: 0,
});
const era = (era_id: string, label_bn: string) => ({ era_id, label_bn, label_en: era_id, range: null, item_count: 0 });

describe("fairness-adjusted overall score", () => {
  it("reports the raw ratio and a conservative Wilson score", () => {
    const r: Responses = {
      MEM_001: "experienced",
      MEM_002: "not_experienced",
      MEM_003: "experienced",
      MEM_004: "not_experienced",
      MEM_005: "not_applicable",
    };
    const result = computeResult(r, fixture());
    expect(result.rawScore).toBe(50); // 2 experienced of 4 applicable
    expect(result.overallScore).toBe(Math.round(wilsonLowerBound(2, 4) * 100));
    expect(result.experiencedCount).toBe(2);
    expect(result.applicableCount).toBe(4);
    expect(result.notApplicableCount).toBe(1);
  });

  it("excludes N/A from the denominator (fairness rule)", () => {
    const r: Responses = {
      MEM_001: "experienced",
      MEM_002: "not_applicable",
      MEM_003: "not_applicable",
      MEM_004: "not_applicable",
      MEM_005: "not_applicable",
    };
    const result = computeResult(r, fixture());
    expect(result.applicableCount).toBe(1);
    expect(result.rawScore).toBe(100);
    expect(result.overallScore).toBe(Math.round(wilsonLowerBound(1, 1) * 100));
  });

  it("treats unanswered as not experienced (after UI confirmation)", () => {
    const r: Responses = { MEM_001: "experienced" }; // everything else unanswered
    const result = computeResult(r, fixture());
    expect(result.answeredCount).toBe(1);
    expect(result.applicableCount).toBe(5);
    expect(result.rawScore).toBe(20);
    expect(result.overallScore).toBe(Math.round(wilsonLowerBound(1, 5) * 100));
  });

  it("returns 0 with no applicable items, without dividing by zero", () => {
    const r: Responses = {
      MEM_001: "not_applicable",
      MEM_002: "not_applicable",
      MEM_003: "not_applicable",
      MEM_004: "not_applicable",
      MEM_005: "not_applicable",
    };
    expect(computeResult(r, fixture()).overallScore).toBe(0);
  });

  it("does not equate a small perfect sample with a large perfect sample", () => {
    expect(wilsonLowerBound(10, 10)).toBeLessThan(wilsonLowerBound(100, 100));
    expect(wilsonLowerBound(100, 100)).toBeLessThan(1);
    expect(wilsonLowerBound(10, 10)).toBeGreaterThan(0);
  });
});

describe("era affinity (OD-05: multi-era items split fractionally)", () => {
  it("splits multi-era item contribution without double-counting", () => {
    const r: Responses = {
      MEM_001: "experienced", // 90s
      MEM_002: "experienced", // 90s
      MEM_003: "experienced", // 80s
      MEM_004: "experienced", // multi — half contribution to each tagged era
      MEM_005: "not_experienced",
    };
    const result = computeResult(r, fixture());
    const byId = Object.fromEntries(result.eraProfile.map((e) => [e.era_id, e]));
    expect(byId["90s"].count).toBe(2.5);
    expect(byId["80s"].count).toBe(1.5);
    expect(result.eraProfile.length).toBe(2);
    expect(result.eraProfile.reduce((sum, era) => sum + era.count, 0)).toBe(4); // each experience contributes one
    expect(result.eraFallbackUsed).toBe(false);
  });

  it("uses the documented fallback when no item is era-eligible (FLG-DS-02)", () => {
    const ds = fixture([
      { item_id: "MEM_001", era_classification_eligible: false },
      { item_id: "MEM_002", era_classification_eligible: false },
      { item_id: "MEM_003", era_classification_eligible: false },
      { item_id: "MEM_004", era_classification_eligible: false },
      { item_id: "MEM_005", era_classification_eligible: false },
    ]);
    const r: Responses = { MEM_001: "experienced", MEM_002: "experienced", MEM_003: "not_experienced" };
    const result = computeResult(r, ds);
    expect(result.eraFallbackUsed).toBe(true);
    expect(result.eraProfile.length).toBe(1);
    expect(result.eraProfile[0].era_id).toBe("90s");
    expect(result.eraProfile[0].share).toBe(100);
  });

  it("fractionally allocates multi-era items in fallback mode too", () => {
    const ds = fixture([
      { item_id: "MEM_001", era_classification_eligible: false },
      { item_id: "MEM_002", era_classification_eligible: false },
      { item_id: "MEM_003", era_classification_eligible: false },
      { item_id: "MEM_004", era_classification_eligible: false },
      { item_id: "MEM_005", era_classification_eligible: false },
    ]);
    const r: Responses = { MEM_001: "experienced", MEM_004: "experienced" };
    const result = computeResult(r, ds);
    expect(result.eraFallbackUsed).toBe(true);
    const byId = Object.fromEntries(result.eraProfile.map((e) => [e.era_id, e]));
    expect(byId["90s"].count).toBe(1.5);
    expect(byId["80s"].count).toBe(0.5);
  });
});

describe("result labels (OD-07 draft rules)", () => {
  it("dominant era ≥50% gets an era label", () => {
    const r: Responses = {
      MEM_001: "experienced",
      MEM_002: "experienced",
      MEM_003: "not_experienced",
      MEM_004: "not_experienced",
      MEM_005: "not_experienced",
    };
    const result = computeResult(r, fixture());
    expect(result.label.title_bn).toContain("নব্বই");
  });

  it("two eras without a majority get a mixed label", () => {
    const r: Responses = {
      MEM_001: "experienced", // 90s
      MEM_003: "experienced", // 80s
      MEM_002: "not_experienced",
      MEM_004: "not_experienced",
      MEM_005: "not_experienced",
    };
    const result = computeResult(r, fixture());
    expect(result.label.title_bn).toBe("দুই দশকের মাঝামাঝি বাচ্চা");
  });

  it("uses a clear mixed-memory title when all three eras appear", () => {
    const r: Responses = {
      MEM_001: "experienced", // 90s
      MEM_002: "experienced", // 90s
      MEM_003: "experienced", // 80s
      MEM_004: "not_experienced",
      MEM_005: "experienced", // 2000s
    };
    const result = computeResult(r, fixture());
    expect(result.label.title_bn).toBe("তিন দশকের মিশ্র স্মৃতি");
  });

  it("zero experienced items gets a gentle, non-shaming label", () => {
    const r: Responses = { MEM_001: "not_experienced" };
    const result = computeResult(r, fixture());
    expect(result.label.title_bn).toContain("খালি");
    expect(result.overallScore).toBe(0);
  });
});

describe("category breakdown (FR-011)", () => {
  it("computes per-category shares excluding N/A", () => {
    const r: Responses = {
      MEM_001: "experienced",
      MEM_002: "experienced",
      MEM_003: "not_experienced",
      MEM_004: "not_applicable",
      MEM_005: "not_experienced",
    };
    const result = computeResult(r, fixture());
    const byId = Object.fromEntries(result.categories.map((c) => [c.category_id, c]));
    expect(byId.tv.share).toBe(100);
    expect(byId.games.share).toBe(0); // 0 of 1 applicable
    expect(byId.food.share).toBe(0);
    expect(result.strongestCategories[0].category_id).toBe("tv");
  });
});

describe("determinism (MVP acceptance: same responses → same result)", () => {
  it("produces identical output for identical input", () => {
    const r: Responses = {
      MEM_001: "experienced",
      MEM_003: "experienced",
      MEM_005: "not_applicable",
    };
    expect(computeResult(r, fixture())).toEqual(computeResult(r, fixture()));
  });
});
