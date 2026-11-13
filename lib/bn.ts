/** Bangla-first display helpers: Bangla numerals everywhere a number is shown. */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Replace ASCII digits with Bangla digits: 87 -> ৮৭ */
export function toBn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** 87 -> ৮৭% */
export function toBnPct(value: number): string {
  return `${toBn(value)}%`;
}

/** 3 of 12 -> "৩/১২" */
export function toBnFraction(a: number, b: number): string {
  return `${toBn(a)}/${toBn(b)}`;
}
