import Link from "next/link";
import { Tv } from "lucide-react";
import { DATASET_VERSION } from "@/lib/data";
import { toBn } from "@/lib/bn";

export default function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-ink bg-paper-deep">
      <div className="rickshaw-stripe h-2 w-full" aria-hidden="true" />
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-brand text-paper">
              <Tv className="h-4 w-4" aria-hidden="true" />
            </span>
            ছেলেবেলা স্কোর
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            বাংলাদেশি ছেলেবেলার স্মৃতি দিয়ে তৈরি একটা মজার কুইজ। কম স্কোর মানে কম সুন্দর ছেলেবেলা নয় — সব ছেলেবেলাই আলাদা।
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm font-medium" aria-label="ফুটার লিংক">
          <Link href="/quiz" className="hover:underline">
            কুইজ খেলো
          </Link>
          <Link href="/privacy" className="hover:underline">
            গোপনীয়তা নীতি
          </Link>
          <Link href="/privacy#scoring" className="hover:underline">
            স্কোর কীভাবে হিসাব হয়
          </Link>
        </nav>
      </div>
      <div className="border-t border-ink/20 px-4 py-3 text-center text-xs text-ink-soft">
        ডেটা ভার্সন {toBn(DATASET_VERSION)} · স্মৃতির তালিকা যাচাইধীন · স্প্রিন্ট টাইটানস · পয়েন্টফেক্স
      </div>
    </footer>
  );
}
