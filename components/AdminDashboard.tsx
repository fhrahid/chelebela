"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DEFAULT_DATASET } from "@/lib/data";

interface CountRow {
  label: string;
  count: number;
}

interface DashboardData {
  days: number;
  generatedAt: number;
  summary: Record<string, number>;
  timeline: Array<{
    day: string;
    pageViews: number;
    visitors: number;
    quizStarts: number;
    quizCompletions: number;
  }>;
  pages: CountRow[];
  sources: CountRow[];
  devices: CountRow[];
  browsers: CountRow[];
  operatingSystems: CountRow[];
  eras: CountRow[];
  categories: CountRow[];
  events: CountRow[];
  answers: CountRow[];
  topMemories: Array<{
    itemId: string;
    total: number;
    experienced: number;
    notExperienced: number;
    notApplicable: number;
  }>;
}

const ranges = [7, 30, 90] as const;

export default function AdminDashboard() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async (range = days) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/metrics?days=${range}`, { cache: "no-store" });
      if (response.status === 401) {
        setAuthenticated(false);
        setData(null);
        return;
      }
      if (response.status === 503) {
        setConfigured(false);
        setData(null);
        return;
      }
      if (!response.ok) throw new Error("Could not load metrics");
      const metrics = await response.json() as DashboardData;
      setConfigured(true);
      setAuthenticated(true);
      setData(metrics);
    } catch {
      setError("Metrics could not be loaded. Check the server and try again.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.status === 503) {
        setConfigured(false);
        return;
      }
      if (response.status === 429) {
        setError("Too many failed attempts. Wait five minutes and try again.");
        return;
      }
      if (!response.ok) {
        setError("Incorrect admin password.");
        return;
      }
      setPassword("");
      await refresh(days);
    } catch {
      setError("Login failed. Check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setAuthenticated(false);
    setData(null);
  }

  if (!configured) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Panel title="Admin access is not configured">
          <p>Set <code>ADMIN_PASSWORD</code> and a random <code>ADMIN_SESSION_SECRET</code> (at least 32 characters) in the server environment, then restart the app.</p>
          <p className="mt-3 text-sm text-ink-soft">No default password is provided. Metrics are collected only by this app and are not seeded with sample data.</p>
        </Panel>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <Panel title="Admin sign in">
          <form onSubmit={login} className="mt-4 space-y-3">
            <label htmlFor="admin-password" className="block text-sm font-bold">Admin password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="min-h-12 w-full rounded-xl border-2 border-ink bg-paper-card px-3"
            />
            {error && <p role="alert" className="text-sm font-semibold text-flame">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-xl border-2 border-ink bg-brand px-5 py-2 font-bold text-paper disabled:opacity-60"
            >
              {loading ? "Checking…" : "Sign in"}
            </button>
          </form>
        </Panel>
      </main>
    );
  }

  const summary = data?.summary ?? {};
  const memoryTitles = new Map(DEFAULT_DATASET.items.map((item) => [item.item_id, item.title_bn]));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Chhelebela Score · Admin</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">Usage metrics</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Observed browser activity · last {days} days · {data ? `updated ${new Date(data.generatedAt).toLocaleString()}` : "loading"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={days === range}
              onClick={() => {
                setDays(range);
                void refresh(range);
              }}
              className={`min-h-10 rounded-lg border-2 border-ink px-3 text-sm font-bold ${days === range ? "bg-marigold" : "bg-paper-card"}`}
            >
              {range} days
            </button>
          ))}
          <button type="button" onClick={() => void refresh()} className="min-h-10 rounded-lg border-2 border-ink bg-paper-card px-3 text-sm font-bold">
            Refresh
          </button>
          <button type="button" onClick={logout} className="min-h-10 rounded-lg border-2 border-ink bg-paper-soft px-3 text-sm font-bold">
            Sign out
          </button>
        </div>
      </header>

      <p className="mt-5 rounded-xl border border-ink/30 bg-paper-soft p-3 text-xs leading-relaxed text-ink-soft">
        These are real events received by this app, not seeded/sample numbers. “Unique visitors” means distinct anonymous first-party browser cookies—not verified individual humans. Cookies can be reset, shared, blocked, or used by bots that execute JavaScript. Known crawler user agents are excluded; no names, raw IP addresses, or full referrer URLs are stored. Raw usage events are retained for 90 days.
      </p>

      {error && <p role="alert" className="mt-4 text-sm font-semibold text-flame">{error}</p>}
      {loading && <p className="py-4 text-sm text-ink-soft">Loading metrics…</p>}
      {!loading && data && data.summary.trackedEventCount === 0 && (
        <p className="mt-4 rounded-xl border-2 border-dashed border-ink/40 p-4 text-sm text-ink-soft">
          No usage events have been recorded in this range yet. The figures will populate from real visits after tracking is deployed; no demo values are shown.
        </p>
      )}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Unique browsers" value={summary.uniqueBrowsers} />
        <Kpi label="Returning browsers" value={summary.returningBrowsers} />
        <Kpi label="Sessions" value={summary.sessions} />
        <Kpi label="Page views" value={summary.pageViews} />
        <Kpi label="Quiz starts" value={summary.quizStarts} />
        <Kpi label="Quiz completions" value={summary.quizCompletions} />
        <Kpi label="Completion rate" value={summary.quizCompletionRate} suffix="%" decimals={1} />
        <Kpi label="Abandoned quizzes" value={summary.quizAbandons} />
        <Kpi label="Abandon rate" value={summary.quizAbandonRate} suffix="%" decimals={1} />
        <Kpi label="Avg. pages / session" value={summary.averagePagesPerSession} decimals={1} />
        <Kpi label="Single-page sessions" value={summary.bounceRate} suffix="%" decimals={1} />
        <Kpi label="Avg. quiz duration" value={summary.averageQuizDurationSeconds} suffix=" sec" decimals={1} />
        <Kpi label="Avg. score" value={summary.averageScore} suffix="%" decimals={1} />
        <Kpi label="Avg. questions / quiz" value={summary.averageQuestionsPerQuiz} decimals={1} />
        <Kpi label="Answered questions" value={summary.answeredQuestionCount} />
        <Kpi label="Comparison links shared" value={summary.shares} />
        <Kpi label="Comparison views" value={summary.comparisonsViewed} />
        <Kpi label="Result-card download clicks" value={summary.cardDownloads} />
        <Kpi label="Comparison links opened" value={summary.comparisonsOpened} />
        <Kpi label="Comparison view rate" value={summary.comparisonViewRate} suffix="%" decimals={1} />
        <Kpi label="Avg. comparable memories" value={summary.averageComparableMemories} decimals={1} />
      </section>

      {data && (
        <>
          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <Timeline rows={data.timeline} />
            <Bars title="Traffic by page" rows={data.pages} />
            <Bars title="Traffic sources (referrer host only)" rows={data.sources} />
            <Bars title="Era / cassette selection" rows={data.eras} />
            <Bars title="Topic selection" rows={data.categories} />
            <Bars title="Answer distribution (completed sessions)" rows={data.answers} />
            <Bars title="Device type" rows={data.devices} />
            <Bars title="Browser" rows={data.browsers} />
            <Bars title="Operating system" rows={data.operatingSystems} />
            <Bars title="Observed events" rows={data.events} />
          </section>

          <section className="mt-8 rounded-2xl border-2 border-ink bg-paper-card p-4 shadow-hard-sm">
            <h2 className="font-display text-lg font-extrabold">Most frequently asked memories</h2>
            <p className="mt-1 text-xs text-ink-soft">Only anonymized daily aggregates are shown here; individual answers are not listed.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead><tr className="border-b border-ink/30 text-xs text-ink-soft">
                  <th className="p-2">Memory</th><th className="p-2">Asked</th><th className="p-2">Experienced</th><th className="p-2">Not experienced</th><th className="p-2">N/A</th>
                </tr></thead>
                <tbody>
                  {data.topMemories.map((memory) => (
                    <tr key={memory.itemId} className="border-b border-ink/10">
                      <td className="p-2">{memoryTitles.get(memory.itemId) ?? memory.itemId}</td>
                      <td className="p-2">{memory.total}</td><td className="p-2">{memory.experienced}</td>
                      <td className="p-2">{memory.notExperienced}</td><td className="p-2">{memory.notApplicable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.topMemories.length === 0 && <p className="p-3 text-sm text-ink-soft">No completed quizzes in this range yet.</p>}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Kpi({
  label,
  value,
  suffix = "",
  decimals = 0,
}: {
  label: string;
  value?: number;
  suffix?: string;
  decimals?: number;
}) {
  const formatted = typeof value === "number" && Number.isFinite(value) ? value.toFixed(decimals) : "—";
  return (
    <div className="rounded-xl border-2 border-ink bg-paper-card p-4 shadow-hard-sm">
      <p className="text-xs font-bold text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{formatted}{suffix}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-ink bg-paper-card p-6 shadow-hard">
      <h1 className="font-display text-2xl font-extrabold">{title}</h1>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Bars({ title, rows }: { title: string; rows: CountRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="rounded-2xl border-2 border-ink bg-paper-card p-4 shadow-hard-sm">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      {rows.length === 0 ? <p className="mt-3 text-sm text-ink-soft">No data yet.</p> : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className="truncate">{row.label}</span>
              <span className="font-mono text-xs">{row.count}</span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded bg-paper-soft">
                <span className="block h-full rounded bg-brand" style={{ width: `${Math.max(2, row.count / max * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Timeline({ rows }: { rows: DashboardData["timeline"] }) {
  const max = Math.max(1, ...rows.map((row) => row.pageViews));
  return (
    <section className="rounded-2xl border-2 border-ink bg-paper-card p-4 shadow-hard-sm">
      <h2 className="font-display text-lg font-extrabold">Daily activity</h2>
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {[...rows].reverse().map((row) => (
          <div key={row.day} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs">
            <time dateTime={row.day}>{row.day}</time>
            <span className="h-2 overflow-hidden rounded bg-paper-soft">
              <span className="block h-full bg-brand" style={{ width: `${Math.max(row.pageViews ? 2 : 0, row.pageViews / max * 100)}%` }} />
            </span>
            <span className="text-right text-ink-soft">{row.pageViews} views · {row.visitors} browsers · {row.quizCompletions} quizzes</span>
          </div>
        ))}
      </div>
    </section>
  );
}
