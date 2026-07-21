import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const parse = (p) => Object.fromEntries(
  readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const env = parse('.env');
const demo = parse('scripts/.demo-account.local');

const ACCOUNTS = [
  { label: 'demo', email: demo.email, password: demo.password },
  { label: 'mediadesk', email: 'gjkalaja@impuls.al', password: 'Test12345' },
];

for (const acc of ACCOUNTS) {
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  const { error: aerr } = await sb.auth.signInWithPassword({ email: acc.email, password: acc.password });
  if (aerr) { console.log(acc.label, 'LOGIN FAILED:', aerr.message); continue; }
  for (let round = 1; round <= 10; round++) {
    const { data, error } = await sb.functions.invoke('translate-products', { body: {} });
    if (error) { console.log(acc.label, 'round', round, 'error:', error.message); break; }
    console.log(acc.label, 'round', round, JSON.stringify(data));
    const did = data?.translated ?? data?.processed ?? 0;
    const left = data?.remaining ?? 0;
    if (did === 0 || left === 0) break;
  }
  await sb.auth.signOut();
}
console.log('backfill done');
