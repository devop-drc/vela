/**
 * The hero film (built from src/compositions/HeroFilm.tsx) — THEME-AWARE:
 * picks the light or dark render to match the landing's theme, remounting
 * the <video> on theme change so the new sources load.
 *
 * Delivery is tiered for performance (the full renders are ~13 MB each):
 *  • Phones / save-data: the POSTER is the hero visual — zero video bytes,
 *    zero decode work. A play chip loads the small 960px mobile MP4 on tap.
 *  • Desktop: `preload="none"` + IntersectionObserver — the film starts
 *    fetching only once visible, so it never competes with first paint.
 *    Alpha WebM preferred (floats over the page); MP4 fallback as a card.
 *  • Reduced motion: poster only, no autoplay anywhere.
 *
 * Tapping/clicking the film toggles fullscreen (landscape-locked), and a close
 * button sits in the corner while it's open. Only Android Chrome honours the
 * orientation lock; iOS fullscreens the <video> and rotates itself (with its
 * own native Done button), and desktop just goes fullscreen — every leg falls
 * back to "keeps playing" rather than failing.
 *
 * Re-render commands live in the HeroFilm.tsx header (4 outputs + posters;
 * mobile MP4s via the ffmpeg commands there too).
 */
import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

const isSmall = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(max-width: 767px)").matches || (navigator as any).connection?.saveData === true);

/* Vendor-prefixed fullscreen + the orientation lock aren't in lib.dom yet. */
type VendorVideo = HTMLVideoElement & {
  webkitRequestFullscreen?: () => void;
  webkitEnterFullscreen?: () => void;
};
type VendorElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type VendorDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

/* mirrors THEMES[*].bakedBg in src/compositions/HeroFilm.tsx */
const BAKED_BG = {
  light: "radial-gradient(120% 130% at 50% 0%, #FDF4F0 0%, #F7E7E4 45%, #F3D9D6 100%)",
  dark: "radial-gradient(120% 130% at 50% 0%, #241318 0%, #1A0F13 45%, #140A0E 100%)",
};

const fullscreenElement = () =>
  document.fullscreenElement || (document as VendorDocument).webkitFullscreenElement || null;

const releaseOrientation = () => {
  try { (screen.orientation as LockableOrientation)?.unlock?.(); } catch { /* not supported */ }
};

/** Go fullscreen, then landscape where the platform allows it.
 *
 *  The WRAPPER goes fullscreen, not the <video> — a video element can't have
 *  children, and the close button has to live inside the fullscreen element
 *  to be visible at all. iOS Safari can only fullscreen the <video> itself,
 *  so it falls back to that and gets Apple's native player (with its own Done
 *  button and rotation). orientation.lock() rejects on iOS and on desktop —
 *  there the film simply plays fullscreen without rotating. */
const goFullscreenLandscape = async (wrapper: HTMLElement | null, video: HTMLVideoElement | null) => {
  const w = wrapper as VendorElement | null;
  const v = video as VendorVideo | null;
  try {
    if (w?.requestFullscreen) await w.requestFullscreen();
    else if (w?.webkitRequestFullscreen) w.webkitRequestFullscreen();
    else if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen(); // iOS
    else return;
  } catch {
    return; // no fullscreen (or the gesture expired) — leave it playing inline
  }
  try {
    await (screen.orientation as LockableOrientation)?.lock?.("landscape");
  } catch {
    /* not supported / not permitted — the native player handles rotation */
  }
};

const exitFullscreen = () => {
  const d = document as VendorDocument;
  if (document.exitFullscreen) void document.exitFullscreen().catch(() => {});
  else d.webkitExitFullscreen?.();
};

