import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS_COUNT, answeredTooFast, COUNT_OPTIONS, DEFAULT_QUIZ_LENGTH, ERA_SETS, getEraSet, mulberry32, resumeQuestionIndex, sampleQuiz, setPool } from "../lib/quiz";
import { DEFAULT_DATASET, ITEMS } from "../lib/data";

describe("era sets", () => {
  it("defines the four session sets", () => {
    expect(ERA_SETS.map((s) => s.id)).toEqual(["80s", "90s", "2000s", "mix"]);
    expect(getEraSet("90s")?.era).toBe("90s");
    expect(getEraSet("mix")?.era).toBeUndefined();
    expect(getEraSet("bogus")).toBeNull();
    expect(getEraSet(null)).toBeNull();
  });

  it("set pools: era membership includes multi-era items; mix includes everything", () => {
    const pool90 = setPool("90s", ITEMS);
    expect(pool90.length).toBeGreaterThan(0);
    for (const item of pool90) expect(item.era_tags).toContain("90s");
    expect(setPool("mix", ITEMS)).toHaveLength(ITEMS.length);
    expect(setPool("bogus", ITEMS)).toHaveLength(0);
  });

  it("intersects a selected category with every era instead of sampling other categories", () => {
    for (const set of ERA_SETS) {
      const foodPool = setPool(set.id, ITEMS, "food");
      expect(foodPool.length).toBeGreaterThan(0);
      for (const item of foodPool) {
        expect(item.category_id).toBe("food");
        if (set.era) expect(item.era_tags).toContain(set.era);
      }
      const sample = sampleQuiz(set.id, ITEMS, 80, 42, [], "food");
      expect(sample.items).toHaveLength(foodPool.length);
      expect(sample.items.every((item) => item.category_id === "food")).toBe(true);
    }
  });
});

describe("random sampling", () => {
  it("resumes at the saved unanswered question, or the next unanswered item", () => {
    const ids = ["MEM_001", "MEM_002", "MEM_003"];
    expect(resumeQuestionIndex(ids, { MEM_001: "experienced" }, 0)).toBe(1);
    expect(resumeQuestionIndex(ids, { MEM_001: "experienced" }, 2)).toBe(2);
    expect(resumeQuestionIndex(ids, {
      MEM_001: "experienced",
      MEM_002: "not_experienced",
      MEM_003: "not_applicable",
    }, 1)).toBe(2);
  });

  it("detects five-question answer bursts without flagging a considered pace", () => {
    expect(answeredTooFast([0, 410, 830, 1220, 1700])).toBe(true);
    expect(answeredTooFast([0, 900, 1800, 2700, 3600])).toBe(false);
    expect(answeredTooFast([0, 300, 600, 900])).toBe(false);
  });

  it("returns the requested number of unique items from each set pool", () => {
    for (const set of ERA_SETS) {
      const { items, ids } = sampleQuiz(set.id, ITEMS, DEFAULT_QUIZ_LENGTH);
      expect(items.length).toBe(Math.min(DEFAULT_QUIZ_LENGTH, setPool(set.id, ITEMS).length));
      expect(new Set(ids).size).toBe(ids.length);
      const poolIds = new Set(setPool(set.id, ITEMS).map((i) => i.item_id));
      for (const id of ids) expect(poolIds.has(id)).toBe(true);
    }
  });

  it("is deterministic for a fixed seed and varied across seeds", () => {
    const a1 = sampleQuiz("90s", ITEMS, 12, 42).ids;
    const a2 = sampleQuiz("90s", ITEMS, 12, 42).ids;
    const b = sampleQuiz("90s", ITEMS, 12, 1337).ids;
    expect(a1).toEqual(a2);
    expect(a1).not.toEqual(b); // 12 picks from a 100+ pool: collision of full order is implausible
  });

  it("mulberry32 produces a stable sequence", () => {
    const rng = mulberry32(7);
    const first = [rng(), rng(), rng()];
    const rng2 = mulberry32(7);
    expect([rng2(), rng2(), rng2()]).toEqual(first);
    for (const v of first) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different sessions get different samples (statistical sanity)", () => {
    const s1 = new Set(sampleQuiz("mix", ITEMS, 12).ids);
    const s2 = new Set(sampleQuiz("mix", ITEMS, 12).ids);
    // two random 12-picks from 180 items will differ with overwhelming probability
    expect([...s1].some((id) => !s2.has(id))).toBe(true);
  });

  it("respects the user-selected question count", () => {
    expect(COUNT_OPTIONS).toContain(5);
    expect(sampleQuiz("mix", ITEMS, 5).items).toHaveLength(5);
    expect(sampleQuiz("mix", ITEMS, 30).items).toHaveLength(30);
    expect(sampleQuiz("mix", ITEMS, ALL_QUESTIONS_COUNT).items).toHaveLength(ITEMS.length);
    expect(sampleQuiz("2000s", ITEMS, 180).items).toHaveLength(setPool("2000s", ITEMS).length);
  });

  it("all questions includes the full selected category even if previously seen", () => {
    const foodPool = setPool("90s", ITEMS, "food");
    const sample = sampleQuiz("90s", ITEMS, ALL_QUESTIONS_COUNT, 42, foodPool.map((item) => item.item_id), "food");
    expect(sample.items).toHaveLength(foodPool.length);
    expect(sample.items.every((item) => item.category_id === "food")).toBe(true);
  });

  it("avoids previously seen questions until the pool is exhausted", () => {
    const first = sampleQuiz("80s", ITEMS, 5, 9);
    const next = sampleQuiz("80s", ITEMS, 5, 10, first.ids);
    expect(next.ids.some((id) => first.ids.includes(id))).toBe(false);
  });
});
