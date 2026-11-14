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
          <li>নাম, ইমেইল, ফোন বা অ্যাকাউন্টের তথ্য সার্ভারে পাঠানো হয় না।</li>
          <li>কোনো তৃতীয়-পক্ষের বিজ্ঞাপন বা অ্যানালিটিক্স ট্র্যাকার নেই; ব্যবহার মাপতে শুধু এই সাইটের নিজস্ব নাম-পরিচয়হীন মেট্রিক্স কুকি আছে।</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">যা তোমার ব্রাউজারে জমা থাকে</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          কুইজ চলার অগ্রগতি ও ফলের একটি local copy তোমার ডিভাইসের লোকাল স্টোরেজে (localStorage) থাকে:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>
            <strong>আগে দেখা প্রশ্নের ID</strong> — যতক্ষণ না ওই ক্যাসেটের প্রশ্ন ফুরোয়, একই প্রশ্ন বারবার না দেখানোর জন্য। কোনো নাম বা ব্যক্তিগত তথ্য নয়।
          </li>
          <li>
            <strong>সেশনভিত্তিক ফলাফলের ইতিহাস</strong> — প্রতিটি কুইজের সব উত্তর আলাদা সেশনে জমা থাকে; নতুন কুইজ আগের ফল মুছে দেয় না।
          </li>
          <li>
            <strong>অপেক্ষমাণ তুলনা</strong> — বন্ধুর লিংক খুলে নিজের কুইজ না দিলে, ফিরে এসে তুলনাটা দেখার জন্য। এখানে শুধু তুলনার ID থাকে, বন্ধুর উত্তর নয়।
          </li>
        </ul>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          ব্রাউজারের ডেটা মুছলে এই লোকাল কপি ও প্রশ্নের ইতিহাস থাকবে না। সার্ভারে রাখা সেশনগুলো ৩০ দিনের মধ্যে মেয়াদোত্তীর্ণ হবে।
        </p>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">সেশনের তথ্য সার্ভারে কীভাবে থাকে</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          প্রতিটি কুইজ শেষ হলে তার উত্তর ও কোন প্রশ্নগুলো করা হয়েছিল—একটি আলাদা, এলোমেলো ID-সহ রেকর্ড হিসেবে SQLite-এ
          ৩০ দিনের জন্য রাখা হয়। নতুন সেশন পুরোনো রেকর্ড বদলায় না। কোনো নাম, ইমেইল, ফোন নম্বর, অ্যাকাউন্ট বা
          কোনো ডিভাইস বা যোগাযোগের ID এই কুইজ-রেকর্ডে রাখা হয় না। তুলনা লিংকটি সেই সেশন ID ব্যবহার করে; লিংক যার কাছে থাকবে, সে উত্তরগুলো দেখে
          তুলনা করতে পারবে। মেয়াদোত্তীর্ণ তথ্য পরের কুইজ-সেশন বা তুলনা-অনুরোধে মুছে ফেলা হয়।
        </p>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-hard-sm">
        <h2 className="font-display text-lg font-extrabold">ব্যবহার-মেট্রিক্স কুকি</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          সত্যিকারের সাইট-ব্যবহার গুনতে একটি এলোমেলো first-party browser ID (সর্বোচ্চ ১ বছর) এবং ৩০ মিনিটের session cookie
          ব্যবহার হয়। ডেটাবেসে কুকির raw মান নয়, তার hash থাকে। পেজ দেখা, কুইজ শুরু/শেষ/ছেড়ে যাওয়া, প্রশ্নের অবস্থান,
          বেছে নেওয়া বিষয়/দশক, স্কোর, কার্ড ডাউনলোড ও তুলনা-লিংকের ব্যবহার গোনা হয়। ডিভাইস, browser ও operating
          system শুধু মোটামুটি শ্রেণি হিসেবে রাখা হয়; raw IP, পুরো referrer URL বা raw user-agent রাখা হয় না।
          “Do Not Track” চালু থাকলে usage metrics সংগ্রহ করা হয় না।
          কাঁচা মেট্রিক্স ৯০ দিন পর মুছে যায়। পরিচিত crawler-এর user-agent বাদ দেওয়া হয়, তবে unique browser মানেই
          নিশ্চিত একজন মানুষ নয়—কুকি মুছলে বা অন্য browser/device ব্যবহার করলে একই মানুষ একাধিকবার গোনা হতে পারে।
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
          প্রতিটি সেশনের তুলনা-তথ্য ৩০ দিন পর মেয়াদোত্তীর্ণ হয়; মেয়াদোত্তীর্ণ রেকর্ড পরের তুলনা-অনুরোধের সময় পরিষ্কার করা হয়।
        </p>
      </section>

      <p className="mt-8 rounded-xl border-2 border-dashed border-ink/40 bg-paper-soft p-4 text-xs leading-relaxed text-ink-soft">
        এই কুইজটা মজার জন্য — কম স্কোর মানেই কম সুন্দর ছেলেবেলা নয়। স্মৃতির তালিকা এখনো যাচাইধীন; ভবিষ্যতে নতুন
        স্মৃতি যোগ হতে পারে, তখন পুরোনো তুলনা লিংক কাজ নাও করতে পারে।
      </p>
    </div>
  );
}
