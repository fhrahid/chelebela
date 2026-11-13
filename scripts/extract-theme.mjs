#!/usr/bin/env node
// Extracts the dominant color palette from the provided UI theme image (webp).
// Used to derive design tokens for the app theme. Run: node scripts/extract-theme.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "CHELEBELA SCORE UI THEME.webp");

const STEP = 32; // quantization step per channel
const toHex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

const img = sharp(src);
const { data, info } = await img.resize(96, 96, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

const buckets = new Map();
let lumSum = 0;
let px = 0;
for (let i = 0; i < data.length; i += info.channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  lumSum += lum;
  px++;
  const key = `${Math.round(r / STEP)}:${Math.round(g / STEP)}:${Math.round(b / STEP)}`;
  const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
  cur.n++; cur.r += r; cur.g += g; cur.b += b;
  buckets.set(key, cur);
}

// merge to representative centers
const centers = [...buckets.values()].map((c) => ({
  count: c.n,
  r: Math.round(c.r / c.n), g: Math.round(c.g / c.n), b: Math.round(c.b / c.n),
}));
const total = centers.reduce((s, c) => s + c.count, 0);
const max = Math.max(...centers.map((c) => c.count));

// cluster coarse buckets that ended up adjacent
const merged = [];
for (const c of [...centers].sort((a, b) => b.count - a.count)) {
  const near = merged.find(
    (m) => Math.abs(m.r - c.r) < 40 && Math.abs(m.g - c.g) < 40 && Math.abs(m.b - c.b) < 40
  );
  if (near) {
    const n = near.count + c.count;
    near.r = Math.round((near.r * near.count + c.r * c.count) / n);
    near.g = Math.round((near.g * near.count + c.g * c.count) / n);
    near.b = Math.round((near.b * near.count + c.b * c.count) / n);
    near.count = n;
  } else merged.push({ ...c });
}

const sat = (c) => (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

const report = {
  source: "CHELEBELA SCORE UI THEME.webp",
  average_luminance: Math.round(lumSum / px),
  overall_impression: lumSum / px > 150 ? "light/paper-like" : lumSum / px > 90 ? "mid" : "dark",
  palette: merged.slice(0, 14).map((c) => ({
    hex: toHex(c.r, c.g, c.b),
    share_pct: +(100 * c.count / total).toFixed(1),
    luminance: Math.round(lum(c)),
    saturation: +sat(c).toFixed(2),
    role_hint:
      sat(c) < 0.12 ? (lum(c) > 200 ? "paper/near-white" : lum(c) < 45 ? "ink/near-black" : "neutral gray/brown")
      : lum(c) > 190 ? "bright accent / highlight"
      : lum(c) < 60 ? "deep accent / shadow"
      : "mid accent",
  })),
  spread_note: `top bucket holds ${(100 * max / total).toFixed(1)}% of pixels (low = rich multicolor art, high = flat background)`,
};
console.log(JSON.stringify(report, null, 2));
