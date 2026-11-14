/**
 * Local persistence (SRS §9.4). Everything stays in the browser:
 * nothing is sent to any server. All loaded JSON is Zod-validated because
 * localStorage is untrusted input (NFR-007 mindset) — corrupted data degrades
 * gracefully to "no saved state" instead of crashing the app.
 */
import { z } from "zod";
import type { Responses } from "./types";

const responseValue = z.enum(["experienced", "not_experienced", "not_applicable"]);
const itemId = z.string().regex(/^MEM_\d{3}$/);

const resultSchema = z.object({
  responses: z.record(responseValue),
  askedIds: z.array(itemId).optional(),
  setId: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  questionCount: z.number().int().positive().optional(),
  eraArtId: z.string().min(1).optional(),
  eraQuoteId: z.string().min(1).optional(),
  completedAt: z.number(),
});

const seenSchema = z.record(z.array(itemId));
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
  result: "chhelebela:result:v1",
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

export interface StoredResult {
  responses: Responses;
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

export const quizStorage = {
  /** Legacy v2 progress is no longer used — purged on quiz entry. */
  clearProgress(): void {
    safeRemove(KEYS.progress);
  },

  loadResult(): StoredResult | null {
    const raw = safeGet(KEYS.result);
    if (!raw) return null;
    try {
      const parsed = resultSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  },
  saveResult(
    responses: Responses,
    askedIds: string[],
    setId: string,
    eraArtId?: string,
    eraQuoteId?: string,
    categoryId?: string,
  ): void {
    safeSet(KEYS.result, JSON.stringify({
      responses,
      askedIds,
      setId,
      ...(categoryId ? { categoryId } : {}),
      questionCount: askedIds.length,
      ...(eraArtId ? { eraArtId } : {}),
      ...(eraQuoteId ? { eraQuoteId } : {}),
      completedAt: Date.now(),
    }));
  },
  saveResultArtId(eraArtId: string): void {
    const result = this.loadResult();
    if (!result) return;
    safeSet(KEYS.result, JSON.stringify({ ...result, eraArtId }));
  },
  saveResultQuoteId(eraQuoteId: string): void {
    const result = this.loadResult();
    if (!result) return;
    safeSet(KEYS.result, JSON.stringify({ ...result, eraQuoteId }));
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
