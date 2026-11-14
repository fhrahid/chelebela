"use client";

import { DEFAULT_DATASET } from "@/lib/data";
import { toBn } from "@/lib/bn";
import { trackMetric } from "@/lib/metrics-client";

const CATEGORIES = DEFAULT_DATASET.categories.filter((category) =>
  DEFAULT_DATASET.items.some((item) => item.category_id === category.category_id),
);

export default function CategorySelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  return (
    <div className="mx-auto max-w-md">
      <label htmlFor="quiz-category" className="block text-center font-display font-bold">
        কোন বিষয়ের স্মৃতি দেখতে চাও?
      </label>
      <select
        id="quiz-category"
        value={value ?? ""}
        onChange={(event) => {
          const selected = event.target.value || null;
          onChange(selected);
          trackMetric({ name: "category_selected", categoryId: selected ?? "all" });
        }}
        className="mt-2 min-h-12 w-full rounded-xl border-2 border-ink bg-paper-card px-3 py-2 font-semibold"
      >
        <option value="">সব বিষয়</option>
        {CATEGORIES.map((category) => {
          const count = DEFAULT_DATASET.items.filter((item) => item.category_id === category.category_id).length;
          return (
            <option key={category.category_id} value={category.category_id}>
              {category.name_bn} · {toBn(count)}টি
            </option>
          );
        })}
      </select>
      <p className="mt-1 text-center text-xs text-ink-soft">
        বিষয় বাছলে সেই বিষয়ের প্রশ্নই আসবে; ক্যাসেট বাছলে সেটি ওই দশকের সঙ্গে মিলিয়ে নেওয়া হবে।
      </p>
    </div>
  );
}
