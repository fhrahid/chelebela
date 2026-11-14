import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeComparisonDatabase,
  createComparison,
  getComparison,
  isValidComparisonToken,
} from "../lib/comparison-db";

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
});
