"use client";

/**
 * Downloadable cassette-J-card result card. The card renders at a fixed CSS
 * pixel size for the chosen social format so the captured PNG (at pixelRatio
 * 2) matches each platform exactly: feed 1200×630, square 1080×1080, portrait
 * 1080×1350, story 1080×1920. A personal photo can replace the era artwork,
 * with a retro 80s/90s film filter applied on top.
 */
import Image from "next/image";
import AlponaFlower from "@/components/AlponaFlower";
import type { EraArt } from "@/lib/era-art";
import { quoteKindLabel, type EraQuote } from "@/lib/era-quotes";
import type { QuizResult } from "@/lib/types";
import { toBn, toBnPct } from "@/lib/bn";

export type CardFormat = "feed" | "square" | "portrait" | "story";

export interface CardFormatSpec {
  id: CardFormat;
  label: string;
  hint: string;
  width: number;
  height: number;
}

/** CSS sizes halve the target resolution; capture at pixelRatio 2 for exact output. */
export const CARD_FORMATS: CardFormatSpec[] = [
  { id: "feed", label: "ফেসবুক", hint: "১.৯১:১ · ১২০০×৬৩০", width: 600, height: 315 },
  { id: "square", label: "স্কয়ার", hint: "১:১ · ১০৮০×১০৮০", width: 540, height: 540 },
  { id: "portrait", label: "ইনস্টা", hint: "৪:৫ · ১০৮০×১৩৫০", width: 540, height: 675 },
  { id: "story", label: "স্টোরি / রিল", hint: "৯:১৬ · ১০৮০×১৯২০", width: 540, height: 960 },
];

export type PhotoFilter = "none" | "80s" | "90s";

export const PHOTO_FILTERS: Array<{ id: PhotoFilter; label: string }> = [
  { id: "80s", label: "৮০'s ফিল্টার" },
  { id: "90s", label: "৯০'s ফিল্টার" },
  { id: "none", label: "ফিল্টার ছাড়া" },
];

/** Warm faded film for the 80s; cooler, slightly hazy compact-camera look for the 90s. */
const PHOTO_FILTER_CSS: Record<PhotoFilter, string> = {
  none: "",
  "80s": "sepia(0.32) saturate(1.4) contrast(0.95) brightness(1.06) hue-rotate(-8deg)",
  "90s": "saturate(1.25) contrast(1.1) brightness(1.03) hue-rotate(6deg) sepia(0.12)",
};

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
  format = "square",
  photoUrl,
  photoFilter = "none",
}: {
  result: QuizResult;
  art: EraArt | null;
  quote: EraQuote | null;
  cardId?: string;
  dominantEra?: string;
  dominantEraLabel?: string;
  format?: CardFormat;
  photoUrl?: string | null;
  photoFilter?: PhotoFilter;
}) {
  const spec = CARD_FORMATS.find((f) => f.id === format) ?? CARD_FORMATS[1];
  const leadingEraId = result.eraProfile[0]?.era_id ?? dominantEra;
  const leadingEraLabel = result.eraProfile[0]?.label_bn ?? dominantEraLabel;
  const credit = art ? `“${art.title}” · ${art.artist} · ${art.license}` : null;

  return (
    <div
      id={cardId}
      role="img"
      aria-label={`ছেলেবেলা স্কোর কার্ড: ${toBnPct(result.overallScore)}, ${result.label.title_bn}`}
      className="relative flex flex-col overflow-hidden rounded-[1.4rem] border-[3px] border-ink bg-paper-card shadow-hard-lg"
      style={{ width: spec.width, height: spec.height }}
    >
      <div className="rickshaw-stripe h-2 w-full shrink-0" aria-hidden="true" />

      {format === "feed" && (
        <FeedBody
          result={result}
          art={art}
          photoUrl={photoUrl}
          photoFilter={photoFilter}
          leadingEraLabel={leadingEraLabel}
          credit={credit}
        />
      )}
      {format === "square" && (
        <SquareBody
          result={result}
          art={art}
          photoUrl={photoUrl}
          photoFilter={photoFilter}
          leadingEraId={leadingEraId}
          leadingEraLabel={leadingEraLabel}
          credit={credit}
        />
      )}
      {format === "portrait" && (
        <PortraitBody
          result={result}
          art={art}
          quote={quote}
          photoUrl={photoUrl}
          photoFilter={photoFilter}
          leadingEraId={leadingEraId}
          leadingEraLabel={leadingEraLabel}
          credit={credit}
        />
      )}
      {format === "story" && (
        <StoryBody
          result={result}
          art={art}
          quote={quote}
          photoUrl={photoUrl}
          photoFilter={photoFilter}
          leadingEraLabel={leadingEraLabel}
          credit={credit}
        />
      )}
    </div>
  );
}

