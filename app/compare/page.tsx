"use client";

/**
 * Comparison view (FR-018/019/020): opens a friend's comparison link (#fragment
 * payload), validates it strictly, and — once the visitor has their own result —
 * shows shared memories and differences. No names, no identifiers (SRS §9.3).
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCheck, Heart, TriangleAlert, Users, X } from "lucide-react";
import { DEFAULT_DATASET } from "@/lib/data";
import { computeResult } from "@/lib/scoring";
import { decodeComparisonPayload } from "@/lib/codec";
import { quizStorage } from "@/lib/storage";
import { getEraSet } from "@/lib/quiz";
import { toBn, toBnPct } from "@/lib/bn";
import type { Responses } from "@/lib/types";

type ViewState =
  | { kind: "loading" }
  | { kind: "no-payload" }
  | { kind: "invalid"; reason: "malformed" | "version" | "item_list_changed" }
  | { kind: "need-own-quiz" }
  | { kind: "compare"; friend: Responses; mine: Responses; mineAsked?: string[]; mineSet?: string };

export default function ComparePage() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    const payload = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
    if (!payload) {
      setView({ kind: "no-payload" });
      return;
    }
    const decoded = decodeComparisonPayload(payload, DEFAULT_DATASET);
    if (!decoded.ok) {
      setView({ kind: "invalid", reason: decoded.reason });
      return;
    }
    const mine = quizStorage.loadResult();
    if (!mine) {
      // Visitor must complete their own quiz first (FR-018); remember the payload.
      quizStorage.savePendingCompare(payload);
      setView({ kind: "need-own-quiz" });
      return;
    }
    quizStorage.clearPendingCompare();
    setView({ kind: "compare", friend: decoded.responses, mine: mine.responses, mineAsked: mine.askedIds, mineSet: mine.setId });
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

      {view.kind === "need-own-quiz" && (
        <Card title="আগে তোমার স্কোর দরকার!">
          <p>
            বন্ধুর সঙ্গে তুলনা করতে হলে আগে তুমি নিজের কুইজটা দিও — শেষ করার সঙ্গে সঙ্গে তুলনাটা এখানেই দেখা যাবে।
            তোমার উত্তর শুধু তোমার ব্রাউজারেই থাকে।
          </p>
          <CTA href="/quiz" label="কুইজ দাও, তারপর তুলনা" />
        </Card>
      )}

      {view.kind === "compare" && <Comparison friend={view.friend} mine={view.mine} mineAsked={view.mineAsked} mineSet={view.mineSet} />}
    </div>
  );
}

function Comparison({ friend, mine, mineAsked, mineSet }: { friend: Responses; mine: Responses; mineAsked?: string[]; mineSet?: string }) {
  // Each session answers its own random sample: score over answered/asked items only.
  const friendResult = useMemo(
    () => computeResult(friend, DEFAULT_DATASET, { askedItemIds: Object.keys(friend) }),
    [friend]
  );
  const myResult = useMemo(
    () => computeResult(mine, DEFAULT_DATASET, { askedItemIds: mineAsked ?? Object.keys(mine) }),
    [mine, mineAsked]
  );
  const mySet = getEraSet(mineSet);

  // Only compare items both parties were actually asked (samples differ per session).
  const shared = DEFAULT_DATASET.items.filter(
    (i) => mine[i.item_id] === "experienced" && friend[i.item_id] === "experienced"
  );
  const bothAnswered = (id: string) => mine[id] !== undefined && friend[id] !== undefined;
  const onlyMine = DEFAULT_DATASET.items.filter(
    (i) => bothAnswered(i.item_id) && mine[i.item_id] === "experienced" && friend[i.item_id] !== "experienced"
  );
  const onlyFriend = DEFAULT_DATASET.items.filter(
    (i) => bothAnswered(i.item_id) && friend[i.item_id] === "experienced" && mine[i.item_id] !== "experienced"
  );

  return (
    <div>
      <section className="rounded-2xl border-2 border-ink bg-paper-card p-6 text-center shadow-hard">
        <p className="flex items-center justify-center gap-2 font-display text-lg font-extrabold text-brand">
          <Heart className="h-5 w-5 text-rose" aria-hidden="true" /> দুজন মিলে পেয়েছ {toBn(shared.length)}টি স্মৃতি
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-ink bg-paper-soft p-3">
            <p className="text-xs font-bold text-ink-soft">তুমি {mySet ? `· ${mySet.label_bn}` : ""}</p>
            <p className="font-display text-3xl font-extrabold text-brand">{toBnPct(myResult.overallScore)}</p>
            <p className="text-sm font-semibold">{myResult.label.title_bn}</p>
            <p className="mt-1 text-xs text-ink-soft">কাঁচা {toBnPct(myResult.rawScore)} · {toBn(myResult.answeredCount)}টি উত্তর</p>
          </div>
          <div className="rounded-xl border-2 border-ink bg-paper-soft p-3">
            <p className="text-xs font-bold text-ink-soft">বন্ধু</p>
            <p className="font-display text-3xl font-extrabold text-flame">{toBnPct(friendResult.overallScore)}</p>
            <p className="text-sm font-semibold">{friendResult.label.title_bn}</p>
            <p className="mt-1 text-xs text-ink-soft">কাঁচা {toBnPct(friendResult.rawScore)} · {toBn(friendResult.answeredCount)}টি উত্তর</p>
          </div>
        </div>
        {mySet && (
          <p className="mt-3 text-xs text-ink-soft">
            দুজনে ভিন্ন ভিন্ন এলোমেলো প্রশ্ন পেয়েছ — তাই তুলনায় শুধু দুজনেরই উত্তর দেওয়া স্মৃতিগুলোই আসে।
          </p>
        )}
      </section>

      <ListBlock
        title={`দুজনেই পেয়েছ (${toBn(shared.length)})`}
        icon={<CheckCheck className="h-5 w-5 text-leaf" aria-hidden="true" />}
        items={shared}
        emptyText="দুজনের মিল একদম শূন্য — এও এক রকম রেকর্ড!"
        tone="leaf"
      />
      <ListBlock
        title={`শুধু তুমি পেয়েছ (${toBn(onlyMine.length)})`}
        icon={<Users className="h-5 w-5 text-brand" aria-hidden="true" />}
        items={onlyMine.slice(0, 12)}
        moreCount={Math.max(0, onlyMine.length - 12)}
        emptyText="তুমি একা পাওয়ার মতো কিছু নেই — বন্ধু সবই পেয়েছ!"
        tone="brand"
      />
      <ListBlock
        title={`শুধু বন্ধু পেয়েছ (${toBn(onlyFriend.length)})`}
        icon={<X className="h-5 w-5 text-flame" aria-hidden="true" />}
        items={onlyFriend.slice(0, 12)}
        moreCount={Math.max(0, onlyFriend.length - 12)}
        emptyText="বন্ধু একা পাওয়ার মতো কিছু নেই — তুমি সবই পেয়েছ!"
        tone="flame"
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
      <h2 className="flex items-center gap-2 font-display text-base font-extrabold">
        {icon} {title}
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
