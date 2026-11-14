#!/usr/bin/env node
/**
 * Build the static quote bank for result screens.
 *
 * The 100-per-era base pool is original nostalgia copy, explicitly labelled as
 * such (never presented as a historical or attributed quote). A few additional
 * public-domain literary snippets and a short Meena theme excerpt are included
 * with their source and attribution. Regenerate with:
 *   node scripts/generate-era-quotes.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const eras = {
  "80s": {
    label_bn: "আশি দশক",
    seeds: [
      "এক্কা-দোক্কা খেলতে খেলতে বিকেল গড়ানো",
      "ছোঁয়াছুঁয়ি খেলায় পাড়ার সবাই জুটে যাওয়া",
      "শীতের বিকেলে ছাদে ঘুড়ি ওড়ানো",
      "স্কুলের বিরতিতে গল্পের বই খুলে বসা",
      "বন্ধুর সঙ্গে পড়ার বই অদলবদল করা",
      "স্কুল থেকে ফিরে রেডিওতে গান শোনা",
      "ধান কাটার পর ফাঁকা জমিতে দৌড়ঝাঁপ",
      "বিটিভিতে এইসব দিন রাত্রি দেখার অপেক্ষা",
      "বহুব্রীহির নাটক নিয়ে বাড়ির গল্প",
      "তিন গোয়েন্দার রহস্যে ডুবে থাকা",
      "পাড়ার বড়দের কাছে গল্প শোনা",
      "বিকেলের আকাশে লাটাইয়ের সুতো সামলানো",
      "স্কুলের খাতার পেছনে আঁকিবুঁকি কাটা",
      "গল্পের বইয়ের পাতায় নিজের জগৎ খুঁজে পাওয়া",
      "বারান্দায় বসে বৃষ্টির শব্দ শোনা",
      "পাড়ার খেলায় দল ভাগ করা",
      "বন্ধুর বাড়ি থেকে বই নিয়ে ফেরত আনা",
      "রেডিওর অনুষ্ঠানে কান পেতে থাকা",
      "ছুটির দিনে উঠোনে খেলা",
      "দূরের ছাদে রঙিন ঘুড়ি দেখা",
      "সন্ধ্যা নামলেই খেলার মাঠ থেকে বাড়ি ফেরা",
      "পরিবারের সঙ্গে টিভির সামনে বসা",
      "চিঠির খামে বন্ধুর নাম লেখা",
      "মাটির উঠোনে ছোট্ট ফুল আঁকা",
      "ছোট্ট খেলায় নিজেরাই নতুন নিয়ম বানানো"
    ],
    endings: [
      "সেইটুকুই ছিল দিনের সেরা সময়।",
      "আজও মনে পড়লে মনটা নরম হয়ে যায়।",
      "এমন ছোট স্মৃতিই বড় হয়ে থেকে যায়।",
      "সেই বিকেলটা যেন আজও থেমে আছে।"
    ]
  },
  "90s": {
    label_bn: "নব্বই দশক",
    seeds: [
      "মীনা কার্টুনের গান মুখে মুখে ফেরা",
      "আলিফ লায়লার জাদুর গল্পে ডুবে থাকা",
      "ক্যাসেটের ফিতা পেনসিলে গুটিয়ে নেওয়া",
      "নিজের হাতে ঈদ কার্ডে নাম লেখা",
      "VCR-এ ভিডিও ক্যাসেট চালানোর অপেক্ষা",
      "মিমি চকলেট পেলে খুশিতে চোখ চকচক করা",
      "দোকানের আর্কেড গেমে কয়েন ঢোকানো",
      "বন্ধুদের সঙ্গে গোল্লাছুট খেলতে নামা",
      "বরফ-পানির খেলায় দৌড়ে বেড়ানো",
      "তিন গোয়েন্দার বই বালিশের পাশে রাখা",
      "প্রতিবেশীর টিভির সামনে সবাই মিলে বসা",
      "ক্যাসেটের দোকানে পছন্দের গান খোঁজা",
      "বিটিভির অনুষ্ঠানের সময় মনে করে রাখা",
      "কাঁচের মার্বেল পকেটে ঝনঝন করা",
      "পিঠু খেলায় পাথরগুলো গুনে সাজানো",
      "স্কুলের বিরতিতে বন্ধুর সঙ্গে গল্পের বই দেখা",
      "ঈদের সালামির জন্য বড়দের কাছে যাওয়া",
      "বন্ধুর সঙ্গে দেখা কার্টুন নিয়ে কথা বলা",
      "কাগজের কার্ডে রঙিন শুভেচ্ছা লেখা",
      "মেলায় নাগরদোলার দিকে তাকিয়ে থাকা",
      "ক্যাসেট প্লেয়ারের বোতাম চেপে গান থামানো",
      "ভিডিও টেপ রিওয়াইন্ড হতে হতে অপেক্ষা করা",
      "বাড়ির সবাই মিলে নাটকের সময় ঠিক করা",
      "খেলার শেষে ধুলো ঝেড়ে বাড়ি ফেরা",
      "বন্ধুরা মিলে এক থালায় নাশতা ভাগ করা"
    ],
    endings: [
      "সেই সুরটা যেন এখনও কানে বাজে।",
      "মনে পড়লেই মুখে হাসি ফিরে আসে।",
      "বন্ধুদের সঙ্গে ভাগ করলেই স্মৃতি জমে।",
      "সেই সময়টা নিজের মতোই রঙিন ছিল।"
    ]
  },
  "2000s": {
    label_bn: "দুই হাজার দশক",
    seeds: [
      "সিসিমপুরের গান শুনে একসঙ্গে গলা মেলানো",
      "কার্টুন নেটওয়ার্কে পোকেমন দেখার অপেক্ষা",
      "বেব্লেড ঘুরিয়ে বন্ধুদের সঙ্গে লড়াই করা",
      "হাতে ধরা ব্রিক গেমে ব্লক সাজানো",
      "বাটনওয়ালা নোকিয়ায় Snake খেলা",
      "বাংলা সংলাপের GTA: Vice City নিয়ে আড্ডা",
      "সাইবার ক্যাফেতে প্রথম ইন্টারনেট খোলা",
      "স্কুল ছুটির পর মেরিডিয়ান চিপস ভাগ করা",
      "পরিবারের সঙ্গে ওয়ান্ডারল্যান্ডে ঘুরতে যাওয়া",
      "স্কুলে কার্টুনের আগের পর্ব নিয়ে আলোচনা",
      "কম্পিউটারে গেম চালু হতে হতে অপেক্ষা",
      "সিডির গায়ে নিজের নাম লিখে রাখা",
      "কিপ্যাডে ছোট ছোট মেসেজ টাইপ করা",
      "বন্ধুর ফোনে Snake-এর স্কোর দেখা",
      "ডেস্কটপ কম্পিউটারের সামনে সবাই মিলে বসা",
      "গেমের সিডি সাবধানে কভারে ঢুকিয়ে রাখা",
      "কার্টুনের সময় শেষ হলে টিভির সামনে মন খারাপ",
      "বন্ধুর বাড়িতে নতুন গেম দেখতে যাওয়া",
      "কম্পিউটার ল্যাবে নিজের পালার অপেক্ষা",
      "ক্রিকেটের স্কোর শুনে পাড়ায় উল্লাস",
      "ইন্টারনেট ধীরে চললে পেজ খুলতে থাকা",
      "স্কুলের ব্যাগে গেমের ছোট যন্ত্র লুকিয়ে রাখা",
      "বিকেলে মাঠ থেকে ফিরে চিপসের প্যাকেট খোলা",
      "নতুন ফোনের রিংটোন বারবার শুনে দেখা",
      "বন্ধুদের সঙ্গে গেমের লেভেল নিয়ে গল্প"
    ],
    endings: [
      "সেই স্ক্রিনের আলো আজও মনে পড়ে।",
      "বন্ধুদের গল্পে বিকেলটা জমে উঠত।",
      "ছোট্ট জিনিসটাই বড় স্মৃতি হয়ে যায়।",
      "মনে পড়লেই সেই দিনগুলো ফিরে আসে।"
    ]
  }
};

const quotes = [];
for (const [eraId, config] of Object.entries(eras)) {
  let n = 1;
  for (const seed of config.seeds) {
    for (const ending of config.endings) {
      quotes.push({
        quote_id: `${eraId}-original-${String(n).padStart(3, "0")}`,
        era_id: eraId,
        text_bn: `“${seed}” — ${ending}`,
        quote_type: "original_caption",
        attribution_bn: "ছেলেবেলা স্কোর · নিজস্ব স্মৃতি-লাইন",
        source_url: null,
        source_note_bn: "এই কুইজের জন্য লেখা নতুন নস্টালজিক ক্যাপশন; কোনো পুরোনো অনুষ্ঠান/ব্যক্তির উদ্ধৃতি নয়।"
      });
      n++;
    }
  }
}

const timeless = [
  {
    quote_id: "timeless-tagore-chitto",
    era_id: "timeless",
    text_bn: "“চিত্ত যেথা ভয়শূন্য, উচ্চ যেথা শির”",
    quote_type: "public_domain_literature",
    attribution_bn: "রবীন্দ্রনাথ ঠাকুর · নৈবেদ্য, কবিতা ৭২",
    source_url: "https://bn.wikisource.org/wiki/নৈবেদ্য_(রবীন্দ্রনাথ_ঠাকুর)/৭২",
    source_note_bn: "চিরকালীন সাহিত্য-উদ্ধৃতি; কোনো নির্দিষ্ট দশকের উক্তি নয়।"
  },
  {
    quote_id: "timeless-tagore-ekla",
    era_id: "timeless",
    text_bn: "“যদি তোর ডাক শুনে কেউ না আসে, তবে একলা চলো রে”",
    quote_type: "public_domain_literature",
    attribution_bn: "রবীন্দ্রনাথ ঠাকুর · গীতবিতান, স্বদেশ",
    source_url: "https://bn.wikisource.org/wiki/গীতবিতান/স্বদেশ/৩",
    source_note_bn: "চিরকালীন গানের সংক্ষিপ্ত লাইন; কোনো নির্দিষ্ট দশকের উক্তি নয়।"
  },
  {
    quote_id: "timeless-tagore-sonar-bangla",
    era_id: "timeless",
    text_bn: "“আমার সোনার বাংলা, আমি তোমায় ভালোবাসি”",
    quote_type: "public_domain_literature",
    attribution_bn: "রবীন্দ্রনাথ ঠাকুর · গীতবিতান, স্বদেশ",
    source_url: "https://bn.wikisource.org/wiki/গীতবিতান/স্বদেশ/১",
    source_note_bn: "চিরকালীন গানের সংক্ষিপ্ত লাইন; কোনো নির্দিষ্ট দশকের উক্তি নয়।"
  }
];
quotes.push(...timeless);

quotes.push({
  quote_id: "90s-meena-theme-excerpt",
  era_id: "90s",
  text_bn: "“আমি বাবা-মায়ের শত আদরের মেয়ে”",
  quote_type: "media_excerpt",
  attribution_bn: "মীনা থিম গান",
  source_url: "/tv/meena-song.mp4",
  source_note_bn: "ব্যবহারকারীর দেওয়া ভিডিও থেকে সংক্ষিপ্ত গীতাংশ; সাইটের নিজস্ব ঐতিহাসিক দাবি নয়।"
});

const result = {
  schema_version: "1.0.0",
  quote_bank_version: "1.0.0",
  policy: {
    original_caption_count_per_era: 100,
    note: "Original captions are clearly labeled as app-written; sourced literary/media excerpts carry attribution and source links. Do not invent historical attributions."
  },
  quotes
};

writeFileSync(join(root, "data/era-quotes.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
for (const eraId of Object.keys(eras)) {
  const count = quotes.filter((quote) => quote.era_id === eraId).length;
  if (count < 100) throw new Error(`${eraId} quote pool has only ${count} lines`);
}
console.log(`Wrote ${quotes.length} quotes; 100 original captions in each supported era.`);
