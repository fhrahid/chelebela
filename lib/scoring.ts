/**
 * Scoring engine — pure, deterministic functions (SRS FR-009/010/011, §6).
 *
 * Implemented rules (documented because the SRS leaves them as open decisions):
 *  - Overall score (OD-01): the displayed score is the Wilson lower bound of
 *    experienced ÷ applicable (see wilsonLowerBound) so that a 10-question run
 *    and a 60-question run cannot both read "100%" for the same experience.
 *    N/A items are excluded from the denominator; explicit not-experienced items
 *    remain in it; unanswered items are treated as "not_experienced".
 *    The raw percentage is also reported (rawScore) for transparency.
 *  - Era affinity (OD-05): multi-era items are split fractionally across their
 *    era tags, so each experienced item contributes exactly one total point
 *    (the other SRS-sanctioned option, avoiding double counting).
 *    Items with era_classification_eligible=false are normally excluded too —
 *    but the cleaned dataset marks ALL items ineligible (FLG-DS-02), so a
 *    documented fallback computes affinity from all tagged items anyway and
 *    sets eraFallbackUsed=true; the result UI shows an "under review" note.
 *  - Weights (OD-06): equal (all items carry weight 1.0 per SRS §6.4).
 *  - Labels (OD-07): non-shaming draft labels in lib/labels.ts, never from birth year.
 *
 * SCORING_VERSION is bumped whenever these rules change, so results and
 * comparison payloads can be interpreted correctly later.
 */
import type { Category, CategoryStat, Dataset, EraShare, QuizResult, Responses } from "./types";
import { resultLabelForProfile } from "./labels";

export const SCORING_VERSION = "0.3.0-draft";

/**
 * Fairness model (product decision 2026-11-14): two users who both score
 * 100% raw — one on 10 questions, one on the whole pool — must NOT get the
 * same result. The displayed score is therefore the Wilson lower bound of the
 * raw proportion at 95% confidence: small samples are pulled conservatively
 * toward uncertainty, and the penalty shrinks as more questions are answered.
 *
 *   raw = experienced / applicable
 *   fair = (raw + z²/2n − z·√(raw(1−raw)/n + z²/4n²)) / (1 + z²/n),  z = 1.96
 *
 * Examples: ০/১০ → ০% · ১০/১০ → ৭২% · ৩০/৩০ → ৮৯% · ৬০/৬০ → ৯৪%
 * The raw percentage and the answered counts are shown alongside it.
 */
const Z = 1.96;

export function wilsonLowerBound(experienced: number, applicable: number): number {
  if (applicable <= 0) return 0;
  const n = applicable;
  const p = experienced / n;
  const z2 = Z * Z;
  const denom = 1 + z2 / n;
  const centre = p + z2 / (2 * n);
  const spread = Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return Math.max(0, Math.min(1, (centre - spread) / denom));
}

export interface ComputeOptions {
  /**
   * Restrict scoring to the items actually asked in this session (era-set quiz
   * samples a subset). Items outside the list are excluded from every count.
   * Undefined = score over the whole dataset (legacy behaviour).
   */
  askedItemIds?: string[];
}

export function computeResult(responses: Responses, dataset: Dataset, options: ComputeOptions = {}): QuizResult {
  const { categories, eras, dataset_version } = dataset;
  const askedSet = options.askedItemIds ? new Set(options.askedItemIds) : null;
  const items = askedSet ? dataset.items.filter((i) => askedSet.has(i.item_id)) : dataset.items;

  let experiencedCount = 0;
  let notExperiencedCount = 0;
  let notApplicableCount = 0;
  let answeredCount = 0;

  for (const item of items) {
    const answer = responses[item.item_id];
    if (answer === undefined) {
      // Unanswered → treated as not experienced (see header note; UI confirms first).
      notExperiencedCount++;
      continue;
    }
    answeredCount++;
    if (answer === "experienced") experiencedCount++;
    else if (answer === "not_experienced") notExperiencedCount++;
    else notApplicableCount++;
  }

  const applicableCount = experiencedCount + notExperiencedCount;
  // Raw percentage (experienced ÷ applicable) and the fairness-adjusted score.
  const rawScore = applicableCount > 0 ? Math.round((experiencedCount / applicableCount) * 100) : 0;
  const overallScore = Math.round(wilsonLowerBound(experiencedCount, applicableCount) * 100);

  // ---- era affinity ----
  const eraLabel = (eraId: string): string =>
    eras.find((e) => e.era_id === eraId)?.label_bn ?? eraId;

  const experiencedItems = items.filter((i) => responses[i.item_id] === "experienced");

  const datasetHasEligibleItems = items.some((i) => i.era_classification_eligible);
  const eraFallbackUsed = !datasetHasEligibleItems && experiencedItems.length > 0;
  const pool = datasetHasEligibleItems
    ? experiencedItems.filter((i) => i.era_classification_eligible)
    : eraFallbackUsed ? experiencedItems : [];

  const eraCounts = new Map<string, number>();
  for (const item of pool) {
    const tags = item.era_tags.filter((tag) => tag !== "neutral");
    if (tags.length === 0) continue;
    const sharePerEra = 1 / tags.length;
    for (const era of tags) eraCounts.set(era, (eraCounts.get(era) ?? 0) + sharePerEra);
  }
  const poolTotal = [...eraCounts.values()].reduce((s, n) => s + n, 0);
  const eraProfile: EraShare[] = [...eraCounts.entries()]
    .map(([era_id, count]) => ({
      era_id,
      label_bn: eraLabel(era_id),
      count,
      share: poolTotal > 0 ? Math.round((count / poolTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.era_id.localeCompare(b.era_id));

  // ---- category breakdown ----
  const categoryStats: CategoryStat[] = categories.map((c: Category) => {
    const catItems = items.filter((i) => i.category_id === c.category_id);
    const experienced = catItems.filter((i) => responses[i.item_id] === "experienced").length;
    const na = catItems.filter((i) => responses[i.item_id] === "not_applicable").length;
    const applicable = catItems.length - na;
    return {
      category_id: c.category_id,
      name_bn: c.name_bn,
      total: catItems.length,
      experienced,
      applicable,
      share: applicable > 0 ? Math.round((experienced / applicable) * 100) : null,
    };
  });
  const strongestCategories = categoryStats
    .filter((c) => (c.share ?? 0) > 0)
    .sort((a, b) => (b.share ?? 0) - (a.share ?? 0) || b.experienced - a.experienced)
    .slice(0, 3);

  const label =
    experiencedCount === 0
      ? {
          title_bn: "ছেলেবেলার খাতা এখনো খালি!",
          sub_bn: "কোনো স্মৃতিতে টিক পড়েনি। মনে রেখো — স্কোর কম মানে কম সুন্দর ছেলেবেলা নয়।",
        }
      : resultLabelForProfile(eraProfile);

  return {
    overallScore,
    rawScore,
    totalItems: items.length,
    answeredCount,
    experiencedCount,
    notExperiencedCount,
    notApplicableCount,
    applicableCount,
    eraProfile,
    eraFallbackUsed,
    categories: categoryStats,
    strongestCategories,
    label,
    scoringVersion: SCORING_VERSION,
    datasetVersion: dataset_version,
  };
}
