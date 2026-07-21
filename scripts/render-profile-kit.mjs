// Renders the Instagram profile kit → branding/marketing/profile-kit/
// (6 highlight covers, 6 highlight stories, 3 reels, 2 post videos + stills)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'branding/marketing/profile-kit';
for (const d of ['highlights', 'stories', 'reels', 'posts']) mkdirSync(`${OUT}/${d}`, { recursive: true });

const run = (args) => execFileSync('npx', ['remotion', ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
const ENTRY = 'src/remotion.ts';

const ICONS = ['nisja', 'dyqani', 'pagesat', 'porosite', 'postimet', 'pyetje'];
for (const icon of ICONS) {
  const props = `out/hl-${icon}.json`;
  writeFileSync(props, JSON.stringify({ icon }));
  run(['still', ENTRY, 'HlCover', `${OUT}/highlights/hl-cover-${icon}.png`, `--props=${props}`]);
  run(['still', ENTRY, 'HlStory', `${OUT}/stories/hl-story-${icon}.png`, `--props=${props}`]);
}

const VIDEOS = [
  ['CleanReelConvert', `${OUT}/reels/01-profili-dyqan.mp4`],
  ['CleanReelAutoPost', `${OUT}/reels/02-posto-vete.mp4`],
  ['CleanReelPay', `${OUT}/reels/03-karte-kesh.mp4`],
  ['CleanPostImport', `${OUT}/posts/04-excel-dyqan.mp4`],
  ['CleanPostStudio', `${OUT}/posts/05-studio.mp4`],
];
for (const [id, out] of VIDEOS) {
  run(['render', ENTRY, id, out, '--codec=h264', '--crf=19']);
}
console.log('profile kit rendered →', OUT);
