"use client";

/**
 * Result screen (FR-009–015, FR-013 explanation, FR-017 link). Reads the last
 * completed session (responses + askedIds + setId) from local storage and
 * recomputes deterministically over the ASKED items only (era-set sampling).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, Disc3, Info, Sparkles, Users } from "lucide-react";
import CassetteCard from "@/components/CassetteCard";
import AlponaFlower from "@/components/AlponaFlower";
import EraBars from "@/components/EraBars";
import CategoryBars from "@/components/CategoryBars";
import ShareActions from "@/components/ShareActions";
import Reveal from "@/components/Reveal";
import { CONTENT_REVIEW_NOTE, DEFAULT_DATASET } from "@/lib/data";
import { computeResult } from "@/lib/scoring";
import { getEraSet } from "@/lib/quiz";
import { randomEraArt, type EraArt } from "@/lib/era-art";
import { quizStorage } from "@/lib/storage";
import { toBn, toBnPct } from "@/lib/bn";
import type { Responses } from "@/lib/types";

export default function ResultPage() {
  const [mounted, setMounted] = useState(false);
  const [responses, setResponses] = useState<Responses | null>(null);
  const [askedIds, setAskedIds] = useState<string[] | undefined>(undefined);
  const [setId, setSetId] = useState<string | undefined>(undefined);
  const [pendingCompare, setPendingCompare] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [resultArt, setResultArt] = useState<EraArt | null>(null);

  useEffect(() => {
    const stored = quizStorage.loadResult();
    if (stored) {
      setResponses(stored.responses);
      setAskedIds(stored.askedIds);
      setSetId(stored.setId);
      const storedResult = computeResult(stored.responses, DEFAULT_DATASET, { askedItemIds: stored.askedIds });
      const leadingEra = storedResult.eraProfile[0]?.era_id ?? getEraSet(stored.setId)?.era;
      setResultArt(randomEraArt(leadingEra));
    }
    const pending = quizStorage.loadPendingCompare();
    if (pending) setPendingCompare(pending.payload);
    setMounted(true);
  }, []);

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
  const dominantEra = result.eraProfile[0]?.era_id ?? set?.era;
  const eraArt = resultArt;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      {/* pending compare banner */}
      {pendingCompare && (
        <Link
          href={`/compare#${pendingCompare}`}
          className="mb-5 flex items-center gap-3 rounded-xl border-2 border-ink bg-marigold p-4 shadow-hard-sm transition-transform hover:-translate-y-0.5"
        >
          <Users className="h-6 w-6 shrink-0" aria-hidden="true" />
          <p className="text-sm font-bold">
            তোমার ফলাফল প্রস্তুত! এখন বন্ধুর স্কোরের সঙ্গে তুলনা করো — <span className="underline">তুলনা দেখো</span>
          </p>
        </Link>
      )}

      {/* score hero */}
      <section className="rounded-2xl border-2 border-ink bg-paper-card p-6 text-center shadow-hard">
        {set && (
          <p className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${set.color}33` }}>
            <Disc3 className="h-3.5 w-3.5" aria-hidden="true" /> {set.label_bn} ক্যাসেট · {toBn(result.totalItems)}টি প্রশ্ন
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
            <div className="relative aspect-[16/9]">
              <Image
                src={eraArt.src}
                alt={eraArt.caption_bn}
                fill
                sizes="(max-width: 672px) 100vw, 640px"
                className={dominantEra === "80s" ? "object-cover grayscale contrast-125" : "object-cover"}
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
            {result.eraFallbackUsed ? " (দশকের তথ্য এখনো যাচাইধীন — ফলাফল আরও খুঁটিয়ে দেখা হবে।)" : ""}
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
        <section className="mt-8 flex flex-col items-center gap-5" aria-labelledby="share-heading">
          <h2 id="share-heading" className="font-display text-xl font-extrabold">
            ক্যাসেট কার্ড বানিয়ে শেয়ার করো
          </h2>
          <CassetteCard
            result={result}
            art={eraArt}
            dominantEra={dominantEra}
            dominantEraLabel={result.eraProfile[0]?.label_bn ?? set?.label_bn}
          />
          <div className="w-full max-w-md">
            <ShareActions result={result} responses={responses} cardId="result-card" getDataset={() => DEFAULT_DATASET} />
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
          <p>{CONTENT_REVIEW_NOTE}</p>
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
