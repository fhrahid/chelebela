import quotesData from "@/data/era-quotes.json";

export type EraQuoteKind = "original_caption" | "public_domain_literature" | "media_excerpt";

export interface EraQuote {
  quote_id: string;
  era_id: string;
  text_bn: string;
  quote_type: EraQuoteKind;
  attribution_bn: string;
  source_url: string | null;
  source_note_bn: string;
}

export const ERA_QUOTES = quotesData.quotes as EraQuote[];

/** Era-specific originals plus a few clearly marked timeless sourced quotes. */
export function eraQuotePool(eraId: string | undefined): EraQuote[] {
  if (!eraId) return ERA_QUOTES.filter((quote) => quote.era_id === "timeless");
  return ERA_QUOTES.filter((quote) => quote.era_id === eraId || quote.era_id === "timeless");
}

export function randomEraQuote(eraId: string | undefined, random = Math.random): EraQuote | null {
  const pool = eraQuotePool(eraId);
  if (pool.length === 0) return null;
  return pool[Math.floor(random() * pool.length)];
}

export function eraQuoteById(quoteId: string | undefined): EraQuote | null {
  if (!quoteId) return null;
  return ERA_QUOTES.find((quote) => quote.quote_id === quoteId) ?? null;
}

export function quoteKindLabel(kind: EraQuoteKind): string {
  switch (kind) {
    case "original_caption":
      return "নিজস্ব স্মৃতি-লাইন";
    case "public_domain_literature":
      return "চিরকালীন কবিতার লাইন";
    case "media_excerpt":
      return "মীনা থিম গান";
  }
}
