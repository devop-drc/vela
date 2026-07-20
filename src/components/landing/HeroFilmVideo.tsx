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
 * Re-render commands live in the HeroFilm.tsx header (4 outputs + posters;
 * mobile MP4s via the ffmpeg commands there too).
 */
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

const isSmall = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(max-width: 767px)").matches || (navigator as any).connection?.saveData === true);

export default function HeroFilmVideo({ dark }: { dark?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"alpha" | "card">("alpha");
  const [small] = useState(isSmall);
  const [mobilePlay, setMobilePlay] = useState(false);
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

  // ── Phones: poster as the hero image (fast LCP), tap streams the small MP4 ──
  if (small && !mobilePlay) {
    return (
      <button
        type="button"
        onClick={() => !reduce && setMobilePlay(true)}
        className="group relative block w-full overflow-hidden rounded-[1.75rem] border border-border shadow-2xl shadow-red-900/15"
        aria-label="Luaj videon — Vela, nga Instagrami te dyqani online"
      >
        <img
          src={`/hero/hero-film-poster${suffix}.jpg`}
          alt="Vela — nga Instagrami te dyqani online"
          className="block aspect-[16/10] w-full object-cover"
          fetchPriority="high"
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
    <video
      key={suffix + (small ? "-m" : "")} // remount on theme switch so the matching render loads
      ref={ref}
      className={cn(
        "block aspect-[16/10] w-full object-cover",
        (mode === "card" || small) && "rounded-[1.75rem] border border-border shadow-2xl shadow-red-900/15",
      )}
      poster={`/hero/hero-film-poster${suffix}.jpg`}
      muted
      loop
      playsInline
      autoPlay={!reduce}
      preload="none"
      aria-label="Vela — nga Instagrami te dyqani online"
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
  );
}
