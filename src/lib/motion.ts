/**
 * Small motion helpers shared by the compositions so every graphic follows the
 * same rules: a real enter, a held middle with subtle life, and a real exit —
 * nothing pops or gets cut off. Built on Remotion's frame-based primitives so
 * renders are deterministic.
 */
import { interpolate, spring, Easing } from "remotion";

/** Spring with a touch of overshoot + settle (anticipation-friendly). */
export const springIn = (
  frame: number,
  fps: number,
  delay = 0,
  config: Partial<{ damping: number; mass: number; stiffness: number }> = {},
) => spring({ frame: frame - delay, fps, config: { damping: 13, mass: 0.9, stiffness: 130, ...config } });

/** 0→1→1→0 envelope: eases in, holds, eases out over the clip. */
export const envelope = (frame: number, durationInFrames: number, inF = 16, outF = 18) =>
  interpolate(frame, [0, inF, durationInFrames - outF, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

/** Fade + lift out over the last `frames` of the clip (returns {opacity, y}). */
export const exitLift = (frame: number, durationInFrames: number, frames = 20, lift = 40) => {
  const t = interpolate(frame, [durationInFrames - frames, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  return { opacity: 1 - t, y: -t * lift };
};

/** Gentle idle float for the held section. */
export const float = (frame: number, amp = 6, speed = 20) => Math.sin(frame / speed) * amp;

/** Soft 0.85→1 glow pulse for accents. */
export const pulse = (frame: number, speed = 24) => 0.85 + Math.sin(frame / speed) * 0.15;
