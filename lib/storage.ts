/**
 * Local quiz-session persistence. Each completed session is kept separately;
 * a new result updates the "latest" pointer without deleting prior sessions.
 * All loaded JSON is Zod-validated because localStorage is untrusted input.
 */
import { z } from "zod";
import type { Responses } from "./types";

const responseValue = z.enum(["experienced", "not_experienced", "not_applicable"]);
const itemId = z.string().regex(/^MEM_\d{3}$/);

const resultSchema = z.object({
  responses: z.record(responseValue),
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{22}$/).optional(),
  serverSessionId: z.string().regex(/^[A-Za-z0-9_-]{22}$/).optional(),
  askedIds: z.array(itemId).optional(),
  setId: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  questionCount: z.number().int().positive().optional(),
  eraArtId: z.string().min(1).optional(),
  eraQuoteId: z.string().min(1).optional(),
  completedAt: z.number(),
});

const seenSchema = z.record(z.array(itemId));
const resultHistorySchema = z.array(resultSchema);
const quizProgressSchema = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  setId: z.enum(["80s", "90s", "2000s", "mix"]),
  categoryId: z.string().min(1).optional(),
  itemIds: z.array(itemId).min(1).max(250),
  responses: z.record(responseValue),
  index: z.number().int().min(0).max(249),
  questionCount: z.union([z.literal(-1), z.number().int().min(1).max(250)]),
  startedAt: z.number().positive(),
  updatedAt: z.number().positive(),
}).strict().superRefine((progress, ctx) => {
  if (new Set(progress.itemIds).size !== progress.itemIds.length) {
    ctx.addIssue({ code: "custom", message: "itemIds must be unique", path: ["itemIds"] });
  }
  if (progress.index >= progress.itemIds.length) {
    ctx.addIssue({ code: "custom", message: "index is outside the quiz", path: ["index"] });
  }
  const asked = new Set(progress.itemIds);
  if (Object.keys(progress.responses).some((id) => !asked.has(id))) {
    ctx.addIssue({ code: "custom", message: "responses must be from this quiz", path: ["responses"] });
  }
});
const pendingCompareSchema = z.object({
  comparisonId: z.string().min(1).max(4096),
  savedAt: z.number(),
});
const legacyPendingCompareSchema = z.object({
  payload: z.string().min(1).max(4096),
  savedAt: z.number(),
});

