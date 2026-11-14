import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeComparisonDatabase,
  createComparison,
  createQuizSession,
  getComparison,
  getQuizSession,
  isValidComparisonToken,
} from "../lib/comparison-db";
import { DEFAULT_DATASET } from "../lib/data";

const record = {
  responses: {
    MEM_001: "experienced",
    MEM_002: "not_experienced",
    MEM_003: "not_applicable",
  },
  askedIds: ["MEM_001", "MEM_002", "MEM_003"],
} as const;

beforeEach(() => {
  process.env.COMPARISON_DB_PATH = ":memory:";
});

afterEach(() => {
  closeComparisonDatabase();
  delete process.env.COMPARISON_DB_PATH;
});

describe("anonymous SQLite comparison records", () => {
  it("stores only responses and asked IDs behind an opaque random token", () => {
    const created = createComparison(record);
    expect(created).not.toBeNull();
    if (!created) return;

    expect(isValidComparisonToken(created.id)).toBe(true);
    expect(created.id).toHaveLength(22);
    expect(getComparison(created.id)).toMatchObject({
      responses: record.responses,
      askedIds: record.askedIds,
      expiresAt: created.expiresAt,
    });
  });

  it("rejects mismatched, duplicate, unknown, or malformed data", () => {
    expect(createComparison({ responses: record.responses, askedIds: ["MEM_001"] })).toBeNull();
    expect(createComparison({
      responses: { MEM_001: "experienced" },
      askedIds: ["MEM_001", "MEM_001"],
    })).toBeNull();
    expect(createComparison({
      responses: { MEM_999: "experienced" },
      askedIds: ["MEM_999"],
    })).toBeNull();
    expect(getComparison("../not-a-token")).toBeNull();
  });

  it("does not expose a record when the token is changed", () => {
    const created = createComparison(record);
    expect(created).not.toBeNull();
    if (!created) return;
    const alteredId = `${created.id.slice(0, -1)}${created.id.endsWith("A") ? "B" : "A"}`;
    expect(getComparison(alteredId)).toBeNull();
  });

  it("keeps each completed quiz session immutable and separate", () => {
    const firstInput = { ...record, id: "AAAAAAAAAAAAAAAAAAAAAA", setId: "mix" as const };
    const secondInput = {
      ...record,
      id: "BBBBBBBBBBBBBBBBBBBBBB",
      setId: "mix" as const,
      responses: { ...record.responses, MEM_001: "not_experienced" as const },
    };
    const first = createQuizSession(firstInput);
    const second = createQuizSession(secondInput);

    expect(first?.id).toBe(firstInput.id);
    expect(second?.id).toBe(secondInput.id);
    expect(getQuizSession(firstInput.id)?.responses).toEqual(record.responses);
    expect(getQuizSession(secondInput.id)?.responses).toEqual(secondInput.responses);
    expect(getComparison(firstInput.id)?.responses).toEqual(record.responses);

    // Retrying the same insert is idempotent; changed answers never overwrite it.
    expect(createQuizSession(firstInput)).toMatchObject({
      id: first?.id,
      expiresAt: first?.expiresAt,
      created: false,
    });
    expect(createQuizSession({
      ...firstInput,
      responses: { ...record.responses, MEM_001: "not_experienced" },
    })).toBeNull();
    expect(getQuizSession(firstInput.id)?.responses).toEqual(record.responses);
  });

  it("accepts a full-length session and keeps all answers together", () => {
    const askedIds = DEFAULT_DATASET.items.map((item) => item.item_id);
    const responses = Object.fromEntries(askedIds.map((id) => [id, "not_experienced"]));
    const created = createQuizSession({
      id: "CCCCCCCCCCCCCCCCCCCCCC",
      responses,
      askedIds,
      setId: "mix",
    });
    expect(created).not.toBeNull();
    expect(getQuizSession("CCCCCCCCCCCCCCCCCCCCCC")?.askedIds).toHaveLength(askedIds.length);
    expect(Object.keys(getQuizSession("CCCCCCCCCCCCCCCCCCCCCC")?.responses ?? {})).toHaveLength(askedIds.length);
  });
});
