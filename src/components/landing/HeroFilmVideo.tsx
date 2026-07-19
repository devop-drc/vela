/**
 * The hero film (built from src/compositions/HeroFilm.tsx).
 * Prefers the ALPHA WebM — the film floats transparently over the live page
 * background, like the navbar glass — and falls back to the MP4 (baked warm
 * backdrop) on browsers without VP9-alpha (Safari), where it renders as a
 * rounded card instead. Pauses offscreen; poster-only under reduced motion.
 *
 * Re-render:
 *   npx remotion render src/remotion.ts HeroFilm public/hero/hero-film.mp4 --codec=h264 --crf=22
 *   npx remotion render src/remotion.ts HeroFilm public/hero/hero-film.webm --codec=vp9 --image-format=png --pixel-format=yuva420p --props="{\"transparent\":true,\"lang\":\"sq\"}"
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function HeroFilmVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"alpha" | "card">("alpha");

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
  }, []);

  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <video
      ref={ref}
      className={cn(
        "block aspect-[16/10] w-full object-cover",
        mode === "card" && "rounded-[1.75rem] border border-border shadow-2xl shadow-red-900/15",
      )}
      poster="/hero/hero-film-poster.jpg"
      muted
      loop
      playsInline
      autoPlay={!reduce}
      preload="metadata"
      aria-label="Vela — nga Instagrami te dyqani online"
    >
      <source src="/hero/hero-film.webm" type="video/webm" />
      <source src="/hero/hero-film.mp4" type="video/mp4" />
    </video>
  );
}