const KEYS = {
  progress: "chhelebela:progress:v1", // old key, cleared for backwards compatibility
  quizProgress: "chhelebela:incomplete-quiz:v1",
  result: "chhelebela:result:v1",
  resultHistory: "chhelebela:results:v1",
  pendingCompare: "chhelebela:pending-compare:v1",
  seen: "chhelebela:seen:v1",
} as const;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private mode / storage disabled — degrade gracefully
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full or unavailable — progress just won't persist */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function createSessionId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      crypto.getRandomValues(bytes);
    } catch {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface StoredResult {
  responses: Responses;
  sessionId?: string;
  serverSessionId?: string;
  askedIds?: string[];
  setId?: string;
  categoryId?: string;
  questionCount?: number;
  eraArtId?: string;
  eraQuoteId?: string;
  completedAt: number;
}

export interface StoredPendingCompare {
  comparisonId: string;
  savedAt: number;
}

export interface StoredQuizProgress {
  sessionId: string;
  setId: "80s" | "90s" | "2000s" | "mix";
  categoryId?: string;
  itemIds: string[];
  responses: Responses;
  index: number;
  questionCount: number;
  startedAt: number;
  updatedAt: number;
}

export const quizStorage = {
  /** Legacy v2 progress is no longer used — purged on quiz entry. */
  clearProgress(): void {
    safeRemove(KEYS.progress);
  },
  createQuizSessionId(): string {
    return createSessionId();
  },
  loadQuizProgress(): StoredQuizProgress | null {
    const raw = safeGet(KEYS.quizProgress);
    if (!raw) return null;
    try {
      const parsed = quizProgressSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  saveQuizProgress(progress: Omit<StoredQuizProgress, "updatedAt">): void {
    const parsed = quizProgressSchema.safeParse({ ...progress, updatedAt: Date.now() });
    if (parsed.success) safeSet(KEYS.quizProgress, JSON.stringify(parsed.data));
  },
  clearQuizProgress(): void {
    safeRemove(KEYS.quizProgress);
  },

  loadResult(): StoredResult | null {
    const raw = safeGet(KEYS.result);
    if (!raw) return null;
    try {
      const parsed = resultSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return null;
      if (parsed.data.sessionId) return parsed.data;
      const upgraded = { ...parsed.data, sessionId: createSessionId() };
      safeSet(KEYS.result, JSON.stringify(upgraded));
      return upgraded;
    } catch {
      return null;
    }
  },
  loadResultHistory(): StoredResult[] {
    const raw = safeGet(KEYS.resultHistory);
    let history: StoredResult[] = [];
    let legacyHistory: StoredResult[] = [];
    if (raw) {
      try {
        const parsed = resultHistorySchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          legacyHistory = parsed.data;
          history = parsed.data.map((result) => ({
            ...result,
            sessionId: result.sessionId ?? createSessionId(),
          }));
        }
      } catch {
        history = [];
      }
    }

    const latest = this.loadResult();
    if (latest) {
      const existingIndex = history.findIndex((result, index) =>
        result.sessionId === latest.sessionId ||
        (!legacyHistory[index]?.sessionId &&
          result.completedAt === latest.completedAt &&
          result.setId === latest.setId &&
          JSON.stringify(result.responses) === JSON.stringify(latest.responses))
      );
      if (existingIndex < 0) history.unshift(latest);
      else history[existingIndex] = latest;
    }

    const unique = [...new Map(history.map((result) => [result.sessionId, result])).values()]
      .sort((a, b) => b.completedAt - a.completedAt);
    safeSet(KEYS.resultHistory, JSON.stringify(unique));
    return unique;
  },
  loadResultBySessionId(sessionId: string): StoredResult | null {
    return this.loadResultHistory().find((result) => result.sessionId === sessionId) ?? null;
  },
  saveResult(
    responses: Responses,
    askedIds: string[],
    setId: string,
    eraArtId?: string,
    eraQuoteId?: string,
    categoryId?: string,
    sessionId?: string,
  ): StoredResult {
    const previous = this.loadResultHistory();
    const existing = sessionId
      ? previous.find((saved) => saved.sessionId === sessionId)
      : undefined;
    if (existing &&
      JSON.stringify(existing.responses) === JSON.stringify(responses) &&
      JSON.stringify(existing.askedIds) === JSON.stringify(askedIds) &&
      existing.setId === setId &&
      existing.categoryId === categoryId) {
      safeSet(KEYS.result, JSON.stringify(existing));
      return existing;
    }
    const resultSessionId = existing ? createSessionId() : sessionId ?? createSessionId();
    const result: StoredResult = {
      responses,
      sessionId: resultSessionId,
      askedIds,
      setId,
      ...(categoryId ? { categoryId } : {}),
      questionCount: askedIds.length,
      ...(eraArtId ? { eraArtId } : {}),
      ...(eraQuoteId ? { eraQuoteId } : {}),
      completedAt: Date.now(),
    };
    const history = [result, ...previous];
    safeSet(KEYS.result, JSON.stringify(result));
    safeSet(KEYS.resultHistory, JSON.stringify(history));
    return result;
  },
  saveResultArtId(eraArtId: string, sessionId?: string): void {
    const result = sessionId ? this.loadResultBySessionId(sessionId) : this.loadResult();
    if (result?.sessionId) updateStoredResult(result.sessionId, { eraArtId });
  },
  saveResultQuoteId(eraQuoteId: string, sessionId?: string): void {
    const result = sessionId ? this.loadResultBySessionId(sessionId) : this.loadResult();
    if (result?.sessionId) updateStoredResult(result.sessionId, { eraQuoteId });
  },
  saveServerSessionId(sessionId: string, serverSessionId: string): void {
    if (!/^[A-Za-z0-9_-]{22}$/.test(serverSessionId)) return;
    updateStoredResult(sessionId, { serverSessionId });
  },
  clearResult(): void {
    safeRemove(KEYS.result);
  },

  loadPendingCompare(): StoredPendingCompare | null {
    const raw = safeGet(KEYS.pendingCompare);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      const parsed = pendingCompareSchema.safeParse(value);
      if (parsed.success) return parsed.data;
      // Migrate pending links saved by the old fragment-based comparison flow.
      const legacy = legacyPendingCompareSchema.safeParse(value);
      if (legacy.success) {
        return { comparisonId: `legacy:${legacy.data.payload}`, savedAt: legacy.data.savedAt };
      }
      return null;
    } catch {
      return null;
    }
  },
  savePendingCompare(comparisonId: string): void {
    safeSet(KEYS.pendingCompare, JSON.stringify({ comparisonId, savedAt: Date.now() }));
  },
  clearPendingCompare(): void {
    safeRemove(KEYS.pendingCompare);
  },

  loadSeenIds(): Record<string, string[]> {
    const raw = safeGet(KEYS.seen);
    if (!raw) return {};
    try {
      const parsed = seenSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : {};
    } catch {
      return {};
    }
  },
  addSeenIds(setId: string, ids: string[]): void {
    const seen = this.loadSeenIds();
    seen[setId] = [...new Set([...(seen[setId] ?? []), ...ids])];
    safeSet(KEYS.seen, JSON.stringify(seen));
  },
  clearSeenIds(): void {
    safeRemove(KEYS.seen);
  },
};

function updateStoredResult(sessionId: string, patch: Partial<StoredResult>): void {
  const history = quizStorage.loadResultHistory().map((result) =>
    result.sessionId === sessionId ? { ...result, ...patch } : result
  );
  safeSet(KEYS.resultHistory, JSON.stringify(history));

  const latest = quizStorage.loadResult();
  if (latest?.sessionId === sessionId) {
    safeSet(KEYS.result, JSON.stringify({ ...latest, ...patch }));
  }
}
