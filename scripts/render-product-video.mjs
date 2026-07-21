// Renders the Instagram Studio motion overlay (ProductPromo) for a product.
//
//   node scripts/render-product-video.mjs --name "Çantë lëkure" --price 4500 \
//     --video https://.../product.mp4 --shop "Dyqani Yt" --template gradient \
//     [--image https://... ] [--currency ALL] [--accent "#A31234"] [--out out/promo.mp4]
//
// Same composition a future Lambda/worker backend will render — this script
// is the manual/on-demand path.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
}
if (!args.name || (!args.video && !args.image)) {
  console.error('Usage: --name <name> (--video <url> | --image <url>) [--price N] [--currency ALL] [--shop <name>] [--accent #hex] [--template gradient|banner|badge] [--out path.mp4]');
  process.exit(1);
}

const props = {
  videoUrl: args.video ?? null,
  imageUrl: args.image ?? null,
  name: args.name,
  price: args.price != null ? parseFloat(args.price) : null,
  currency: args.currency ?? 'ALL',
  shopName: args.shop ?? '',
  accent: args.accent ?? '#A31234',
  template: args.template ?? 'gradient',
};

mkdirSync('out', { recursive: true });
const propsFile = 'out/product-promo-props.json';
writeFileSync(propsFile, JSON.stringify(props));
const out = args.out ?? 'out/product-promo.mp4';

execFileSync('npx', [
  'remotion', 'render', 'src/remotion.ts', 'ProductPromo', out,
  '--codec=h264', '--crf=19', `--props=${propsFile}`,
], { stdio: 'inherit', shell: process.platform === 'win32' });
console.log('rendered:', out);