export default function HeroFilmVideo({ dark }: { dark?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"alpha" | "card">("alpha");
  const [small] = useState(isSmall);
  const [mobilePlay, setMobilePlay] = useState(false);
  const [fs, setFs] = useState(false);
  // set when the phone poster is tapped, so the <video> that mounts right
  // after can carry that same gesture into fullscreen
  const wantFs = useRef(false);
  const suffix = dark ? "-dark" : "";
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => setMode(v.currentSrc.endsWith(".webm") ? "alpha" : "card");
    v.addEventListener("loadedmetadata", onMeta);
    if (reduce) return () => v.removeEventListener("loadedmetadata", onMeta);
    // Fetch + play only while visible; pause (and stop buffering) offscreen.
    const io = new IntersectionObserver(
      ([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => { io.disconnect(); v.removeEventListener("loadedmetadata", onMeta); };
  }, [dark, mobilePlay, reduce]);

  // Track fullscreen so the film can letterbox instead of crop, and release
  // the orientation lock on the way out.
  useEffect(() => {
    const v = ref.current;
    const sync = () => {
      const active = !!fullscreenElement();
      setFs(active);
      if (!active) releaseOrientation();
    };
    const onIosEnd = () => { setFs(false); releaseOrientation(); };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    v?.addEventListener("webkitendfullscreen", onIosEnd);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      v?.removeEventListener("webkitendfullscreen", onIosEnd);
    };
  }, [mobilePlay]);

  // The phone path mounts the <video> only after the poster is tapped — carry
  // that tap through to fullscreen (browsers keep the activation alive for a
  // few seconds, and if it has lapsed the film just plays inline).
  useEffect(() => {
    if (!wantFs.current) return;
    wantFs.current = false;
    void goFullscreenLandscape(wrapRef.current, ref.current);
  }, [mobilePlay]);

  // one tap toggles: into fullscreen, or back out of it
  const toggleFullscreen = () => {
    if (fullscreenElement()) { exitFullscreen(); return; }
    void ref.current?.play().catch(() => {});
    void goFullscreenLandscape(wrapRef.current, ref.current);
  };

  // ── Phones: poster as the hero image (fast LCP), tap streams the small MP4 ──
  if (small && !mobilePlay) {
    return (
      <button
        type="button"
        onClick={() => {
          if (reduce) return;
          wantFs.current = true;
          setMobilePlay(true);
        }}
        className="group relative block w-full overflow-hidden rounded-[1.75rem] border border-border shadow-2xl shadow-red-900/15"
        aria-label="Luaj videon — Vela, nga Instagrami te dyqani online"
      >
        <img
          src={`/hero/hero-film-poster${suffix}.jpg`}
          alt="Vela — nga Instagrami te dyqani online"
          className="block aspect-[16/10] w-full object-cover"
          {...{ fetchpriority: "high" }}
          decoding="async"
        />
        {!reduce && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform group-active:scale-95">
              <Play className="ml-0.5 h-6 w-6 fill-current" />
            </span>
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={cn("relative w-full", fs && "grid h-full place-items-center")}
      // the alpha WebM is transparent by design (it floats over the page), so
      // fullscreen would drop it onto black — paint HeroFilm's own bakedBg
      // behind it instead
      style={fs ? { background: dark ? BAKED_BG.dark : BAKED_BG.light } : undefined}
    >
      <video
        key={suffix + (small ? "-m" : "")} // remount on theme switch so the matching render loads
        ref={ref}
        className={cn(
          "block cursor-pointer",
          // Fullscreen letterboxes (the film is 16:10, most screens aren't).
          // Capped in VIEWPORT units on purpose: the centred grid row is
          // content-sized, so percentage caps resolve cyclically and get
          // dropped, and the video overflows at its intrinsic 2240×1400.
          fs
            ? "h-auto max-h-[100vh] w-auto max-w-[100vw] object-contain"
            : "aspect-[16/10] w-full object-cover",
          !fs && (mode === "card" || small) && "rounded-[1.75rem] border border-border shadow-2xl shadow-red-900/15",
        )}
        poster={`/hero/hero-film-poster${suffix}.jpg`}
        muted
        loop
        playsInline
        autoPlay={!reduce}
        preload="none"
        role="button"
        tabIndex={0}
        onClick={toggleFullscreen}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          toggleFullscreen();
        }}
        aria-label={
          fs
            ? "Vela — nga Instagrami te dyqani online. Dil nga ekrani i plotë"
            : "Vela — nga Instagrami te dyqani online. Shfaq në ekran të plotë"
        }
      >
        {small ? (
          <source src={`/hero/hero-film-mobile${suffix}.mp4`} type="video/mp4" />
        ) : (
          <>
            <source src={`/hero/hero-film${suffix}.webm`} type="video/webm" />
            <source src={`/hero/hero-film${suffix}.mp4`} type="video/mp4" />
          </>
        )}
      </video>

      {fs && (
        <button
          type="button"
          onClick={exitFullscreen}
          className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:top-6"
          aria-label="Dil nga ekrani i plotë"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
