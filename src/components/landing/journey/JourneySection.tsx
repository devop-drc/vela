/**
 * "The full journey" — a Remotion Player running the JourneyFilm, with a
 * chapter rail that stays in sync with playback. Clicking a chapter seeks
 * the film; the active chapter highlights as the film plays.
 */
import { useEffect, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { JourneyFilm, FPS, SCENE_FRAMES, TOTAL_FRAMES } from "./JourneyFilm";
import type { LandingCopy } from "../copy";

const BRAND = "brand-gradient";

export default function JourneySection({ copy }: { copy: LandingCopy }) {
  const playerRef = useRef<PlayerRef>(null);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  const wrapRef = useRef<HTMLDivElement>(null);

  // Keep the chapter rail in sync with the film.
  useEffect(() => {
    const t = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setActive(Math.min(9, Math.floor(p.getCurrentFrame() / SCENE_FRAMES)));
      setPlaying(p.isPlaying());
    }, 250);
    return () => clearInterval(t);
  }, []);

  // Pause when offscreen; always resume in view unless the USER paused.
  // (Deriving "was playing" from player state races autoPlay on mount —
  // the observer fires before playback starts and the film never begins.)
  const userPaused = useRef(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      const p = playerRef.current;
      if (!p) return;
      if (e.isIntersecting) {
        if (!userPaused.current) p.play();
      } else {
        p.pause();
      }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const seek = (i: number) => {
    userPaused.current = false;
    playerRef.current?.seekTo(i * SCENE_FRAMES + 1);
    playerRef.current?.play();
  };

  return (
    <div ref={wrapRef} className="grid items-start gap-8 lg:grid-cols-[1.9fr_1fr]">
      {/* Film */}
      <div className="ls-card relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        <Player
          ref={playerRef}
          component={JourneyFilm as any}
          inputProps={{ copy }}
          durationInFrames={TOTAL_FRAMES}
          fps={FPS}
          compositionWidth={960}
          compositionHeight={620}
          style={{ width: "100%", aspectRatio: "960 / 620" }}
          autoPlay
          loop
          clickToPlay
          controls={false}
          moveToBeginningWhenEnded
        />
        <button
          onClick={() => {
            userPaused.current = playing;
            if (playing) playerRef.current?.pause();
            else playerRef.current?.play();
          }}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-border bg-background/85 text-foreground shadow-lg backdrop-blur transition-transform hover:scale-105"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
        </button>
        {/* progress rail */}
        <div className="absolute inset-x-0 bottom-0 flex h-1 gap-0.5 px-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className={cn("flex-1 rounded-full transition-colors duration-300", i <= active ? BRAND : "bg-border")} />
          ))}
        </div>
      </div>

      {/* Chapters */}
      <div className="flex max-h-[560px] flex-col gap-1 overflow-y-auto pr-1">
        {copy.journey.steps.map((s, i) => {
          const isActive = i === active;
          const phaseStart = i === 0 || copy.journey.steps[i - 1].phase !== s.phase;
          return (
            <div key={i}>
              {phaseStart && (
                <div className="mb-1 mt-3 flex items-center gap-2 first:mt-0">
                  <span className={cn("h-1.5 w-1.5 rounded-full", BRAND)} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {copy.journey.phases[s.phase]}
                  </span>
                </div>
              )}
              <button
                onClick={() => seek(i)}
                className={cn(
                  "w-full rounded-xl border px-3.5 py-2.5 text-left transition-all",
                  isActive
                    ? "border-fuchsia-500/40 bg-fuchsia-500/5 shadow-sm"
                    : "border-transparent hover:border-border hover:bg-card"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    isActive ? cn("text-white", BRAND) : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <span className={cn("text-sm", isActive ? "font-semibold" : "font-medium text-muted-foreground")}>{s.t}</span>
                </div>
                {isActive && <p className="mt-1.5 pl-[30px] text-xs leading-relaxed text-muted-foreground">{s.d}</p>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
