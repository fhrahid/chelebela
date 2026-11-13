import { describe, expect, it } from "vitest";
import { toBn, toBnFraction, toBnPct } from "../lib/bn";

describe("Bangla numeral display", () => {
  it("converts ASCII digits to Bangla digits", () => {
    expect(toBn(87)).toBe("৮৭");
    expect(toBn(0)).toBe("০");
    expect(toBn(2000)).toBe("২০০০");
    expect(toBn("1.0.0")).toBe("১.০.০");
  });

  it("formats percentages and fractions", () => {
    expect(toBnPct(87)).toBe("৮৭%");
    expect(toBnFraction(18, 30)).toBe("১৮/৩০");
  });
});