/* ---------------- format bodies ---------------- */

function FeedBody({
  result,
  art,
  photoUrl,
  photoFilter,
  leadingEraLabel,
  credit,
}: {
  result: QuizResult;
  art: EraArt | null;
  photoUrl?: string | null;
  photoFilter: PhotoFilter;
  leadingEraLabel?: string;
  credit: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 gap-3 p-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <CardHeader compact />
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="font-display text-[44px] font-extrabold leading-[1.05] text-brand">
            {toBnPct(result.overallScore)}
          </p>
          <p className="max-w-[150px] text-right font-display text-sm font-bold leading-[1.35]">
            {result.label.title_bn}
          </p>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[10px] leading-[1.5] text-ink-soft">{result.label.sub_bn}</p>
        <div className="mt-2">
          <EraBarsPanel result={result} compact />
        </div>
        <CardFooter result={result} className="mt-auto" />
      </div>
      {photoUrl ? (
        <UserPhoto src={photoUrl} filter={photoFilter} badge={leadingEraLabel} className="min-h-0 w-[220px] shrink-0" />
      ) : art ? (
        <div className="flex w-[220px] shrink-0 flex-col">
          <EraImage art={art} badge={leadingEraLabel} creditOverlay={credit} className="min-h-0 flex-1" />
        </div>
      ) : null}
    </div>
  );
}

function SquareBody({
  result,
  art,
  photoUrl,
  photoFilter,
  leadingEraId,
  leadingEraLabel,
  credit,
}: {
  result: QuizResult;
  art: EraArt | null;
  photoUrl?: string | null;
  photoFilter: PhotoFilter;
  leadingEraId?: string;
  leadingEraLabel?: string;
  credit: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3.5">
      <CardHeader />
      <ImageBlock art={art} photoUrl={photoUrl} photoFilter={photoFilter} leadingEraLabel={leadingEraLabel} credit={credit} />
      <ScoreRow result={result} eraId={leadingEraId} />
      <EraBarsPanel result={result} />
      <CardFooter result={result} />
    </div>
  );
}

function PortraitBody({
  result,
  art,
  quote,
  photoUrl,
  photoFilter,
  leadingEraId,
  leadingEraLabel,
  credit,
}: {
  result: QuizResult;
  art: EraArt | null;
  quote: EraQuote | null;
  photoUrl?: string | null;
  photoFilter: PhotoFilter;
  leadingEraId?: string;
  leadingEraLabel?: string;
  credit: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
      <CardHeader />
      <ImageBlock art={art} photoUrl={photoUrl} photoFilter={photoFilter} leadingEraLabel={leadingEraLabel} credit={credit} />
      {quote && <QuoteBlock quote={quote} compact />}
      <ScoreRow result={result} eraId={leadingEraId} />
      <EraBarsPanel result={result} />
      <CardFooter result={result} />
    </div>
  );
}

