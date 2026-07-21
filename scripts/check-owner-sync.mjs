// Watch the owner's latest sync jobs + product count (duplicate check).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const NL = String.fromCharCode(10);
const parse = (p) => Object.fromEntries(readFileSync(p, 'utf8').split(NL).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const env = parse('.env'); const acct = parse('scripts/.owner-account.local');
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
await sb.auth.signInWithPassword({ email: acct.email, password: acct.password });

for (let i = 0; i < 12; i++) {
  const { data: jobs } = await sb.from('sync_jobs').select('status, message, summary, created_at').order('created_at', { ascending: false }).limit(3);
  const running = (jobs ?? []).some((j) => ['starting', 'in_progress'].includes(j.status));
  if (!running || i === 11) {
    for (const j of jobs ?? []) console.log(j.status, '|', j.message, '|', JSON.stringify(j.summary).slice(0, 160));
    break;
  }
  await new Promise((r) => setTimeout(r, 10000));
}
const { data: prods } = await sb.from('products').select('id, name, instagram_post_id');
console.log('PRODUCT COUNT:', prods?.length, JSON.stringify(prods?.map((p) => p.name)));
await sb.auth.signOut();
