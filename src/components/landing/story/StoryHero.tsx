/**
 * Player shell for the Vela story film. Like the old hero we don't rely on the
 * Player's autoPlay (browsers can block it); instead we advance the frame with
 * requestAnimationFrame + seekTo(), which isn't gated. Advances only while
 * on-screen and the tab is visible. `?heroFrame=N` freezes a frame for review.
 */
import { useEffect, useRef } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { StoryFilm, STORY_FRAMES, STORY_FPS, STORY_W, STORY_H } from "./StoryFilm";
import type { LandingCopy } from "../copy";

export default function StoryHero({
  copy,
  lang,
  dark = false,
}: {
  copy: LandingCopy;
  lang: "sq" | "en";
  dark?: boolean;
  layout?: "landscape" | "portrait";
}) {
  const playerRef = useRef<PlayerRef>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      if (startTs == null) startTs = ts - (p.getCurrentFrame() / STORY_FPS) * 1000;
      const frame = Math.floor(((ts - startTs) / 1000) * STORY_FPS) % STORY_FRAMES;
      p.seekTo(frame);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); obs?.disconnect(); };
  }, []);

  return (
    <div ref={wrapRef} className="film-stage relative">
      <Player
        ref={playerRef}
        component={StoryFilm as any}
        inputProps={{ copy, lang, dark }}
        durationInFrames={STORY_FRAMES}
        fps={STORY_FPS}
        compositionWidth={STORY_W}
        compositionHeight={STORY_H}
        style={{ width: "100%", aspectRatio: `${STORY_W} / ${STORY_H}`, background: "transparent" }}
        controls={false}
        clickToPlay={false}
        numberOfSharedAudioTags={0}
        acknowledgeRemotionLicense
      />
    </div>
  );
}
