"use client";

/**
 * Cassette J-card style result card (idea proposal: "a cassette J-card as the
 * share card"). Original CSS art only. This element is captured by
 * html-to-image for the downloadable share image (FR-014/015).
 */
import type { QuizResult } from "@/lib/types";
import { toBn, toBnPct } from "@/lib/bn";
import Image from "next/image";
import type { EraArt } from "@/lib/era-art";

const ERA_COLORS: Record<string, string> = {
  "80s": "var(--color-brass)",
  "90s": "var(--color-leaf)",
  "2000s": "var(--color-flame)",
  neutral: "var(--color-taupe)",
};

export default function CassetteCard({
  result,
  art,
  cardId = "result-card",
  dominantEra,
  dominantEraLabel,
}: {
  result: QuizResult;
  art: EraArt | null;
  cardId?: string;
  dominantEra?: string;
  dominantEraLabel?: string;
}) {
  return (
    <div
      id={cardId}
      className="relative w-full min-w-0 max-w-[340px] select-none rounded-2xl border-4 border-ink bg-paper-card p-3 shadow-hard-lg sm:p-4"
      role="img"
      aria-label={`ছেলেবেলা স্কোর কার্ড: ${toBnPct(result.overallScore)}, ${result.label.title_bn}`}
    >
      {/* header */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-ink/30 pb-2">
        <p className="font-display text-lg font-extrabold">ছেলেবেলা স্কোর</p>
        <div className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-ink" />
          <span className="h-2 w-2 rounded-full bg-ink" />
        </div>
      </div>

      {art && (
        <div>
          <div className="relative mt-3 h-20 overflow-hidden rounded-lg border-2 border-ink">
            <Image
              src={art.src}
              alt={art.caption_bn}
              fill
              sizes="340px"
              className={dominantEra === "80s" ? "object-cover grayscale contrast-125" : "object-cover"}
            />
            {result.eraProfile[0]?.label_bn || dominantEraLabel ? (
              <span className="absolute bottom-1 right-1 rounded bg-ink/75 px-1.5 py-0.5 text-[8px] font-bold text-paper">
                {result.eraProfile[0]?.label_bn ?? dominantEraLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-center text-[8px] leading-[1.45] text-ink-soft">
            “{art.title}” · {art.artist} · {art.license} · Wikimedia Commons
          </p>
        </div>
      )}

      {/* cassette window */}
      <div className="relative mt-3 overflow-hidden rounded-xl border-2 border-ink bg-brand-deep px-4 py-6">
        <div className="scanlines absolute inset-0 opacity-50" aria-hidden="true" />
        {/* reels */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          <Reel />
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          <Reel reverse />
        </div>
        <div className="relative z-10 text-center">
          <p className="text-[11px] font-semibold text-paper/80">আমার স্কোর</p>
          <p className="font-display text-5xl font-extrabold leading-[1.2] text-marigold drop-shadow-[3px_3px_0_rgba(0,0,0,0.55)] sm:text-6xl">
            {toBnPct(result.overallScore)}
          </p>
          <p className="mt-2 font-display text-xl font-bold text-paper">{result.label.title_bn}</p>
        </div>
      </div>

      {/* tape ribbon */}
      <div className="tape-ribbon mx-6 -mt-1 h-2 rounded-b-md border-x-2 border-b-2 border-ink" aria-hidden="true" />

      {/* meta chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {result.strongestCategories.slice(0, 2).map((c) => (
          <span key={c.category_id} className="rounded-full border-2 border-ink bg-tan px-3 py-1 text-xs font-bold">
            {c.name_bn} · {toBnPct(c.share ?? 0)}
          </span>
        ))}
      </div>

      {/* era strip */}
      <div className="mt-4 space-y-1.5">
        {result.eraProfile.slice(0, 3).map((e) => (
          <div key={e.era_id} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs font-semibold">{e.label_bn}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full border border-ink/60 bg-ink/10">
              <span
                className="block h-full rounded-full"
                style={{ width: `${e.share}%`, backgroundColor: ERA_COLORS[e.era_id] ?? "var(--color-taupe)" }}
              />
            </span>
            <span className="w-9 text-right text-xs font-bold">{toBnPct(e.share)}</span>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t-2 border-dashed border-ink/30 pt-2 text-center text-[10px] text-ink-soft">
        <span>{toBn(result.experiencedCount)}/{toBn(result.totalItems)}টি পেরেছ · কাঁচা {toBnPct(result.rawScore)}</span>
        <span>chhelebela-score</span>
      </div>
      <div className="rickshaw-stripe absolute inset-x-0 bottom-0 h-2 rounded-b-xl" aria-hidden="true" />
    </div>
  );
}

function Reel({ reverse = false }: { reverse?: boolean }) {
  return (
    <div
      className="h-12 w-12 rounded-full border-2 border-paper/70 bg-ink/70"
      style={{
        backgroundImage: `conic-gradient(${reverse ? "transparent" : "rgba(250,241,221,0.85)"} 0deg 30deg, ${
          reverse ? "rgba(250,241,221,0.85)" : "transparent"
        } 30deg 60deg, transparent 60deg 120deg, rgba(250,241,221,0.85) 120deg 150deg, transparent 150deg 210deg, rgba(250,241,221,0.85) 210deg 240deg, transparent 240deg 300deg, rgba(250,241,221,0.85) 300deg 330deg, transparent 330deg 360deg)`,
      }}
    >
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper/70 bg-brand-deep" />
    </div>
  );
}
