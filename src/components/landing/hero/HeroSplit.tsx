/**
 * Player shell for the hero film. We do NOT rely on the Player's autoPlay —
 * browsers' autoplay policy can block <Player> playback (it pre-allocates audio
 * tags and starting playback needs a gesture), which leaves it paused until a
 * tab switch. Instead we drive the frame ourselves with requestAnimationFrame +
 * seekTo(), which isn't gated. Advances only while on-screen and the tab is
 * visible; resumes seamlessly.
 */
import { useEffect, useRef } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { HeroSplitFilm, FPS, HERO_FRAMES } from "./HeroSplitFilm";
import type { LandingCopy } from "../copy";

export default function HeroSplit({
  copy,
  lang,
  layout = "landscape",
}: {
  copy: LandingCopy;
  lang: "sq" | "en";
  layout?: "landscape" | "portrait";
}) {
  const playerRef = useRef<PlayerRef>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const portrait = layout === "portrait";
  const W = portrait ? 480 : 1120;
  const H = portrait ? 760 : 620;

  useEffect(() => {
    // Dev-only: freeze on a specific frame for visual inspection (?heroFrame=46)
    const frozen = new URLSearchParams(window.location.search).get("heroFrame");
    if (frozen != null) {
      const id = requestAnimationFrame(() => playerRef.current?.seekTo(Number(frozen)));
      return () => cancelAnimationFrame(id);
    }

    let raf = 0;
    let startTs: number | null = null;
    let onScreen = true;

    const el = wrapRef.current;
    let obs: IntersectionObserver | undefined;
    if (el) {
      obs = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; if (onScreen) startTs = null; },
        { threshold: 0.05 },
      );
      obs.observe(el);
    }

    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const p = playerRef.current;
      if (!p || !onScreen || document.hidden) { startTs = null; return; }
      // Anchor the clock to the current frame so pause/resume is seamless.
      if (startTs == null) startTs = ts - (p.getCurrentFrame() / FPS) * 1000;
      const frame = Math.floor(((ts - startTs) / 1000) * FPS) % HERO_FRAMES;
      p.seekTo(frame);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); obs?.disconnect(); };
  }, []);

  return (
    <div ref={wrapRef} className="ls-card relative overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-2xl shadow-fuchsia-900/10">
      <Player
        ref={playerRef}
        component={HeroSplitFilm as any}
        inputProps={{ copy, lang, layout }}
        durationInFrames={HERO_FRAMES}
        fps={FPS}
        compositionWidth={W}
        compositionHeight={H}
        style={{ width: "100%", aspectRatio: `${W} / ${H}` }}
        controls={false}
        clickToPlay={false}
        numberOfSharedAudioTags={0}
      />
    </div>
  );
}
