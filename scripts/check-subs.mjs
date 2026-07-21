import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
const NL = String.fromCharCode(10);
const parse = (p) => Object.fromEntries(readFileSync(p, 'utf8').split(NL).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const env = parse('.env');
const demo = parse('scripts/.demo-account.local');
for (const acc of [
  { label: 'demo', email: demo.email, password: demo.password },
  { label: 'mediadesk', email: 'gjkalaja@impuls.al', password: 'Test12345' },
]) {
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
  const { error } = await sb.auth.signInWithPassword({ email: acc.email, password: acc.password });
  if (error) { console.log(acc.label, 'login failed:', error.message); continue; }
  const { data } = await sb.from('subscriptions').select('plan_id,status,trial_started_at,trial_ends_at,current_period_end').maybeSingle();
  console.log(acc.label, JSON.stringify(data));
  await sb.auth.signOut();
}
