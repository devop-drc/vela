import { readFileSync } from 'node:fs';
const NL = String.fromCharCode(10);
const parse = (p) => Object.fromEntries(readFileSync(p, 'utf8').split(NL).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const env = parse('.env');
const res = await fetch(env.VITE_SUPABASE_URL + '/functions/v1/get-public-shop-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY, Authorization: 'Bearer ' + env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY },
  body: JSON.stringify({ shopSlug: "dyqani-yt" }),
});
console.log('status', res.status);
console.log((await res.text()).slice(0, 600));
