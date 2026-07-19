/**
 * StoryCTA — the closer (1080x1920). Full drifting brand-gradient canvas,
 * white ship, the trial offer, and a "link in bio" pointer.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { springIn, exitLift, float } from "../../lib/motion";
import { Chip, ShipWhite, CLASH, INTER } from "./storyKit";

export const storyCtaSchema = z.object({ headline: z.string() });
export const storyCtaDefaults: z.infer<typeof storyCtaSchema> = { headline: "Provo falas 7 ditë" };

export const StoryCTA = ({ headline }: z.infer<typeof storyCtaSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const exit = exitLift(frame, durationInFrames, 18, 40);

  const drift = (speed: number, from: number, to: number, phase = 0) =>
    interpolate(Math.sin(frame / speed + phase), [-1, 1], [from, to]);

  const ship = springIn(frame, fps, 4, { damping: 11 });
  const head = springIn(frame, fps, 14, { damping: 13 });
  const sub = springIn(frame, fps, 26, { damping: 15 });
  const bio = springIn(frame, fps, 40, { damping: 13 });
  const bounce = Math.abs(Math.sin(frame / 11)) * 16;

  return (
    <AbsoluteFill style={{ fontFamily: INTER, backgroundColor: "#A31234" }}>
      {/* drifting mesh — the animated .brand-gradient (wine/neon/gold; drift restored) */}
      <AbsoluteFill
        style={{
          backgroundImage: `
            radial-gradient(42% 56% at ${drift(70, 12, 42)}% ${drift(85, 15, 40, 2)}%, #7F1D3B 0%, rgba(127, 29, 59, 0) 100%),
            radial-gradient(48% 62% at ${drift(80, 62, 92, 1)}% ${drift(75, 8, 32, 3)}%, #FACC15 0%, rgba(250, 204, 21, 0) 100%),
            radial-gradient(52% 66% at ${drift(90, 58, 86, 4)}% ${drift(70, 62, 92, 1)}%, #FF2E4D 0%, rgba(255, 46, 77, 0) 100%),
            radial-gradient(44% 54% at ${drift(75, 10, 36, 5)}% ${drift(95, 60, 88, 2)}%, #F59E0B 0%, rgba(245, 158, 11, 0) 100%)`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(90% 70% at 50% 42%, rgba(15,12,19,0) 30%, rgba(15,12,19,0.42) 100%)" }} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 90px", opacity: exit.opacity, transform: `translateY(${exit.y}px)` }}>
        <div style={{ opacity: ship, transform: `translateY(${(1 - ship) * -120 + float(frame, 9, 24)}px) scale(${0.7 + ship * 0.3})` }}>
          <ShipWhite size={250} style={{ filter: "drop-shadow(0 44px 90px rgba(0,0,0,0.4))" }} />
        </div>

        <h1 style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 128, letterSpacing: "-0.02em", lineHeight: 1.05, color: "#fff", textAlign: "center", marginTop: 80, textShadow: "0 20px 60px rgba(0,0,0,0.25)", opacity: head, transform: `translateY(${(1 - head) * 70}px)` }}>
          {headline.split(" ").slice(0, 2).join(" ")}
          <br />
          {headline.split(" ").slice(2).join(" ")}
        </h1>

        <p style={{ fontSize: 44, fontWeight: 500, color: "rgba(255,255,255,0.88)", marginTop: 44, opacity: sub, transform: `translateY(${(1 - sub) * 30}px)` }}>
          pa kartë · anulo kurdo
        </p>

        <div style={{ marginTop: 100, textAlign: "center", opacity: bio, transform: `translateY(${(1 - bio) * 40}px)` }}>
          <div style={{ fontSize: 58, transform: `translateY(${-bounce}px)` }}>👆</div>
          <Chip style={{ marginTop: 26, background: "rgba(15,12,19,0.45)", border: "2.5px solid rgba(255,255,255,0.55)" }}>Linku në bio — vela.al</Chip>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", bottom: 84, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.75)", fontSize: 24, fontWeight: 700, letterSpacing: "0.3em", fontFamily: INTER }}>
        VELA — DYQANI YT ONLINE
      </div>
    </AbsoluteFill>
  );
};
