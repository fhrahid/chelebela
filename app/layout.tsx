import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

// Use a broad Bengali text face for conjunct/diacritic coverage, with Hind
// Siliguri for display. next/font self-hosts both subsets to avoid runtime
// font-loading and fallback inconsistencies.
const noto = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

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
    <html lang="bn" className={`${noto.variable} ${hind.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <SiteHeader />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
