import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { DEFAULT_DATASET } from "@/lib/data";
import type { StoredQuizSession } from "@/lib/comparison-db";

const eraId = z.enum(["80s", "90s", "2000s", "mix"]);
const categoryIds = new Set(DEFAULT_DATASET.categories.map((category) => category.category_id));
const categoryId = z.string().max(40).refine((id) => id === "all" || categoryIds.has(id));

const metricEventSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("page_view"),
    path: z.string().min(1).max(240),
    referrer: z.string().max(1000).optional(),
  }).strict(),
  z.object({
    name: z.literal("category_selected"),
    categoryId,
  }).strict(),
  z.object({
    name: z.literal("quiz_started"),
    era: eraId,
    categoryId: categoryId.optional(),
    questionCount: z.number().int().min(1).max(250),
  }).strict(),
  z.object({
    name: z.literal("quiz_abandoned"),
    era: eraId,
    categoryId: categoryId.optional(),
    answeredCount: z.number().int().min(1).max(250),
    durationSeconds: z.number().int().min(0).max(14_400),
  }).strict(),
  z.object({ name: z.literal("result_card_downloaded") }).strict(),
  z.object({ name: z.literal("share_link_created") }).strict(),
  z.object({ name: z.literal("share_facebook") }).strict(),
  z.object({ name: z.literal("comparison_opened") }).strict(),
  z.object({
    name: z.literal("comparison_viewed"),
    comparableCount: z.number().int().min(0).max(250),
  }).strict(),
]);

export type MetricEvent = z.infer<typeof metricEventSchema>;

export function parseMetricEvent(value: unknown): MetricEvent | null {
  const parsed = metricEventSchema.safeParse(value);
  if (!parsed.success) return null;
  if (parsed.data.name === "page_view" && !normalizePath(parsed.data.path)) return null;
  return parsed.data;
}

export interface AnalyticsIdentity {
  visitorHash: string;
  sessionHash: string;
}

export interface AnalyticsCookies {
  visitorId: string;
  sessionId: string;
  setVisitor: boolean;
  setSession: boolean;
}

type ServerQuizCompletedEvent = {
  name: "quiz_completed";
  era: "80s" | "90s" | "2000s" | "mix";
  categoryId?: string;
  questionCount: number;
};
type StoredMetricEvent = MetricEvent | ServerQuizCompletedEvent;

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const VISITOR_COOKIE = "cb_visitor";
const SESSION_COOKIE = "cb_analytics_session";
const ANALYTICS_RETENTION_DAYS = 90;

let database: DatabaseSync | undefined;

