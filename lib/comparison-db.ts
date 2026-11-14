import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { DEFAULT_DATASET } from "@/lib/data";
import type { Responses } from "@/lib/types";

const itemIdSchema = z.string().regex(/^MEM_\d{3}$/);
const responsesSchema = z.record(z.enum(["experienced", "not_experienced", "not_applicable"]));
const maxQuestionCount = DEFAULT_DATASET.items.length;
const answerFields = {
  responses: responsesSchema,
  askedIds: z.array(itemIdSchema).min(1).max(maxQuestionCount),
};
function validateAnswerSet(
  { responses, askedIds }: { responses: Responses; askedIds: string[] },
  ctx: z.RefinementCtx,
) {
  if (new Set(askedIds).size !== askedIds.length) {
    ctx.addIssue({ code: "custom", message: "askedIds must be unique", path: ["askedIds"] });
  }
  const asked = new Set(askedIds);
  if (Object.keys(responses).length !== asked.size || Object.keys(responses).some((id) => !asked.has(id))) {
    ctx.addIssue({ code: "custom", message: "responses must match askedIds", path: ["responses"] });
  }
}
const comparisonInputSchema = z.object(answerFields).strict().superRefine(validateAnswerSet);

const comparisonTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);
const quizSessionInputSchema = z.object({
  ...answerFields,
  id: comparisonTokenSchema,
  setId: z.enum(["80s", "90s", "2000s", "mix"]),
  categoryId: z.string().min(1).optional(),
}).strict().superRefine(validateAnswerSet);
const knownCategoryIds = new Set(DEFAULT_DATASET.categories.map((category) => category.category_id));
const knownItemIds = new Set(DEFAULT_DATASET.items.map((item) => item.item_id));
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ACTIVE_RECORDS = 100_000;

export type ComparisonInput = {
  responses: Responses;
  askedIds: string[];
};

export type StoredComparison = ComparisonInput & {
  expiresAt: number;
};

