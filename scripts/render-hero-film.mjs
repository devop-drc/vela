/**
 * Re-render the landing hero film in all four variants, then the mobile
 * encodes and the posters. Sequential on purpose — each render already
 * saturates the CPU.
 *
 *   node scripts/render-hero-film.mjs            # everything
 *   ONLY=light node scripts/render-hero-film.mjs # just the light pair
 *   CONCURRENCY=8 node scripts/render-hero-film.mjs
 *
 * ~9 min per variant at the default concurrency. The only real speed lever is
 * CONCURRENCY (more parallel Chrome tabs, more RAM) — GPU flags don't help:
 * this is a DOM/CSS composition, not WebGL, and the alpha WebM leg (VP9 +
 * yuva420p) has no hardware encoder path anyway. Keep every variant on the
 * same settings — mixing renderers between light and dark can show up as
 * rasterization differences when the landing swaps themes.
 */
import { execFileSync } from "child_process";

const only = process.env.ONLY || "";
const concurrency = process.env.CONCURRENCY ? [`--concurrency=${process.env.CONCURRENCY}`] : [];
const run = (args, label) => {
  const t0 = Date.now();
  console.log(`\n▶ ${label}`);
  execFileSync("npx", ["remotion", ...args], { stdio: "inherit", shell: true });
  console.log(`✔ ${label} — ${Math.round((Date.now() - t0) / 1000)}s`);
};

const VARIANTS = [
  { key: "light", out: "public/hero/hero-film.mp4", props: "scripts/.film-light-baked.json", alpha: false },
  { key: "light", out: "public/hero/hero-film.webm", props: "scripts/.film-light-alpha.json", alpha: true },
  { key: "dark", out: "public/hero/hero-film-dark.mp4", props: "scripts/.film-dark-baked.json", alpha: false },
  { key: "dark", out: "public/hero/hero-film-dark.webm", props: "scripts/.film-dark-alpha.json", alpha: true },
];

for (const v of VARIANTS) {
  if (only && v.key !== only) continue;
  const codec = v.alpha
    ? ["--codec=vp9", "--image-format=png", "--pixel-format=yuva420p"]
    : ["--codec=h264", "--crf=22"];
  run(["render", "src/remotion.ts", "HeroFilm", v.out, ...codec, "--scale=1.4", `--props=${v.props}`, ...concurrency, "--log=error"], v.out);
}

/* mobile encodes (~0.85 MB — HeroFilmVideo's tap-to-play source on phones) */
for (const [src, out] of [
  ["public/hero/hero-film.mp4", "public/hero/hero-film-mobile.mp4"],
  ["public/hero/hero-film-dark.mp4", "public/hero/hero-film-mobile-dark.mp4"],
]) {
  if (only && !src.includes(only === "dark" ? "dark" : "hero-film.mp4")) continue;
  run(["ffmpeg", "-y", "-i", src, "-vf", "scale=960:-2", "-c:v", "libx264", "-crf", "30",
    "-preset", "slow", "-an", "-movflags", "+faststart", out], out);
}

/* posters — frame 78: the Instagram-grind beat with every DM landed */
for (const [src, out] of [
  ["public/hero/hero-film.mp4", "public/hero/hero-film-poster.jpg"],
  ["public/hero/hero-film-dark.mp4", "public/hero/hero-film-poster-dark.jpg"],
]) {
  if (only && !src.includes(only === "dark" ? "dark" : "hero-film.mp4")) continue;
  run(["ffmpeg", "-y", "-ss", "2.6", "-i", src, "-frames:v", "1", "-q:v", "4", out], out);
}

console.log("\nHERO FILM RENDER DONE");
