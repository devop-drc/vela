// Builds the Instagram profile icon: the tag-sails boat centered on a night
// background with a wine aurora, sized for IG's circular crop (1080x1080).
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const src = readFileSync('branding/logo/ship-logo-nobg.svg', 'utf8');

// Pull the inner content of the root <svg> (defs + layer groups), dropping
// Inkscape's editor metadata blocks which resvg ignores anyway.
let inner = src.slice(src.indexOf('>', src.indexOf('<svg')) + 1, src.lastIndexOf('</svg>'));
// Drop Inkscape's editor metadata (may contain nested self-closing children,
// so cut from the opening tag to its paired close explicitly).
const nvStart = inner.indexOf('<sodipodi:namedview');
if (nvStart >= 0) {
  const closeTag = '</sodipodi:namedview>';
  const nvClose = inner.indexOf(closeTag, nvStart);
  const nvEnd = nvClose >= 0 ? nvClose + closeTag.length : inner.indexOf('/>', nvStart) + 2;
  inner = inner.slice(0, nvStart) + inner.slice(nvEnd);
}
inner = inner.replace(/<metadata[\s\S]*?<\/metadata>/g, '');

// Boat viewBox 0 0 255.688 211.909 → scale to ~56% of the 1080 canvas width
// and optically center (slightly above true center reads better in a circle).
const VB_W = 255.688, VB_H = 211.90938;
const SCALE = (1080 * 0.56) / VB_W;
const W = VB_W * SCALE, H = VB_H * SCALE;
const TX = (1080 - W) / 2, TY = (1080 - H) / 2 - 18;

const icon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd">
  <defs>
    <radialGradient id="igAurora" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#A31234" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="#5C0A1D" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#140A0E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="igGlow" cx="50%" cy="52%" r="40%">
      <stop offset="0%" stop-color="#FF2E4D" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FF2E4D" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="#140A0E"/>
  <rect width="1080" height="1080" fill="url(#igAurora)"/>
  <rect width="1080" height="1080" fill="url(#igGlow)"/>
  <g transform="translate(${TX.toFixed(2)}, ${TY.toFixed(2)}) scale(${SCALE.toFixed(5)})">
${inner}
  </g>
</svg>`;

writeFileSync('branding/logo/instagram-profile-icon.svg', icon);

const png = new Resvg(icon, { fitTo: { mode: 'width', value: 1080 } }).render().asPng();
writeFileSync('branding/logo/instagram-profile-icon.png', png);
console.log('written: branding/logo/instagram-profile-icon.{svg,png}', png.length, 'bytes');
