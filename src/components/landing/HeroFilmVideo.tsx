/**
 * The hero film (built from src/compositions/HeroFilm.tsx) — THEME-AWARE:
 * picks the light or dark render to match the landing's theme, remounting
 * the <video> on theme change so the new sources load.
 * Prefers the ALPHA WebM (film floats transparently over the live page,
 * like the navbar glass); falls back to the MP4 (baked backdrop) on
 * browsers without VP9-alpha (Safari), rendered as a rounded card.
 * Pauses offscreen; poster-only under reduced motion.
 *
 * Re-render commands live in the HeroFilm.tsx header (4 outputs + posters).
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function HeroFilmVideo({ dark }: { dark?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"alpha" | "card">("alpha");
  const suffix = dark ? "-dark" : "";

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => setMode(v.currentSrc.endsWith(".webm") ? "alpha" : "card");
    v.addEventListener("loadedmetadata", onMeta);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => v.removeEventListener("loadedmetadata", onMeta);
    const io = new IntersectionObserver(
      ([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => { io.disconnect(); v.removeEventListener("loadedmetadata", onMeta); };
  }, [dark]);

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <video
      key={suffix} // remount on theme switch so the matching render loads
      ref={ref}
      className={cn(
        "block aspect-[16/10] w-full object-cover",
        mode === "card" && "rounded-[1.75rem] border border-border shadow-2xl shadow-red-900/15",
      )}
      poster={`/hero/hero-film-poster${suffix}.jpg`}
      muted
      loop
      playsInline
      autoPlay={!reduce}
      preload="metadata"
      aria-label="Vela — nga Instagrami te dyqani online"
    >
      <source src={`/hero/hero-film${suffix}.webm`} type="video/webm" />
      <source src={`/hero/hero-film${suffix}.mp4`} type="video/mp4" />
    </video>
  );
}
