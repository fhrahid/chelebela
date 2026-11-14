import type { Metadata, Viewport } from "next";
import "@fontsource/noto-sans-bengali/bengali-400.css";
import "@fontsource/noto-sans-bengali/bengali-500.css";
import "@fontsource/noto-sans-bengali/bengali-600.css";
import "@fontsource/noto-sans-bengali/bengali-700.css";
import "@fontsource/noto-sans-bengali/latin-400.css";
import "@fontsource/noto-sans-bengali/latin-500.css";
import "@fontsource/noto-sans-bengali/latin-600.css";
import "@fontsource/noto-sans-bengali/latin-700.css";
import "@fontsource/hind-siliguri/bengali-600.css";
import "@fontsource/hind-siliguri/bengali-700.css";
import "@fontsource/hind-siliguri/latin-600.css";
import "@fontsource/hind-siliguri/latin-700.css";
import "./globals.css";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import VisitorTracker from "@/components/VisitorTracker";
import IncompleteQuizBanner from "@/components/IncompleteQuizBanner";

export const metadata: Metadata = {
  title: {
    default: "ছেলেবেলা স্কোর — বাংলাদেশি ছেলেবেলার নস্টালজিয়া কুইজ",
    template: "%s — ছেলেবেলা স্কোর",
  },
  description:
    "৮০, ৯০ কি ২০০০-এর দশকের বাংলাদেশি ছেলেবেলার স্মৃতি তুমি কতটা পেরেছ? প্রশ্নসংখ্যা নিজে বেছে নাও; জন্মসাল নয়, সত্যিকারের অভিজ্ঞতা থেকেই ফল। লগইন লাগে না।",
  applicationName: "ছেলেবেলা স্কোর",
  keywords: ["ছেলেবেলা", "নস্টালজিয়া", "৯০ এর দশক", "বাংলাদেশ", "childhood", "nostalgia", "quiz"],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "ছেলেবেলা স্কোর — তোমার ছেলেবেলা কতটা বাংলাদেশি?",
    description:
      "বাংলাদেশি ছেলেবেলার স্মৃতির কুইজ — অভিজ্ঞতা থেকে স্কোর, দশক-পরিচয় আর বন্ধুর সঙ্গে তুলনা। লগইন লাগে না।",
    locale: "bn_BD",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#21534D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <VisitorTracker />
        <SiteHeader />
        <IncompleteQuizBanner />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
