// Seeds product_specifications for the dyqani-yt demo catalog (its products
// were created with details:null, so the storefront specs block was empty).
// Signs in as the demo merchant; keyword-matched, Albanian-first values.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const NL = String.fromCharCode(10);
const parse = (p) => Object.fromEntries(readFileSync(p, 'utf8').split(NL).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const env = parse('.env');
const demo = parse('scripts/.demo-account.local');

const RULES = [
  [/qiri|arom/i, [['Materiali', 'Dyllë soje natyrale', null], ['Kohëzgjatja e djegies', '40', 'orë'], ['Aroma', 'Vanilje & Ambër', null], ['Pesha', '220', 'g']]],
  [/varëse|varese|zinxhir/i, [['Materiali', 'Ar 14K', null], ['Gjatësia', '45', 'cm'], ['Pesha', '2.1', 'g'], ['Punimi', 'Me dorë', null]]],
  [/unazë|unaze|ring/i, [['Materiali', 'Argjend 925', null], ['Punimi', 'Artizanal', null], ['Garancia', '12', 'muaj']]],
  [/syze/i, [['Korniza', 'Metal i lehtë', null], ['Lentet', 'UV400 të polarizuara', null], ['Përfshirë', 'Kuti + peçetë mikrofibre', null]]],
  [/çantë shpine|cante shpine|shpine/i, [['Materiali', 'Najlon i papërshkueshëm', null], ['Kapaciteti', '22', 'L'], ['Ndarja e laptopit', 'deri 15.6"', null]]],
  [/çantë|cante|dore/i, [['Materiali', 'Lëkurë natyrale', null], ['Përmasat', '28 × 20 × 10', 'cm'], ['Punimi', 'Artizanal shqiptar', null]]],
  [/fustan|bluz|xhup|triko|veshje/i, [['Materiali', '100% pambuk', null], ['Prodhimi', 'Turqi', null], ['Kujdesi', 'Larje 30°C', null]]],
  [/atlete|këpucë|kepuce/i, [['Materiali i sipërm', 'Rrjetë e frymëmarrshme', null], ['Shuall', 'Gomë antirrëshqitëse', null], ['Pesha', '280', 'g']]],
  [/kafe|çaj|caj|mjaltë|mjalte/i, [['Origjina', 'Prodhim vendor', null], ['Pesha neto', '250', 'g'], ['Skadenca', '12', 'muaj']]],
];
const FALLBACK = [['Origjina', 'E përzgjedhur me kujdes', null], ['Garancia', '12', 'muaj']];

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
const { error: aerr } = await sb.auth.signInWithPassword({ email: demo.email, password: demo.password });
if (aerr) { console.error('login failed:', aerr.message); process.exit(1); }

const { data: products, error } = await sb.from('products').select('id, name');
if (error) { console.error(error.message); process.exit(1); }

let total = 0;
for (const p of products) {
  const specs = (RULES.find(([re]) => re.test(p.name)) ?? [null, FALLBACK])[1];
  const rows = specs.map(([key, value, unit], i) => ({ product_id: p.id, key, value, unit, display_order: i }));
  const { error: uerr } = await sb.from('product_specifications').upsert(rows, { onConflict: 'product_id,key' });
  if (uerr) { console.log(p.name, 'FAILED:', uerr.message); continue; }
  total += rows.length;
  console.log(p.name, '→', rows.length, 'specs');
}
console.log('seeded', total, 'spec rows');
await sb.auth.signOut();