function StoryBody({
  result,
  art,
  quote,
  photoUrl,
  photoFilter,
  leadingEraLabel,
  credit,
}: {
  result: QuizResult;
  art: EraArt | null;
  quote: EraQuote | null;
  photoUrl?: string | null;
  photoFilter: PhotoFilter;
  leadingEraLabel?: string;
  credit: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-5 text-center">
      <div className="flex items-center justify-center gap-2.5">
        <AlponaFlower size={26} petal="#B15853" center="#F9BB29" />
        <div>
          <p className="font-display text-2xl font-extrabold leading-[1.25] text-ink">ছেলেবেলা</p>
          <p className="text-[10px] font-semibold text-ink-soft">স্মৃতির ক্যাসেট · পিঠ ১</p>
        </div>
        <span className="rounded-md border-2 border-ink bg-rose px-2.5 py-1 font-display text-base font-extrabold text-paper shadow-hard-sm">
          স্কোর
        </span>
      </div>

      <p className="font-display text-[84px] font-extrabold leading-[1.05] text-brand">
        {toBnPct(result.overallScore)}
      </p>
      <div>
        <p className="font-display text-2xl font-extrabold leading-[1.35]">{result.label.title_bn}</p>
        <p className="mx-auto max-w-[430px] text-xs leading-[1.5] text-ink-soft">{result.label.sub_bn}</p>
      </div>

      <ImageBlock art={art} photoUrl={photoUrl} photoFilter={photoFilter} leadingEraLabel={leadingEraLabel} credit={credit} />

      {quote && <QuoteBlock quote={quote} />}
      <EraBarsPanel result={result} />

      <div className="rounded-xl border-2 border-ink bg-marigold px-4 py-2.5 shadow-hard-sm">
        <p className="font-display text-lg font-extrabold leading-[1.35]">তোমারটা কত? এক মিনিটেই বের করো</p>
        <p className="text-[10px] font-bold text-ink-soft">ছেলেবেলা স্কোর · মজার স্মৃতির কুইজ</p>
      </div>
    </div>
  );
}

/* ---------------- shared pieces ---------------- */

function CardHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-dashed border-ink/30 pb-1.5">
      <div>
        <p className={`font-display font-extrabold leading-[1.25] text-ink ${compact ? "text-lg" : "text-xl"}`}>ছেলেবেলা</p>
        <p className="text-[9px] font-semibold text-ink-soft">স্মৃতির ক্যাসেট · পিঠ ১</p>
      </div>
      <span
        className={`rounded-md border-2 border-ink bg-rose font-display font-extrabold text-paper shadow-hard-sm ${
          compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-base"
        }`}
      >
        স্কোর
      </span>
    </div>
  );
}

/**
 * Era artwork by default; a personal photo replaces it entirely (no license
 * caption then). Falls back to nothing when neither is available.
 */
function ImageBlock({
  art,
  photoUrl,
  photoFilter,
  leadingEraLabel,
  credit,
}: {
  art: EraArt | null;
  photoUrl?: string | null;
  photoFilter: PhotoFilter;
  leadingEraLabel?: string;
  credit: string | null;
}) {
  if (photoUrl) {
    return <UserPhoto src={photoUrl} filter={photoFilter} badge={leadingEraLabel} className="min-h-0 flex-1" />;
  }
  if (!art) return null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <EraImage art={art} badge={leadingEraLabel} className="min-h-0 flex-1" />
      <p className="shrink-0 truncate text-center text-[8px] leading-[1.4] text-ink-soft">
        {credit} · Wikimedia Commons
      </p>
    </div>
  );
}

/** Personal photo frame with a retro film filter and era badge. */
function UserPhoto({
  src,
  filter,
  badge,
  className = "",
}: {
  src: string;
  filter: PhotoFilter;
  badge?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border-[3px] border-ink bg-brand-deep ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL, not an optimized asset */}
      <img
        src={src}
        alt="নিজের ছবি"
        className="absolute inset-0 h-full w-full object-cover"
        style={filter === "none" ? undefined : { filter: PHOTO_FILTER_CSS[filter] }}
      />
      {filter !== "none" && <RetroOverlay kind={filter} />}
      {badge && (
        <span className="absolute left-1.5 top-1.5 rounded-full border border-paper/60 bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-paper">
          {badge}
        </span>
      )}
    </div>
  );
}

/** Period texture over the photo: warm glow + vignette (80s) or VHS scanlines + cool vignette (90s). */
function RetroOverlay({ kind }: { kind: "80s" | "90s" }) {
  const background =
    kind === "80s"
      ? [
          "radial-gradient(circle at 50% 40%, rgba(255,205,130,0.16), rgba(255,205,130,0) 62%)",
          "radial-gradient(circle, rgba(0,0,0,0) 58%, rgba(88,52,18,0.32) 100%)",
        ].join(", ")
      : [
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0) 1px 3px)",
          "linear-gradient(120deg, rgba(255,80,180,0.06), rgba(80,220,255,0.06))",
          "radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(20,40,90,0.28) 100%)",
        ].join(", ");
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background }} />;
}

