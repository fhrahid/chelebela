"use client";

/**
 * Result screen (FR-009–015, FR-013 explanation, FR-017 link). Reads the last
 * completed session (responses + askedIds + setId) from local storage and
 * recomputes deterministically over the ASKED items only (era-set sampling).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Disc3, ImagePlus, Info, Sparkles, Users, X } from "lucide-react";
import CassetteCard, {
  CARD_FORMATS,
  PHOTO_FILTERS,
  type CardFormat,
  type PhotoFilter,
  type PhotoPosition,
} from "@/components/CassetteCard";
import AlponaFlower from "@/components/AlponaFlower";
import EraBars from "@/components/EraBars";
import CategoryBars from "@/components/CategoryBars";
import ShareActions from "@/components/ShareActions";
import Reveal from "@/components/Reveal";
import { DEFAULT_DATASET } from "@/lib/data";
import { computeResult } from "@/lib/scoring";
import { getEraSet } from "@/lib/quiz";
import { eraArtById, randomEraArt, type EraArt } from "@/lib/era-art";
import { eraQuoteById, randomEraQuote, quoteKindLabel, type EraQuote } from "@/lib/era-quotes";
import { quizStorage, type StoredResult } from "@/lib/storage";
import { syncQuizSession } from "@/lib/session-sync";
import { toBn, toBnPct } from "@/lib/bn";
import type { Responses } from "@/lib/types";

export default function ResultPage() {
  const [mounted, setMounted] = useState(false);
  const [responses, setResponses] = useState<Responses | null>(null);
  const [askedIds, setAskedIds] = useState<string[] | undefined>(undefined);
  const [setId, setSetId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [serverSessionId, setServerSessionId] = useState<string | undefined>(undefined);
  const [resultHistory, setResultHistory] = useState<StoredResult[]>([]);
  const [isHistorical, setIsHistorical] = useState(false);
  const [sessionSyncFailed, setSessionSyncFailed] = useState(false);
  const [sessionSyncAttempt, setSessionSyncAttempt] = useState(0);
  const [pendingCompare, setPendingCompare] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [resultArt, setResultArt] = useState<EraArt | null>(null);
  const [resultQuote, setResultQuote] = useState<EraQuote | null>(null);
  const [cardFormat, setCardFormat] = useState<CardFormat>("square");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("90s");
  const [photoPosition, setPhotoPosition] = useState<PhotoPosition>({ x: 50, y: 50 });
  const [photoError, setPhotoError] = useState<string | null>(null);

  const showStoredResult = useCallback((stored: StoredResult) => {
    setResponses(stored.responses);
    setAskedIds(stored.askedIds);
    setSetId(stored.setId);
    setCategoryId(stored.categoryId);
    setSessionId(stored.sessionId);
    setServerSessionId(stored.serverSessionId);
    setSessionSyncFailed(false);
    setIsHistorical(stored.sessionId !== quizStorage.loadResult()?.sessionId);

    const storedResult = computeResult(stored.responses, DEFAULT_DATASET, { askedItemIds: stored.askedIds });
    const leadingEra = storedResult.eraProfile[0]?.era_id ?? getEraSet(stored.setId)?.era;
    const chosenArt = eraArtById(stored.eraArtId) ?? randomEraArt(leadingEra);
    const chosenQuote = eraQuoteById(stored.eraQuoteId) ?? randomEraQuote(leadingEra);
    setResultArt(chosenArt);
    setResultQuote(chosenQuote);
    if (!stored.eraArtId && chosenArt && stored.sessionId) {
      quizStorage.saveResultArtId(chosenArt.art_id, stored.sessionId);
    }
    if (!stored.eraQuoteId && chosenQuote && stored.sessionId) {
      quizStorage.saveResultQuoteId(chosenQuote.quote_id, stored.sessionId);
    }
  }, []);

  useEffect(() => {
    const history = quizStorage.loadResultHistory();
    setResultHistory(history);
    const stored = quizStorage.loadResult();
    if (stored) showStoredResult(stored);
    const pending = quizStorage.loadPendingCompare();
    if (pending) setPendingCompare(pending.comparisonId);
    setMounted(true);
  }, [showStoredResult]);

  useEffect(() => {
    if (!sessionId || serverSessionId) return;
    const stored = quizStorage.loadResultBySessionId(sessionId);
    if (!stored || !stored.setId || !stored.askedIds?.length) return;
    let cancelled = false;
    void syncQuizSession(stored).then((savedId) => {
      if (!savedId) {
        if (!cancelled) setSessionSyncFailed(true);
        return;
      }
      setResultHistory(quizStorage.loadResultHistory());
      if (!cancelled) {
        setServerSessionId(savedId);
        setSessionSyncFailed(false);
      }
    });
    return () => { cancelled = true; };
  }, [sessionId, serverSessionId, sessionSyncAttempt]);

  const result = useMemo(
    () => (responses ? computeResult(responses, DEFAULT_DATASET, { askedItemIds: askedIds }) : null),
    [responses, askedIds]
  );

  // score count-up (respects reduced motion)
  const finalScore = result?.overallScore ?? 0;
  const rafRef = useRef(0);
  useEffect(() => {
    if (!result) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplayScore(finalScore);
      return;
    }
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * finalScore));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [result, finalScore]);

  if (!mounted) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-ink-soft">ফলাফল বের করা হচ্ছে…</div>;
  }

  if (!result || !responses) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border-2 border-ink bg-paper-card p-8 shadow-hard">
          <p className="font-display text-2xl font-extrabold">এখনো কোনো ফলাফল নেই!</p>
          <p className="mt-2 text-sm text-ink-soft">
            আগে একটা ক্যাসেট বাজিয়ে ফেলো — তারপর এখানে তোমার স্কোর, দশক আর ক্যাটাগরির ছবি দেখা যাবে।
          </p>
          <Link
            href="/quiz"
            className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-ink bg-flame px-6 py-3 font-display font-bold text-paper shadow-hard"
          >
            ক্যাসেট বাছাই করো <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const set = getEraSet(setId);
  const selectedCategory = DEFAULT_DATASET.categories.find((category) => category.category_id === categoryId);
  const dominantEra = result.eraProfile[0]?.era_id ?? set?.era;
  const eraArt = resultArt;
  const previousSessions = resultHistory.filter((session) => session.sessionId !== sessionId);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("এটা ছবি ফাইল নয় — একটা ছবি বেছে দাও।");
      return;
    }
    try {
      const dataUrl = await downscaleToDataUrl(file, 1200);
      setPhotoUrl(dataUrl);
      setPhotoFilter(result.eraProfile[0]?.era_id === "80s" ? "80s" : "90s");
      setPhotoPosition({ x: 50, y: 50 });
      setPhotoError(null);
    } catch {
      setPhotoError("ছবিটা পড়া গেল না — অন্য একটা ছবি দিয়ে চেষ্টা করো।");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      {/* pending compare banner */}
      {pendingCompare && !isHistorical && (
        <Link
          href={pendingCompare.startsWith("legacy:")
            ? `/compare#${pendingCompare.slice("legacy:".length)}`
            : `/compare/${pendingCompare}`}
          className="mb-5 flex items-center gap-3 rounded-xl border-2 border-ink bg-marigold p-4 shadow-hard-sm transition-transform hover:-translate-y-0.5"
        >
          <Users className="h-6 w-6 shrink-0" aria-hidden="true" />
          <p className="text-sm font-bold">
            তোমার ফলাফল প্রস্তুত! এখন বন্ধুর স্কোরের সঙ্গে তুলনা করো — <span className="underline">তুলনা দেখো</span>
          </p>
        </Link>
      )}

      {isHistorical && (
        <p className="mb-4 rounded-xl border-2 border-ink bg-marigold p-3 text-center text-sm font-bold">
          আগের সেশনের ফলাফল দেখছ
        </p>
      )}
      {sessionSyncFailed && (
        <p className="mb-4 rounded-xl border border-flame bg-paper-card p-3 text-center text-sm text-ink-soft">
          এই সেশনের উত্তর এই ডিভাইসে আছে, কিন্তু সার্ভারে সেভ হয়নি।
          <button
            type="button"
            onClick={() => setSessionSyncAttempt((attempt) => attempt + 1)}
            className="ml-2 font-bold text-brand underline underline-offset-2"
          >
            আবার চেষ্টা করো
          </button>
        </p>
      )}

      {previousSessions.length > 0 && (
        <details className="mb-5 rounded-2xl border-2 border-ink bg-paper-card p-4 shadow-hard-sm">
          <summary className="cursor-pointer font-display font-extrabold">
            আগের ফলাফলগুলো দেখো ({toBn(previousSessions.length)})
          </summary>
          <ul className="mt-3 space-y-2">
            {previousSessions.map((previous) => {
              const previousResult = computeResult(previous.responses, DEFAULT_DATASET, {
                askedItemIds: previous.askedIds,
              });
              const previousSet = getEraSet(previous.setId);
              const previousCategory = DEFAULT_DATASET.categories.find(
                (category) => category.category_id === previous.categoryId,
              );
              return (
                <li key={previous.sessionId}>
                  <button
                    type="button"
                    onClick={() => {
                      showStoredResult(previous);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-ink/30 bg-paper-soft px-3 py-2 text-left"
                  >
                    <span>
                      <span className="block text-sm font-bold">
                        {previousSet?.label_bn ?? "কুইজ"}
                        {previousCategory ? ` · ${previousCategory.name_bn}` : ""}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {new Date(previous.completedAt).toLocaleDateString("bn-BD")} · {toBn(previous.askedIds?.length ?? Object.keys(previous.responses).length)}টি প্রশ্ন
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-lg font-extrabold text-brand">
                      {toBnPct(previousResult.overallScore)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {/* score hero */}
      <section className="rounded-2xl border-2 border-ink bg-paper-card p-6 text-center shadow-hard">
        {set && (
          <p className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${set.color}33` }}>
            <Disc3 className="h-3.5 w-3.5" aria-hidden="true" /> {set.label_bn} ক্যাসেট
            {selectedCategory ? ` · ${selectedCategory.name_bn}` : ""} · {toBn(result.totalItems)}টি প্রশ্ন
          </p>
        )}
        <p className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-ink-soft">
          <AlponaFlower size={22} petal="#B15853" center="#F9BB29" />
          তোমার ছেলেবেলা স্কোর
          <AlponaFlower size={22} petal="#298265" center="#F9BB29" />
        </p>
        <p className="score-pop mt-2 font-display text-6xl font-extrabold leading-[1.2] text-brand sm:text-7xl" aria-label={`স্কোর ${toBnPct(finalScore)}`}>
          {toBnPct(displayScore)}
        </p>
        <h1 className="mt-3 font-display text-2xl font-extrabold">{result.label.title_bn}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-soft">{result.label.sub_bn}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold">
          <span className="rounded-full border-2 border-ink bg-paper-soft px-3 py-1">{toBn(result.experiencedCount)}টি পেরেছ</span>
          <span className="rounded-full border-2 border-ink bg-paper-soft px-3 py-1">{toBn(result.applicableCount)}টি প্রযোজ্য ছিল</span>
          <span className="rounded-full border-2 border-ink bg-paper-soft px-3 py-1">{toBn(result.notApplicableCount)}টি প্রযোজ্য নয়</span>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full border border-ink/30 bg-paper-soft px-3 py-1">
            কাঁচা হিসাব {toBnPct(result.rawScore)}
          </span>
          <span className="rounded-full border border-ink/30 bg-paper-soft px-3 py-1">
            উত্তর {toBn(result.answeredCount)}/{toBn(result.totalItems)}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          কম প্রশ্নে অনুমানটা বেশি সতর্ক; বেশি প্রশ্নে কাঁচা হিসাবের কাছাকাছি।
        </p>
      </section>

      {eraArt && (
        <Reveal>
          <figure className="mt-6 overflow-hidden rounded-2xl border-2 border-ink bg-paper-card shadow-hard-sm">
            <div className="relative aspect-[4/3] bg-brand-deep p-2 sm:aspect-[16/9]">
              <Image
                src={eraArt.src}
                alt={eraArt.caption_bn}
                fill
                sizes="(max-width: 672px) 100vw, 640px"
                className={dominantEra === "80s" ? "object-contain grayscale contrast-125" : "object-contain"}
                priority
              />
              <span className="absolute bottom-2 left-2 rounded-full border border-paper/60 bg-ink/75 px-3 py-1 text-xs font-bold text-paper">
                {result.eraProfile[0]?.label_bn ?? set?.label_bn}
              </span>
            </div>
            <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-ink-soft">
              <span>{eraArt.caption_bn}</span>
              <a href={eraArt.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                “{eraArt.title}” · {eraArt.artist} · {eraArt.license}
              </a>
            </figcaption>
          </figure>
        </Reveal>
      )}

      {resultQuote && (
        <Reveal>
          <figure className="mt-5 rounded-2xl border-2 border-ink bg-paper-card px-5 py-4 text-center shadow-hard-sm">
            <span className="font-display text-4xl font-extrabold leading-none text-brick" aria-hidden="true">“</span>
            <blockquote className="font-display text-lg font-bold leading-[1.55] text-brand sm:text-xl">
              {resultQuote.text_bn}
            </blockquote>
            <figcaption className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-ink-soft">
              <span>{resultQuote.attribution_bn}</span>
              <span aria-hidden="true">·</span>
              <span>{quoteKindLabel(resultQuote.quote_type)}</span>
              {resultQuote.source_url && (
                <a
                  href={resultQuote.source_url}
                  target={resultQuote.source_url.startsWith("http") ? "_blank" : undefined}
                  rel={resultQuote.source_url.startsWith("http") ? "noreferrer" : undefined}
                  className="underline underline-offset-2"
                >
                  সূত্র
                </a>
              )}
            </figcaption>
          </figure>
        </Reveal>
      )}

      {/* era profile */}
      <Reveal>
        <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm" aria-labelledby="era-heading">
          <h2 id="era-heading" className="flex items-center gap-2 font-display text-lg font-extrabold">
            <AlponaFlower size={25} petal="#B15853" center="#F9BB29" />
            <Sparkles className="h-5 w-5 text-brass" aria-hidden="true" /> দশকের ছবি
          </h2>
          <div className="mt-3">
            <EraBars profile={result.eraProfile} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            একাধিক দশকে থাকা স্মৃতির অবদান সমান ভাগে ভাগ করা হয়েছে—একটি স্মৃতি মোটে একবারই গোনা হয়।
          </p>
        </section>
      </Reveal>

      {/* category breakdown */}
      <Reveal>
        <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm" aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="flex items-center gap-2 font-display text-lg font-extrabold">
            <AlponaFlower size={25} petal="#298265" center="#F9BB29" />
            <BarChart3 className="h-5 w-5 text-brand" aria-hidden="true" /> ক্যাটাগরির হিসাব
          </h2>
          {result.strongestCategories.length > 0 && (
            <p className="mt-2 text-sm">
              সবচেয়ে শক্তিশালী:{" "}
              <strong className="font-display">{result.strongestCategories.map((c) => c.name_bn).join(", ")}</strong>
            </p>
          )}
          <div className="mt-3">
            <CategoryBars stats={result.categories} />
          </div>
        </section>
      </Reveal>

      {/* card preview + share */}
      <Reveal>
        <section className="mt-8 flex flex-col items-center gap-4" aria-labelledby="share-heading">
          <h2 id="share-heading" className="text-center font-display text-xl font-extrabold">
            ক্যাসেট কার্ড বানিয়ে শেয়ার করো
          </h2>
          <div className="flex max-w-md flex-wrap justify-center gap-2" role="radiogroup" aria-label="কার্ডের মাপ বেছে নাও">
            {CARD_FORMATS.map((formatSpec) => {
              const active = cardFormat === formatSpec.id;
              return (
                <button
                  key={formatSpec.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCardFormat(formatSpec.id)}
                  className={`min-h-11 rounded-xl border-2 border-ink px-3 py-1.5 text-center transition-transform active:scale-95 ${
                    active ? "bg-marigold shadow-hard-sm" : "bg-paper-card"
                  }`}
                >
                  <span className="block text-sm font-bold leading-tight">{formatSpec.label}</span>
                  <span className="block text-[10px] font-semibold text-ink-soft">{formatSpec.hint}</span>
                </button>
              );
            })}
          </div>
          {/* personal photo + retro filter */}
          <div className="flex w-full max-w-md flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-ink bg-paper-card px-3 py-2 text-sm font-bold shadow-hard-sm transition-transform active:scale-95">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {photoUrl ? "ছবি বদলাও" : "নিজের ছবি দাও"}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-ink/40 bg-paper-soft px-3 py-2 text-sm font-bold"
                >
                  <X className="h-4 w-4" aria-hidden="true" /> সরাও
                </button>
              )}
            </div>
            {photoUrl && (
              <>
                <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="ছবির ফিল্টার বেছে নাও">
                  {PHOTO_FILTERS.map((filterSpec) => {
                    const active = photoFilter === filterSpec.id;
                    return (
                      <button
                        key={filterSpec.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setPhotoFilter(filterSpec.id)}
                        className={`min-h-11 rounded-xl border-2 border-ink px-3 py-1.5 text-center text-sm font-bold transition-transform active:scale-95 ${
                          active ? "bg-marigold shadow-hard-sm" : "bg-paper-card"
                        }`}
                      >
                        {filterSpec.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-xs font-semibold text-ink-soft">
                    ছবির অবস্থান ঠিক করো — কার্ডে ছবিটা টেনে ধরেও সরানো যায়
                  </p>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border-2 border-ink/30 bg-paper-soft p-1.5">
                    {PHOTO_GRID.map(([gx, gy]) => {
                      const active = photoPosition.x === gx && photoPosition.y === gy;
                      return (
                        <button
                          key={`${gx}-${gy}`}
                          type="button"
                          aria-label={`ছবি ${gx === 0 ? "বাঁয়ে" : gx === 100 ? "ডানে" : "মাঝে"}, ${
                            gy === 0 ? "উপরে" : gy === 100 ? "নিচে" : "মাঝে"
                          }`}
                          aria-pressed={active}
                          onClick={() => setPhotoPosition({ x: gx, y: gy })}
                          className={`h-6 w-6 rounded-md border-2 transition-transform active:scale-90 ${
                            active ? "border-ink bg-brand" : "border-ink/30 bg-paper-card hover:bg-paper-soft"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {photoError && <p className="text-xs font-semibold text-brick">{photoError}</p>}
          </div>
          <ScaledCardPreview format={cardFormat}>
            <CassetteCard
              result={result}
              art={eraArt}
              quote={resultQuote}
              dominantEra={dominantEra}
              dominantEraLabel={result.eraProfile[0]?.label_bn ?? set?.label_bn}
              cardId="result-card"
              format={cardFormat}
              photoUrl={photoUrl}
              photoFilter={photoFilter}
              photoPosition={photoPosition}
              onPhotoPositionChange={setPhotoPosition}
            />
          </ScaledCardPreview>
          <div className="w-full max-w-md">
            <ShareActions
              result={result}
              responses={responses}
              askedIds={askedIds ?? Object.keys(responses)}
              sessionId={serverSessionId}
              cardId="result-card"
              downloadName={`chhelebela-score-${cardFormat}.png`}
            />
          </div>
        </section>
      </Reveal>

      {/* explanation */}
      <details className="mt-8 rounded-2xl border-2 border-dashed border-ink/50 bg-paper-soft p-5">
        <summary className="flex cursor-pointer items-center gap-2 font-display text-base font-bold">
          <Info className="h-5 w-5" aria-hidden="true" /> স্কোর কীভাবে হিসাব হলো?
        </summary>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
          <p>
            এই সেশনে তোমাকে {toBn(result.totalItems)}টি এলোমেলো স্মৃতি জিজ্ঞেস করা হয়েছিল{" "}
            {set ? `(${set.label_bn} ক্যাসেট থেকে)` : "(মিক্স টেপ থেকে)"}। কাঁচা হিসাব হলো পেরেছি ÷ প্রযোজ্য প্রশ্ন।
            ‘প্রযোজ্য নয়’ হিসাবের বাইরে থাকে।
          </p>
          <p>
            <strong>দেখানো স্কোর</strong> এই কাঁচা হিসাবের Wilson lower-bound অনুমান: কম প্রশ্নে ফলকে বেশি সতর্ক রাখা হয়,
            বেশি প্রশ্নের উত্তর দিলে অনিশ্চয়তা কমে এবং স্কোর কাঁচা হিসাবের কাছাকাছি আসে। তাই ১০/১০ এবং ১০০/১০০
            কাঁচা ফল দুটোই ১০০% দেখায় না। উত্তর দেওয়া প্রশ্নের সংখ্যা ও কাঁচা হিসাব দুটোই পাশে দেখানো আছে।
          </p>
          <p className="text-xs">
            উদাহরণ (সব উত্তর “পেরেছি” হলে): ১০/১০ ≈ ৭২%, ১০০/১০০ ≈ ৯৬%, আর ১৮০/১৮০ ≈ ৯৮% — ছোট নমুনা আর বড় নমুনা তাই আলাদা।
          </p>
          <p>
            <strong>দশকের ছবি</strong> তৈরি হয় তুমি যেসব স্মৃতি পেয়েছ তার era tag থেকে; একাধিক দশকে থাকলে অবদান ভাগ হয়,
            দ্বিগুণ হয় না। জন্মসাল এই হিসাবে কোনো ভূমিকা রাখে না — পরে জন্মালেও আগের দশকের স্মৃতি পেলে সেটাই গোনা হয়।
          </p>
        </div>
      </details>

      {/* replay */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={set ? `/quiz?set=${set.id}&count=${result.totalItems}` : "/quiz"}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-ink bg-brand px-5 py-2.5 text-sm font-bold text-paper shadow-hard-sm"
        >
          <RotateCwIcon /> আবার বাজাও (নতুন প্রশ্ন)
        </Link>
        <Link
          href="/quiz"
          className="min-h-11 rounded-xl border-2 border-ink bg-paper-card px-5 py-2.5 text-sm font-bold shadow-hard-sm"
        >
          অন্য ক্যাসেট
        </Link>
        <Link
          href="/privacy"
          className="min-h-11 rounded-xl border-2 border-ink bg-paper-card px-5 py-2.5 text-sm font-bold shadow-hard-sm"
        >
          গোপনীয়তা নীতি
        </Link>
      </div>
    </div>
  );
}

function RotateCwIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

/**
 * The card renders at fixed social-media pixel sizes; this wrapper scales the
 * preview down to the available width. Capture targets the unscaled card, so
 * downloads always keep the exact ratio resolution.
 */
function ScaledCardPreview({ format, children }: { format: CardFormat; children: React.ReactNode }) {
  const spec = CARD_FORMATS.find((f) => f.id === format) ?? CARD_FORMATS[1];
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / spec.width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [spec.width]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ maxWidth: spec.width, height: Math.round(spec.height * scale) }}
    >
      <div style={{ width: spec.width, height: spec.height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {children}
      </div>
    </div>
  );
}

/** 3×3 crop anchors (object-position %) for repositioning the personal photo. */
const PHOTO_GRID: Array<[number, number]> = [
  [0, 0], [50, 0], [100, 0],
  [0, 50], [50, 50], [100, 50],
  [0, 100], [50, 100], [100, 100],
];

/**
 * Loads a picked photo as a JPEG data URL capped at maxEdge on its longest
 * side (keeps the card light and reliably capturable by html-to-image).
 * Browsers apply EXIF orientation when decoding, so portrait phone shots
 * stay upright.
 */
async function downscaleToDataUrl(file: File, maxEdge: number): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = document.createElement("img");
    img.src = objectUrl;
    await img.decode();
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
