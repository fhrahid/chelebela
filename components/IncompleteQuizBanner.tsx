"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { getEraSet } from "@/lib/quiz";
import { quizStorage, type StoredQuizProgress } from "@/lib/storage";
import { DEFAULT_DATASET } from "@/lib/data";
import { toBn } from "@/lib/bn";

export default function IncompleteQuizBanner() {
  const pathname = usePathname();
  const [progress, setProgress] = useState<StoredQuizProgress | null>(null);

  useEffect(() => {
    if (pathname === "/quiz") {
      setProgress(null);
      return;
    }
    setProgress(quizStorage.loadQuizProgress());
  }, [pathname]);

  if (!progress) return null;
  const answered = Object.keys(progress.responses).length;
  // A just-started quiz with no answers yet is not worth a site-wide banner;
  // it can still be resumed by opening the quiz page.
  if (answered === 0) return null;
  const set = getEraSet(progress.setId);
  const category = DEFAULT_DATASET.categories.find((item) => item.category_id === progress.categoryId);

  return (
    <div className="border-b border-ink/20 bg-marigold/70 px-4 py-2">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold">
          অসমাপ্ত কুইজ সেভ আছে · {set?.label_bn ?? "মিক্স টেপ"}
          {category ? ` · ${category.name_bn}` : ""}
          {" · "}{toBn(answered)}/{toBn(progress.itemIds.length)} উত্তর
        </p>
        <Link href="/quiz?resume=1" className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-ink bg-paper-card px-3 text-xs font-bold">
          চালিয়ে যাও <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
