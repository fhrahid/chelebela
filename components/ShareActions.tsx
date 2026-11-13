"use client";

/**
 * Share actions (FR-015/016/017, NFR-008): download the result card as an
 * image, native Web Share (with image file when supported), and copy the
 * comparison link. Every path has a fallback.
 */
import { useState } from "react";
import { Download, Link2, Share2, CheckCheck } from "lucide-react";
import type { QuizResult, Responses } from "@/lib/types";
import { buildCompareUrl } from "@/lib/codec";
import { toBnPct } from "@/lib/bn";

interface Props {
  result: QuizResult;
  responses: Responses;
  cardId: string;
  getDataset: () => import("@/lib/types").Dataset;
}

export default function ShareActions({ result, responses, cardId, getDataset }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareText = `আমার ছেলেবেলা স্কোর ${toBnPct(result.overallScore)} — ${result.label.title_bn}! তোমারটা কত?`;

  async function captureCard(): Promise<Blob | null> {
    const el = document.getElementById(cardId);
    if (!el) return null;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, backgroundColor: "#F0DAB8" });
    const blob = await (await fetch(dataUrl)).blob();
    return blob;
  }

  async function handleDownload() {
    setBusy("download");
    try {
      const blob = await captureCard();
      if (!blob) throw new Error("card not found");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chhelebela-score.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("ছবিটা নামাতে সমস্যা হলো — আরেকবার চেষ্টা করো, বা স্ক্রিনশট নিয়ে শেয়ার করো।");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    try {
      const url = buildCompareUrl(responses, getDataset());
      if (typeof navigator !== "undefined" && navigator.share) {
        // Try sharing the card image + link together (supported browsers)
        try {
          const blob = await captureCard();
          if (blob && typeof navigator.canShare === "function") {
            const file = new File([blob], "chhelebela-score.png", { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ text: shareText, url, files: [file] });
              return;
            }
          }
        } catch {
          /* fall through to text-only share */
        }
        await navigator.share({ text: shareText, url });
      } else {
        await copyToClipboard(url);
      }
    } catch {
      /* user cancelled or API unavailable — no-op */
    } finally {
      setBusy(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleCopyLink() {
    setBusy("link");
    await copyToClipboard(buildCompareUrl(responses, getDataset()));
    setBusy(null);
  }

  const btn =
    "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink px-3 py-2 text-sm font-bold transition-transform active:scale-95 disabled:opacity-60";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleDownload} disabled={busy !== null} className={`${btn} bg-flame text-paper shadow-hard-sm`}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {busy === "download" ? "বানাচ্ছি…" : "কার্ড নামাও"}
        </button>
        <button type="button" onClick={handleShare} disabled={busy !== null} className={`${btn} bg-brand text-paper shadow-hard-sm`}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {busy === "share" ? "শেয়ার হচ্ছে…" : "শেয়ার করো"}
        </button>
        <button type="button" onClick={handleCopyLink} disabled={busy !== null} className={`${btn} bg-paper-card text-ink`}>
          {copied ? <CheckCheck className="h-4 w-4 text-leaf" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          {copied ? "কপি হয়েছে!" : "তুলনা লিংক কপি"}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">
        তুলনা লিংকে শুধু তোমার উত্তর থাকে — নাম বা অন্য কোনো তথ্য থাকে না।
      </p>
    </div>
  );
}
