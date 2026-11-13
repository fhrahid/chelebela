import { describe, expect, it } from "vitest";
import { ERA_ART, eraArtPool, randomEraArt } from "../lib/era-art";

describe("random era result artwork", () => {
  it("has multiple Commons images per supported era and selects within that era", () => {
    for (const era of ["80s", "90s", "2000s"]) {
      const pool = eraArtPool(era);
      expect(pool.length).toBeGreaterThanOrEqual(2);
      expect(randomEraArt(era, () => 0)).toEqual(pool[0]);
      expect(randomEraArt(era, () => 0.999)).toEqual(pool[pool.length - 1]);
    }
  });

  it("every image record has attribution and a Commons source link", () => {
    for (const pool of Object.values(ERA_ART)) {
      for (const art of pool) {
        expect(art.title.length).toBeGreaterThan(0);
        expect(art.artist.length).toBeGreaterThan(0);
        expect(art.license.length).toBeGreaterThan(0);
        expect(art.sourceUrl).toContain("commons.wikimedia.org");
      }
    }
  });
});
