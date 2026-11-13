"use client";

/**
 * Quiz flow: choose an era cassette + question count, then get a fresh random
 * sample on every entry. Previously answered items are avoided until the set
 * pool is exhausted. The last answer submits automatically.
 *
 * SRS mapping: FR-004/005 (item + three-state answer), FR-006 (progress),
 * The old category-grouped long list is replaced by era sets; category
 * breakdown still appears in results.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, Home, X } from "lucide-react";
import AlponaFlower from "@/components/AlponaFlower";
import { CONTENT_REVIEW_NOTE, DEFAULT_DATASET, TOTAL_ITEMS } from "@/lib/data";
import { ALL_QUESTIONS_COUNT, answeredTooFast, COUNT_OPTIONS, DEFAULT_QUIZ_LENGTH, ERA_SETS, getEraSet, sampleQuiz, setPool } from "@/lib/quiz";
import { quizStorage } from "@/lib/storage";
import { toBn, toBnFraction } from "@/lib/bn";
import type { MemoryItem, ResponseValue, Responses } from "@/lib/types";

type Phase = "select" | "quiz";

export default function QuizPage() {
  return (
    <Suspense fallback={<p className="py-24 text-center text-ink-soft">ক্যাসেটের তাক সাজানো হচ্ছে…</p>}>
      <QuizFlow />
    </Suspense>
  );
}

function QuizFlow() {
  const router = useRouter();
  const search = useSearchParams();

  const [phase, setPhase] = useState<Phase>("select");
  const [setId, setSetId] = useState<string | null>(null);
  const [quizItems, setQuizItems] = useState<MemoryItem[]>([]);
  const [responses, setResponses] = useState<Responses>({});
  const [index, setIndex] = useState(0);
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUIZ_LENGTH);
  const [confirmExit, setConfirmExit] = useState(false);
  const [speedCheck, setSpeedCheck] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [pop, setPop] = useState(false);
  const submittingRef = useRef(false);
  const answerLockRef = useRef(false);
  const answerTimesRef = useRef<number[]>([]);

  const startSet = useCallback((id: string, count: number) => {
    const seen = [...new Set(Object.values(quizStorage.loadSeenIds()).flat())];
    const { items } = sampleQuiz(id, DEFAULT_DATASET.items, count, undefined, seen);
    setSetId(id);
    setQuizItems(items);
    setResponses({});
    setIndex(0);
    setQuestionCount(count);
    setPhase("quiz");
    submittingRef.current = false;
    answerLockRef.current = false;
    answerTimesRef.current = [];
    setSpeedCheck(false);
    setTransitioning(false);
    quizStorage.clearProgress();
    window.scrollTo({ top: 0 });
  }, []);

  // Honor set/count deep links, but never restore an old session. Each entry
  // creates a new random sample.
  useEffect(() => {
    quizStorage.clearProgress();
    const deepLink = getEraSet(search.get("set"));
    if (deepLink) {
      const countParam = Number(search.get("count"));
      const count = countParam === ALL_QUESTIONS_COUNT || (Number.isInteger(countParam) && countParam >= 1 && countParam <= TOTAL_ITEMS)
        ? countParam
        : DEFAULT_QUIZ_LENGTH;
      startSet(deepLink.id, count);
    }
    // Deliberately run once on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = getEraSet(setId);
  const answered = Object.keys(responses).length;
  const total = quizItems.length;
  const current = quizItems[index];

  const answer = useCallback(
    (value: ResponseValue) => {
      if (!current || !setId || submittingRef.current || answerLockRef.current) return;
      answerLockRef.current = true;
      setTransitioning(true);
      const isFirstAnswerForItem = responses[current.item_id] === undefined;
      const nextResponses = { ...responses, [current.item_id]: value };
      setResponses(nextResponses);
      quizStorage.addSeenIds(setId, [current.item_id]);
      setPop(true);
      setTimeout(() => setPop(false), 260);

      const allAnswered = quizItems.every((item) => nextResponses[item.item_id] !== undefined);
      if (allAnswered) {
        submittingRef.current = true;
        // Save the exact latest map; don't depend on React's async state flush.
        setTimeout(() => {
          quizStorage.saveResult(nextResponses, quizItems.map((item) => item.item_id), setId);
          quizStorage.addSeenIds(setId, Object.keys(nextResponses));
          quizStorage.clearProgress();
          router.push("/result");
        }, 320);
      } else {
        let promptToSlowDown = false;
        if (isFirstAnswerForItem) {
          const now = performance.now();
          answerTimesRef.current.push(now);
          if (answerTimesRef.current.length === 5) {
            promptToSlowDown = answeredTooFast(answerTimesRef.current);
            answerTimesRef.current = [];
          }
        }

        if (promptToSlowDown) {
          setSpeedCheck(true);
          return;
        }

        setTimeout(() => {
          setIndex((i) => Math.min(total - 1, i + 1));
          answerLockRef.current = false;
          setTransitioning(false);
        }, 260);
      }
    },
    [current, responses, setId, quizItems, total, router]
  );

  if (phase === "select") {
    return <SetSelect onPick={startSet} questionCount={questionCount} onCountChange={setQuestionCount} />;
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-4">
      {/* sticky progress header */}
      <header className="sticky top-0 z-30 -mx-4 border-b-2 border-ink bg-paper/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (answered > 0 ? setConfirmExit(true) : setPhase("select"))}
            disabled={transitioning}
            aria-label="ক্যাসেট বদলাও"
            className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-paper-card disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="text-center">
            <p className="font-display text-sm font-extrabold">
              {set?.label_bn} <span className="font-sans text-xs font-normal text-ink-soft">ক্যাসেট</span>
            </p>
            <p className="text-[11px] font-bold text-ink-soft">
              প্রশ্ন {toBn(index + 1)}/{toBn(total)}
            </p>
          </div>
          <Link
            href="/"
            aria-label="হোম পাতায় ফিরে যাও"
            className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-paper-card"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink/60 bg-ink/10"
          role="progressbar"
          aria-valuenow={answered}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${toBn(answered)} / ${toBn(total)} উত্তর দেওয়া হয়েছে`}
        >
          <div
            className="h-full rounded-full bg-leaf transition-[width] duration-300"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </header>

      {/* question card */}
      {current ? (
        <div key={current.item_id} className="card-enter mt-6">
          <QuestionCard item={current} selected={responses[current.item_id]} onAnswer={answer} pop={pop} disabled={transitioning} />
        </div>
      ) : null}

      {/* nav */}
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || transitioning}
          className="flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-ink bg-paper-card px-4 py-2 text-sm font-bold shadow-hard-sm disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> আগেরটা
        </button>
        <p className="text-xs font-semibold text-ink-soft">{toBn(TOTAL_ITEMS)}টি স্মৃতি থেকে {toBn(total)}টি</p>
        <p className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-ink-soft">
          উত্তর দিলে পরেরটা <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </p>
      </div>

      <p className="mt-8 rounded-xl border-2 border-dashed border-ink/40 bg-paper-soft p-3 text-xs leading-relaxed text-ink-soft">
        {CONTENT_REVIEW_NOTE}
      </p>

      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-label="ক্যাসেট বদলানো" className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-lg">
            <h2 className="font-display text-lg font-extrabold">ক্যাসেট বদলাবে?</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              এই সেশনের {toBnFraction(answered, total)} উত্তর মুছে যাবে। নতুন ক্যাসেট বাছলে নতুন এলোমেলো প্রশ্ন আসবে।
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="min-h-11 flex-1 rounded-xl border-2 border-ink bg-paper-card px-4 py-2 text-sm font-bold"
              >
                না, থাক
              </button>
              <button
                type="button"
                onClick={() => {
                  quizStorage.clearProgress();
                  setConfirmExit(false);
                  setPhase("select");
                  setResponses({});
                  setQuizItems([]);
                  setIndex(0);
                  submittingRef.current = false;
                }}
                className="min-h-11 flex-1 rounded-xl border-2 border-ink bg-flame px-4 py-2 text-sm font-bold text-paper shadow-hard-sm"
              >
                হ্যাঁ, বদলাও
              </button>
            </div>
          </div>
        </div>
      )}

      {speedCheck && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="speed-check-title"
            className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-lg"
          >
            <div className="flex items-center gap-3">
              <AlponaFlower size={34} petal="#E1463E" center="#F9BB29" />
              <h2 id="speed-check-title" className="font-display text-lg font-extrabold">
                একটু থেমে স্মৃতিটা মনে করি?
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              ঠিকমতো পড়ে উত্তর দিচ্ছ তো? পাঁচটা উত্তর খুব তাড়াতাড়ি হয়ে গেল—প্রতিটা স্মৃতি মনে করে উত্তর দিলে ফলটা আরও মজার হবে।
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setSpeedCheck(false);
                answerTimesRef.current = [];
                setIndex((i) => Math.min(total - 1, i + 1));
                answerLockRef.current = false;
                setTransitioning(false);
              }}
              className="mt-4 min-h-12 w-full rounded-xl border-2 border-ink bg-marigold px-5 py-3 font-display font-bold shadow-hard-sm"
            >
              হ্যাঁ, পড়ে উত্তর দিচ্ছি
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- cassette selection ---------------- */

function SetSelect({
  onPick,
  questionCount,
  onCountChange,
}: {
  onPick: (id: string, count: number) => void;
  questionCount: number;
  onCountChange: (count: number) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="text-center font-display text-3xl font-extrabold">কোন ক্যাসেটটা বাজাবে?</h1>
      <p className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-ink-soft">
        ক্যাসেট বেছে নাও, তারপর কতগুলো প্রশ্নের উত্তর দেবে ঠিক করো। প্রতিবার নতুন এলোমেলো স্মৃতি আসবে।
      </p>
      <fieldset className="mx-auto mt-5 max-w-md">
        <legend className="mb-2 w-full text-center font-display font-bold">কতগুলো প্রশ্ন খেলবে?</legend>
        <div className="flex flex-wrap justify-center gap-2">
          {COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              aria-pressed={questionCount === count}
              onClick={() => onCountChange(count)}
              className={`min-h-11 min-w-14 rounded-xl border-2 border-ink px-3 py-2 font-display font-bold transition-transform active:scale-95 ${
                questionCount === count ? "bg-marigold shadow-hard-sm" : "bg-paper-card"
              }`}
            >
              {count === ALL_QUESTIONS_COUNT ? "সব" : toBn(count)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-ink-soft">
          “সব” বাছলে নির্বাচিত ক্যাসেটের সব স্মৃতি আসবে। বেশি প্রশ্নে ফলের অনুমান আরও নির্ভরযোগ্য হয়।
        </p>
      </fieldset>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ERA_SETS.map((s) => {
          const count = setPool(s.id, DEFAULT_DATASET.items).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id, questionCount)}
              className="group rounded-2xl border-2 border-ink bg-paper-card p-4 text-left shadow-hard-sm transition-transform hover:-translate-y-1"
            >
              <div className="relative rounded-xl border-2 border-ink p-3" style={{ backgroundColor: `${s.color}22` }}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full border border-ink" style={{ backgroundColor: s.color }} />
                    <span className="h-2.5 w-2.5 rounded-full border border-ink" style={{ backgroundColor: s.color }} />
                  </div>
                  <span className="text-[10px] font-bold text-ink-soft">পিঠ ১</span>
                </div>
                <div className="mt-2 rounded-lg border-2 border-ink bg-brand-deep py-2 text-center">
                  <span className="font-display text-xl font-extrabold text-marigold">{s.label_bn}</span>
                </div>
                <div className="tape-ribbon mx-8 -mb-1 h-1.5 rounded-b-md" aria-hidden="true" />
              </div>
              <p className="mt-3 font-bold">{s.sub_bn}</p>
              <p className="text-xs text-ink-soft">{toBn(count)}টি স্মৃতির ভান্ডার</p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand group-hover:underline">
                বাজাও <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </p>
            </button>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-ink-soft">{CONTENT_REVIEW_NOTE}</p>
    </div>
  );
}

/* ---------------- one question ---------------- */

function QuestionCard({
  item,
  selected,
  onAnswer,
  pop,
  disabled,
}: {
  item: MemoryItem;
  selected: ResponseValue | undefined;
  onAnswer: (v: ResponseValue) => void;
  pop: boolean;
  disabled: boolean;
}) {
  const [openDesc, setOpenDesc] = useState(false);
  return (
    <article className="rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard sm:p-6">
      <div className="flex flex-col items-center gap-1">
        <AlponaFlower
          size={29}
          petal={item.era_tags.includes("80s") ? "#543C22" : item.era_tags.includes("90s") ? "#E1463E" : "#298265"}
          center="#F9BB29"
        />
        <p className="text-center text-[11px] font-bold text-ink-soft">মনে আছে?</p>
      </div>
      <h2 className="mt-3 text-center font-display text-2xl font-bold leading-[1.5] sm:text-[1.7rem]">{item.title_bn}</h2>
      {item.title_en && <p className="mt-1 text-center text-xs italic text-ink-soft/80">{item.title_en}</p>}

      {item.description_bn && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setOpenDesc((o) => !o)}
            aria-expanded={openDesc}
            className="inline-flex items-center gap-1 rounded-full border-2 border-ink/30 bg-paper-soft px-3 py-1 text-xs font-bold"
          >
            একটু বুঝিয়ে বলো <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDesc ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {openDesc && (
            <p className="mx-auto mt-2 max-w-md rounded-xl border-l-4 border-brass bg-paper-soft px-4 py-2 text-sm leading-relaxed text-ink-soft">
              {item.description_bn}
            </p>
          )}
        </div>
      )}

      <div className={`mt-6 grid gap-3 ${pop ? "answer-pop" : ""}`}>
        <AnswerButton
          value="experienced"
          selected={selected}
          onClick={onAnswer}
          label="পেরেছি!"
          hint="সত্যিই এটা আমার হয়েছে"
          icon={<span className="text-2xl" aria-hidden="true">✓</span>}
          classes="bg-leaf text-paper"
          disabled={disabled}
        />
        <AnswerButton
          value="not_experienced"
          selected={selected}
          onClick={onAnswer}
          label="পাইনি"
          hint="এটা আমার হয়নি"
          icon={<span className="text-2xl" aria-hidden="true">✕</span>}
          classes="bg-brick text-paper"
          disabled={disabled}
        />
        <AnswerButton
          value="not_applicable"
          selected={selected}
          onClick={onAnswer}
          label="প্রযোজ্য নয়"
          hint="আমার জীবনে আসার কথাই নয়"
          icon={<span className="text-2xl" aria-hidden="true">–</span>}
          classes="bg-tan text-ink"
          disabled={disabled}
        />
      </div>
    </article>
  );
}

function AnswerButton({
  value,
  selected,
  onClick,
  label,
  hint,
  icon,
  classes,
  disabled,
}: {
  value: ResponseValue;
  selected: ResponseValue | undefined;
  onClick: (v: ResponseValue) => void;
  label: string;
  hint: string;
  icon: React.ReactNode;
  classes: string;
  disabled: boolean;
}) {
  const active = selected === value;
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onClick(value)}
      className={`flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-75 ${
        active ? `${classes} border-ink shadow-hard-sm` : "border-ink/30 bg-paper-soft hover:border-ink/70"
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 ${active ? "border-ink bg-paper/20" : "border-ink/30"}`}>
        {icon}
      </span>
      <span>
        <span className="block font-display text-lg font-bold leading-[1.4]">{label}</span>
        <span className={`block text-xs ${active ? "opacity-90" : "text-ink-soft"}`}>{hint}</span>
      </span>
    </button>
  );
}
