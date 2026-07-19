/**
 * StoryProblem — the pain → the fix (1080x1920). Act 1: "how much?" bubbles
 * pile up over the seller. Act 2: the product card with a real checkout —
 * customers buy on their own.
 */
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";
import { springIn, exitLift, float, pulse } from "../../lib/motion";
import { StoryShell, Chip, BRAND, gradText, CLASH } from "./storyKit";

export const storyProblemSchema = z.object({ shop: z.string() });
export const storyProblemDefaults: z.infer<typeof storyProblemSchema> = { shop: "dyqani.yt" };

const ACT1 = 118;

const Bubble: React.FC<{ text: string; delay: number; x: number; frame: number; fps: number }> = ({ text, delay, x, frame, fps }) => {
  const s = springIn(frame, fps, delay, { damping: 11 });
  return (
    <div style={{ alignSelf: x > 0 ? "flex-end" : "flex-start", opacity: s, transform: `translateY(${(1 - s) * 46}px) scale(${0.85 + s * 0.15})`, background: "#fff", color: BRAND.ink, borderRadius: 36, borderTopRightRadius: x > 0 ? 10 : 36, borderTopLeftRadius: x > 0 ? 36 : 10, padding: "26px 40px", fontSize: 38, fontWeight: 500, boxShadow: "0 24px 60px -24px rgba(46,33,64,0.35)", marginBottom: 26 }}>
      {text}
    </div>
  );
};

export const StoryProblem = ({ shop }: z.infer<typeof storyProblemSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <StoryShell frame={frame} durationInFrames={durationInFrames}>
      {/* ── Act 1: the message pile ── */}
      <Sequence from={0} durationInFrames={ACT1} layout="none">
        {(() => {
          const f = Math.min(frame, ACT1);
          const out = interpolate(f, [ACT1 - 16, ACT1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
          const head = springIn(f, fps, 2, { damping: 14 });
          return (
            <AbsoluteFill style={{ padding: "300px 96px", opacity: 1 - out, transform: `translateX(${-out * 260}px)` }}>
              <h1 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 92, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#fff", opacity: head, transform: `translateY(${(1 - head) * 50}px)` }}>
                Gjithë dita duke u<br />përgjigjur në <span style={gradText}>mesazhe?</span>
              </h1>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 90 }}>
                <Bubble text="Sa kushton? 🙏" delay={22} x={-1} frame={f} fps={fps} />
                <Bubble text="A ka masë M? 🥺" delay={38} x={1} frame={f} fps={fps} />
                <Bubble text="Si porosis?" delay={54} x={-1} frame={f} fps={fps} />
                <Bubble text="Sa kushton? 🙏" delay={68} x={1} frame={f} fps={fps} />
                <Bubble text="Çmimi ju lutem…" delay={82} x={-1} frame={f} fps={fps} />
              </div>
            </AbsoluteFill>
          );
        })()}
      </Sequence>

      {/* ── Act 2: the shop sells itself ── */}
      <Sequence from={ACT1} layout="none">
        {(() => {
          const f = frame - ACT1;
          const dur = durationInFrames - ACT1;
          const exit = exitLift(f, dur, 20, 50);
          const head = springIn(f, fps, 4, { damping: 13 });
          const card = springIn(f, fps, 16, { damping: 12 });
          const btn = springIn(f, fps, 34, { damping: 11 });
          const chip = springIn(f, fps, 52, { damping: 14 });
          return (
            <AbsoluteFill style={{ padding: "300px 96px", alignItems: "center", opacity: exit.opacity, transform: `translateY(${exit.y}px)` }}>
              <h1 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 96, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", opacity: head, transform: `translateY(${(1 - head) * 50}px)` }}>
                Klientët <span style={gradText}>blejnë vetë.</span>
              </h1>
              <p style={{ fontSize: 40, color: "rgba(255,255,255,0.62)", marginTop: 26, opacity: head }}>Pa mesazhe. Pa pritje.</p>

              <div style={{ width: 700, marginTop: 80, borderRadius: 56, background: "#fff", padding: 34, boxShadow: "0 70px 160px -60px rgba(0,0,0,0.8)", opacity: card, transform: `translateY(${(1 - card) * 120 + float(f, 7, 30)}px) scale(${0.88 + card * 0.12})` }}>
                <div style={{ height: 520, borderRadius: 36, backgroundImage: "linear-gradient(140deg,#F4E5F0,#E9D5EC 45%,#F6E3D2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 150 }}>👗</div>
                <div style={{ padding: "34px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 44, color: BRAND.ink }}>Fustan liri</div>
                    <div style={{ fontSize: 30, color: BRAND.muted, marginTop: 6 }}>{shop} · dërgesa nesër</div>
                  </div>
                  <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 46, color: BRAND.pink }}>3.500 L</div>
                </div>
                <div style={{ margin: "26px 14px 12px", borderRadius: 28, padding: "28px 0", textAlign: "center", color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 38, backgroundImage: "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)", opacity: btn, transform: `scale(${0.92 + Math.min(btn, 1) * 0.08 * pulse(f, 18)})` }}>
                  Shto në shportë
                </div>
              </div>

              <div style={{ marginTop: 70, opacity: chip, transform: `translateY(${(1 - chip) * 30}px)` }}>
                <Chip>vela.al — provo falas 7 ditë</Chip>
              </div>
            </AbsoluteFill>
          );
        })()}
      </Sequence>
    </StoryShell>
  );
};
