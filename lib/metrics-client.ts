export type ClientMetricEvent =
  | { name: "page_view"; path: string; referrer?: string }
  | { name: "category_selected"; categoryId: string }
  | { name: "quiz_started"; era: string; categoryId?: string; questionCount: number }
  | { name: "quiz_abandoned"; era: string; categoryId?: string; answeredCount: number; durationSeconds: number }
  | { name: "result_card_downloaded" }
  | { name: "share_link_created" }
  | { name: "comparison_opened" }
  | { name: "comparison_viewed"; comparableCount: number };

let identityRequest: Promise<boolean> | null = null;

/** Establish the anonymous first-party cookies before emitting parallel events. */
export function prepareMetricsIdentity(): Promise<boolean> {
  if (typeof navigator !== "undefined" && ["1", "yes"].includes(navigator.doNotTrack ?? "")) {
    return Promise.resolve(false);
  }
  if (!identityRequest) {
    identityRequest = fetch("/api/metrics/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).then((response) => response.ok).catch(() => false).then((ready) => {
      if (!ready) identityRequest = null;
      return ready;
    });
  }
  return identityRequest;
}

/** Best-effort same-origin usage event. It never blocks quiz or share actions. */
export function trackMetric(event: ClientMetricEvent): void {
  if (typeof window === "undefined") return;
  void (async () => {
    if (!(await prepareMetricsIdentity())) return;
    await fetch("/api/metrics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  })().catch(() => {
    // Analytics is optional; the app must remain usable if it is unavailable.
  });
}
