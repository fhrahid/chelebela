import type { Metadata } from "next";
import AlponaFlower from "@/components/AlponaFlower";

export const metadata: Metadata = {
  title: "গোপনীয়তা নীতি",
  description: "ছেলেবেলা স্কোর কী তথ্য রাখে, কোথায় রাখে, আর তুলনা লিংকের তথ্য কতদিন থাকে।",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold leading-[1.4]">
        <AlponaFlower size={30} petal="#B15853" center="#F9BB29" />
        গোপনীয়তা নীতি
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        ছেলেবেলা স্কোর একটা মজার কুইজ, আর মজার জিনিসের জন্য তোমার ব্যক্তিগত তথ্য লাগে না। কী হয় আর কী হয় না — সবটা
        নিচে পরিষ্কার করে লেখা হলো।
      </p>

      <section className="mt-8 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">যা হয় না</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>কোনো অ্যাকাউন্ট, লগইন বা রেজিস্ট্রেশন লাগে না।</li>
          <li>নাম, ইমেইল, ফোন নম্বর বা জন্মসাল — কিছুই জিজ্ঞেস করা হয় না।</li>
          <li>কুইজের উত্তর স্বয়ংক্রিয়ভাবে সার্ভারে পাঠানো হয় না; তুলনা লিংক তৈরি করলে শুধু তুলনার জন্য দরকারি উত্তরগুলো যায়।</li>
          <li>এই সংস্করণে কোনো অ্যানালিটিক্স বা বিজ্ঞাপন ট্র্যাকার নেই।</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">যা তোমার ব্রাউজারে জমা থাকে</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          কুইজ ও ফলাফলের জন্য কয়েকটি ছোট তথ্য, শুধু তোমার ডিভাইসের লোকাল স্টোরেজে (localStorage) — নজর রাখার জন্য নয়:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>
            <strong>আগে দেখা প্রশ্নের ID</strong> — যতক্ষণ না ওই ক্যাসেটের প্রশ্ন ফুরোয়, একই প্রশ্ন বারবার না দেখানোর জন্য। কোনো নাম বা ব্যক্তিগত তথ্য নয়।
          </li>
          <li>
            <strong>শেষ ফলাফলের উত্তর</strong> — ফলাফল আর তুলনা পাতা কাজ করার জন্য। নতুন কুইজে নতুন এলোমেলো প্রশ্ন আসে।
          </li>
          <li>
            <strong>অপেক্ষমাণ তুলনা</strong> — বন্ধুর লিংক খুলে নিজের কুইজ না দিলে, ফিরে এসে তুলনাটা দেখার জন্য। এখানে শুধু তুলনার ID থাকে, বন্ধুর উত্তর নয়।
          </li>
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          ব্রাউজারের ডেটা মুছলে বা নতুন ডিভাইসে এগুলো থাকবে না। লোকাল স্টোরেজ মুছলে প্রশ্নের ইতিহাসও রিসেট হবে।
        </p>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">তুলনা লিংক তৈরি করলে কী হয়</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          “তুলনা লিংক কপি” বা শেয়ার চাপলে তোমার উত্তর ও কোন প্রশ্নগুলো করা হয়েছিল—শুধু এই তথ্য SQLite-এ রাখা হয়।
          কোনো নাম, ইমেইল, ফোন নম্বর, অ্যাকাউন্ট বা ডিভাইস ID রাখা হয় না। প্রতিটি লিংকে এলোমেলো, অনুমান করা কঠিন
          একটি ID থাকে; লিংক যার কাছে থাকবে, সে উত্তরগুলো দেখে তুলনা করতে পারবে। লিংক ৩০ দিন পর মেয়াদোত্তীর্ণ হয়;
          মেয়াদোত্তীর্ণ তথ্য পরের তুলনা-অনুরোধে মুছে ফেলা হয়। তুমি তুলনা লিংক না বানালে উত্তর সার্ভারে যায় না।
        </p>
      </section>

      <section id="scoring" className="mt-6 scroll-mt-20 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">স্কোর কীভাবে হিসাব হয়</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>প্রতিটা সেশনে বাছাই করা ক্যাসেট থেকে তোমার বেছে নেওয়া সংখ্যক এলোমেলো স্মৃতি জিজ্ঞেস করা হয়; স্কোর হিসাব হয় শুধু ওই প্রশ্নগুলো নিয়েই।</li>
          <li>কাঁচা হিসাব = “পেরেছি” ÷ প্রযোজ্য প্রশ্ন; “প্রযোজ্য নয়” বাদ থাকে। উত্তর দেওয়া সংখ্যাও ফলাফলে দেখা যায়।</li>
          <li>দেখানো স্কোর কাঁচা হিসাবের ৯৫% Wilson lower-bound অনুমান: ছোট নমুনায় বেশি সতর্ক, বেশি প্রশ্নে কাঁচা হিসাবের কাছাকাছি। ফলে অল্প কয়েকটি প্রশ্নে ১০০% কাঁচা ফল পুরো পুলে ১০০% ফলের সমান স্কোর পায় না।</li>
          <li>“প্রযোজ্য নয়” চাপা স্মৃতি হিসাবের বাইরে — স্কোর কমায় না।</li>
          <li>সব স্মৃতির ওজন সমান — কোনো স্মৃতি “বেশি দামি” নয়।</li>
          <li>
            <strong>দশকের ছবি</strong> বানাতে একাধিক দশকের স্মৃতির অবদান ভাগ করে দেওয়া হয়—দ্বিগুণ গোনা হয় না। জন্মসাল
            দিয়ে স্কোর বা দশক কাটা-ছাঁটা হয় না।
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">মুছে ফেলতে চাইলে</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          ব্রাউজার সেটিংস থেকে সাইটের ডেটা মুছে দিলে সেখানে থাকা ফলাফল ও প্রশ্নের ইতিহাস মুছে যাবে। শেয়ার করা
          তুলনা-তথ্য ৩০ দিন পর মেয়াদোত্তীর্ণ হয়; মেয়াদোত্তীর্ণ রেকর্ড পরের তুলনা-অনুরোধের সময় পরিষ্কার করা হয়।
        </p>
      </section>

      <p className="mt-8 rounded-xl border-2 border-dashed border-ink/40 bg-paper-soft p-4 text-xs leading-relaxed text-ink-soft">
        এই কুইজটা মজার জন্য — কম স্কোর মানেই কম সুন্দর ছেলেবেলা নয়। স্মৃতির তালিকা এখনো যাচাইধীন; ভবিষ্যতে নতুন
        স্মৃতি যোগ হতে পারে, তখন পুরোনো তুলনা লিংক কাজ নাও করতে পারে।
      </p>
    </div>
  );
}
