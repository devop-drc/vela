/**
 * Vela logo sting — the animated "winking face" app icon as a REMOTION
 * composition (the standard for all Vela motion graphics).
 *
 * The owner's app icon reads as a face: tag-sails = eyes, holes = pupils,
 * hull = smile. Two variants:
 *  • intro — plays once: the smile MORPHS open from a thin line (arrow
 *    sprouting), the tag-eyes morph up out of it, pupils pop in, look at
 *    the camera, the gold eye winks (smile grins), pupils return to the
 *    frozen tag-hole position — final frame = the exact static icon.
 *  • loop — seamless: frozen → pupils to camera → wink → frozen.
 *
 * Render (alpha WebM for web + MP4 with baked cream backdrop):
 *   npx remotion render src/remotion.ts LogoStingIntro branding/motion/vela-sting-intro.webm --codec=vp9 --image-format=png --pixel-format=yuva420p --scale=2
 *   npx remotion render src/remotion.ts LogoStingIntro branding/motion/vela-sting-intro.mp4 --codec=h264 --crf=20 --scale=2 --props=scripts/.logo-baked-props.json
 *   (same for LogoStingLoop)
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, Easing } from "remotion";
import { interpolatePath } from "@remotion/paths";
import { z } from "zod";

export const logoStingSchema = z.object({ transparent: z.boolean() });
export const logoStingDefaults: z.infer<typeof logoStingSchema> = { transparent: true };
export const LOGO_STING = { width: 512, height: 512, fps: 30, introFrames: 165, loopFrames: 180 };

const FPS = 30;

/* ── path states (identical command structure → smooth morphs) ——
   END states = the owner's updated vela-app-icon.svg geometry. ── */
const SMILE_END = "m 108.92,317.6 c 144.85806,41.28771 215.49474,17.87112 240.19873,0.71366 L 357.56,313.16 c 2.66302,-1.62586 3.94667,-2.96 2.96,-5.92 l -4.44,-10.36 c -0.98667,-3.94667 0.49333,-4.68667 4.44,-2.22 l 35.52,17.02 c 3.45333,1.97333 3.45333,4.19333 0,6.66 c -19.24,14.06 -42.92,28.86 -69.56,40.7 c -44.4,19.24 -111,17.76 -150.96,2.96 c -29.6,-11.84 -53.28,-28.12 -66.6,-44.4 z";
const SMILE_START = "m 108.92,341.2 c 144.86,4.13 215.49,1.79 240.2,0.07 L 357.56,341 c 2.66,-0.16 3.95,-0.3 2.96,-0.59 l -4.44,-1.04 c -0.99,-0.39 0.49,-0.47 4.44,-0.22 l 3.4,1.62 c 0.33,0.19 0.33,0.4 0,0.63 c -19.24,1.41 -42.92,2.89 -69.56,4.07 c -44.4,1.92 -111,1.78 -150.96,0.3 c -29.6,-1.18 -53.28,-2.81 -66.6,-4.44 z";
const BACK_END = "M 200.05469 157.50391 C 193.44953 157.69956 189.30039 165.36993 186.52539 175.54492 C 170.98539 216.98492 159.88531 264.34539 155.44531 306.52539 C 155.28623 307.53292 155.21682 312.64987 155.20703 318.0625 C 185.01319 324.25978 210.92208 327.37311 233.29883 328.32227 C 233.8658 320.4423 234.02054 307.29177 233.88477 304.30469 C 233.14477 267.30469 229.44492 216.98539 222.04492 177.02539 C 221.05354 164.64719 215.6474 158.76474 201.4082 157.56641 C 200.9457 157.51153 200.49503 157.49086 200.05469 157.50391 Z";
const BACK_START = "M 195.51 305.55 C 194.85 305.57 194.43 306.34 194.15 307.35 C 192.6 311.5 191.49 316.23 191.04 320.45 C 191.03 320.55 191.02 321.07 191.02 321.61 C 194 322.23 196.59 322.54 198.83 322.63 C 198.89 321.84 198.9 320.53 198.89 320.23 C 198.81 316.53 198.44 311.5 197.7 307.5 C 197.61 306.26 197.06 305.68 195.64 305.56 C 195.59 305.55 195.55 305.55 195.51 305.55 Z";
const FRONT_END = "M 285.46875 130.56055 C 276.65295 130.23894 273.97422 139.61565 271.19922 151.64062 C 259.35922 201.96062 250.47906 262.6393 246.03906 307.7793 C 245.78716 309.54264 245.38441 321.14264 245.26562 328.46875 C 288.56511 329.83761 318.2132 323.00095 337.01953 314.99609 C 337.14629 310.97387 337.17482 307.61467 337.06055 306.30078 C 335.58055 271.52078 327.44086 209.35914 313.38086 153.11914 C 310.42621 134.49024 309.076 132.76018 287.31641 130.75586 C 286.67229 130.64612 286.05647 130.58199 285.46875 130.56055 Z";
const FRONT_START = "M 290.45 306.46 C 289.57 306.42 289.3 307.36 289.02 308.56 C 287.84 313.6 286.95 319.66 286.5 324.18 C 286.48 324.35 286.44 325.51 286.43 326.25 C 290.76 326.38 293.72 325.7 295.6 324.9 C 295.61 324.5 295.62 324.16 295.61 324.03 C 295.46 320.55 294.64 314.34 293.24 308.71 C 292.94 306.85 292.81 306.68 290.63 306.48 C 290.57 306.46 290.51 306.46 290.45 306.46 Z";

