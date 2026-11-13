/** Era-affinity bars (FR-010) — colors keyed by era id. */
import type { EraShare } from "@/lib/types";
import { toBn, toBnPct } from "@/lib/bn";

const ERA_COLORS: Record<string, string> = {
  "80s": "var(--color-brass)",
  "90s": "var(--color-leaf)",
  "2000s": "var(--color-flame)",
  neutral: "var(--color-taupe)",
};

export default function EraBars({ profile }: { profile: EraShare[] }) {
  if (profile.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-ink/30 bg-paper-soft p-4 text-sm text-ink-soft">
        এখনো এক-দশকের স্মৃতি টিক পড়েনি, তাই দশকের ছবি আঁকা যাচ্ছে না।
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {profile.map((e) => (
        <li key={e.era_id} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-sm font-semibold">{e.label_bn}</span>
          <span className="h-4 flex-1 overflow-hidden rounded-full border-2 border-ink/60 bg-ink/10">
            <span
              className="block h-full rounded-full transition-[width] duration-500"
              style={{ width: `${e.share}%`, backgroundColor: ERA_COLORS[e.era_id] ?? "var(--color-taupe)" }}
            />
          </span>
          <span className="w-12 text-right font-display text-sm font-bold">{toBnPct(e.share)}</span>
          <span className="w-10 text-right text-xs text-ink-soft">({toBn(e.count)}টা)</span>
        </li>
      ))}
    </ul>
  );
}
