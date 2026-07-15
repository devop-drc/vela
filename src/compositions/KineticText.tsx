/**
 * KineticText — a short phrase that snaps in word by word with overshoot,
 * breathes gently while held, then flies up and out. Long phrases auto-fit
 * (shrink + wrap) so nothing overflows.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { loadFont } from "@remotion/google-fonts/Inter";
import { springIn } from "../lib/motion";

const { fontFamily } = loadFont();

export const kineticTextSchema = z.object({
  phrase: z.string(),
  accent: zColor(),
});
export const kineticTextDefaults: z.infer<typeof kineticTextSchema> = {
  phrase: "Move with intention",
  accent: "#d946ef",
};

export const KineticText = ({ phrase, accent }: z.infer<typeof kineticTextSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const words = phrase.trim().split(/\s+/);

  // auto-fit: shrink as the phrase gets longer
  const base = 150;
  const fontSize = Math.max(56, Math.min(base, (base * 26) / Math.max(phrase.length, 1)));

  const out = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const breathe = 1 + Math.sin(frame / 22) * 0.012;

  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 100% at 50% 50%, #14101c 0%, #09090c 70%)", fontFamily, alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: width * 0.8, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.3em", transform: `scale(${breathe})`, opacity: 1 - out }}>
        {words.map((w, i) => {
          const s = springIn(frame, fps, i * 5, { damping: 11, stiffness: 140 });
          // each word: overshoot up + settle; flies further up on exit, staggered
          const y = (1 - s) * 70 - out * (60 + i * 12);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontSize,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: i % 2 === 1 ? accent : "#ffffff",
                opacity: s * (1 - out),
                transform: `translateY(${y}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
