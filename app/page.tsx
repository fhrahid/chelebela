import Link from "next/link";
import { ArrowRight, BarChart3, Disc3, Users } from "lucide-react";
import RetroTV from "@/components/RetroTV";
import Reveal from "@/components/Reveal";
import AlponaFlower from "@/components/AlponaFlower";
import EraCassettePicker from "@/components/EraCassettePicker";
import { CONTENT_REVIEW_NOTE, SORTED_CATEGORIES, TOTAL_ITEMS } from "@/lib/data";
import { DEFAULT_QUIZ_LENGTH } from "@/lib/quiz";
import { toBn } from "@/lib/bn";

const TICKER = [
  "মীনা কার্টুন",
  "তিন গোয়েন্দা",
  "গোল্লাছুট",
  "ক্যাসেটের স্পুলে পেনসিল",
  "মিমি চকলেট",
  "সিসিমপুর",
  "বহুব্রীহি",
  "ঈদের কার্ড",
  "নোকিয়ায় Snake",
  "ব্রিক গেম",
  "শীতের বিকেলে ঘুড়ি",
  "সাইবার ক্যাফে",
];

export default function LandingPage() {
  const categoriesWithItems = SORTED_CATEGORIES.filter((c) => c.item_count > 0);

  const steps = [
    {
      icon: <Disc3 className="h-6 w-6" aria-hidden="true" />,
      title: "ক্যাসেট বাছো",
      text: `আশি, নব্বই, দুই হাজার — কিংবা মিক্স টেপ। তুমি কতগুলো প্রশ্ন খেলবে বেছে নাও; প্রতি বার নতুন এলোমেলো স্মৃতি আসবে।`,
    },
    {
      icon: <BarChart3 className="h-6 w-6" aria-hidden="true" />,
      title: "শেষ করলেই ফল",
      text: "স্কোর, তুমি কোন দশকের বাচ্চা, আর কোন ধরনের স্মৃতিতে তুমি সবচেয়ে বড় — সব দেখাবে।",
    },
    {
      icon: <Users className="h-6 w-6" aria-hidden="true" />,
      title: "বন্ধুকে চ্যালেঞ্জ",
      text: "ক্যাসেট-কার্ড শেয়ার করো, তুলনা লিংক পাঠাও — দুজনে কতগুলো স্মৃতি মিলেছে দেখো।",
    },
  ];

  return (
    <div className="pb-4">
      {/* nostalgia ticker */}
      <div className="overflow-hidden border-b-2 border-ink bg-brand py-1.5 text-paper" aria-hidden="true">
        <div className="marquee-track gap-8 text-xs font-bold">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-8">
              {t} <span className="text-marigold">✦</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-10 sm:pt-14">
        {/* hero */}
        <section className="grid items-center gap-10 sm:grid-cols-2">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-marigold px-3 py-1 text-xs font-bold shadow-hard-sm">
              ১০০% বাংলাদেশি স্মৃতি
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.38] sm:text-5xl">
              তোমার <span className="text-brand underline decoration-flame decoration-4 underline-offset-4">ছেলেবেলা</span> স্কোর কত?
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
              {toBn(TOTAL_ITEMS)}টি স্মৃতির ভান্ডার থেকে নিজের মতো প্রশ্ন বেছে নাও — জন্মসাল নয়, সত্যিকারের অভিজ্ঞতাই
              গোনা হবে। লগইন লাগবে না।
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/quiz"
                className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-ink bg-flame px-6 py-3 font-display text-lg font-bold text-paper shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0 active:translate-x-0.5"
              >
                ক্যাসেট বাছাই করো <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/privacy#scoring"
                className="flex min-h-12 items-center rounded-xl border-2 border-ink bg-paper-card px-6 py-3 font-display text-lg font-bold shadow-hard-sm transition-transform hover:-translate-y-0.5"
              >
                কীভাবে হিসাব হয়?
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-ink-soft" aria-label="এক নজরে">
              <li className="rounded-full border border-ink/30 bg-paper-soft px-3 py-1">{toBn(TOTAL_ITEMS)}টি স্মৃতি</li>
              <li className="rounded-full border border-ink/30 bg-paper-soft px-3 py-1">{toBn(DEFAULT_QUIZ_LENGTH)}টি ডিফল্ট প্রশ্ন</li>
              <li className="rounded-full border border-ink/30 bg-paper-soft px-3 py-1">৪টি ক্যাসেট</li>
              <li className="rounded-full border border-ink/30 bg-paper-soft px-3 py-1">কোনো লগইন নেই</li>
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <RetroTV />
          </Reveal>
        </section>

        {/* steps */}
        <section className="mt-16" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="flex items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl">
            <AlponaFlower size={30} petal="#E1463E" center="#F9BB29" />
            খেলা তিন ধাপে <span className="text-flame">✦</span>
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="h-full rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-brand text-paper">
                      {s.icon}
                    </span>
                    <span className="font-display text-sm font-bold text-ink-soft">ধাপ {toBn(i + 1)}</span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* era cassettes */}
        <section className="mt-14" aria-labelledby="eras-title">
          <h2 id="eras-title" className="flex items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl">
            <AlponaFlower size={30} petal="#B15853" center="#F9BB29" />
            কোন ক্যাসেটটা বাজাবে?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            প্রতিটা ক্যাসেটে ওই দশকের স্মৃতি — মিক্স টেপে সবগুলো মিলেমিশে। চাইলে ক্যাসেটের সঙ্গে খাবার বা অন্য বিষয়ও বেছে নিতে পারো।
          </p>
          <div className="mt-5">
            <EraCassettePicker />
          </div>
        </section>

        {/* categories */}
        <section className="mt-14" aria-labelledby="cats-title">
          <h2 id="cats-title" className="flex items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl">
            <AlponaFlower size={30} petal="#298265" center="#F9BB29" />
            মনে আছে এগুলো? <span className="text-brass">✦</span>
          </h2>
          <Reveal>
            <div className="mt-4 flex flex-wrap gap-2">
              {categoriesWithItems.map((c) => (
                <Link
                  key={c.category_id}
                  href="/quiz"
                  className="rounded-full border-2 border-ink bg-paper-card px-4 py-1.5 text-sm font-bold shadow-hard-sm transition-transform hover:-translate-y-0.5"
                >
                  {c.name_bn} <span className="font-normal text-ink-soft">({toBn(c.item_count)})</span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>

        {/* fairness + honesty notes */}
        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border-2 border-ink bg-brand p-5 text-paper shadow-hard-sm">
              <h2 className="font-display text-lg font-bold text-marigold">এটা পরীক্ষা নয়, মজার খেলা</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-paper/90">
                কম স্কোর মানেই কম সুন্দর ছেলেবেলা নয় — প্রতিটা ছেলেবেলাই আলাদা। জন্মসাল দিয়ে স্কোর কাটা-ছাঁটা হয় না;
                যা সত্যিই পেরেছ, সেটাই গোনা হয়।
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="h-full rounded-2xl border-2 border-dashed border-ink/50 bg-paper-soft p-5">
              <h2 className="font-display text-lg font-bold">একটা সৎ স্বীকারোক্তি</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{CONTENT_REVIEW_NOTE}</p>
            </div>
          </Reveal>
        </section>

        {/* final CTA */}
        <Reveal className="mt-14">
          <section className="rounded-2xl border-2 border-ink bg-paper-card p-6 text-center shadow-hard">
            <p className="font-display text-2xl font-extrabold">তাহলে দেরি কীসের?</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">
              নিজের পছন্দের সংখ্যক এলোমেলো স্মৃতি — আর তোমার দশকের বাচ্চা পরিচয়।
            </p>
            <Link
              href="/quiz"
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-ink bg-flame px-8 py-3 font-display text-lg font-bold text-paper shadow-hard transition-transform hover:-translate-y-0.5"
            >
              এখনই খেলো <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
