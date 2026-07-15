/**
 * Motion tokens for the admin app's GSAP animation system.
 *
 * One source of truth for durations, easings, stagger, and travel distance so
 * every animated surface feels like the same product. Values are GSAP-native
 * (seconds; ease strings). Keep motion SUBTLE — this is a productivity app, not
 * a landing page. The landing/storefront have their own richer motion language.
 */

/** Seconds. */
export const DURATION = {
  fast: 0.18,
  base: 0.28,
  slow: 0.45,
  xslow: 0.7,
} as const;

/** GSAP ease strings. `soft`/`out` for entrances, `inOut` for moves. */
export const EASE = {
  out: "power2.out",
  inOut: "power2.inOut",
  soft: "power3.out",
  spring: "back.out(1.5)",
} as const;

/** Seconds between staggered items. */
export const STAGGER = {
  tight: 0.035,
  base: 0.06,
  loose: 0.1,
} as const;

/** Pixels of travel for rise/reveal entrances. */
export const DISTANCE = {
  sm: 8,
  base: 16,
  lg: 28,
} as const;
