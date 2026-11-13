"use client";

/**
 * Interactive retro CRT television — the landing-page toy.
 *
 *  • ঝিরঝির (static): canvas noise + WebAudio white noise (generated, no assets).
 *  • Antenna: drag it (pointer events) OR tap it repeatedly to nudge it — when
 *    it points near the sweet spot, the signal clears and channels appear.
 *  • Left knob: channel (1–4) with a static burst between zaps, like a real TV.
 *  • Right knob: volume (0–100) — controls the white-noise/gain.
 *  • Channels are ORIGINAL CSS-animated retro broadcasts (no copyrighted
 *    footage, per SRS NFR-011): test card w/ live clock, morning cartoon
 *    (rickshaw & kite), cricket scoreboard, Eid greeting card.
 *  • Accessibility: every control is also a keyboard-operable button;
 *    prefers-reduced-motion disables noise animation/flicker.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { RadioTower } from "lucide-react";
import { toBn } from "@/lib/bn";

const CHANNELS = [
  { id: 1, label: "চ্যানেল ১", name_bn: "পরীক্ষা সম্প্রচার" },
  { id: 2, label: "চ্যানেল ২", name_bn: "বাতাবি লেবু" },
  { id: 3, label: "চ্যানেল ৩", name_bn: "সকালের কার্টুন" },
  { id: 4, label: "চ্যানেল ৪", name_bn: "ক্রিকেট" },
  { id: 5, label: "চ্যানেল ৫", name_bn: "ঈদের শুভেচ্ছা" },
  { id: 6, label: "চ্যানেল ৬", name_bn: "সংবাদ সারসংক্ষেপ" },
  // Real broadcast clips — product-owner decision 2026-11-16 (see README decision log; deviates from SRS NFR-011).
  { id: 7, label: "চ্যানেল ৭", name_bn: "মিনার গান" },
  { id: 8, label: "চ্যানেল ৮", name_bn: "বিটিভির ঘোষণা" },
  { id: 9, label: "চ্যানেল ৯", name_bn: "এটিএন বাংলার সংবাদ" },
];

export default function RetroTV() {
  const [antennaAngle, setAntennaAngle] = useState(-30);
  const [targetAngle, setTargetAngle] = useState(14);
  const [channel, setChannel] = useState(2); // antenna fixed → বাতাবি লেবু first (the people's reward)
  const [volume, setVolume] = useState(55);
  const [fixedOnce, setFixedOnce] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false); // any real interaction happened → sound allowed
  const [zapBurst, setZapBurst] = useState(0); // >0 → brief static overlay on channel change
  const [showHint, setShowHint] = useState(false);
  const [clock, setClock] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const antennaRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
  const dragState = useRef<{ knob: "channel" | "volume" | null; startX: number; startVal: number }>({ knob: null, startX: 0, startVal: 0 });

  // signal quality: distance from the antenna's sweet spot, with a small
  // deadzone so the signal locks cleanly. 0 = clear, 1 = full ঝিরঝির.
  // (Bug fix 2026-11-15: the old pre-fix branch had a hard floor of 0.35,
  // which made isFixed unreachable — intensity dropped but never cleared.)
  const misalignment = Math.abs(antennaAngle - targetAngle);
  const DEADZONE = 9; // degrees of tolerance where the picture locks
  const staticLevel = Math.min(1, Math.max(zapBurst, misalignment <= DEADZONE ? 0 : (misalignment - DEADZONE) / 36));
  const isFixed = staticLevel < 0.12;

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ---- canvas static (ঝিরঝির) ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = (canvas.width = 120);
    const H = (canvas.height = 90);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const draw = () => {
      const img = ctx.createImageData(W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- audio (white noise, gain follows static level & volume) ----
  const ensureAudio = useCallback(() => {
    setAudioUnlocked(true); // every TV interaction is a user gesture → autoplay-with-sound unlocks
    if (audioRef.current) return audioRef.current;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(ctx.destination);
      src.start();
      audioRef.current = { ctx, gain };
      return audioRef.current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const target = staticLevel * (volume / 100) * 0.18;
    a.gain.gain.setTargetAtTime(target, a.ctx.currentTime, 0.08);
  }, [staticLevel, volume]);

  // ---- signal lock ----
  useEffect(() => {
    if (!fixedOnce && isFixed) {
      setFixedOnce(true);
      setZapBurst(1);
      const t = setTimeout(() => setZapBurst(0), 500);
      return () => clearTimeout(t);
    }
  }, [isFixed, fixedOnce]);

  // ---- antenna interactions ----
  const nudgeAntenna = () => {
    ensureAudio();
    // each tap moves ~35% closer to the sweet spot, with a little wobble
    setAntennaAngle((a) => {
      const next = a + (targetAngle - a) * 0.35 + (Math.random() - 0.5) * 6;
      return Math.max(-45, Math.min(45, next));
    });
  };

  const onAntennaPointerDown = (e: React.PointerEvent) => {
    ensureAudio();
    const onMove = (ev: PointerEvent) => {
      // pivot = the antenna rod's own base; angle measured from straight-up
      // (Bug fix 2026-11-15: old math was rotated by ~90°, so dragging felt wrong.)
      const rect = antennaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.bottom;
      const dx = ev.clientX - cx;
      const up = cy - ev.clientY;
      if (up <= 0) return; // pointer below the base — ignore
      const deg = (Math.atan2(dx, up) * 180) / Math.PI;
      setAntennaAngle(Math.max(-45, Math.min(45, deg)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ---- knobs ----
  const changeChannel = (dir: 1 | -1) => {
    ensureAudio();
    setChannel((c) => {
      const next = ((c - 1 + dir + CHANNELS.length) % CHANNELS.length) + 1;
      return next;
    });
    setZapBurst(1);
    setTimeout(() => setZapBurst(0), 350);
  };

  const changeVolume = (dir: 1 | -1) => {
    ensureAudio();
    setVolume((v) => Math.max(0, Math.min(100, v + dir * 10)));
  };

  const onKnobPointerDown = (knob: "channel" | "volume") => (e: React.PointerEvent) => {
    ensureAudio();
    dragState.current = { knob, startX: e.clientX, startVal: knob === "channel" ? channel : volume };
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragState.current.startX;
      if (knob === "volume") {
        setVolume(Math.max(0, Math.min(100, dragState.current.startVal + dx)));
      } else {
        const step = Math.round(dx / 28);
        const next = (((dragState.current.startVal - 1 + step) % CHANNELS.length) + CHANNELS.length) % CHANNELS.length + 1;
        setChannel((cur) => {
          if (cur !== next) {
            setZapBurst(1);
            setTimeout(() => setZapBurst(0), 300);
          }
          return next;
        });
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dragState.current.knob = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="relative mx-auto w-full max-w-md select-none" ref={tvRef}>
      {/* antennas (interactive) */}
      <div className="pointer-events-none absolute -top-12 left-1/2 z-0 flex w-64 -translate-x-1/2 justify-between">
        <div
          ref={antennaRef}
          role="slider"
          tabIndex={0}
          aria-label="টিভির অ্যান্টেনা — ঝিরঝির ঠিক করতে টেনে ধরো বা বারবার চাপো"
          aria-valuenow={Math.round(antennaAngle)}
          aria-valuemin={-45}
          aria-valuemax={45}
          onPointerDown={onAntennaPointerDown}
          onClick={nudgeAntenna}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setAntennaAngle((a) => Math.max(-45, Math.min(45, a + (e.key === "ArrowRight" ? 5 : -5))));
            }
          }}
          className="pointer-events-auto absolute right-0 bottom-0 h-24 w-1.5 origin-bottom cursor-grab rounded-full bg-ink transition-transform active:cursor-grabbing"
          style={{ transform: `rotate(${antennaAngle}deg)` }}
        >
          <span className="absolute -top-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-ink" />
        </div>
        <div className="absolute left-0 bottom-0 h-20 w-1.5 origin-bottom rotate-[28deg] rounded-full bg-ink" />
      </div>

      {/* wooden body */}
      <div className="relative z-10 mt-12 rounded-[2rem] border-4 border-ink bg-gradient-to-br from-wood via-[#6b4a2a] to-wood p-4 shadow-hard-lg">
        <div className="grid grid-cols-[1fr_auto] gap-4">
          {/* screen */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border-4 border-ink bg-brand-deep">
            {/* channel content */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${isFixed ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
              {channel === 1 && <TestCard clock={clock} />}
              {channel === 2 && <BatabiLebuChannel />}
              {channel === 3 && <CartoonChannel />}
              {channel === 4 && <CricketChannel />}
              {channel === 5 && <EidChannel />}
              {channel === 6 && <NewsChannel clock={clock} />}
              {channel === 7 && <VideoChannel src="/tv/meena-song.mp4" label="মিনার গান" volume={volume} audioUnlocked={audioUnlocked} />}
              {channel === 8 && <VideoChannel src="/tv/btv-announcement.mp4" label="বিটিভির ঘোষণা" volume={volume} audioUnlocked={audioUnlocked} />}
              {channel === 9 && <VideoChannel src="/tv/atn-news.mp4" label="এটিএন বাংলার সংবাদ" volume={volume} audioUnlocked={audioUnlocked} />}
            </div>

            {/* static overlay */}
            <canvas
              ref={canvasRef}
              className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-300 ${isFixed ? "opacity-0" : "opacity-90"}`}
              style={{ imageRendering: "pixelated", opacity: isFixed ? 0 : Math.max(0.15, staticLevel) }}
              aria-hidden="true"
            />

            {/* glass effects */}
            <div className="crt-glow pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="scanlines pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

            {/* live badge + channel indicator */}
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded border border-paper/30 bg-ink/50 px-1.5 py-0.5 text-[10px] font-bold text-marigold">
              <span className={`inline-block h-1.5 w-1.5 rounded-full bg-flame ${isFixed ? "animate-pulse" : ""}`} />
              {isFixed ? "সরাসরি সম্প্রচার" : "ঝিরঝির…"}
            </div>
            <div className="absolute bottom-2 right-2 rounded border border-paper/30 bg-ink/50 px-1.5 py-0.5 text-[10px] font-bold text-paper">
              {CHANNELS[channel - 1].label}
            </div>

            {/* status line for screen readers */}
            <p className="sr-only" aria-live="polite">
              {isFixed
                ? `সিগন্যাল পরিষ্কার — ${CHANNELS[channel - 1].name_bn} দেখানো হচ্ছে`
                : "টিভিতে ঝিরঝির চলছে — অ্যান্টেনা ধরে ঘুরিয়ে ঠিক করো"}
            </p>

            {/* hint */}
            {!fixedOnce && showHint && (
              <div className="absolute inset-x-3 bottom-3 animate-bounce rounded-lg border-2 border-marigold bg-ink/80 px-2 py-1.5 text-center text-[11px] font-bold text-marigold">
                <RadioTower className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                অ্যান্টেনা ধরে ঘুরাও বা টোকা দাও — ঝিরঝির থামবে!
              </div>
            )}
          </div>

          {/* side panel: knobs + grille */}
          <div className="flex w-14 flex-col items-center justify-between gap-3 rounded-xl border-2 border-ink/40 bg-[#7a5433] py-3">
            <Knob
              label="চ্যানেল বদলাও"
              rotate={((channel - 1) * 360) / CHANNELS.length + 20}
              marker={toBn(channel)}
              onPointerDown={onKnobPointerDown("channel")}
              onClick={() => changeChannel(1)}
              onWheel={(e) => {
                e.preventDefault();
                changeChannel(e.deltaY > 0 ? 1 : -1);
              }}
            />
            <Knob
              label="ভলিউম কমাও-বাড়াও"
              rotate={(volume / 100) * 270 - 135 + 20}
              marker={toBn(volume)}
              onPointerDown={onKnobPointerDown("volume")}
              onClick={() => changeVolume(1)}
              onWheel={(e) => {
                e.preventDefault();
                changeVolume(e.deltaY > 0 ? 1 : -1);
              }}
            />
            <div className="grille h-10 w-9 rounded-md border border-ink/40" aria-hidden="true" />
          </div>
        </div>

        {/* feet */}
        <div className="mt-3 flex justify-between px-8" aria-hidden="true">
          <div className="h-3 w-10 rounded-b-lg border-2 border-t-0 border-ink bg-ink" />
          <div className="h-3 w-10 rounded-b-lg border-2 border-t-0 border-ink bg-ink" />
        </div>
      </div>

      {/* caption */}
      <p className="mt-3 text-center text-xs font-semibold text-ink-soft">
        {isFixed ? "ভালো করেছ! এবার নব ঘুরিয়ে চ্যানেল বদলাও" : "ঝিরঝির বন্ধ করতে অ্যান্টেনা নিয়ে খেলো — একদম সেই আমলের মতো"}
      </p>
    </div>
  );
}

function Knob({
  label,
  rotate,
  marker,
  onPointerDown,
  onClick,
  onWheel,
}: {
  label: string;
  rotate: number;
  marker: string;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: () => void;
  onWheel: (e: React.WheelEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onWheel={onWheel}
      className="relative h-11 w-11 cursor-grab touch-none rounded-full border-2 border-ink bg-brass shadow-hard-sm transition-transform active:cursor-grabbing active:scale-95"
    >
      <span
        className="absolute inset-0 transition-transform duration-200"
        style={{ transform: `rotate(${rotate}deg)` }}
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-0.5 h-3 w-1 -translate-x-1/2 rounded bg-ink" />
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-ink/70">
        {marker}
      </span>
    </button>
  );
}

/* ---------------- video channels (local clips; sound = volume knob) ---------------- */

function VideoChannel({
  src,
  label,
  volume,
  audioUnlocked,
}: {
  src: string;
  label: string;
  volume: number;
  audioUnlocked: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  // Videos start muted (autoplay policy). The moment the viewer has touched any
  // TV control (antenna/knobs — all real gestures), sound unlocks and follows
  // the volume knob: 0 = silent, 100 = full. No separate mute UI.
  useEffect(() => {
    const v = ref.current;
    if (!v || !audioUnlocked) return;
    if (volume === 0) {
      v.muted = true;
      return;
    }
    v.volume = volume / 100;
    v.muted = false;
    void v.play().catch(() => {
      // still blocked by a strict browser → keep playing muted, no crash
      v.muted = true;
    });
  }, [volume, audioUnlocked]);

  return (
    <div className="absolute inset-0 bg-black">
      <video
        ref={ref}
        src={src}
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={label}
      />
      <p className="pointer-events-none absolute left-2 top-2 rounded bg-ink/60 px-1.5 py-0.5 text-[10px] font-bold text-paper/90">
        {label}
      </p>
      {volume === 0 && audioUnlocked && (
        <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-paper/80">
          🔇 ভলিউম নব ঘুরিয়ে সাউন্ড চালু করো
        </p>
      )}
    </div>
  );
}

/* ---------------- original animated "broadcasts" (CSS only) ---------------- */

/**
 * "বাতাবি লেবু" — an ORIGINAL animated homage to BTV's endlessly rerun
 * educational fillers (the real clips are state-broadcaster property, so we
 * recreate the *memory*, not the footage: the slow zoom, the spotlit fruit,
 * the matter-of-fact caption bar).
 */
function BatabiLebuChannel() {
  const captions = [
    "বাতাবি লেবু",
    "ভিটামিন সি-এর ভাণ্ডার",
    "রসে ভরপুর, শরীরে সবৃদ্ধ",
    "আগে খোসা, তারপর ফালি",
  ];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#24403b]">
      {/* studio spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(250,241,221,0.22),transparent_60%)]" aria-hidden="true" />
      <p className="absolute left-2 top-2 rounded bg-ink/60 px-1.5 py-0.5 text-[10px] font-bold text-paper/90">শিক্ষামূলক ফিলার</p>

      {/* the fruit, with a slow documentary zoom */}
      <div className="absolute inset-x-0 top-[16%] flex justify-center">
        <div className="relative animate-[fruit-zoom_7s_ease-in-out_infinite_alternate]" aria-hidden="true">
          <div className="h-20 w-20 rounded-full bg-[radial-gradient(circle_at_34%_30%,#e5ef9e,#aebd3a_58%,#7a8c26)] shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
            {/* dimpled peel */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_60%_20%,rgba(255,255,255,0.28),transparent_38%)]" />
            <div className="absolute inset-0 rounded-full opacity-30 bg-[repeating-radial-gradient(circle_at_50%_50%,transparent_0_7px,rgba(0,0,0,0.16)_7px_8px)]" />
          </div>
          {/* leaf */}
          <div className="absolute -top-2 left-1/2 h-3.5 w-6 -translate-x-1/2 rotate-12 rounded-full border border-ink/40 bg-[#5d8c3a]" />
          {/* stem dot */}
          <div className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#5d4a1e]" />
        </div>
      </div>

      {/* table line */}
      <div className="absolute inset-x-8 bottom-[34%] h-1.5 rounded bg-wood/70" aria-hidden="true" />

      {/* classic caption bar, cycling like the narrator's lines */}
      <div className="absolute inset-x-4 bottom-5 h-9 overflow-hidden rounded border-2 border-paper/40 bg-ink/85" aria-hidden="true">
        {captions.map((c, i) => (
          <p
            key={c}
            className="absolute inset-0 flex items-center justify-center font-display text-base font-bold text-[#ffe08a]"
            style={{ animation: `caption-cycle 12s ease-in-out ${i * 3}s infinite` }}
          >
            {c}
          </p>
        ))}
      </div>
    </div>
  );
}

/** BTV-style evening bulletin — globe, strap, ticker (all original art). */
function NewsChannel({ clock }: { clock: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#132c47]">
      {/* spinning globe */}
      <div className="absolute right-3 top-3 h-14 w-14 overflow-hidden rounded-full border-2 border-paper/50 bg-[#1e4d7b]" aria-hidden="true">
        <div
          className="absolute inset-0 animate-[globe-spin_6s_linear_infinite] bg-[repeating-linear-gradient(90deg,rgba(163,210,254,0.55)_0_3px,transparent_3px_14px),radial-gradient(circle_at_50%_50%,rgba(163,210,254,0.35)_0_6px,transparent_7px_20px)]"
        />
      </div>
      {/* news strap */}
      <div className="absolute left-2 top-2 flex items-center gap-2">
        <span className="rounded bg-flame px-2 py-0.5 font-display text-xs font-extrabold text-paper">সংবাদ</span>
        <span className="rounded bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-paper/90">{clock || "সন্ধ্যা ৭টা"}</span>
      </div>
      {/* headline card */}
      <div className="absolute inset-x-4 top-1/3 rounded-lg border-2 border-paper/40 bg-[#0e2438]/90 p-3 text-center">
        <p className="font-display text-sm font-bold leading-[1.45] text-paper">
          আজকের শিরোনাম: দেশজুড়ে বৃষ্টির পূর্বাভাস
        </p>
        <p className="mt-1 text-[10px] text-paper/70">সবাই ছাতা নিয়ে বের হওয়ার অনুরোধ জানানো হলো</p>
      </div>
      {/* ticker */}
      <div className="absolute inset-x-0 bottom-0 border-t-2 border-marigold/70 bg-ink/85 py-1" aria-hidden="true">
        <div className="marquee-track gap-10 px-2 text-[10px] font-bold text-marigold">
          {["বিদ্যুৎ বিভ্রাট রাত ৮টায়", "কাল সকালে কুয়াশা", "ঈদ উপলক্ষে বিশেষ অনুষ্ঠান", "সিসিমপুরে আজ নতুন পর্ব", "পরীক্ষার সময়সূচি ঘোষিত"].map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              {t} <span className="text-paper/60">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TestCard({ clock }: { clock: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
      <div className="flex h-1/2 w-full" aria-hidden="true">
        {["#c8c8c8", "#c8c800", "#00c8c8", "#00c800", "#c800c8", "#c80000", "#0000c8"].map((c) => (
          <span key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="rounded-xl border-2 border-paper/70 bg-ink/60 px-4 py-2 text-center">
          <p className="font-display text-sm font-bold text-paper">শুভ সম্প্রচার</p>
          <p className="font-display text-3xl font-extrabold text-marigold tabular-nums">{clock || "--:--"}</p>
        </div>
      </div>
    </div>
  );
}

function CartoonChannel() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#7ec8e3] via-[#a8d8b9] to-[#d8e8c8]">
      {/* sun */}
      <div className="absolute right-5 top-3 h-10 w-10 animate-[sun-pulse_3s_ease-in-out_infinite] rounded-full bg-marigold shadow-[0_0_24px_6px_rgba(249,187,41,0.55)]" aria-hidden="true" />
      {/* clouds */}
      <div className="absolute left-6 top-4 h-3.5 w-14 animate-[drift_9s_linear_infinite] rounded-full bg-white/80" aria-hidden="true" />
      <div className="absolute left-20 top-9 h-3 w-10 animate-[drift_13s_linear_infinite] rounded-full bg-white/70" aria-hidden="true" />
      {/* road */}
      <div className="absolute inset-x-0 bottom-0 h-8 bg-[#8a7a66]">
        <div className="mt-3 h-0.5 w-full bg-[repeating-linear-gradient(to_right,#faf1dd_0_14px,transparent_14px_28px)]" aria-hidden="true" />
      </div>
      {/* rickshaw driving past */}
      <div className="absolute bottom-5 animate-[drive_7s_linear_infinite]" aria-hidden="true">
        <div className="relative">
          <div className="h-6 w-10 rounded-md border-2 border-ink bg-flame" />
          <div className="absolute -top-3 left-1 h-3.5 w-7 rounded-t-md border-2 border-ink bg-marigold" />
          <div className="absolute -top-5 left-6 h-3 w-6 border-2 border-b-0 border-ink rounded-t-full bg-paper-card" />
          <div className="absolute -bottom-1.5 left-1 h-2.5 w-2.5 rounded-full border border-ink bg-ink" />
          <div className="absolute -bottom-1.5 right-1 h-2.5 w-2.5 rounded-full border border-ink bg-ink" />
        </div>
      </div>
      {/* kite */}
      <div className="absolute left-8 top-10 animate-[kite_5s_ease-in-out_infinite]" aria-hidden="true">
        <div className="h-5 w-5 rotate-45 border-2 border-ink bg-rose" />
      </div>
      <p className="absolute left-2 top-2 rounded bg-ink/50 px-1.5 py-0.5 text-[10px] font-bold text-paper">সকালের কার্টুন</p>
    </div>
  );
}

function CricketChannel() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0e3b23]">
      <p className="rounded bg-ink/50 px-2 py-0.5 text-[10px] font-bold text-marigold">লাইভ স্কোর</p>
      <div className="rounded-lg border-2 border-paper/60 bg-[#12492c] px-4 py-2 text-center">
        <p className="font-display text-2xl font-extrabold text-paper tabular-nums">১৮/২</p>
        <p className="text-[10px] font-semibold text-paper/80">শেষ ওভারে ৬ দরকার</p>
      </div>
      {/* bouncing ball + stumps */}
      <div className="relative mt-1 h-8 w-40" aria-hidden="true">
        <div className="absolute bottom-0 left-1 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-6 w-1 rounded-t bg-paper/90" />
          ))}
        </div>
        <div className="absolute bottom-1 left-16 h-2.5 w-2.5 animate-[ball_1.6s_ease-in_infinite] rounded-full bg-marigold" />
        <div className="absolute bottom-2 right-2 h-4 w-1.5 origin-bottom animate-[bat_1.6s_ease-in_infinite] rounded-full bg-wood" />
      </div>
      <p className="mt-1 animate-pulse text-[10px] font-bold text-marigold">ছক্কা!!! জয় আমাদেরই!</p>
    </div>
  );
}

function EidChannel() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand-deep">
      <div className="relative">
        <div className="h-12 w-12 animate-[moon-glow_4s_ease-in-out_infinite] rounded-full bg-[#f5e9c8] shadow-[0_0_26px_8px_rgba(245,233,200,0.35)]" />
        <span className="absolute right-1.5 top-1.5 h-9 w-9 rounded-full bg-brand-deep" aria-hidden="true" />
      </div>
      <p className="font-display text-2xl font-extrabold text-marigold">ঈদ মোবারক</p>
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-rose"
            style={{ animation: `twinkle 1.8s ease-in-out ${i * 0.25}s infinite` }}
          />
        ))}
      </div>
      <p className="text-[10px] font-semibold text-paper/80">শুভেচ্ছা বিনিময়ের সেই দিনগুলো</p>
    </div>
  );
}
