import { quizStorage, type StoredResult } from "@/lib/storage";
import { prepareMetricsIdentity } from "@/lib/metrics-client";

/** Idempotently persist one completed browser session to the anonymous server store. */
export async function syncQuizSession(result: StoredResult): Promise<string | null> {
  if (!result.sessionId || !result.setId || !result.askedIds?.length) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  const optedOut = typeof navigator !== "undefined" && ["1", "yes"].includes(navigator.doNotTrack ?? "");
  try {
    await prepareMetricsIdentity();
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(optedOut ? { "X-Analytics-Opt-Out": "1" } : {}),
      },
      body: JSON.stringify({
        id: result.sessionId,
        responses: result.responses,
        askedIds: result.askedIds,
        setId: result.setId,
        ...(result.categoryId ? { categoryId: result.categoryId } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = await response.json() as { id?: string };
    if (body.id !== result.sessionId) return null;
    quizStorage.saveServerSessionId(result.sessionId, body.id);
    return body.id;
  } catch {
    // The complete session is still retained locally; result-page reloads retry.
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