function getDatabase(): DatabaseSync {
  if (database) return database;
  const defaultPath = process.env.NODE_ENV === "production"
    ? "/data/comparisons.sqlite"
    : resolve(process.cwd(), ".data", "comparisons.sqlite");
  const configuredPath = process.env.COMPARISON_DB_PATH || defaultPath;
  const dbPath = configuredPath === ":memory:" ? configuredPath : resolve(configuredPath);
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });

  database = new DatabaseSync(dbPath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at INTEGER NOT NULL,
      visitor_hash TEXT NOT NULL,
      session_hash TEXT NOT NULL,
      event_name TEXT NOT NULL,
      path TEXT NOT NULL,
      referrer_host TEXT,
      era TEXT,
      category TEXT,
      question_count INTEGER,
      duration_seconds INTEGER,
      score INTEGER,
      device TEXT NOT NULL,
      browser TEXT NOT NULL,
      operating_system TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS analytics_events_time_idx ON analytics_events(occurred_at);
    CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON analytics_events(visitor_hash, occurred_at);
    CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events(session_hash, occurred_at);
    CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON analytics_events(event_name, occurred_at);
    CREATE TABLE IF NOT EXISTS analytics_item_answers (
      day TEXT NOT NULL,
      item_id TEXT NOT NULL,
      answer TEXT NOT NULL,
      answer_count INTEGER NOT NULL,
      PRIMARY KEY (day, item_id, answer)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS analytics_item_answers_day_idx ON analytics_item_answers(day);
  `);
  return database;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookies = request.headers.get("cookie") ?? "";
  const pair = cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  const value = pair?.slice(name.length + 1);
  return value && TOKEN_PATTERN.test(value) ? value : undefined;
}

function newToken(): string {
  return randomBytes(16).toString("base64url");
}

export function getAnalyticsCookies(request: Request): AnalyticsCookies {
  const visitorId = cookieValue(request, VISITOR_COOKIE);
  const sessionId = cookieValue(request, SESSION_COOKIE);
  return {
    visitorId: visitorId ?? newToken(),
    sessionId: sessionId ?? newToken(),
    setVisitor: !visitorId,
    setSession: true, // sliding 30-minute session expiry
  };
}

export function analyticsIdentity(cookies: AnalyticsCookies): AnalyticsIdentity {
  return {
    visitorHash: sha256(cookies.visitorId),
    sessionHash: sha256(cookies.sessionId),
  };
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const requestHost = (forwardedHost || request.headers.get("host") || new URL(request.url).host).toLowerCase();
    return originHost === requestHost;
  } catch {
    return false;
  }
}

export function isLikelyBot(request: Request): boolean {
  const userAgent = request.headers.get("user-agent") ?? "";
  return /bot|crawler|spider|slurp|headless|preview|facebookexternalhit|whatsapp|twitterbot|linkedinbot/i.test(userAgent);
}

export function hasMetricsOptOut(request: Request): boolean {
  return request.headers.get("dnt") === "1" ||
    request.headers.get("sec-gpc") === "1" ||
    request.headers.get("x-analytics-opt-out") === "1";
}

function normalizePath(path: string): string | null {
  if (path === "/" || path === "/quiz" || path === "/result" || path === "/privacy") return path;
  if (path === "/compare" || /^\/compare\/[A-Za-z0-9_-]{22}$/.test(path)) return "/compare";
  return null;
}

function getReferrerHost(referrer: string | undefined, request: Request): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().slice(0, 180);
    const ownHost = (request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      request.headers.get("host") || "").split(":")[0].toLowerCase();
    return host && host !== ownHost ? host : null;
  } catch {
    return null;
  }
}

function userAgentDimensions(request: Request): { device: string; browser: string; operatingSystem: string } {
  const userAgent = request.headers.get("user-agent") ?? "";
  const device = /ipad|tablet/i.test(userAgent)
    ? "tablet"
    : /mobile|android|iphone|ipod/i.test(userAgent) ? "mobile" : "desktop";
  const browser = /edg\//i.test(userAgent) ? "Edge"
    : /opr\//i.test(userAgent) ? "Opera"
      : /firefox\//i.test(userAgent) ? "Firefox"
        : /chrome\//i.test(userAgent) ? "Chrome"
          : /safari\//i.test(userAgent) ? "Safari" : "Other";
  const operatingSystem = /android/i.test(userAgent) ? "Android"
    : /iphone|ipad|ipod/i.test(userAgent) ? "iOS"
      : /windows/i.test(userAgent) ? "Windows"
        : /macintosh|mac os/i.test(userAgent) ? "macOS"
          : /linux/i.test(userAgent) ? "Linux" : "Other";
  return { device, browser, operatingSystem };
}

function eventDimensions(event: StoredMetricEvent): {
  eventName: string;
  path: string;
  referrerHost: string | null;
  era: string | null;
  category: string | null;
  questionCount: number | null;
  durationSeconds: number | null;
  score: number | null;
} | null {
  if (event.name === "page_view") {
    const path = normalizePath(event.path);
    return path ? {
      eventName: event.name,
      path,
      referrerHost: null,
      era: null,
      category: null,
      questionCount: null,
      durationSeconds: null,
      score: null,
    } : null;
  }
  const dimensions = {
    eventName: event.name,
    path: event.name === "comparison_opened" || event.name === "comparison_viewed" ? "/compare"
      : event.name.startsWith("quiz_") ? "/quiz" : "/result",
    referrerHost: null,
    era: "era" in event ? event.era : null,
    category: "categoryId" in event ? event.categoryId ?? null : null,
    questionCount: "questionCount" in event ? event.questionCount
      : "answeredCount" in event ? event.answeredCount
        : "comparableCount" in event ? event.comparableCount
          : null,
    durationSeconds: "durationSeconds" in event ? event.durationSeconds : null,
    score: null,
  };
  return dimensions;
}

function insertEvent(
  db: DatabaseSync,
  identity: AnalyticsIdentity,
  request: Request,
  event: StoredMetricEvent,
  extra?: { questionCount?: number; durationSeconds?: number; score?: number },
): void {
  const dimensions = eventDimensions(event);
  if (!dimensions) return;
  const now = Date.now();
  const ua = userAgentDimensions(request);
  const referrer = event.name === "page_view" ? getReferrerHost(event.referrer, request) : null;
  db.prepare(`
    INSERT INTO analytics_events (
      occurred_at, visitor_hash, session_hash, event_name, path, referrer_host,
      era, category, question_count, duration_seconds, score,
      device, browser, operating_system
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    now,
    identity.visitorHash,
    identity.sessionHash,
    dimensions.eventName,
    dimensions.path,
    referrer,
    dimensions.era,
    dimensions.category,
    extra?.questionCount ?? dimensions.questionCount,
    extra?.durationSeconds ?? dimensions.durationSeconds,
    extra?.score ?? dimensions.score,
    ua.device,
    ua.browser,
    ua.operatingSystem,
  );
}

function pruneAnalytics(db: DatabaseSync, now: number): void {
  const cutoff = now - ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare("DELETE FROM analytics_events WHERE occurred_at < ?").run(cutoff);
  db.prepare("DELETE FROM analytics_item_answers WHERE day < ?").run(new Date(cutoff).toISOString().slice(0, 10));
}

export function recordBrowserMetric(
  request: Request,
  event: MetricEvent,
): { cookies: AnalyticsCookies; recorded: boolean } {
  const cookies = getAnalyticsCookies(request);
  if (isLikelyBot(request)) return { cookies, recorded: false };

  const db = getDatabase();
  const now = Date.now();
  pruneAnalytics(db, now);
  const identity = analyticsIdentity(cookies);
  const count = db.prepare(`
    SELECT COUNT(*) AS count FROM analytics_events
    WHERE session_hash = ? AND occurred_at > ?
  `).get(identity.sessionHash, now - 60_000) as { count: number };
  if (Number(count.count) >= 300) return { cookies, recorded: false };
  if (event.name === "quiz_started") {
    const duplicate = db.prepare(`
      SELECT 1 AS found FROM analytics_events
      WHERE session_hash = ? AND event_name = 'quiz_started'
        AND era = ? AND category IS ? AND occurred_at > ?
      LIMIT 1
    `).get(
      identity.sessionHash,
      event.era,
      event.categoryId ?? null,
      now - 2_000,
    );
    if (duplicate) return { cookies, recorded: false };
  }

  insertEvent(db, identity, request, event);
  return { cookies, recorded: true };
}

export function recordCompletedQuizMetric(
  request: Request,
  session: StoredQuizSession,
  score: number,
): AnalyticsCookies {
  const cookies = getAnalyticsCookies(request);
  const db = getDatabase();
  const now = Date.now();
  pruneAnalytics(db, now);
  const identity = analyticsIdentity(cookies);
  const start = db.prepare(`
    SELECT occurred_at FROM analytics_events
    WHERE session_hash = ? AND event_name = 'quiz_started' AND occurred_at <= ?
    ORDER BY occurred_at DESC LIMIT 1
  `).get(identity.sessionHash, now) as { occurred_at: number } | undefined;
  const durationSeconds = start
    ? Math.min(14_400, Math.max(0, Math.round((now - start.occurred_at) / 1000)))
    : undefined;

  insertEvent(db, identity, request, {
    name: "quiz_completed",
    era: session.setId,
    ...(session.categoryId ? { categoryId: session.categoryId } : {}),
    questionCount: session.askedIds.length,
  }, {
    questionCount: session.askedIds.length,
    durationSeconds,
    score: Math.max(0, Math.min(100, Math.round(score))),
  });

  const day = new Date(now).toISOString().slice(0, 10);
  const upsert = db.prepare(`
    INSERT INTO analytics_item_answers (day, item_id, answer, answer_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(day, item_id, answer)
    DO UPDATE SET answer_count = answer_count + 1
  `);
  for (const itemId of session.askedIds) {
    upsert.run(day, itemId, session.responses[itemId]);
  }
  return cookies;
}

function rows<T>(statement: ReturnType<DatabaseSync["prepare"]>, ...params: (string | number)[]): T[] {
  return statement.all(...params) as T[];
}

function one<T>(statement: ReturnType<DatabaseSync["prepare"]>, ...params: (string | number)[]): T {
  return statement.get(...params) as T;
}

export interface AnalyticsDashboardData {
  days: number;
  generatedAt: number;
  summary: Record<string, number>;
  timeline: Array<{ day: string; pageViews: number; visitors: number; quizStarts: number; quizCompletions: number }>;
  pages: Array<{ label: string; count: number }>;
  sources: Array<{ label: string; count: number }>;
  devices: Array<{ label: string; count: number }>;
  browsers: Array<{ label: string; count: number }>;
  operatingSystems: Array<{ label: string; count: number }>;
  eras: Array<{ label: string; count: number }>;
  categories: Array<{ label: string; count: number }>;
  events: Array<{ label: string; count: number }>;
  answers: Array<{ label: string; count: number }>;
  topMemories: Array<{ itemId: string; total: number; experienced: number; notExperienced: number; notApplicable: number }>;
}

export function getAnalyticsDashboard(days: number): AnalyticsDashboardData {
  const safeDays = Math.max(1, Math.min(90, Math.floor(days)));
  const db = getDatabase();
  const now = Date.now();
  pruneAnalytics(db, now);
  const start = now - safeDays * 24 * 60 * 60 * 1000;
  const timeRange = "occurred_at >= ?";

  const pageSummary = one<{
    pageViews: number;
    visitors: number;
    sessions: number;
    newVisitors: number;
    returningVisitors: number;
  }>(db.prepare(`
    SELECT
      COUNT(*) AS pageViews,
      COUNT(DISTINCT visitor_hash) AS visitors,
      COUNT(DISTINCT session_hash) AS sessions,
      COUNT(DISTINCT CASE WHEN first_seen >= ? THEN visitor_hash END) AS newVisitors,
      COUNT(DISTINCT CASE WHEN first_seen < ? THEN visitor_hash END) AS returningVisitors
    FROM (
      SELECT e.*, (
        SELECT MIN(first.occurred_at) FROM analytics_events first
        WHERE first.visitor_hash = e.visitor_hash AND first.event_name = 'page_view'
      ) AS first_seen
      FROM analytics_events e
      WHERE e.event_name = 'page_view' AND ${timeRange}
    )
  `), start, start, start);

  const eventCounts = rows<{ label: string; count: number }>(db.prepare(`
    SELECT event_name AS label, COUNT(*) AS count FROM analytics_events
    WHERE ${timeRange} GROUP BY event_name ORDER BY count DESC
  `), start);
  const countByEvent = new Map(eventCounts.map((row) => [row.label, Number(row.count)]));

  const pageViewsPerSession = one<{ average: number; bounces: number; sessions: number }>(db.prepare(`
    SELECT AVG(page_count) AS average,
      SUM(CASE WHEN page_count = 1 THEN 1 ELSE 0 END) AS bounces,
      COUNT(*) AS sessions
    FROM (
      SELECT session_hash, COUNT(*) AS page_count FROM analytics_events
      WHERE event_name = 'page_view' AND ${timeRange}
      GROUP BY session_hash
    )
  `), start);

  const quizStarts = countByEvent.get("quiz_started") ?? 0;
  const quizCompletions = countByEvent.get("quiz_completed") ?? 0;
  const quizAbandons = countByEvent.get("quiz_abandoned") ?? 0;
  const comparisonsOpened = countByEvent.get("comparison_opened") ?? 0;
  const comparisonsViewed = countByEvent.get("comparison_viewed") ?? 0;
  const summary = {
    pageViews: Number(pageSummary.pageViews ?? 0),
    uniqueBrowsers: Number(pageSummary.visitors ?? 0),
    sessions: Number(pageSummary.sessions ?? 0),
    newBrowsers: Number(pageSummary.newVisitors ?? 0),
    returningBrowsers: Number(pageSummary.returningVisitors ?? 0),
    averagePagesPerSession: Number(pageViewsPerSession.average ?? 0),
    bounceRate: Number(pageViewsPerSession.sessions)
      ? Number(pageViewsPerSession.bounces ?? 0) / Number(pageViewsPerSession.sessions) * 100
      : 0,
    quizStarts,
    quizCompletions,
    quizAbandons,
    quizCompletionRate: quizStarts ? quizCompletions / quizStarts * 100 : 0,
    quizAbandonRate: quizStarts ? quizAbandons / quizStarts * 100 : 0,
    comparisonViewRate: comparisonsOpened ? comparisonsViewed / comparisonsOpened * 100 : 0,
    averageComparableMemories: Number(one<{ value: number | null }>(db.prepare(`
      SELECT AVG(question_count) AS value FROM analytics_events
      WHERE event_name = 'comparison_viewed' AND ${timeRange}
    `), start).value ?? 0),
    averageScore: Number(one<{ value: number | null }>(db.prepare(`
      SELECT AVG(score) AS value FROM analytics_events
      WHERE event_name = 'quiz_completed' AND ${timeRange}
    `), start).value ?? 0),
    averageQuizDurationSeconds: Number(one<{ value: number | null }>(db.prepare(`
      SELECT AVG(duration_seconds) AS value FROM analytics_events
      WHERE event_name = 'quiz_completed' AND duration_seconds IS NOT NULL AND ${timeRange}
    `), start).value ?? 0),
    averageQuestionsPerQuiz: Number(one<{ value: number | null }>(db.prepare(`
      SELECT AVG(question_count) AS value FROM analytics_events
      WHERE event_name = 'quiz_completed' AND ${timeRange}
    `), start).value ?? 0),
    answeredQuestionCount: Number(one<{ value: number | null }>(db.prepare(`
      SELECT SUM(question_count) AS value FROM analytics_events
      WHERE event_name IN ('quiz_completed', 'quiz_abandoned') AND ${timeRange}
    `), start).value ?? 0),
    shares: (countByEvent.get("share_link_created") ?? 0) + (countByEvent.get("share_facebook") ?? 0),
    cardDownloads: countByEvent.get("result_card_downloaded") ?? 0,
    comparisonsOpened,
    comparisonsViewed,
    trackedEventCount: eventCounts.reduce((total, event) => total + Number(event.count), 0),
  };

  const dayRows = rows<{ day: string; pageViews: number; visitors: number; quizStarts: number; quizCompletions: number }>(db.prepare(`
    SELECT date(occurred_at / 1000, 'unixepoch') AS day,
      SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS pageViews,
      COUNT(DISTINCT CASE WHEN event_name = 'page_view' THEN visitor_hash END) AS visitors,
      SUM(CASE WHEN event_name = 'quiz_started' THEN 1 ELSE 0 END) AS quizStarts,
      SUM(CASE WHEN event_name = 'quiz_completed' THEN 1 ELSE 0 END) AS quizCompletions
    FROM analytics_events WHERE ${timeRange}
    GROUP BY day ORDER BY day
  `), start);
  const byDay = new Map(dayRows.map((row) => [row.day, row]));
  const timeline: AnalyticsDashboardData["timeline"] = [];
  for (let offset = safeDays - 1; offset >= 0; offset--) {
    const date = new Date(now - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const row = byDay.get(date);
    timeline.push({
      day: date,
      pageViews: Number(row?.pageViews ?? 0),
      visitors: Number(row?.visitors ?? 0),
      quizStarts: Number(row?.quizStarts ?? 0),
      quizCompletions: Number(row?.quizCompletions ?? 0),
    });
  }

  const groupMetric = (column: string, filter: string) =>
    rows<{ label: string; count: number }>(db.prepare(`
      SELECT COALESCE(${column}, 'unknown') AS label, COUNT(*) AS count
      FROM analytics_events WHERE ${filter} AND ${timeRange}
      GROUP BY label ORDER BY count DESC LIMIT 12
    `), start);
  const pages = groupMetric("path", "event_name = 'page_view'");
  const sources = rows<{ label: string; count: number }>(db.prepare(`
    SELECT COALESCE(referrer_host, 'direct / unknown') AS label, COUNT(*) AS count
    FROM analytics_events WHERE event_name = 'page_view' AND ${timeRange}
    GROUP BY label ORDER BY count DESC LIMIT 12
  `), start);
  const devices = groupMetric("device", "event_name = 'page_view'");
  const browsers = groupMetric("browser", "event_name = 'page_view'");
  const operatingSystems = groupMetric("operating_system", "event_name = 'page_view'");
  const eras = rows<{ label: string; count: number }>(db.prepare(`
    SELECT COALESCE(era, 'unknown') AS label, COUNT(*) AS count
    FROM analytics_events WHERE event_name = 'quiz_started' AND ${timeRange}
    GROUP BY label ORDER BY count DESC
  `), start);
  const categories = rows<{ label: string; count: number }>(db.prepare(`
    SELECT COALESCE(category, 'all') AS label, COUNT(*) AS count
    FROM analytics_events WHERE event_name = 'quiz_started' AND ${timeRange}
    GROUP BY label ORDER BY count DESC
  `), start);
  const answers = rows<{ label: string; count: number }>(db.prepare(`
    SELECT answer AS label, SUM(answer_count) AS count FROM analytics_item_answers
    WHERE day >= ? GROUP BY answer ORDER BY count DESC
  `), new Date(start).toISOString().slice(0, 10));
  const topMemories = rows<{
    itemId: string; total: number; experienced: number; notExperienced: number; notApplicable: number;
  }>(db.prepare(`
    SELECT item_id AS itemId,
      SUM(answer_count) AS total,
      SUM(CASE WHEN answer = 'experienced' THEN answer_count ELSE 0 END) AS experienced,
      SUM(CASE WHEN answer = 'not_experienced' THEN answer_count ELSE 0 END) AS notExperienced,
      SUM(CASE WHEN answer = 'not_applicable' THEN answer_count ELSE 0 END) AS notApplicable
    FROM analytics_item_answers WHERE day >= ?
    GROUP BY item_id ORDER BY total DESC LIMIT 15
  `), new Date(start).toISOString().slice(0, 10));

  return {
    days: safeDays,
    generatedAt: now,
    summary,
    timeline: timeline.map((row) => ({
      ...row,
      pageViews: Number(row.pageViews ?? 0),
      visitors: Number(row.visitors ?? 0),
      quizStarts: Number(row.quizStarts ?? 0),
      quizCompletions: Number(row.quizCompletions ?? 0),
    })),
    pages,
    sources,
    devices,
    browsers,
    operatingSystems,
    eras,
    categories,
    events: eventCounts,
    answers,
    topMemories,
  };
}

/** Close the process-local database handle for isolated tests. */
export function closeAnalyticsDatabase(): void {
  database?.close();
  database = undefined;
}
