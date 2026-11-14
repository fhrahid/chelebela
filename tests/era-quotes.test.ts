import { describe, expect, it } from "vitest";
import { ERA_QUOTES, eraQuotePool, randomEraQuote } from "../lib/era-quotes";

describe("era result quote bank", () => {
  it.each(["80s", "90s", "2000s"])("%s has at least 100 original, clearly-labelled lines", (eraId) => {
    const originals = ERA_QUOTES.filter((quote) => quote.era_id === eraId && quote.quote_type === "original_caption");
    expect(originals).toHaveLength(100);
    expect(new Set(originals.map((quote) => quote.text_bn)).size).toBe(100);
    expect(originals.every((quote) => quote.attribution_bn.includes("নিজস্ব"))).toBe(true);
  });

  it("keeps sourced literature and media lines distinct and attributed", () => {
    const sourced = ERA_QUOTES.filter((quote) => quote.quote_type !== "original_caption");
    expect(sourced.length).toBeGreaterThan(0);
    for (const quote of sourced) {
      expect(quote.attribution_bn.length).toBeGreaterThan(0);
      expect(quote.source_url).toBeTruthy();
    }
  });

  it("selects a quote from the result's leading-era pool and supports deterministic selection", () => {
    for (const eraId of ["80s", "90s", "2000s"]) {
      const pool = eraQuotePool(eraId);
      expect(pool.length).toBeGreaterThanOrEqual(100);
      expect(randomEraQuote(eraId, () => 0)).toEqual(pool[0]);
      expect(randomEraQuote(eraId, () => 0.999)).toEqual(pool[pool.length - 1]);
    }
  });
});
