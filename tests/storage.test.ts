import { afterEach, describe, expect, it } from "vitest";
import { quizStorage } from "../lib/storage";

const values = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: mockStorage },
});

afterEach(() => values.clear());

describe("quiz result persistence", () => {
  it("writes and reads a completed sampled result for the result page", () => {
    const responses = {
      MEM_001: "experienced" as const,
      MEM_002: "not_experienced" as const,
      MEM_003: "not_applicable" as const,
    };
    quizStorage.saveResult(responses, Object.keys(responses), "90s", "90s-cassette-still-life", "90s-original-013", "food");

    expect(quizStorage.loadResult()).toMatchObject({
      responses,
      askedIds: ["MEM_001", "MEM_002", "MEM_003"],
      setId: "90s",
      categoryId: "food",
      questionCount: 3,
      eraArtId: "90s-cassette-still-life",
      eraQuoteId: "90s-original-013",
    });
    // Re-reading after a result-page refresh returns the exact same selected art.
    expect(quizStorage.loadResult()?.eraArtId).toBe("90s-cassette-still-life");
    expect(quizStorage.loadResult()?.eraQuoteId).toBe("90s-original-013");
  });

  it("keeps every quiz session and its complete answers instead of overwriting history", () => {
    const first = quizStorage.saveResult(
      { MEM_001: "experienced" },
      ["MEM_001"],
      "80s",
    );
    const second = quizStorage.saveResult(
      { MEM_002: "not_experienced", MEM_003: "not_applicable" },
      ["MEM_002", "MEM_003"],
      "90s",
    );

    expect(first.sessionId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(quizStorage.loadResult()?.responses).toEqual(second.responses);
    expect(quizStorage.loadResultHistory()).toHaveLength(2);
    expect(quizStorage.loadResultBySessionId(first.sessionId!)?.responses).toEqual(first.responses);
    expect(quizStorage.loadResultBySessionId(second.sessionId!)?.responses).toEqual(second.responses);
  });

  it("preserves a result saved by an older app version when the next quiz completes", () => {
    const oldResult = {
      responses: { MEM_010: "experienced" },
      askedIds: ["MEM_010"],
      setId: "80s",
      completedAt: 1234,
    };
    mockStorage.setItem("chhelebela:result:v1", JSON.stringify(oldResult));

    const newResult = quizStorage.saveResult(
      { MEM_020: "not_experienced" },
      ["MEM_020"],
      "90s",
    );

    expect(quizStorage.loadResult()?.sessionId).toBe(newResult.sessionId);
    expect(quizStorage.loadResultBySessionId(newResult.sessionId!)?.responses).toEqual(newResult.responses);
    expect(quizStorage.loadResultHistory()).toHaveLength(2);
    expect(quizStorage.loadResultHistory().some((result) => result.responses.MEM_010 === "experienced")).toBe(true);
  });

  it("returns null instead of breaking the result route on corrupted saved JSON", () => {
    values.set("chhelebela:result:v1", "{not-json");
    expect(quizStorage.loadResult()).toBeNull();
  });

  it("stores the short comparison ID locally and migrates a pending legacy link", () => {
    quizStorage.savePendingCompare("Abcdefghijklmnopqrstu_");
    expect(quizStorage.loadPendingCompare()?.comparisonId).toBe("Abcdefghijklmnopqrstu_");

    mockStorage.setItem("chhelebela:pending-compare:v1", JSON.stringify({
      payload: "cs1.1.12345678.AA",
      savedAt: 123,
    }));
    expect(quizStorage.loadPendingCompare()).toEqual({
      comparisonId: "legacy:cs1.1.12345678.AA",
      savedAt: 123,
    });
  });

  it("tracks seen question ids and can clear legacy progress", () => {
    quizStorage.addSeenIds("90s", ["MEM_001", "MEM_002"]);
    quizStorage.addSeenIds("mix", ["MEM_002", "MEM_003"]);
    expect(quizStorage.loadSeenIds()).toEqual({
      "90s": ["MEM_001", "MEM_002"],
      mix: ["MEM_002", "MEM_003"],
    });
    mockStorage.setItem("chhelebela:progress:v1", "old");
    quizStorage.clearProgress();
    expect(mockStorage.getItem("chhelebela:progress:v1")).toBeNull();
  });
});