/* pupil rest ("frozen") and at-camera states */
const P_BACK = { rest: { cx: 201.96, cy: 192.96, r: 7.45 }, cam: { cx: 195, cy: 245, r: 9.5 } };
const P_FRONT = { rest: { cx: 294.41, cy: 166.9, r: 7.45 }, cam: { cx: 291.5, cy: 232, r: 10 } };

const outCubic = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const inOut = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
const springy = (frame: number, delay: number) =>
  spring({ frame: frame - delay, fps: FPS, config: { damping: 11, stiffness: 200, mass: 0.9 } });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Grads = () => (
  <defs>
    <linearGradient id="ls-front" gradientUnits="userSpaceOnUse" x1="312" y1="70" x2="244" y2="316" gradientTransform="matrix(0.74,0,0,0.74,64,88)">
      <stop offset="0" stopColor="#FACC15" /><stop offset="0.42" stopColor="#F59E0B" /><stop offset="1" stopColor="#FF2E4D" />
    </linearGradient>
    <linearGradient id="ls-back" gradientUnits="userSpaceOnUse" x1="184" y1="116" x2="124" y2="316" gradientTransform="matrix(0.74,0,0,0.74,62.205656,85.264781)">
      <stop offset="0" stopColor="#FF2E4D" /><stop offset="0.55" stopColor="#A31234" /><stop offset="1" stopColor="#7F1D3B" />
    </linearGradient>
    <linearGradient id="ls-hull" gradientUnits="userSpaceOnUse" x1="56" y1="390" x2="452" y2="360" gradientTransform="matrix(0.74,0,0,0.74,66,66)">
      <stop offset="0" stopColor="#7F1D3B" /><stop offset="0.3" stopColor="#A31234" /><stop offset="0.62" stopColor="#FF2E4D" /><stop offset="0.86" stopColor="#F59E0B" /><stop offset="1" stopColor="#FACC15" />
    </linearGradient>
  </defs>
);

/** shared face renderer — every timing arrives as a resolved 0..1 progress */
const Face: React.FC<{
  transparent: boolean;
  smileP: number; backP: number; frontP: number;
  pupilPop: number; look: number; // 0 rest → 1 camera
  wink: number; // 0..1..0 lid closed amount
}> = ({ transparent, smileP, backP, frontP, pupilPop, look, wink }) => {
  const back = { cx: lerp(P_BACK.rest.cx, P_BACK.cam.cx, look), cy: lerp(P_BACK.rest.cy, P_BACK.cam.cy, look), r: lerp(P_BACK.rest.r, P_BACK.cam.r, look) * pupilPop };
  const front = { cx: lerp(P_FRONT.rest.cx, P_FRONT.cam.cx, look), cy: lerp(P_FRONT.rest.cy, P_FRONT.cam.cy, look), r: lerp(P_FRONT.rest.r, P_FRONT.cam.r, look) * pupilPop };
  const lid = 1 - wink * 0.92; // scaleY of the winking eye
  const grinX = 1 + wink * 0.05;
  const grinY = 1 - wink * 0.07;
  return (
    <AbsoluteFill style={{ background: transparent ? undefined : "#FBF6F4", alignItems: "center", justifyContent: "center" }}>
      <svg width="100%" height="100%" viewBox="0 0 512 512">
        <Grads />
        <rect width="512" height="512" rx="115" fill="#FFFFFF" />
        <rect width="512" height="512" rx="115" fill="none" stroke="#2A1D22" strokeOpacity="0.06" strokeWidth="4" />
        {/* smile — morphs open, grins on the wink */}
        <g style={{ transform: `scale(${grinX}, ${grinY})`, transformOrigin: "283px 350px" }}>
          <path fill="url(#ls-hull)" d={interpolatePath(smileP, SMILE_START, SMILE_END)} />
        </g>
        {/* back eye */}
        <path fill="url(#ls-back)" d={interpolatePath(backP, BACK_START, BACK_END)} />
        {back.r > 0.05 && <circle cx={back.cx} cy={back.cy} r={back.r} fill="#FFFFFF" opacity={Math.min(1, backP * 2)} />}
        {/* front eye — winks around its base */}
        <g style={{ transform: `scaleY(${lid})`, transformOrigin: "291px 329px" }}>
          <path fill="url(#ls-front)" d={interpolatePath(frontP, FRONT_START, FRONT_END)} />
          {front.r > 0.05 && wink < 0.55 && (
            <circle cx={front.cx} cy={front.cy} r={front.r} fill="#FFFFFF" opacity={Math.min(1, frontP * 2) * (1 - wink)} />
          )}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* ── intro: build-in → look → wink → settle (plays once) ── */
export const LogoStingIntro: React.FC<z.infer<typeof logoStingSchema>> = ({ transparent }) => {
  const f = useCurrentFrame();
  const look = outCubic(f, 63, 77) - outCubic(f, 112, 127); // to camera, later back
  const wink = interpolate(f, [87, 94, 99, 106], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return (
    <Face
      transparent={transparent}
      smileP={outCubic(f, 0, 30)}
      backP={outCubic(f, 14, 41)}
      frontP={outCubic(f, 20, 47)}
      pupilPop={Math.min(1, springy(f, 48))}
      look={look}
      wink={wink}
    />
  );
};

/* ── loop: frozen → camera → wink → frozen (seamless) ── */
export const LogoStingLoop: React.FC<z.infer<typeof logoStingSchema>> = ({ transparent }) => {
  const f = useCurrentFrame();
  const look = inOut(f, 18, 32) - inOut(f, 88, 102);
  const wink = interpolate(f, [52, 59, 64, 71], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <Face transparent={transparent} smileP={1} backP={1} frontP={1} pupilPop={1} look={look} wink={wink} />;
};
