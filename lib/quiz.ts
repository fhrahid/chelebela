/**
 * Era-set quiz model (2026-11-14 redesign).
 *
 * Rationale: a 180-item checklist is exhausting (quiz-fatigue). Each session now
 * samples a player-selected number of random items from one era set (or the "mix" tape = all
 * items). Membership rule: an item belongs to an era set when era_tags includes
 * that era — multi-era items are members of each tagged era set (matches how the
 * data models overlapping popularity; see FLG-DS-16 for the tagging caveat).
 *
 * Sampling is seeded-random so tests are deterministic; presentation order is
 * the sampled (shuffled) order, while the comparison codec always encodes in
 * global item_id order, so sampling never affects link compatibility.
 */
import type { MemoryItem } from "./types";

export const DEFAULT_QUIZ_LENGTH = 10;
export const ALL_QUESTIONS_COUNT = -1;

/** Question-count choices shown before starting a quiz. */
export const COUNT_OPTIONS = [5, 10, 15, 20, 30, 50, 80, ALL_QUESTIONS_COUNT] as const;

export interface EraSet {
  id: string;
  label_bn: string;
  sub_bn: string;
  /** undefined = mix (all items) */
  era?: string;
  color: string; // theme token value for the cassette card
}

export const ERA_SETS: EraSet[] = [
  { id: "80s", era: "80s", label_bn: "আশি দশক", sub_bn: "সেই সোনালি পুরনো জমানা", color: "var(--color-brass)" },
  { id: "90s", era: "90s", label_bn: "নব্বই দশক", sub_bn: "সবচেয়ে ডাকা জমানা", color: "var(--color-leaf)" },
  { id: "2000s", era: "2000s", label_bn: "দুই হাজার দশক", sub_bn: "নতুন শতকের ঝলক", color: "var(--color-flame)" },
  { id: "mix", label_bn: "মিক্স টেপ", sub_bn: "সব দশক মিলেমিশে এলোমেলো", color: "var(--color-rose)" },
];

export function getEraSet(setId: string | undefined | null): EraSet | null {
  if (!setId) return null;
  return ERA_SETS.find((s) => s.id === setId) ?? null;
}

/** Items eligible for a set (era membership; retired/draft-filterable later). */
export function setPool(setId: string, items: MemoryItem[]): MemoryItem[] {
  const set = getEraSet(setId);
  if (!set) return [];
  if (!set.era) return [...items];
  return items.filter((i) => i.era_tags.includes(set.era as string));
}

/** Deterministic PRNG (mulberry32) so sessions can be replayed in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random, unique sample of up to `count` items from the set pool. */
export function sampleQuiz(
  setId: string,
  items: MemoryItem[],
  count: number = DEFAULT_QUIZ_LENGTH,
  seed?: number,
  seenIds: string[] = []
): { items: MemoryItem[]; ids: string[] } {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const fullPool = setPool(setId, items);
  const seen = new Set(seenIds);
  // Avoid repeats from previous completed quizzes in this era set where
  // possible. Once the unseen pool is exhausted, refill from the full pool.
  const unseenPool = fullPool.filter((item) => !seen.has(item.item_id));
  const pool = unseenPool.length >= Math.min(count, fullPool.length)
    ? unseenPool
    : [...unseenPool, ...fullPool.filter((item) => seen.has(item.item_id))];
  // Fisher–Yates with the provided rng
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const requestedCount = count === ALL_QUESTIONS_COUNT ? pool.length : Math.max(0, count);
  const picked = pool.slice(0, requestedCount);
  return { items: picked, ids: picked.map((i) => i.item_id) };
}
