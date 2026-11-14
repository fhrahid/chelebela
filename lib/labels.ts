/**
 * Result labels — DRAFT copy pending SRS OD-07 approval.
 * Rules obey SRS §6.7 and §2.4: labels never derive from birth year, never
 * shame a low score, and never present one era as superior.
 */
import type { EraShare } from "./types";

const SHORT: Record<string, string> = {
  "80s": "আশি দশকের",
  "90s": "নব্বই দশকের",
  "2000s": "দুই হাজার দশকের",
  neutral: "যুগ-নিরপেক্ষ",
};

export function resultLabelForProfile(profile: EraShare[]): { title_bn: string; sub_bn: string } {
  if (profile.length === 0) {
    return {
      title_bn: "দশক ধরা গেল না",
      sub_bn: "এক-দশকের স্মৃতি এখনো কম — আরও কিছু অভিজ্ঞতা টিক দিলে ছবিটা পরিষ্কার হবে।",
    };
  }

  const [top, second, third] = profile;

  if (top.share > 50) {
    return {
      title_bn: `${SHORT[top.era_id] ?? top.label_bn} বাচ্চা`,
      sub_bn: `তুমি যা যা পেরেছ, তার বেশির ভাগই এই দশকের স্মৃতি।`,
    };
  }

  if (third && third.share >= 15) {
    return {
      title_bn: "তিন দশকের মিশ্র স্মৃতি",
      sub_bn: "আশি, নব্বই আর দুই হাজার — তিন দশকের স্মৃতি মিলেমিশে আছে তোমার ছেলেবেলায়।",
    };
  }

  if (second) {
    return {
      title_bn: "দুই দশকের মাঝামাঝি বাচ্চা",
      sub_bn: `${top.label_bn} আর ${second.label_bn} — দুই দশকের স্মৃতিই তোমার সবচেয়ে বড় অংশ।`,
    };
  }

  return {
    title_bn: `${SHORT[top.era_id] ?? top.label_bn} বাচ্চা`,
    sub_bn: "তোমার স্মৃতির সিংহভাগ এই দশক থেকে এসেছে।",
  };
}
