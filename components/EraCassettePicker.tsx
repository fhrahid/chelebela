"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AlponaFlower from "@/components/AlponaFlower";
import CassetteArtwork from "@/components/CassetteArtwork";
import CategorySelect from "@/components/CategorySelect";
import { ITEMS } from "@/lib/data";
import { ALL_QUESTIONS_COUNT, COUNT_OPTIONS, DEFAULT_QUIZ_LENGTH, ERA_SETS, setPool } from "@/lib/quiz";
import { toBn } from "@/lib/bn";
import { useState } from "react";

const SHELL_COLORS: Record<string, string> = {
  "80s": "#C7C0AF",
  "90s": "#D4C5A5",
  "2000s": "#9CA49A",
  mix: "#D5B9A0",
};

const FLOWER_COLORS: Record<string, string> = {
  "80s": "#543C22",
  "90s": "#E1463E",
  "2000s": "#298265",
  mix: "#F35887",
};

/** Home-page cassette chooser: amount + era in one step, then straight to quiz. */
export default function EraCassettePicker() {
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUIZ_LENGTH);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  return (
    <div>
      <fieldset className="mx-auto max-w-xl rounded-2xl border-2 border-ink bg-paper-card p-4 shadow-hard-sm sm:p-5">
        <legend className="mx-auto px-2 font-display text-lg font-bold">কতগুলো স্মৃতি বাজাবে?</legend>
        <div className="flex flex-wrap justify-center gap-2">
          {COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={questionCount === count}
              onClick={() => setQuestionCount(count)}
              className={`min-h-11 min-w-14 rounded-xl border-2 border-ink px-3 py-2 font-display font-bold transition-transform active:scale-95 ${
                questionCount === count ? "bg-marigold shadow-hard-sm" : "bg-paper-soft"
              }`}
            >
              {count === ALL_QUESTIONS_COUNT ? "সব" : toBn(count)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-ink-soft">
          “সব” বাছলে বেছে নেওয়া ক্যাসেট ও বিষয়ের সব প্রশ্ন আসবে।
        </p>
      </fieldset>

      <div className="mt-5">
        <CategorySelect value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ERA_SETS.map((set) => {
          const poolCount = setPool(set.id, ITEMS, categoryId).length;
          const actualCount = questionCount === ALL_QUESTIONS_COUNT
            ? poolCount
            : Math.min(questionCount, poolCount);
          const categoryParam = categoryId ? `&category=${encodeURIComponent(categoryId)}` : "";
          const eraRange = set.era
            ? set.era === "80s" ? "১৯৮০–৮৯"
              : set.era === "90s" ? "১৯৯০–৯৯"
              : "২০০০–০৯"
            : "সব দশক";

          return (
            <Link
              key={set.id}
              href={`/quiz?set=${set.id}&count=${questionCount}${categoryParam}`}
              aria-disabled={poolCount === 0}
              tabIndex={poolCount === 0 ? -1 : undefined}
              className={`group block h-full rounded-2xl border-2 border-ink bg-paper-card p-3 shadow-hard-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-hard sm:p-4 ${poolCount === 0 ? "pointer-events-none opacity-50" : ""}`}
            >
              <div
                className="rounded-xl border-2 border-ink p-2.5"
                style={{ backgroundColor: `${set.color}22` }}
              >
                <div className="mb-1 flex items-center justify-between px-1">
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((dot) => (
                      <i key={dot} className="h-2 w-2 rounded-full border border-ink" style={{ backgroundColor: set.color }} />
                    ))}
                  </span>
                  <AlponaFlower size={23} petal={FLOWER_COLORS[set.id]} center="#F9BB29" />
                </div>
                <CassetteArtwork label={set.label_bn} accent={set.color} shell={SHELL_COLORS[set.id]} />
              </div>

              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-extrabold leading-[1.4]">{set.label_bn}</h3>
                  <p className="mt-0.5 text-xs text-ink-soft">{set.sub_bn}</p>
                </div>
                <span className="shrink-0 rounded-full border border-ink/30 bg-paper-soft px-2 py-0.5 text-[10px] font-bold">
                  {eraRange}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink/30 pt-2">
                <span className="text-xs font-semibold text-ink-soft">
                  {toBn(actualCount)}টি প্রশ্ন · পুল {toBn(poolCount)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-brand">
                  বাজাও <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
              <span className="sr-only">এই ক্যাসেট বেছে নিলে {toBn(actualCount)}টি প্রশ্নের কুইজ সরাসরি শুরু হবে</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
