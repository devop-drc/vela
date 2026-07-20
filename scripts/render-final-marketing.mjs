/**
 * Renders the FINAL bilingual marketing campaign into
 * branding/marketing/final/{en,sq}/… — both languages from the same comps.
 * Props are passed as JSON FILES (no shell-quoting pitfalls on Windows).
 *
 *   node scripts/render-final-marketing.mjs            # everything
 *   node scripts/render-final-marketing.mjs stills     # stills only
 *   node scripts/render-final-marketing.mjs videos     # videos only
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'branding', 'marketing', 'final');
const only = process.argv[2] ?? 'all';
const LANGS = ['en', 'sq'];
const PROPS_DIR = mkdtempSync(path.join(tmpdir(), 'vela-final-props-'));

const VIDEOS = [
  ['FinReelMachine', 'reels/01-the-machine.mp4'],
  ['FinReelNoNeed', 'reels/02-you-dont-need.mp4'],
  ['FinReelNight', 'reels/03-open-247.mp4'],
  ['FinPostPanel', 'posts/01-control-room.mp4'],
  ['FinPostFive', 'posts/02-five-minutes.mp4'],
];
const STILLS = [
  ['FinReelCover', 'reel-covers/01-the-machine.png'],
  ['FinStoryTrial', 'stories/01-trial-picker.png'],
  ['FinStoryTonight', 'stories/02-tonight.png'],
];
// Numbered system series — one single-image post per part of the system.
const SERIES_SLUGS = {
  en: ['01-the-system', '02-the-shop', '03-payments', '04-control', '05-the-harbor'],
  sq: ['01-sistemi', '02-dyqani', '03-pagesat', '04-kontrolli', '05-porti'],
};
// TikTok layer = the two fast reels, copied after render
const TIKTOK = [
  ['reels/02-you-dont-need.mp4', 'tiktok/01-you-dont-need.mp4'],
  ['reels/03-open-247.mp4', 'tiktok/02-open-247.mp4'],
];

const propsFile = (obj) => {
  // key+value in the name — {lang,part:0} and {lang,slide:0} must not collide
  const p = path.join(PROPS_DIR, `${Object.entries(obj).flat().join('-')}.json`);
  writeFileSync(p, JSON.stringify(obj));
  return p;
};

const remotion = (args) => {
  console.log('> remotion', args.join(' '));
  execFileSync('npx', ['remotion', ...args], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
};

for (const lang of LANGS) {
  for (const dir of ['reels', 'reel-covers', 'posts', 'single-posts', 'carousels', 'stories', 'tiktok']) {
    mkdirSync(path.join(OUT, lang, dir), { recursive: true });
  }
  const langProps = propsFile({ lang });
  if (only !== 'videos') {
    for (const [comp, out] of STILLS) {
      remotion(['still', 'src/remotion.ts', comp, path.join('branding/marketing/final', lang, out), '--frame=25', `--props=${langProps}`]);
    }
    for (let part = 0; part < 5; part++) {
      remotion(['still', 'src/remotion.ts', 'FinSystemPost', path.join('branding/marketing/final', lang, 'single-posts', `${SERIES_SLUGS[lang][part]}.png`), '--frame=25', `--props=${propsFile({ lang, part })}`]);
    }
    for (let slide = 0; slide < 5; slide++) {
      remotion(['still', 'src/remotion.ts', 'FinCarousel', path.join('branding/marketing/final', lang, 'carousels', `01-voyage-${slide + 1}.png`), '--frame=15', `--props=${propsFile({ lang, slide })}`]);
    }
  }
  if (only !== 'stills') {
    for (const [comp, out] of VIDEOS) {
      remotion(['render', 'src/remotion.ts', comp, path.join('branding/marketing/final', lang, out), `--props=${langProps}`]);
    }
    for (const [src, dst] of TIKTOK) {
      copyFileSync(path.join(OUT, lang, ...src.split('/')), path.join(OUT, lang, ...dst.split('/')));
      console.log('copied', dst);
    }
  }
}
console.log('final campaign rendered.');
