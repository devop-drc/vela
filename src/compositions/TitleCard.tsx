/**
 * TitleCard — a centered title + subtitle. Words spring up and unblur one after
 * another, an accent underline draws in, the subtitle rises, the whole card
 * floats gently while held, then lifts and fades out. Minimal on purpose.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { loadFont } from "@remotion/google-fonts/Inter";
import { springIn, exitLift, float } from "../lib/motion";

const { fontFamily } = loadFont();

export const titleCardSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  accent: zColor(),
});
export const titleCardDefaults: z.infer<typeof titleCardSchema> = {
  title: "Your Title Here",
  subtitle: "A clean, animated subtitle",
  accent: "#d946ef",
};

export const TitleCard = ({ title, subtitle, accent }: z.infer<typeof titleCardSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const words = title.split(" ");
  const exit = exitLift(frame, durationInFrames, 22, 44);
  const under = springIn(frame, fps, 10, { damping: 16 });
  const subS = springIn(frame, fps, 18, { damping: 18 });

  return (
    <AbsoluteFill style={{ background: "radial-gradient(130% 100% at 50% 0%, #17121f 0%, #0a0a0d 62%)", fontFamily }}>
      {/* soft accent bloom */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 640, height: 640, borderRadius: 999, background: accent, filter: "blur(160px)", opacity: 0.16 }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {/* title-safe: keep content within ~80% width */}
        <div style={{ maxWidth: width * 0.8, textAlign: "center", opacity: exit.opacity, transform: `translateY(${exit.y + float(frame)}px)` }}>
          <h1 style={{ margin: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.28em", fontSize: 118, fontWeight: 800, lineHeight: 1.02, color: "#fff", letterSpacing: "-0.02em" }}>
            {words.map((w, i) => {
              const s = springIn(frame, fps, i * 4, { damping: 12 });
              return (
                <span key={i} style={{ display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * 64}px)`, filter: `blur(${(1 - s) * 9}px)` }}>{w}</span>
              );
            })}
          </h1>
          <div style={{ height: 5, width: 132, margin: "30px auto 0", borderRadius: 5, background: accent, transform: `scaleX(${under})`, transformOrigin: "center" }} />
          <p style={{ margin: "26px 0 0", fontSize: 40, fontWeight: 500, color: "#b9b9c4", opacity: subS, transform: `translateY(${(1 - subS) * 22}px)` }}>{subtitle}</p>
        </div>
      </AbsoluteFill>

      {/*
        Sound effect example — drop a file in public/ and uncomment:
        import { Audio, Sequence, staticFile } from "remotion";
        <Sequence from={0}><Audio src={staticFile("whoosh.mp3")} /></Sequence>
      */}
    </AbsoluteFill>
  );
};
