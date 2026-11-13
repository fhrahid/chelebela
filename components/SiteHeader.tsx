import Link from "next/link";

/** Themed, Bangla-first masthead. The wordmark follows the supplied reference. */
export default function SiteHeader() {
  return (
    <header className="border-b-2 border-ink bg-paper/95">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between border-b border-ink/30 py-1.5 text-[10px] font-bold text-ink-soft sm:text-xs">
          <span>ছেলেবেলা চ্যানেল · সংখ্যা ০১</span>
          <span>১৯৯০ – ২০০৯</span>
        </div>

        <div className="flex flex-col items-center py-2 sm:py-3">
          <Link
            href="/"
            aria-label="ছেলেবেলা স্কোর — হোম পাতা"
            className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-transform hover:-translate-y-0.5"
          >
            <span className="font-display text-[2rem] font-extrabold leading-[1.35] text-ink sm:text-5xl">
              ছেলেবেলা
            </span>
            <span className="score-logo inline-flex -rotate-2 items-center rounded-lg border-[3px] border-ink bg-rose px-2.5 py-0.5 font-display text-2xl font-extrabold leading-[1.4] text-paper shadow-hard-sm sm:px-3 sm:py-1 sm:text-4xl">
              স্কোর
            </span>
          </Link>
          <p className="mt-0.5 text-[9px] font-semibold text-ink-soft sm:text-[10px]">
            আমাদের ছেলেবেলার স্মৃতির যাত্রা
          </p>
        </div>

        <nav className="flex items-center justify-center gap-1 border-t border-ink/20 py-1 text-xs font-bold sm:gap-4 sm:py-1.5 sm:text-sm" aria-label="প্রধান মেনু">
          <Link href="/quiz" className="rounded-full px-3 py-1 hover:bg-marigold/50">
            কুইজ
          </Link>
          <span className="text-brick" aria-hidden="true">✿</span>
          <Link href="/result" className="rounded-full px-3 py-1 hover:bg-marigold/50">
            ফলাফল
          </Link>
          <span className="text-brick" aria-hidden="true">✿</span>
          <Link href="/privacy" className="rounded-full px-3 py-1 hover:bg-marigold/50">
            গোপনীয়তা
          </Link>
        </nav>
      </div>
      <div className="alpona-border" aria-hidden="true" />
    </header>
  );
}
