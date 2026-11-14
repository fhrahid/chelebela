"use client";

/**
 * Opens an anonymous, short-ID comparison link (or a legacy fragment link).
 * Only memories both people were asked about are compared.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCheck, Heart, TriangleAlert, Users, X } from "lucide-react";
import { DEFAULT_DATASET } from "@/lib/data";
import { computeResult } from "@/lib/scoring";
import { compareResponses } from "@/lib/comparison";
import { decodeComparisonPayload } from "@/lib/codec";
import { quizStorage } from "@/lib/storage";
import { getEraSet } from "@/lib/quiz";
import { toBn, toBnPct } from "@/lib/bn";
import type { Responses } from "@/lib/types";
import { trackMetric } from "@/lib/metrics-client";

type ViewState =
  | { kind: "loading" }
  | { kind: "no-payload" }
  | { kind: "invalid"; reason: "malformed" | "version" | "item_list_changed" }
  | { kind: "not-found" }
  | { kind: "server-error" }
  | { kind: "need-own-quiz" }
  | {
      kind: "compare";
      friend: Responses;
      friendAsked: string[];
      mine: Responses;
      mineAsked: string[];
      mineSet?: string;
    };

export default function ComparePage() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const pathId = pathParts[0] === "compare" ? pathParts[1] : undefined;
    const legacyPayload = window.location.hash.replace(/^#/, "").trim();

    async function loadComparison() {
      let friend: Responses;
      let friendAsked: string[];
      let pendingId: string;

      if (pathId) {
        try {
          const response = await fetch(`/api/comparisons/${encodeURIComponent(pathId)}`, { cache: "no-store" });
          if (response.status === 404) {
            if (!cancelled) setView({ kind: "not-found" });
            return;
          }
          if (!response.ok) {
            if (!cancelled) setView({ kind: "server-error" });
            return;
          }
          const stored = await response.json() as { responses: Responses; askedIds: string[] };
          trackMetric({ name: "comparison_opened" });
          friend = stored.responses;
          friendAsked = stored.askedIds;
          pendingId = pathId;
        } catch {
          if (!cancelled) setView({ kind: "server-error" });
          return;
        }
      } else if (legacyPayload) {
        const decoded = decodeComparisonPayload(legacyPayload, DEFAULT_DATASET);
        if (!decoded.ok) {
          if (!cancelled) setView({ kind: "invalid", reason: decoded.reason });
          return;
        }
        friend = decoded.responses;
        friendAsked = Object.keys(decoded.responses);
        trackMetric({ name: "comparison_opened" });
        pendingId = `legacy:${legacyPayload}`;
      } else {
        if (!cancelled) setView({ kind: "no-payload" });
        return;
      }

      const mine = quizStorage.loadResult();
      if (!mine) {
        // Complete a quiz first, then return to this anonymous comparison ID.
        quizStorage.savePendingCompare(pendingId);
        if (!cancelled) setView({ kind: "need-own-quiz" });
        return;
      }
      quizStorage.clearPendingCompare();
      if (!cancelled) {
        setView({
          kind: "compare",
          friend,
          friendAsked,
          mine: mine.responses,
          mineAsked: mine.askedIds ?? Object.keys(mine.responses),
          mineSet: mine.setId,
        });
      }
    }

    void loadComparison();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      {view.kind === "loading" && <p className="py-24 text-center text-ink-soft">তুলনা খোলা হচ্ছে…</p>}

      {view.kind === "no-payload" && (
        <Card title="তুলনার কিছু পাওয়া যায়নি">
          <p>এই পাতায় আসার জন্য একটা বৈধ তুলনা লিংক লাগবে — বন্ধুর ফলাফল পাতা থেকে ‘তুলনা লিংক কপি’ করে পাঠানো যায়।</p>
          <CTA href="/quiz" label="নিজের কুইজ দাও" />
        </Card>
      )}

      {view.kind === "invalid" && (
        <Card title="লিংকটা খুলছে না" tone="warn">
          {view.reason === "version" && <p>এই লিংকটা অ্যাপের পুরোনো সংস্করণের — বন্ধুকে নতুন লিংক পাঠাতে বলো।</p>}
          {view.reason === "item_list_changed" && (
            <p>লিংকটা বানানোর পর স্মৃতির তালিকা বদলে গেছে, তাই নিরাপদভাবে তুলনা করা যাচ্ছে না। বন্ধুকে নতুন লিংক পাঠাতে বলো।</p>
          )}
          {view.reason === "malformed" && <p>লিংকটা কোথাও কেটে-পড়ে গেছে বা ঠিকমতো কপি হয়নি। পুরো লিংকটা আবার কপি করে চেষ্টা করো।</p>}
          <CTA href="/quiz" label="নিজের কুইজ দাও" />
        </Card>
      )}

      {view.kind === "not-found" && (
        <Card title="তুলনা লিংকটি আর চালু নেই" tone="warn">
          <p>লিংকটি হয়তো ৩০ দিন পার হওয়ায় মুছে গেছে, অথবা ঠিকমতো কপি হয়নি। বন্ধুকে নতুন তুলনা লিংক পাঠাতে বলো।</p>
          <CTA href="/quiz" label="নিজের কুইজ দাও" />
        </Card>
      )}

      {view.kind === "server-error" && (
        <Card title="এখন তুলনাটি খোলা যাচ্ছে না" tone="warn">
          <p>সার্ভারে সাময়িক সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করো।</p>
        </Card>
      )}

      {view.kind === "need-own-quiz" && (
        <Card title="আগে তোমার কুইজ দরকার!">
          <p>
            বন্ধুর সঙ্গে তুলনা করতে হলে আগে তুমি নিজের কুইজটা দাও। শেষ হলে ফলাফলের পাতায় এই তুলনায় ফেরার লিংক পাবে।
            তোমার উত্তর তুলনা লিংক তৈরি না করা পর্যন্ত ব্রাউজারেই থাকে।
          </p>
          <CTA href="/quiz" label="কুইজ দাও, তারপর তুলনা" />
        </Card>
      )}

      {view.kind === "compare" && (
        <Comparison
          friend={view.friend}
          friendAsked={view.friendAsked}
          mine={view.mine}
          mineAsked={view.mineAsked}
          mineSet={view.mineSet}
        />
      )}
    </div>
  );
}

function Comparison({
  friend,
  friendAsked,
  mine,
  mineAsked,
  mineSet,
}: {
  friend: Responses;
  friendAsked: string[];
  mine: Responses;
  mineAsked: string[];
  mineSet?: string;
}) {
  // Each session can have a different random sample. First intersect the
  // explicit asked-ID lists, then exclude N/A from one-sided experience counts.
  const friendResult = useMemo(
    () => computeResult(friend, DEFAULT_DATASET, { askedItemIds: friendAsked }),
    [friend, friendAsked]
  );
  const myResult = useMemo(
    () => computeResult(mine, DEFAULT_DATASET, { askedItemIds: mineAsked }),
    [mine, mineAsked]
  );
  const mySet = getEraSet(mineSet);
  const comparison = useMemo(
    () => compareResponses(mine, mineAsked, friend, friendAsked, DEFAULT_DATASET),
    [mine, mineAsked, friend, friendAsked],
  );
  const comparisonViewed = useRef(false);
  useEffect(() => {
    if (comparisonViewed.current) return;
    comparisonViewed.current = true;
    trackMetric({ name: "comparison_viewed", comparableCount: comparison.comparableItems.length });
  }, [comparison.comparableItems.length]);

  return (
    <div>
      <section className="rounded-2xl border-2 border-ink bg-paper-card p-6 text-center shadow-hard">
        <p className="font-display text-lg font-extrabold text-brand">
          মিলিয়ে দেখা হয়েছে {toBn(comparison.comparableItems.length)}টি স্মৃতি
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          দুজনকেই জিজ্ঞেস করা হয়েছিল {toBn(comparison.overlappingItems.length)}টি একই স্মৃতি। “প্রযোজ্য নয়” উত্তর বাদ দিয়ে
          {` ${toBn(comparison.comparableItems.length)}টি`} স্মৃতির অভিজ্ঞতা তুলনা করা হয়েছে
          {comparison.excludedNotApplicable > 0
            ? `; ${toBn(comparison.excludedNotApplicable)}টি “প্রযোজ্য নয়” উত্তর বাদ গেছে।`
            : "।"}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-ink bg-paper-soft p-3">
            <p className="text-xs font-bold text-ink-soft">তোমার কুইজের স্কোর{mySet ? ` · ${mySet.label_bn}` : ""}</p>
            <p className="font-display text-3xl font-extrabold text-brand">{toBnPct(myResult.overallScore)}</p>
            <p className="text-sm font-semibold">{myResult.label.title_bn}</p>
            <p className="mt-1 text-xs text-ink-soft">নিজের {toBn(myResult.answeredCount)}টি উত্তরের ভিত্তিতে</p>
          </div>
          <div className="rounded-xl border-2 border-ink bg-paper-soft p-3">
            <p className="text-xs font-bold text-ink-soft">বন্ধুর কুইজের স্কোর</p>
            <p className="font-display text-3xl font-extrabold text-flame">{toBnPct(friendResult.overallScore)}</p>
            <p className="text-sm font-semibold">{friendResult.label.title_bn}</p>
            <p className="mt-1 text-xs text-ink-soft">নিজের {toBn(friendResult.answeredCount)}টি উত্তরের ভিত্তিতে</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          স্কোর দুজনের নিজ নিজ কুইজের নমুনা থেকে; নিচের স্মৃতির তালিকাগুলো শুধু একই প্রশ্নের উত্তর মিলিয়ে দেখায়।
        </p>
      </section>

      <ListBlock
        title={`দুজনেরই এই অভিজ্ঞতা হয়েছে (${toBn(comparison.shared.length)})`}
        icon={<Heart className="h-5 w-5 text-leaf" aria-hidden="true" />}
        items={comparison.shared}
        emptyText="একই প্রশ্নের উত্তরে, দুজনেরই এই অভিজ্ঞতা হয়েছে—এমন স্মৃতি নেই।"
        tone="leaf"
      />
      <ListBlock
        title={`তোমার অভিজ্ঞতা হয়েছে, বন্ধুর হয়নি (${toBn(comparison.onlyMine.length)})`}
        icon={<Users className="h-5 w-5 text-brand" aria-hidden="true" />}
        items={comparison.onlyMine.slice(0, 12)}
        moreCount={Math.max(0, comparison.onlyMine.length - 12)}
        emptyText="এমন কোনো একই প্রশ্ন নেই, যেখানে তোমার অভিজ্ঞতা হয়েছে কিন্তু বন্ধুর হয়নি।"
        tone="brand"
      />
      <ListBlock
        title={`বন্ধুর অভিজ্ঞতা হয়েছে, তোমার হয়নি (${toBn(comparison.onlyFriend.length)})`}
        icon={<X className="h-5 w-5 text-flame" aria-hidden="true" />}
        items={comparison.onlyFriend.slice(0, 12)}
        moreCount={Math.max(0, comparison.onlyFriend.length - 12)}
        emptyText="এমন কোনো একই প্রশ্ন নেই, যেখানে বন্ধুর অভিজ্ঞতা হয়েছে কিন্তু তোমার হয়নি।"
        tone="flame"
      />
      <ListBlock
        title={`দুজনের কারও এই অভিজ্ঞতা হয়নি (${toBn(comparison.neither.length)})`}
        icon={<CheckCheck className="h-5 w-5 text-ink-soft" aria-hidden="true" />}
        items={comparison.neither.slice(0, 12)}
        moreCount={Math.max(0, comparison.neither.length - 12)}
        emptyText="একই প্রশ্নের উত্তরে, দুজনের কারও হয়নি—এমন স্মৃতি নেই।"
        tone="leaf"
      />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/result"
          className="min-h-11 rounded-xl border-2 border-ink bg-paper-card px-5 py-2.5 text-sm font-bold shadow-hard-sm"
        >
          নিজের ফলাফল দেখো
        </Link>
        <Link
          href="/quiz"
          className="min-h-11 rounded-xl border-2 border-ink bg-flame px-5 py-2.5 text-sm font-bold text-paper shadow-hard-sm"
        >
          আরেকবার খেলো
        </Link>
      </div>
    </div>
  );
}

function ListBlock({
  title,
  icon,
  items,
  moreCount,
  emptyText,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ item_id: string; title_bn: string }>;
  moreCount?: number;
  emptyText: string;
  tone: "leaf" | "brand" | "flame";
}) {
  const toneClass =
    tone === "leaf" ? "border-leaf/50 bg-leaf/10" : tone === "brand" ? "border-brand/40 bg-brand/10" : "border-flame/40 bg-flame/10";
  return (
    <section className="mt-5 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
      <h2 className="flex min-w-0 items-start gap-2 font-display text-base font-extrabold leading-[1.4]">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <span className="min-w-0">{title}</span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{emptyText}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((i) => (
            <li key={i.item_id} className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
              {i.title_bn}
            </li>
          ))}
          {moreCount && moreCount > 0 ? (
            <li className="rounded-full border border-ink/30 bg-paper-soft px-3 py-1 text-xs font-semibold text-ink-soft">
              আরও {toBn(moreCount)}টি…
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

function Card({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="mt-8 rounded-2xl border-2 border-ink bg-paper-card p-6 text-center shadow-hard">
      {tone === "warn" && (
        <TriangleAlert className="mx-auto h-8 w-8 text-brass" aria-hidden="true" />
      )}
      <h1 className="mt-2 font-display text-2xl font-extrabold">{title}</h1>
      <div className="mx-auto mt-2 max-w-md space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

function CTA({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-ink bg-flame px-6 py-3 font-display font-bold text-paper shadow-hard transition-transform hover:-translate-y-0.5"
    >
      {label} <ArrowRight className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}
