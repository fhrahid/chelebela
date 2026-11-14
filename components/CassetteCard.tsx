"use client";

/** Downloadable cassette-J-card result layout with a fully visible era image. */
import Image from "next/image";
import AlponaFlower from "@/components/AlponaFlower";
import type { EraArt } from "@/lib/era-art";
import { quoteKindLabel, type EraQuote } from "@/lib/era-quotes";
import type { QuizResult } from "@/lib/types";
import { toBn, toBnPct } from "@/lib/bn";

const ERA_COLORS: Record<string, string> = {
  "80s": "var(--color-brass)",
  "90s": "var(--color-leaf)",
  "2000s": "var(--color-flame)",
  neutral: "var(--color-taupe)",
};

export default function CassetteCard({
  result,
  art,
  quote,
  cardId = "result-card",
  dominantEra,
  dominantEraLabel,
}: {
  result: QuizResult;
  art: EraArt | null;
  quote: EraQuote | null;
  cardId?: string;
  dominantEra?: string;
  dominantEraLabel?: string;
}) {
  const leadingEraId = result.eraProfile[0]?.era_id ?? dominantEra;
  const leadingEraLabel = result.eraProfile[0]?.label_bn ?? dominantEraLabel;

  return (
    <div
      id={cardId}
      className="relative w-full min-w-0 max-w-[380px] overflow-hidden rounded-[1.4rem] border-[3px] border-ink bg-paper-card p-3 shadow-hard-lg sm:p-4"
      role="img"
      aria-label={`ছেলেবেলা স্কোর কার্ড: ${toBnPct(result.overallScore)}, ${result.label.title_bn}`}
    >
      <div className="rickshaw-stripe -mx-3 -mt-3 h-2 sm:-mx-4 sm:-mt-4" aria-hidden="true" />

      {/* J-card header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-ink/30 py-2">
        <div>
          <p className="font-display text-xl font-extrabold leading-[1.35] text-ink">ছেলেবেলা</p>
          <p className="text-[10px] font-semibold text-ink-soft">স্মৃতির ক্যাসেট · পিঠ ১</p>
        </div>
        <span className="rounded-md border-2 border-ink bg-rose px-2.5 py-1 font-display text-base font-extrabold text-paper shadow-hard-sm">
          স্কোর
        </span>
      </div>

      {/* Full image frame: contain keeps portraits and landscape photos uncropped. */}
      {art && (
        <figure className="mt-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-[3px] border-ink bg-brand-deep">
            <Image
              src={art.src}
              alt={art.caption_bn}
              fill
              sizes="(max-width: 640px) 100vw, 380px"
              className={`object-contain p-2 ${art.art_id.startsWith("80s-") ? "grayscale contrast-125" : ""}`}
            />
            {leadingEraLabel && (
              <span className="absolute bottom-2 left-2 rounded-full border border-paper/60 bg-ink/80 px-2.5 py-1 text-xs font-bold text-paper">
                {leadingEraLabel}
              </span>
            )}
          </div>
          <figcaption className="mt-1.5 text-center text-[9px] leading-[1.45] text-ink-soft">
            {art.caption_bn}<br />
            “{art.title}” · {art.artist} · {art.license} · Wikimedia Commons
          </figcaption>
        </figure>
      )}

      {quote && (
        <blockquote className="mt-3 rounded-xl border-2 border-dashed border-brick/60 bg-paper-soft px-3 py-2.5 text-center">
          <p className="font-display text-sm font-bold leading-[1.5] text-brand">“{quote.text_bn}”</p>
          <p className="mt-1 text-[9px] leading-[1.4] text-ink-soft">
            {quote.attribution_bn} · {quoteKindLabel(quote.quote_type)}
            {quote.source_url
              ? ` · সূত্র: ${quote.quote_type === "media_excerpt" ? "মীনা থিম গান" : "bn.wikisource.org"}`
              : ""}
          </p>
          <p className="mt-1 text-[8px] leading-[1.35] text-ink-soft/80">{quote.source_note_bn}</p>
        </blockquote>
      )}

      {/* Score sticker */}
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border-2 border-ink bg-paper-soft px-3 py-3">
        <div>
          <p className="text-xs font-bold text-ink-soft">তোমার স্মৃতি-স্কোর</p>
          <p className="mt-0.5 font-display text-5xl font-extrabold leading-[1.2] text-brand sm:text-6xl">
            {toBnPct(result.overallScore)}
          </p>
        </div>
        <div className="max-w-[118px] text-right">
          <AlponaFlower
            size={33}
            petal={leadingEraId === "80s" ? "#543C22" : leadingEraId === "90s" ? "#E1463E" : "#298265"}
            center="#F9BB29"
            className="ml-auto"
          />
          <p className="mt-1 font-display text-sm font-bold leading-[1.4]">{result.label.title_bn}</p>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-ink-soft">
        কাঁচা {toBnPct(result.rawScore)} · {toBn(result.answeredCount)}/{toBn(result.totalItems)}টি উত্তর
      </p>

      {result.strongestCategories.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {result.strongestCategories.slice(0, 2).map((category) => (
            <span key={category.category_id} className="rounded-full border border-ink bg-tan px-2.5 py-1 text-xs font-bold">
              {category.name_bn} · {toBnPct(category.share ?? 0)}
            </span>
          ))}
        </div>
      )}

      {/* Mini cassette window / era profile */}
      <div className="mt-3 rounded-xl border-2 border-ink bg-brand-deep px-3 py-2.5">
        <div className="space-y-1.5">
          {result.eraProfile.slice(0, 3).map((era) => (
            <div key={era.era_id} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs font-semibold text-paper">{era.label_bn}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper/20">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${era.share}%`, backgroundColor: ERA_COLORS[era.era_id] ?? "#F9BB29" }}
                />
              </span>
              <span className="w-9 text-right text-xs font-bold text-paper">{toBnPct(era.share)}</span>
            </div>
          ))}
          {result.eraProfile.length === 0 && (
            <p className="text-center text-xs text-paper/85">দশকের ছবি এখনো স্পষ্ট নয়</p>
          )}
        </div>
        <div className="mt-2 flex justify-center gap-8" aria-hidden="true">
          <span className="h-5 w-5 rounded-full border-2 border-paper/70 bg-ink/70 shadow-inner" />
          <span className="h-5 w-5 rounded-full border-2 border-paper/70 bg-ink/70 shadow-inner" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t-2 border-dashed border-ink/30 pt-2 text-center text-[10px] text-ink-soft">
        <span>{toBn(result.experiencedCount)}/{toBn(result.totalItems)}টি পেরেছ</span>
        <span aria-hidden="true">✿</span>
        <span>chhelebela-score</span>
      </div>
    </div>
  );
}
