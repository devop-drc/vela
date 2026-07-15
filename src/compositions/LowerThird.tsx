/**
 * LowerThird — a name/role chip in the lower-left. A backing bar slides in from
 * the left with a little overshoot, an accent rail wipes down, the name and role
 * stagger in, an accent dot glows while held, then the whole thing slides back
 * out. Sits inside the title-safe area.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { loadFont } from "@remotion/google-fonts/Inter";
import { springIn, pulse } from "../lib/motion";

const { fontFamily } = loadFont();

export const lowerThirdSchema = z.object({
  name: z.string(),
  role: z.string(),
  accent: zColor(),
});
export const lowerThirdDefaults: z.infer<typeof lowerThirdSchema> = {
  name: "Jane Doe",
  role: "Founder & CEO",
  accent: "#f97316",
};

export const LowerThird = ({ name, role, accent }: z.infer<typeof lowerThirdSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, height } = useVideoConfig();

  const enter = springIn(frame, fps, 0, { damping: 14, stiffness: 120 });
  const rail = springIn(frame, fps, 6, { damping: 15 });
  const nameS = springIn(frame, fps, 12, { damping: 16 });
  const roleS = springIn(frame, fps, 18, { damping: 18 });
  // exit: slide back out to the left over the final frames
  const out = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const x = (1 - enter) * -80 - out * 120;
  const opacity = Math.min(enter, 1 - out);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <div style={{ position: "absolute", left: height * 0.09, bottom: height * 0.12, transform: `translateX(${x}px)`, opacity, display: "flex", alignItems: "stretch", gap: 0 }}>
        {/* accent rail wiping down */}
        <div style={{ width: 8, borderRadius: 4, background: accent, transform: `scaleY(${rail})`, transformOrigin: "top" }} />
        <div style={{ background: "rgba(12,12,16,0.82)", backdropFilter: "blur(8px)", borderRadius: 16, padding: "22px 34px", marginLeft: 16, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 12, height: 12, borderRadius: 999, background: accent, boxShadow: `0 0 18px ${accent}`, opacity: pulse(frame) }} />
            <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", opacity: nameS, transform: `translateX(${(1 - nameS) * 18}px)` }}>{name}</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: "#b9b9c4", marginTop: 6, opacity: roleS, transform: `translateX(${(1 - roleS) * 18}px)` }}>{role}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
