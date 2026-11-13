/** Domain types shared by the quiz UI and the scoring engine. */

export type ResponseValue = "experienced" | "not_experienced" | "not_applicable";

/** item_id -> answer. Absent key = unanswered. */
export type Responses = Record<string, ResponseValue>;

export interface Period {
  from: string | null;
  to: string | null;
  label_bn: string;
}

export interface MemoryItem {
  item_id: string;
  title_bn: string;
  title_en: string | null;
  description_bn: string | null;
  category_id: string;
  era_tags: string[];
  era_scope: "single" | "multi";
  classification_confidence: "verified" | "probable" | "uncertain";
  setting_tags: string[];
  origin_period: Period | null;
  popularity_period_bd: Period;
  weight: number;
  era_classification_eligible: boolean;
  validation_status: "draft" | "under_review" | "verified" | "disputed" | "retired";
  last_reviewed: string | null;
  source_references: string[];
  evidence_bn: string;
  region_notes_bn: string;
  review_notes_bn: string;
  flags: string[];
}

export interface Category {
  category_id: string;
  name_bn: string;
  name_en: string;
  display_order: number;
  maps_from: string[];
  item_count: number;
  note?: string;
}

export interface Era {
  era_id: string;
  label_bn: string;
  label_en: string;
  range: string | null;
  item_count: number;
  note?: string;
}

export interface Dataset {
  items: MemoryItem[];
  categories: Category[];
  eras: Era[];
  dataset_version: string;
}

export interface EraShare {
  era_id: string;
  label_bn: string;
  share: number; // 0-100, rounded
  count: number;
}

export interface CategoryStat {
  category_id: string;
  name_bn: string;
  total: number;
  experienced: number;
  applicable: number;
  share: number | null; // null when no applicable items
}

export interface ResultLabel {
  title_bn: string;
  sub_bn: string;
}

export interface QuizResult {
  /** Fairness-adjusted score (Wilson lower bound) — what the user sees. */
  overallScore: number; // 0-100
  /** Raw percentage (experienced ÷ applicable) — shown alongside for transparency. */
  rawScore: number; // 0-100
  totalItems: number;
  answeredCount: number;
  experiencedCount: number;
  notExperiencedCount: number;
  notApplicableCount: number;
  applicableCount: number;
  eraProfile: EraShare[];
  /** true when era affinity was computed via the fallback rule (see FLG-DS-02). */
  eraFallbackUsed: boolean;
  categories: CategoryStat[];
  strongestCategories: CategoryStat[];
  label: ResultLabel;
  scoringVersion: string;
  datasetVersion: string;
}