function EraImage({
  art,
  badge,
  creditOverlay,
  className = "",
}: {
  art: EraArt;
  badge?: string;
  creditOverlay?: string | null;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border-[3px] border-ink bg-brand-deep ${className}`}>
      <Image
        src={art.src}
        alt={art.caption_bn}
        fill
        sizes="600px"
        className={`object-contain p-1.5 ${art.art_id.startsWith("80s-") ? "grayscale contrast-125" : ""}`}
      />
      {badge && (
        <span className="absolute left-1.5 top-1.5 rounded-full border border-paper/60 bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-paper">
          {badge}
        </span>
      )}
      {creditOverlay && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-ink/70 px-1.5 py-0.5 text-[8px] leading-[1.5] text-paper/90">
          {creditOverlay}
        </span>
      )}
    </div>
  );
}

function QuoteBlock({ quote, compact = false }: { quote: EraQuote; compact?: boolean }) {
  return (
    <blockquote className="shrink-0 rounded-xl border-2 border-dashed border-brick/60 bg-paper-soft px-3 py-1.5 text-center">
      <p className={`font-display font-bold leading-[1.4] text-brand ${compact ? "text-[11px]" : "text-sm"}`}>
        “{quote.text_bn}”
      </p>
      <p className="mt-0.5 text-[9px] leading-[1.35] text-ink-soft">
        {quote.attribution_bn} · {quoteKindLabel(quote.quote_type)}
      </p>
    </blockquote>
  );
}

function ScoreRow({ result, eraId }: { result: QuizResult; eraId?: string }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border-2 border-ink bg-paper-soft px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-ink-soft">তোমার স্মৃতি-স্কোর</p>
        <p className="font-display text-4xl font-extrabold leading-[1.15] text-brand">{toBnPct(result.overallScore)}</p>
      </div>
      <div className="flex max-w-[150px] flex-col items-end text-right">
        <AlponaFlower
          size={30}
          petal={eraId === "80s" ? "#543C22" : eraId === "90s" ? "#E1463E" : "#298265"}
          center="#F9BB29"
        />
        <p className="mt-1 font-display text-sm font-bold leading-[1.35]">{result.label.title_bn}</p>
      </div>
    </div>
  );
}

function EraBarsPanel({ result, compact = false }: { result: QuizResult; compact?: boolean }) {
  return (
    <div className={`shrink-0 rounded-xl border-2 border-ink bg-brand-deep ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}>
      <div className={compact ? "space-y-1" : "space-y-1.5"}>
        {result.eraProfile.slice(0, 3).map((era) => (
          <div key={era.era_id} className="flex items-center gap-1.5">
            <span className={`${compact ? "w-[64px] text-[9px]" : "w-24 text-xs"} shrink-0 font-semibold text-paper`}>
              {era.label_bn}
            </span>
            <span className={`${compact ? "h-1.5" : "h-2"} flex-1 overflow-hidden rounded-full bg-paper/20`}>
              <span
                className="block h-full rounded-full"
                style={{ width: `${era.share}%`, backgroundColor: ERA_COLORS[era.era_id] ?? "#F9BB29" }}
              />
            </span>
            <span className={`${compact ? "w-8 text-[9px]" : "w-9 text-xs"} text-right font-bold text-paper`}>
              {toBnPct(era.share)}
            </span>
          </div>
        ))}
        {result.eraProfile.length === 0 && (
          <p className="py-0.5 text-center text-[10px] text-paper/85">দশকের ছবি এখনো স্পষ্ট নয়</p>
        )}
      </div>
    </div>
  );
}

function CardFooter({ result, className = "" }: { result: QuizResult; className?: string }) {
  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t-2 border-dashed border-ink/30 pt-1.5 text-center text-[10px] font-semibold text-ink-soft ${className}`}
    >
      <span>কাঁচা {toBnPct(result.rawScore)}</span>
      <span aria-hidden="true">✿</span>
      <span>
        {toBn(result.experiencedCount)}/{toBn(result.totalItems)}টি পেরেছ
      </span>
      <span aria-hidden="true">✿</span>
      <span>ছেলেবেলা স্কোর</span>
    </div>
  );
}
