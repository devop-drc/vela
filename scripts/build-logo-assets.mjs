/* Generates the Vela lockup family around the LEGACY ship mark (the
   official logo — owner reverted the tag-face exploration on 2026-07-20).
   The mark itself ships as-is from branding/legacy/; this script embeds it
   via nested <svg viewBox> and pairs it with the OUTLINED "Vela" wordmark
   (Clash Display Semibold converted to paths — no font dependency). */
import fs from "fs";

const WORD =
  "M125.84 0L198.12-174.20L151.32-174.20L99.84-39.52L97.24-39.52L44.98-174.20L-2.08-174.20L70.20 0M275.60 2.60C316.94 2.60 344.50-17.16 344.50-45.50L344.50-48.36L305.50-48.36L305.50-45.76C305.50-34.58 297.44-28.60 274.30-28.60C249.08-28.60 239.72-37.18 238.68-57.20L344.76-57.20C345.28-61.62 345.80-65 345.80-69.68C345.80-110.50 317.46-132.86 274.82-132.86C231.92-132.86 202.54-106.60 202.54-65C202.54-18.72 232.18 2.60 275.60 2.60M274.04-102.44C296.92-102.44 307.32-94.90 308.36-77.74L239.20-77.74C241.02-94.64 250.90-102.44 274.04-102.44M401.44 0L401.44-174.20L362.44-174.20L362.44 0M462.02 2.60C490.88 2.60 509.08-9.62 515.06-29.90L517.14-29.90L517.14 0L553.54 0L553.54-76.44C553.54-110.50 533-132.86 489.58-132.86C446.68-132.86 419.64-110.50 419.64-78.26L419.64-77.48L458.90-77.48L458.90-78.52C458.90-93.34 466.96-98.54 486.72-98.54C507.52-98.54 515.06-93.86 515.06-76.96L515.06-72.02L459.16-66.30C431.34-63.44 417.04-51.48 417.04-32.24C417.04-10.40 433.94 2.60 462.02 2.60M456.30-34.84C456.30-41.08 460.46-43.68 469.82-44.46L515.06-49.66C514.02-31.20 499.72-24.96 473.20-24.96C461.76-24.96 456.30-27.82 456.30-34.84";

/* the legacy marks, embeddable: strip the xml decl + root width/height so a
   nested <svg> can size them (their own viewBox stays) */
const embeddable = (file) =>
  fs
    .readFileSync(file, "utf-8")
    .replace(/^<\?xml[^>]*>\s*/, "")
    .replace(/<!--[\s\S]*?-->\s*/, "")
    .replace(/(<svg[^>]*?)\swidth="[^"]*"/, "$1")
    .replace(/(<svg[^>]*?)\sheight="[^"]*"/, "$1");

const gradShip = embeddable("branding/legacy/ship-colored.svg");
const whiteShip = embeddable("branding/legacy/ship-white-flat.svg");
// the flat ship is #f9f9f9 (near-white) with two stray #000000 micro-dots
const inkShip = whiteShip
  .replace(/fill:#f9f9f9/gi, "fill:#2A1D22")
  .replace(/fill="#f9f9f9"/gi, 'fill="#2A1D22"');

const nest = (inner, x, y, w, h) =>
  inner.replace(/<svg/, `<svg x="${x}" y="${y}" width="${w}" height="${h}"`);

const header = (w, h, note) => `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Vela brand asset — ${note}. Wordmark is outlined (no font dependency). -->\n<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:xlink="http://www.w3.org/1999/xlink">`;

const write = (name, body) => {
  fs.writeFileSync(`branding/logo/${name}`, body);
  console.log("wrote", name);
};

/* mono ink mark (white flat recolored) */
write("vela-mark-mono-black.svg", `${header(512, 512, "mark, mono ink")}\n  ${nest(inkShip, 10, 15, 492, 482)}\n</svg>\n`);

/* horizontal lockups — ship ≈ 246×241 at left, text baseline centred */
const lockupH = (ship, text, note) =>
  `${header(950, 320, note)}\n  ${nest(ship, 0, 36, 252, 247)}\n  <path transform="translate(310,247)" fill="${text}" d="${WORD}"/>\n</svg>\n`;
write("vela-lockup.svg", lockupH(gradShip, "#2A1D22", "horizontal lockup, ink wordmark"));
write("vela-lockup-white.svg", lockupH(gradShip, "#FFFFFF", "horizontal lockup for dark surfaces"));
write("vela-lockup-mono-black.svg", lockupH(inkShip, "#2A1D22", "horizontal lockup, all ink"));
write("vela-lockup-mono-white.svg", lockupH(whiteShip, "#FFFFFF", "horizontal lockup, all white"));

/* vertical lockups */
const lockupV = (ship, text, note) =>
  `${header(640, 660, note)}\n  ${nest(ship, 137, 6, 366, 358)}\n  <path transform="translate(110,562) scale(0.758)" fill="${text}" d="${WORD}"/>\n</svg>\n`;
write("vela-lockup-vertical.svg", lockupV(gradShip, "#2A1D22", "vertical lockup, ink wordmark"));
write("vela-lockup-vertical-white.svg", lockupV(gradShip, "#FFFFFF", "vertical lockup for dark surfaces"));
console.log("done");
