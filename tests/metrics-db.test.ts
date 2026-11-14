import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeAnalyticsDatabase,
  getAnalyticsDashboard,
  hasMetricsOptOut,
  parseMetricEvent,
  recordBrowserMetric,
  recordCompletedQuizMetric,
} from "../lib/metrics-db";

const visitor = "VVVVVVVVVVVVVVVVVVVVVV";
const session = "SSSSSSSSSSSSSSSSSSSSSS";
const headers = {
  host: "example.test",
  cookie: `cb_visitor=${visitor}; cb_analytics_session=${session}`,
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36",
};

beforeEach(() => {
  process.env.COMPARISON_DB_PATH = ":memory:";
});

afterEach(() => {
  closeAnalyticsDatabase();
  delete process.env.COMPARISON_DB_PATH;
});

describe("observed usage metrics", () => {
  it("starts empty rather than inventing demo traffic", () => {
    const metrics = getAnalyticsDashboard(30);
    expect(metrics.summary.uniqueBrowsers).toBe(0);
    expect(metrics.summary.pageViews).toBe(0);
    expect(metrics.summary.quizCompletions).toBe(0);
    expect(metrics.events).toEqual([]);
  });

  it("counts real recorded page and quiz events by anonymous browser/session", () => {
    const request = new Request("https://example.test/api/metrics/event", { headers });
    expect(recordBrowserMetric(request, {
      name: "page_view",
      path: "/",
      referrer: "https://search.example/results?query=private",
    }).recorded).toBe(true);
    recordBrowserMetric(request, { name: "page_view", path: "/quiz" });
    recordBrowserMetric(request, {
      name: "quiz_started",
      era: "90s",
      categoryId: "food",
      questionCount: 10,
    });
    recordBrowserMetric(request, {
      name: "comparison_viewed",
      comparableCount: 4,
    });

    const metrics = getAnalyticsDashboard(7);
    expect(metrics.summary.uniqueBrowsers).toBe(1);
    expect(metrics.summary.sessions).toBe(1);
    expect(metrics.summary.pageViews).toBe(2);
    expect(metrics.summary.quizStarts).toBe(1);
    expect(metrics.summary.comparisonsViewed).toBe(1);
    expect(metrics.summary.averageComparableMemories).toBe(4);
    expect(metrics.sources).toContainEqual({ label: "search.example", count: 1 });
    expect(metrics.pages.map((row) => row.label)).toContain("/");
  });

  it("aggregates completed quiz answers without storing a visitor-linked answer event", () => {
    const request = new Request("https://example.test/api/sessions", { headers });
    recordCompletedQuizMetric(request, {
      responses: { MEM_037: "experienced", MEM_128: "not_applicable" },
      askedIds: ["MEM_037", "MEM_128"],
      setId: "80s",
      categoryId: "food",
      expiresAt: Date.now() + 100_000,
    }, 73);

    const metrics = getAnalyticsDashboard(30);
    expect(metrics.summary.quizCompletions).toBe(1);
    expect(metrics.summary.averageScore).toBe(73);
    expect(metrics.answers).toContainEqual({ label: "experienced", count: 1 });
    expect(metrics.answers).toContainEqual({ label: "not_applicable", count: 1 });
    expect(metrics.topMemories).toContainEqual(expect.objectContaining({ itemId: "MEM_037", experienced: 1 }));
  });

  it("accepts only known page paths and the declared browser event types", () => {
    expect(parseMetricEvent({ name: "page_view", path: "/admin" })).toBeNull();
    expect(parseMetricEvent({ name: "page_view", path: "/compare/AAAAAAAAAAAAAAAAAAAAAA" })?.name).toBe("page_view");
    expect(parseMetricEvent({ name: "quiz_completed", score: 999 })).toBeNull();
  });

  it("respects the browser Do Not Track preference", () => {
    expect(hasMetricsOptOut(new Request("https://example.test", {
      headers: { dnt: "1" },
    }))).toBe(true);
    expect(hasMetricsOptOut(new Request("https://example.test"))).toBe(false);
  });
});
