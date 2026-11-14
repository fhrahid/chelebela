"use client";

/**
 * Share actions (FR-015/016/017, NFR-008): download the result card as an
 * image in the chosen social format, native Web Share (with the image file
 * when supported), a Facebook share with a ready Bangla caption and the card
 * image attached, and copy the anonymous short-ID comparison link. Every
 * path has a fallback.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCheck, Download, Facebook, Link2, Share2 } from "lucide-react";
import type { QuizResult, Responses } from "@/lib/types";
import { toBnPct } from "@/lib/bn";
import { trackMetric } from "@/lib/metrics-client";

interface Props {
  result: QuizResult;
  responses: Responses;
  askedIds: string[];
  sessionId?: string;
  cardId: string;
  downloadName?: string;
}

export default function ShareActions({
  result,
  responses,
  askedIds,
  sessionId,
  cardId,
  downloadName = "chhelebela-score.png",
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noteTimer.current) window.clearTimeout(noteTimer.current);
    };
  }, []);

  const shareText = `আমার ছেলেবেলা স্কোর ${toBnPct(result.overallScore)} — ${result.label.title_bn}! তোমারটা কত?`;

  function showNote(message: string) {
    setNote(message);
    if (noteTimer.current) window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 9000);
  }

  /** Ready-to-paste Bangla caption for a Facebook post. */
  function buildFacebookCaption(url: string): string {
    return [
      `🎬 আমার ছেলেবেলা স্কোর ${toBnPct(result.overallScore)} — “${result.label.title_bn}”!`,
      result.label.sub_bn,
      `তোমার ছেলেবেলা কেমন কেটেছিল, এক মিনিটের মজার কুইজেই বের করো 👉 ${url}`,
      "#ছেলেবেলা #ChelebelaScore #Nostalgia",
    ].join("\n");
  }

  async function createCompareUrl(): Promise<string> {
    if (sessionId && /^[A-Za-z0-9_-]{22}$/.test(sessionId)) {
      try {
        const existing = await fetch(`/api/comparisons/${sessionId}`, { cache: "no-store" });
        if (existing.ok) return new URL(`/compare/${sessionId}`, window.location.origin).toString();
      } catch {
        // Fall through and make a fresh share record from this local result.
      }
    }
    const response = await fetch("/api/comparisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses, askedIds }),
    });
    if (!response.ok) throw new Error("comparison link creation failed");
    const { id } = await response.json() as { id: string };
    if (!/^[A-Za-z0-9_-]{22}$/.test(id)) throw new Error("invalid comparison ID");
    return new URL(`/compare/${id}`, window.location.origin).toString();
  }

  async function captureCard(): Promise<Blob | null> {
    const el = document.getElementById(cardId);
    if (!el) return null;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true, backgroundColor: "#F0DAB8" });
    const blob = await (await fetch(dataUrl)).blob();
    return blob;
  }

  function saveBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function writeClipboard(text: string) {
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
  }

  async function handleDownload() {
    setBusy("download");
    try {
      const blob = await captureCard();
      if (!blob) throw new Error("card not found");
      saveBlob(blob);
      trackMetric({ name: "result_card_downloaded" });
    } catch {
      alert("ছবিটা নামাতে সমস্যা হলো — আরেকবার চেষ্টা করো, বা স্ক্রিনশট নিয়ে শেয়ার করো।");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    let url: string;
    try {
      url = await createCompareUrl();
    } catch {
      alert("তুলনা লিংক তৈরি করা যায়নি — একটু পরে আবার চেষ্টা করো।");
      setBusy(null);
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        // Try sharing the card image + link together (supported browsers)
        try {
          const blob = await captureCard();
          if (blob && typeof navigator.canShare === "function") {
            const file = new File([blob], downloadName, { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ text: shareText, url, files: [file] });
              trackMetric({ name: "share_link_created" });
              return;
            }
          }
        } catch {
          /* fall through to text-only share */
        }
        await navigator.share({ text: shareText, url });
        trackMetric({ name: "share_link_created" });
      } else {
        await writeClipboard(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        trackMetric({ name: "share_link_created" });
      }
    } catch {
      /* user cancelled or API unavailable — no-op */
    } finally {
      setBusy(null);
    }
  }

  async function handleFacebook() {
    setBusy("facebook");
    try {
      const url = await createCompareUrl();
      const caption = buildFacebookCaption(url);
      const blob = await captureCard();

      // Preferred: the native share sheet carries the card image as a file,
      // so it uploads automatically once Facebook is picked from the sheet.
      if (blob && typeof navigator !== "undefined" && navigator.share && typeof navigator.canShare === "function") {
        const file = new File([blob], downloadName, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ text: caption, url, files: [file] });
            trackMetric({ name: "share_facebook" });
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            /* fall through to the web fallback */
          }
        }
      }

      // Web fallback: save the image, copy the caption, open the share dialog.
      if (blob) saveBlob(blob);
      await writeClipboard(caption);
      const popup = window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        "facebook-share",
        "noopener,noreferrer,width=680,height=640",
      );
      trackMetric({ name: "share_facebook" });
      showNote(
        popup
          ? "কার্ডের ছবি নামানো হলো আর বাংলা ক্যাপশন কপি হলো — ফেসবুক পোস্টে ছবিটা দিয়ে ক্যাপশনটা বসিয়ে দাও।"
          : "ক্যাপশন কপি হয়েছে আর ছবিটা নামানো হয়েছে; পপ-আপ আটকে গেলে ফেসবুকে গিয়ে নিজে পোস্টটা বসাও।",
      );
    } catch {
      alert("ফেসবুকে শেয়ার করা যায়নি — আরেকবার চেষ্টা করো।");
    } finally {
      setBusy(null);
    }
  }

  async function handleCopyLink() {
    setBusy("link");
    try {
      await writeClipboard(await createCompareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      trackMetric({ name: "share_link_created" });
    } catch {
      alert("তুলনা লিংক তৈরি করা যায়নি — একটু পরে আবার চেষ্টা করো।");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink px-3 py-2 text-sm font-bold transition-transform active:scale-95 disabled:opacity-60";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleFacebook} disabled={busy !== null} className={`${btn} bg-[#1877F2] text-paper shadow-hard-sm`}>
          <Facebook className="h-4 w-4" aria-hidden="true" />
          {busy === "facebook" ? "শেয়ার হচ্ছে…" : "ফেসবুকে শেয়ার"}
        </button>
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
      {note && (
        <p role="status" className="mt-2 rounded-xl border-2 border-ink/30 bg-paper-soft p-2.5 text-center text-xs leading-relaxed text-ink-soft">
          {note}
        </p>
      )}
    </div>
  );
}
