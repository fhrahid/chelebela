/** Category breakdown (FR-011). */
import type { CategoryStat } from "@/lib/types";
import { toBn, toBnPct } from "@/lib/bn";

export default function CategoryBars({ stats }: { stats: CategoryStat[] }) {
  const visible = stats.filter((s) => s.total > 0);
  return (
    <ul className="space-y-3">
      {visible.map((s) => (
        <li key={s.category_id} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-sm font-semibold">{s.name_bn}</span>
          <span className="h-4 flex-1 overflow-hidden rounded-full border-2 border-ink/60 bg-ink/10">
            {s.share === null ? null : (
              <span
                className="block h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${s.share}%` }}
              />
            )}
          </span>
          <span className="w-12 text-right font-display text-sm font-bold">
            {s.share === null ? "—" : toBnPct(s.share)}
          </span>
          <span className="w-14 text-right text-xs text-ink-soft">
            {toBn(s.experienced)}/{toBn(s.applicable || 0)}
          </span>
        </li>
      ))}
    </ul>
  );
}