export type StoredQuizSession = ComparisonInput & {
  setId: "80s" | "90s" | "2000s" | "mix";
  categoryId?: string;
  expiresAt: number;
};

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
    CREATE TABLE IF NOT EXISTS comparisons (
      token_hash TEXT PRIMARY KEY,
      responses_json TEXT NOT NULL,
      asked_ids_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS comparisons_expires_at_idx ON comparisons(expires_at);
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      token_hash TEXT PRIMARY KEY,
      responses_json TEXT NOT NULL,
      asked_ids_json TEXT NOT NULL,
      set_id TEXT NOT NULL,
      category_id TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS quiz_sessions_expires_at_idx ON quiz_sessions(expires_at);
  `);
  return database;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function pruneExpired(db: DatabaseSync, now: number): void {
  db.prepare("DELETE FROM comparisons WHERE expires_at <= ?").run(now);
  db.prepare("DELETE FROM quiz_sessions WHERE expires_at <= ?").run(now);
}

export function isValidComparisonToken(token: string): boolean {
  return comparisonTokenSchema.safeParse(token).success;
}

export function createComparison(value: unknown): { id: string; expiresAt: number } | null {
  const parsed = comparisonInputSchema.safeParse(value);
  if (!parsed.success) return null;
  if (parsed.data.askedIds.some((id) => !knownItemIds.has(id))) return null;

  const db = getDatabase();
  const now = Date.now();
  pruneExpired(db, now);
  const activeCount = db.prepare("SELECT COUNT(*) AS count FROM comparisons").get() as { count: number };
  if (Number(activeCount.count) >= MAX_ACTIVE_RECORDS) {
    throw new Error("Comparison store is full");
  }

  const expiresAt = now + RETENTION_MS;
  const insert = db.prepare(`
    INSERT INTO comparisons (token_hash, responses_json, asked_ids_json, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  // The 128-bit random token is only returned to the browser; SQLite stores its
  // SHA-256 hash so a database-only leak does not directly expose share links.
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = randomBytes(16).toString("base64url");
    try {
      insert.run(
        hashToken(id),
        JSON.stringify(parsed.data.responses),
        JSON.stringify(parsed.data.askedIds),
        now,
        expiresAt,
      );
      return { id, expiresAt };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  return null;
}

export function getComparison(token: string): StoredComparison | null {
  if (!isValidComparisonToken(token)) return null;

  const db = getDatabase();
  const now = Date.now();
  pruneExpired(db, now);
  const row = db.prepare(`
    SELECT responses_json, asked_ids_json, expires_at
    FROM comparisons
    WHERE token_hash = ? AND expires_at > ?
  `).get(hashToken(token), now) as {
    responses_json: string;
    asked_ids_json: string;
    expires_at: number;
  } | undefined;
  if (!row) {
    const session = getQuizSession(token);
    return session
      ? { responses: session.responses, askedIds: session.askedIds, expiresAt: session.expiresAt }
      : null;
  }

  try {
    const parsed = comparisonInputSchema.safeParse({
      responses: JSON.parse(row.responses_json),
      askedIds: JSON.parse(row.asked_ids_json),
    });
    if (!parsed.success) return null;
    return { ...parsed.data, expiresAt: row.expires_at };
  } catch {
    return null;
  }
}

/** Save one completed quiz as an immutable, anonymous session record. */
export function createQuizSession(value: unknown): { id: string; expiresAt: number; created: boolean } | null {
  const parsed = quizSessionInputSchema.safeParse(value);
  if (!parsed.success) return null;

  const { id, responses, askedIds, setId, categoryId } = parsed.data;
  if (askedIds.some((itemId) => !knownItemIds.has(itemId))) return null;
  if (categoryId && !knownCategoryIds.has(categoryId)) return null;

  const era = setId === "mix" ? undefined : setId;
  const eligibleIds = new Set(DEFAULT_DATASET.items
    .filter((item) => (!era || item.era_tags.includes(era)) && (!categoryId || item.category_id === categoryId))
    .map((item) => item.item_id));
  if (askedIds.some((itemId) => !eligibleIds.has(itemId))) return null;

  const db = getDatabase();
  const now = Date.now();
  pruneExpired(db, now);
  const tokenHash = hashToken(id);
  const prior = db.prepare(`
    SELECT responses_json, asked_ids_json, set_id, category_id, expires_at
    FROM quiz_sessions
    WHERE token_hash = ?
  `).get(tokenHash) as {
    responses_json: string;
    asked_ids_json: string;
    set_id: string;
    category_id: string | null;
    expires_at: number;
  } | undefined;

  if (prior) {
    // Idempotent retries are okay, but never replace a completed session.
    const sameSession =
      prior.responses_json === JSON.stringify(responses) &&
      prior.asked_ids_json === JSON.stringify(askedIds) &&
      prior.set_id === setId &&
      prior.category_id === (categoryId ?? null);
    return sameSession ? { id, expiresAt: prior.expires_at, created: false } : null;
  }

  const activeCount = db.prepare("SELECT COUNT(*) AS count FROM quiz_sessions").get() as { count: number };
  if (Number(activeCount.count) >= MAX_ACTIVE_RECORDS) throw new Error("Quiz session store is full");

  const expiresAt = now + RETENTION_MS;
  db.prepare(`
    INSERT INTO quiz_sessions
      (token_hash, responses_json, asked_ids_json, set_id, category_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    tokenHash,
    JSON.stringify(responses),
    JSON.stringify(askedIds),
    setId,
    categoryId ?? null,
    now,
    expiresAt,
  );
  return { id, expiresAt, created: true };
}

export function getQuizSession(token: string): StoredQuizSession | null {
  if (!isValidComparisonToken(token)) return null;

  const db = getDatabase();
  const now = Date.now();
  pruneExpired(db, now);
  const row = db.prepare(`
    SELECT responses_json, asked_ids_json, set_id, category_id, expires_at
    FROM quiz_sessions
    WHERE token_hash = ? AND expires_at > ?
  `).get(hashToken(token), now) as {
    responses_json: string;
    asked_ids_json: string;
    set_id: StoredQuizSession["setId"];
    category_id: string | null;
    expires_at: number;
  } | undefined;
  if (!row) return null;

  try {
    const parsed = quizSessionInputSchema.safeParse({
      id: token,
      responses: JSON.parse(row.responses_json),
      askedIds: JSON.parse(row.asked_ids_json),
      setId: row.set_id,
      ...(row.category_id ? { categoryId: row.category_id } : {}),
    });
    if (!parsed.success) return null;
    return {
      responses: parsed.data.responses,
      askedIds: parsed.data.askedIds,
      setId: parsed.data.setId,
      ...(parsed.data.categoryId ? { categoryId: parsed.data.categoryId } : {}),
      expiresAt: row.expires_at,
    };
  } catch {
    return null;
  }
}

/** Close the process-local handle; also useful for isolated database tests. */
export function closeComparisonDatabase(): void {
  database?.close();
  database = undefined;
}
