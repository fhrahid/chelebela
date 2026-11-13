"use client";

/** Three-state answer control (FR-005): experienced / not experienced / not applicable.
 *  Tapping the active option again deselects it (back to unanswered).
 *  The "unsure" state is intentionally absent — pending SRS open decision OD-01. */
import { Check, Minus, X } from "lucide-react";
import type { ResponseValue } from "@/lib/types";

interface Props {
  itemId: string;
  title: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue | undefined) => void;
}

const OPTIONS: Array<{ value: ResponseValue; label: string; icon: React.ReactNode; activeClass: string }> = [
  { value: "experienced", label: "পেরেছি", icon: <Check className="h-5 w-5" aria-hidden="true" />, activeClass: "border-ink bg-leaf text-paper shadow-hard-sm" },
  { value: "not_experienced", label: "পাইনি", icon: <X className="h-5 w-5" aria-hidden="true" />, activeClass: "border-ink bg-brick text-paper shadow-hard-sm" },
  { value: "not_applicable", label: "প্রযোজ্য নয়", icon: <Minus className="h-5 w-5" aria-hidden="true" />, activeClass: "border-ink bg-tan text-ink shadow-hard-sm" },
];

export default function AnswerToggle({ itemId, title, value, onChange }: Props) {
  return (
    <div role="group" aria-label={`প্রশ্ন: ${title}`} className="grid w-full max-w-xs grid-cols-3 gap-2">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            aria-label={`${title} — ${opt.label}`}
            onClick={() => onChange(active ? undefined : opt.value)}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-2 py-1.5 text-xs font-bold transition-transform active:scale-95 ${
              active ? opt.activeClass : "border-ink/25 bg-paper-card text-ink-soft hover:border-ink/70"
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
      <span className="sr-only" data-item={itemId} />
    </div>
  );
}
