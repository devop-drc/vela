/**
 * StorySteps — three quick steps, one per beat, then the ask (1080x1920).
 */
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { z } from "zod";
import { springIn, float } from "../../lib/motion";
import { StoryShell, Chip, BRAND, gradText, CLASH } from "./storyKit";

export const storyStepsSchema = z.object({ cta: z.string() });
export const storyStepsDefaults: z.infer<typeof storyStepsSchema> = { cta: "Provo falas 7 ditë" };

const BEAT = 78;
const STEPS = [
  {
    n: "01",
    title: "Lidh Instagramin",
    desc: "Një prekje për të lidhur profilin\nInstagram Business. Pa kod.",
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="110" height="110" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.4" /><circle cx="17.6" cy="6.4" r="1.15" fill={c} stroke="none" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Sistemi ndërton produktet",
    desc: "Postimet bëhen produkte — emri, çmimi,\nkategoria dhe variantet, vetë.",
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="110" height="110" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2.6v18.8M2.6 12h18.8M5.4 5.4l13.2 13.2M18.6 5.4L5.4 18.6" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Ndaj linkun & shit",
    desc: "Publiko vitrinën dhe merr porosi\ne pagesa që sot.",
    icon: (c: string) => (
      <svg viewBox="0 0 24 24" width="110" height="110" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2.5 3.5 6v14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V6L18 2.5H6z" /><path d="M3.5 6h17" /><path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
];
const COLORS = [BRAND.fuchsia, BRAND.pink, BRAND.red];

const Step: React.FC<{ i: number; frames: number }> = ({ i, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = STEPS[i];
  const icon = springIn(frame, fps, 2, { damping: 11 });
  const num = springIn(frame, fps, 8, { damping: 12 });
  const title = springIn(frame, fps, 16, { damping: 13 });
  const desc = springIn(frame, fps, 24, { damping: 15 });
  const out = interpolate(frame, [frames - 14, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 96px", opacity: 1 - out, transform: `translateX(${-out * 300}px)` }}>
      <div style={{ width: 250, height: 250, borderRadius: 70, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", opacity: icon, transform: `translateX(${(1 - icon) * 300}px) rotate(${(1 - icon) * 8}deg) translateY(${float(frame, 6, 28)}px)` }}>
        {s.icon(COLORS[i])}
      </div>
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 210, lineHeight: 1, marginTop: 66, ...gradText, opacity: num, transform: `translateX(${(1 - num) * 340}px)` }}>{s.n}</div>
      <h2 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 84, letterSpacing: "-0.02em", color: "#fff", marginTop: 20, textAlign: "center", opacity: title, transform: `translateX(${(1 - title) * 380}px)` }}>{s.title}</h2>
      <p style={{ fontSize: 38, lineHeight: 1.5, color: "rgba(255,255,255,0.6)", marginTop: 30, textAlign: "center", whiteSpace: "pre-line", opacity: desc, transform: `translateX(${(1 - desc) * 420}px)` }}>{s.desc}</p>
    </AbsoluteFill>
  );
};

export const StorySteps = ({ cta }: z.infer<typeof storyStepsSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const outro = frame - BEAT * 3;
  const head = springIn(Math.max(outro, 0), fps, 4, { damping: 12 });
  const chip = springIn(Math.max(outro, 0), fps, 20, { damping: 13 });

  // progress dots across the whole story
  const active = Math.min(Math.floor(frame / BEAT), 3);

  return (
    <StoryShell frame={frame} durationInFrames={durationInFrames}>
      {[0, 1, 2].map((i) => (
        <Sequence key={i} from={i * BEAT} durationInFrames={BEAT} layout="none">
          <Step i={i} frames={BEAT} />
        </Sequence>
      ))}

      <Sequence from={BEAT * 3} layout="none">
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 96px" }}>
          <h1 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 108, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", lineHeight: 1.08, opacity: head, transform: `translateY(${(1 - head) * 70}px)` }}>
            Gati për <span style={gradText}>të shitur?</span>
          </h1>
          <div style={{ marginTop: 76, opacity: chip, transform: `scale(${0.9 + chip * 0.1})` }}>
            <Chip filled>{cta} →</Chip>
          </div>
        </AbsoluteFill>
      </Sequence>

      <div style={{ position: "absolute", bottom: 200, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: i === active ? 54 : 16, height: 16, borderRadius: 99, transition: "none", background: i === active ? "linear-gradient(90deg,#FF2E4D,#A31234)" : "rgba(255,255,255,0.25)" }} />
        ))}
      </div>
    </StoryShell>
  );
};
