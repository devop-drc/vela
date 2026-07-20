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

/* ── path states (identical command structure → smooth morphs) ── */
const SMILE_END = "m 108.92,317.6 c 168.54958,-6.53405 179.08,14.8 239.76,-1.48 l 8.88,-2.96 c 2.96,-0.98667 3.94667,-2.96 2.96,-5.92 l -4.44,-10.36 c -0.98667,-3.94667 0.49333,-4.68667 4.44,-2.22 l 35.52,17.02 c 3.45333,1.97333 3.45333,4.19333 0,6.66 c -19.24,14.06 -42.92,28.86 -69.56,40.7 c -44.4,19.24 -111,17.76 -150.96,2.96 c -29.6,-11.84 -53.28,-28.12 -66.6,-44.4 z";
const SMILE_START = "m 108.92,341.2 c 168.55,-0.62 179.08,1.4 239.76,-0.14 l 8.88,-0.28 c 2.96,-0.09 3.95,-0.28 2.96,-0.56 l -4.44,-0.98 c -0.99,-0.37 0.49,-0.44 4.44,-0.21 l 3.4,1.62 c 0.33,0.19 0.33,0.4 0,0.63 c -19.24,1.33 -42.92,2.74 -69.56,3.87 c -44.4,1.83 -111,1.69 -150.96,0.28 c -29.6,-1.12 -53.28,-2.67 -66.6,-4.23 z";
const BACK_END = "m 206.06641,157.78516 c -7.4,0.98666 -12.58102,6.90643 -15.54102,17.75976 -15.54,41.44 -26.64008,88.80047 -31.08008,130.98047 -0.34742,2.20037 -0.42285,4.14234 -0.22656,5.82617 32.5269,-0.23634 57.25986,0.70925 77.11914,1.91797 1.21727,-2.54948 1.73293,-5.8717 1.54688,-9.96484 -0.74,-37 -4.43985,-87.3193 -11.83985,-127.2793 -0.98666,-7.4 -3.94557,-12.33411 -8.8789,-14.80078 z";
const BACK_START = "m 196,310 c -0.74,0.0987 -1.2581,0.6906 -1.5541,1.776 -1.554,4.144 -2.664,8.88 -3.108,13.098 -0.0347,0.22 -0.0423,0.4142 -0.0227,0.5826 3.2527,-0.0236 5.726,0.0709 7.7119,0.1918 0.1217,-0.2549 0.1733,-0.5872 0.1547,-0.9965 -0.074,-3.7 -0.444,-8.7319 -1.184,-12.7279 -0.0987,-0.74 -0.3946,-1.2334 -0.8879,-1.4801 z";
const FRONT_END = "M 284.96094 129.43945 C 276.08094 131.41279 270.15922 138.81397 267.19922 151.64062 C 255.35922 201.96062 246.47906 262.6393 242.03906 307.7793 C 241.6825 310.27524 241.64262 312.47062 241.91602 314.36523 C 284.64641 317.02933 304.58109 320.82939 331.95898 316.25391 C 333.04355 313.65354 333.41149 310.33666 333.06055 306.30078 C 331.58055 271.52078 323.44086 209.35914 309.38086 153.11914 C 307.90086 143.74581 304.1993 137.57914 298.2793 134.61914 L 284.96094 129.43945 Z";
const FRONT_START = "M 287.70 295.54 C 286.81 295.74 286.22 296.48 285.92 297.76 C 284.74 302.80 283.85 308.86 283.40 313.38 C 283.37 313.63 283.36 313.85 283.39 314.04 C 287.66 314.30 289.66 314.68 292.40 314.23 C 292.50 313.97 292.54 313.63 292.51 313.23 C 292.36 309.75 291.54 303.54 290.14 297.91 C 289.99 296.98 289.62 296.36 289.03 296.06 L 287.70 295.54 Z";

/* pupil rest ("frozen") and at-camera states */
const P_BACK = { rest: { cx: 208.29, cy: 192.57, r: 6.66 }, cam: { cx: 184, cy: 238, r: 9 } };
const P_FRONT = { rest: { cx: 288.25, cy: 164.96, r: 7.02 }, cam: { cx: 288.25, cy: 228, r: 9.5 } };

const outCubic = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
const inOut = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
const springy = (frame: number, delay: number) =>
  spring({ frame: frame - delay, fps: FPS, config: { damping: 11, stiffness: 200, mass: 0.9 } });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Grads = () => (
  <defs>
    <linearGradient id="ls-front" gradientUnits="userSpaceOnUse" x1="312" y1="70" x2="244" y2="316" gradientTransform="matrix(0.74,0,0,0.74,60,88)">
      <stop offset="0" stopColor="#FACC15" /><stop offset="0.42" stopColor="#F59E0B" /><stop offset="1" stopColor="#FF2E4D" />
    </linearGradient>
    <linearGradient id="ls-back" gradientUnits="userSpaceOnUse" x1="184" y1="116" x2="124" y2="316" gradientTransform="matrix(0.74,0,0,0.74,66.205656,85.264781)">
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
        <g style={{ transform: `scale(${grinX}, ${grinY})`, transformOrigin: "283px 345px" }}>
          <path fill="url(#ls-hull)" d={interpolatePath(smileP, SMILE_START, SMILE_END)} />
        </g>
        {/* back eye */}
        <path fill="url(#ls-back)" d={interpolatePath(backP, BACK_START, BACK_END)} />
        {back.r > 0.05 && <circle cx={back.cx} cy={back.cy} r={back.r} fill="#FFFFFF" opacity={Math.min(1, backP * 2)} />}
        {/* front eye — winks around its base */}
        <g style={{ transform: `scaleY(${lid})`, transformOrigin: "288px 318px" }}>
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
