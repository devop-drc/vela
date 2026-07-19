/**
 * StoryIntro — brand opener (1080x1920). The ship drops in, the tagline
 * springs word-by-word ("në dyqan online." in gradient), then the trial chip.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { springIn, exitLift, float } from "../../lib/motion";
import { StoryShell, Chip, ShipWhite, gradText, CLASH } from "./storyKit";

export const storyIntroSchema = z.object({ cta: z.string() });
export const storyIntroDefaults: z.infer<typeof storyIntroSchema> = { cta: "Provo falas 7 ditë · pa kartë" };

export const StoryIntro = ({ cta }: z.infer<typeof storyIntroSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exit = exitLift(frame, durationInFrames, 22, 60);

  const ship = springIn(frame, fps, 4, { damping: 12 });
  const line1 = ["Kthe", "Instagramin"];
  const line2 = ["në", "dyqan", "online."];
  const sub = springIn(frame, fps, 44, { damping: 16 });
  const chip = springIn(frame, fps, 58, { damping: 14 });

  const word = (w: string, i: number, delay: number, grad?: boolean) => {
    const s = springIn(frame, fps, delay + i * 5, { damping: 12 });
    return (
      <span key={w + i} style={{ display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * 90}px)`, filter: `blur(${(1 - s) * 10}px)`, ...(grad ? gradText : {}) }}>
        {w}
      </span>
    );
  };

  return (
    <StoryShell frame={frame} durationInFrames={durationInFrames}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 84px", opacity: exit.opacity, transform: `translateY(${exit.y}px)` }}>
        <div style={{ transform: `translateY(${(1 - ship) * -140 + float(frame, 8, 26)}px) scale(${0.6 + ship * 0.4})`, opacity: ship, marginBottom: 90 }}>
          <ShipWhite size={230} style={{ filter: "drop-shadow(0 40px 80px rgba(219,39,119,0.35))" }} />
        </div>

        <h1 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 118, lineHeight: 1.06, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", margin: 0 }}>
          <span style={{ display: "flex", justifyContent: "center", gap: "0.26em", flexWrap: "wrap" }}>{line1.map((w, i) => word(w, i, 16))}</span>
          <span style={{ display: "flex", justifyContent: "center", gap: "0.26em", flexWrap: "wrap" }}>{line2.map((w, i) => word(w, i, 28, true))}</span>
        </h1>

        <p style={{ fontSize: 42, fontWeight: 500, color: "rgba(255,255,255,0.66)", marginTop: 54, textAlign: "center", opacity: sub, transform: `translateY(${(1 - sub) * 34}px)` }}>
          Produktet, pagesat dhe porositë — vetë.
        </p>

        <div style={{ marginTop: 84, opacity: chip, transform: `translateY(${(1 - chip) * 40}px) scale(${0.9 + chip * 0.1})` }}>
          <Chip filled>{cta}</Chip>
        </div>
      </AbsoluteFill>
    </StoryShell>
  );
};
