/**
 * CANVAS — shared video settings for every Remotion composition.
 * Change resolution / fps HERE and nowhere else; Root.tsx reads these.
 *
 *   1080p  → width: 1920, height: 1080
 *   4K     → width: 3840, height: 2160
 *   60fps  → fps: 60
 */
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/** Convert seconds → frames at the current fps (use for durations/timings). */
export const sec = (s: number) => Math.round(s * VIDEO.fps);
