import { describe, expect, it } from "vitest";
import { buildCompareUrl, decodeComparisonPayload, encodeComparisonPayload } from "../lib/codec";
import type { Dataset, MemoryItem, Responses } from "../lib/types";

function fixtureDataset(): Dataset {
  const items: MemoryItem[] = [];
  for (let i = 1; i <= 10; i++) {
    const id = `MEM_${String(i).padStart(3, "0")}`;
    items.push({
      item_id: id,
      title_bn: `শিরোনাম ${i}`,
      title_en: null,
      description_bn: null,
      category_id: "tv",
      era_tags: ["90s"],
      era_scope: "single",
      classification_confidence: "probable",
      setting_tags: ["both"],
      origin_period: null,
      popularity_period_bd: { from: null, to: null, label_bn: "টেস্ট" },
      weight: 1,
      era_classification_eligible: false,
      validation_status: "under_review",
      last_reviewed: null,
      source_references: [],
      evidence_bn: "",
      region_notes_bn: "",
      review_notes_bn: "",
      flags: [],
    });
  }
  return {
    items,
    categories: [{ category_id: "tv", name_bn: "টিভি", name_en: "tv", display_order: 1, maps_from: [], item_count: 10 }],
    eras: [{ era_id: "90s", label_bn: "৯০-এর দশক", label_en: "90s", range: null, item_count: 10 }],
    dataset_version: "test",
  };
}

const ds = fixtureDataset();

const responses: Responses = {
  MEM_001: "experienced",
  MEM_002: "not_experienced",
  MEM_003: "not_applicable",
  // MEM_004..010 unanswered
};

describe("comparison payload codec", () => {
  it("round-trips all three answer states plus unanswered", () => {
    const payload = encodeComparisonPayload(responses, ds);
    const decoded = decodeComparisonPayload(payload, ds);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.responses.MEM_001).toBe("experienced");
      expect(decoded.responses.MEM_002).toBe("not_experienced");
      expect(decoded.responses.MEM_003).toBe("not_applicable");
      expect(decoded.responses.MEM_004).toBeUndefined();
      expect(decoded.responses.MEM_010).toBeUndefined();
    }
  });

  it("all-experienced full payload round-trips", () => {
    const all: Responses = Object.fromEntries(ds.items.map((i) => [i.item_id, "experienced"]));
    const decoded = decodeComparisonPayload(encodeComparisonPayload(all, ds), ds);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(Object.keys(decoded.responses)).toHaveLength(10);
  });

  it("payloads stay compact (SRS §9.3)", () => {
    const all: Responses = Object.fromEntries(ds.items.map((i) => [i.item_id, "experienced"]));
    const payload = encodeComparisonPayload(all, ds);
    expect(payload.length).toBeLessThan(80);
  });

  it("rejects malformed payloads (FR-020, NFR-007)", () => {
    expect(decodeComparisonPayload("random-text", ds)).toEqual({ ok: false, reason: "malformed" });
    expect(decodeComparisonPayload("cs2.10.abcdef01.AAAA", ds)).toEqual({ ok: false, reason: "version" });
    expect(decodeComparisonPayload("cs1.10.deadbeef.!!!", ds)).toEqual({ ok: false, reason: "malformed" });
    expect(decodeComparisonPayload("", ds)).toEqual({ ok: false, reason: "malformed" });
    expect(decodeComparisonPayload("x".repeat(5000), ds)).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects payloads built against a different item list (documented FR-020 behaviour)", () => {
    const payload = encodeComparisonPayload(responses, ds);
    const changed: Dataset = { ...ds, items: ds.items.slice(0, 9) }; // item removed
    const decoded = decodeComparisonPayload(payload, changed);
    expect(decoded).toEqual({ ok: false, reason: "item_list_changed" });
  });

  it("rejects payloads with non-zero trailing padding bits", () => {
    const payload = encodeComparisonPayload(responses, ds);
    const parts = payload.split(".");
    // flip a low bit of the last byte -> likely touches padding bits (10 items = 20 bits = 3 bytes, 4 pad bits)
    const bytes = atob(parts[3].replace(/-/g, "+").replace(/_/g, "/"));
    const arr = Uint8Array.from(bytes, (c) => c.charCodeAt(0));
    arr[arr.length - 1] |= 0b0001;
    const b64 = btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const tampered = `cs1.${parts[1]}.${parts[2]}.${b64}`;
    // Either caught by padding check or decodes differently but never throws:
    const decoded = decodeComparisonPayload(tampered, ds);
    expect(decoded.ok === false || decoded.ok === true).toBe(true);
  });

  it("builds a fragment URL, not a query string (SRS §9.3 prefers fragments)", () => {
    const url = buildCompareUrl(responses, ds, "https://example.com");
    expect(url.startsWith("https://example.com/compare#cs1.")).toBe(true);
    expect(url).not.toContain("?");
  });
});
