/**
 * Instagram→Product extraction test runner.
 *
 *   node test/run_extraction_tests.ts             deterministic suite (no API)
 *   node test/run_extraction_tests.ts --remote    ALSO calls the DEPLOYED
 *                                                 ai-product-classifier edge fn
 *                                                 (uses .env supabase creds)
 *   node test/run_extraction_tests.ts --filter=case_51
 *
 * Deterministic layer (always runs, zero network):
 *   • media selection    — which media the pipeline sends to the model
 *                          (video→thumbnail, carousel→first 3, image→url)
 *   • routing            — isCaptionInsufficient() vs the annotated baseline
 *   • normalization      — mock_model_response.json is pushed through the
 *                          SAME normalizeAnalysis() the edge fn uses (core.ts)
 *                          and compared field-by-field with expected_behavior
 *
 * Remote layer (--remote): the real handler + real Gemini, evaluated with the
 * same assertions. NOTE: it tests the DEPLOYED revision — local prompt fixes
 * only show up there after `supabase functions deploy ai-product-classifier`.
 *
 * Output: console table + test/report.md + test/report.json. Exit code 1 on
 * any deterministic failure (remote failures are reported but don't fail CI
 * while the deployed revision lags local).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isCaptionInsufficient,
  selectMediaForAnalysis,
  normalizeAnalysis,
} from '../supabase/functions/ai-product-classifier/core.ts';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ARGS = process.argv.slice(2);
const REMOTE = ARGS.includes('--remote');
const FILTER = ARGS.find((a) => a.startsWith('--filter='))?.slice('--filter='.length) ?? null;
const TEST_USER_ID = '00000000-0000-4000-8000-000000000000';

interface Check { name: string; pass: boolean; detail?: string }
interface CaseResult { folder: string; checks: Check[]; remoteChecks?: Check[]; remoteMs?: number; crashed?: string }

const lc = (s: unknown) => String(s ?? '').toLowerCase();

/* ── assertion helpers ────────────────────────────────────────────────── */
function checkClassification(result: any, expected: any, label: string): Check[] {
  const checks: Check[] = [];
  const c = expected.classification;
  if (!c) return checks;
  const put = (name: string, pass: boolean, detail?: string) =>
    checks.push({ name: `${label}:${name}`, pass, ...(detail ? { detail } : {}) });

  if (c.skip_or_image_retry) {
    const declined = result.isProductPost === false;
    const flagged = result._needsImageRetry === true;
    put('skip-or-image-retry', declined || flagged,
      declined || flagged ? undefined : `expected a decline or _needsImageRetry, got isProductPost=${result.isProductPost} with productName="${result.productName}"`);
    // hallucination guard even here: a "product" invented from emoji is the failure mode
    if (result.isProductPost === true && !flagged) {
      put('no-invented-product', false, `pipeline fabricated a product from an unusable caption: "${result.productName}"`);
    }
    return checks;
  }

  if (c.is_product_post != null) {
    put('isProductPost', Boolean(result.isProductPost) === Boolean(c.is_product_post),
      `expected ${c.is_product_post}, got ${result.isProductPost}`);
  }

  if (c.is_product_post) {
    put('multi-vs-single', Boolean(result.isMultiProductPost) === Boolean(c.is_multi),
      `expected isMultiProductPost=${c.is_multi}, got ${result.isMultiProductPost}`);
    const count = Array.isArray(result.products) && result.products.length > 0 ? result.products.length : (result.isProductPost ? 1 : 0);
    put('product-count', count === c.product_count, `expected ${c.product_count} product(s), got ${count}`);
    if (c.pricing_type) {
      put('pricing-type', (result.pricing_type || result.pricingType) === c.pricing_type,
        `expected ${c.pricing_type}, got ${result.pricing_type || result.pricingType}`);
    }
  }
  if (c.is_sale_or_promotion != null) {
    put('sale-flag', Boolean(result.isSaleOrPromotion) === Boolean(c.is_sale_or_promotion),
      `expected isSaleOrPromotion=${c.is_sale_or_promotion}, got ${result.isSaleOrPromotion}`);
  }
  if (expected.promotion_expect) {
    const p = result.promotion;
    const ok = p && (!expected.promotion_expect.discount_type || p.discount_type === expected.promotion_expect.discount_type)
      && (expected.promotion_expect.discount_value == null || Number(p.discount_value) === Number(expected.promotion_expect.discount_value));
    put('promotion', Boolean(ok), ok ? undefined : `expected promotion ${JSON.stringify(expected.promotion_expect)}, got ${JSON.stringify(p ?? null)}`);
  }

  // per-product assertions — matched results are CONSUMED so a substring
  // collision (expected 'phone' matching result 'headphones') can't compare
  // one extracted product against two different expectations.
  const resultProducts: any[] = Array.isArray(result.products) && result.products.length > 0
    ? result.products
    : (result.isProductPost ? [result] : []);
  const consumed = new Set<number>();
  for (const [i, ep] of (expected.products ?? []).entries()) {
    const matchIdx = resultProducts.findIndex((rp, idx) => {
      if (consumed.has(idx)) return false;
      const name = lc(rp.productName || rp.name) + ' ' + lc(rp.productNameSq);
      return (ep.name_keywords_any ?? []).some((k: string) => name.includes(lc(k)));
    });
    const match = matchIdx >= 0 ? resultProducts[matchIdx] : undefined;
    if (matchIdx >= 0) consumed.add(matchIdx);
    if (!match) {
      put(`product[${i}]-found`, false, `no extracted product matched any of [${(ep.name_keywords_any ?? []).join(', ')}] — got: ${resultProducts.map((r) => r.productName || r.name).join(' | ') || '(none)'}`);
      continue;
    }
    put(`product[${i}]-found`, true);
    if (ep.price != null) {
      const got = Number(match.price ?? NaN);
      put(`product[${i}]-price`, got === Number(ep.price), `expected ${ep.price}, got ${match.price}`);
    }
    if (ep.currency) {
      put(`product[${i}]-currency`, lc(match.currency) === lc(ep.currency), `expected ${ep.currency}, got ${match.currency}`);
    }
    if (ep.inventory != null) {
      put(`product[${i}]-inventory`, Number(match.inventory) === Number(ep.inventory), `expected ${ep.inventory}, got ${match.inventory}`);
    }
    if (ep.options_expect) {
      const opts = match.options && !Array.isArray(match.options) ? match.options : {};
      // Group names may come back in the merchant's language ("Masat",
      // "Ngjyra") — that's correct storefront behavior, so match bilingually.
      const GROUP_ALIASES: Record<string, string[]> = {
        size: ['size', 'masat', 'masa', 'madhësia', 'madhesia'],
        color: ['color', 'colour', 'ngjyra', 'ngjyrat', 'ngjyre'],
      };
      for (const [wantName, wantValues] of Object.entries(ep.options_expect) as [string, string[]][]) {
        const aliases = GROUP_ALIASES[lc(wantName)] ?? [lc(wantName)];
        const realKey = Object.keys(opts).find((k) => aliases.some((a) => lc(k).includes(a) || a.includes(lc(k))));
        if (!realKey) {
          put(`product[${i}]-option-${wantName}`, false, `option group "${wantName}" missing — got groups: [${Object.keys(opts).join(', ') || 'none'}]`);
          continue;
        }
        const gotValues = (opts[realKey] as any[]).map((v) => lc(typeof v === 'string' ? v : v.value));
        const missing = wantValues.filter((v) => !gotValues.some((g) => g.includes(lc(v)) || lc(v).includes(g)));
        put(`product[${i}]-option-${wantName}`, missing.length === 0,
          missing.length ? `missing values [${missing.join(', ')}] in ${realKey}=[${gotValues.join(', ')}]` : undefined);
      }
    }
  }

  // hallucination guards
  for (const field of expected.must_be_empty_or_zero ?? []) {
    if (!result.isProductPost) continue; // nothing extracted → nothing hallucinated
    const v = result[field];
    const ok = v == null || v === 0 || v === '' || (Array.isArray(v) && v.length === 0);
    put(`no-hallucinated-${field}`, ok, ok ? undefined : `${field} must stay empty/0 (not stated in post), got ${JSON.stringify(v)}`);
  }
  return checks;
}

/* ── remote invocation ────────────────────────────────────────────────── */
function readEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '..', '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch { /* no .env */ }
  return env;
}

async function callRemote(input: any, env: Record<string, string>): Promise<any> {
  const url = `${env.VITE_SUPABASE_URL}/functions/v1/ai-product-classifier`;
  const post = input.post;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY}`,
    },
    body: JSON.stringify({
      caption: post.caption || '',
      user_id: TEST_USER_ID,
      include_images: input.include_images ?? undefined,
      post_media: { media_url: post.media_url, thumbnail_url: post.thumbnail_url, media_type: post.media_type, post_id: post.id },
    }),
    signal: AbortSignal.timeout(90000), // rides out cold starts + the fn's internal Gemini retry chain
  });
  return res.json();
}

/* ── main ─────────────────────────────────────────────────────────────── */
async function main() {
  const folders = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('case_'))
    .map((d) => d.name)
    .filter((n) => !FILTER || n.includes(FILTER))
    .sort();
  if (folders.length === 0) {
    console.error('No case folders found. Run: node test/generate_cases.ts');
    process.exit(2);
  }

  const env = readEnv();
  const results: CaseResult[] = [];

  for (const folder of folders) {
    const dir = path.join(ROOT, folder);
    const r: CaseResult = { folder, checks: [] };
    results.push(r);
    try {
      const input = JSON.parse(fs.readFileSync(path.join(dir, 'input.json'), 'utf8'));
      const expected = JSON.parse(fs.readFileSync(path.join(dir, 'expected_behavior.json'), 'utf8'));
      const post = input.post;

      // 1) media selection
      if (expected.media_selection) {
        const sel = selectMediaForAnalysis(post).map(({ index, source }) => ({ index, source }));
        const want = expected.media_selection;
        const same = sel.length === want.length && sel.every((s, i) => s.index === want[i].index && s.source === want[i].source);
        r.checks.push({ name: 'media-selection', pass: same, ...(same ? {} : { detail: `expected ${JSON.stringify(want)}, got ${JSON.stringify(sel)}` }) });
        // annotated per-product media indices must reference media the model actually receives
        const maxIdx = sel.length - 1;
        for (const [i, ep] of (expected.products ?? []).entries()) {
          if (!ep.media_indices) continue;
          const bad = ep.media_indices.filter((ix: number) => ix > maxIdx);
          r.checks.push({
            name: `product[${i}]-media-indices-reachable`, pass: bad.length === 0,
            ...(bad.length ? { detail: `annotation maps product to media ${JSON.stringify(bad)} but only indices 0..${maxIdx} are sent to the model` } : {}),
          });
        }
      }

      // 2) routing
      if (expected.routing) {
        const got = isCaptionInsufficient(post.caption ?? null);
        r.checks.push({
          name: 'routing-caption-insufficient', pass: got === expected.routing.caption_insufficient,
          ...(got === expected.routing.caption_insufficient ? {} : { detail: `isCaptionInsufficient=${got}, annotation says ${expected.routing.caption_insufficient}` }),
        });
      }

      // 3) deterministic normalization on the mock model output
      const mockPath = path.join(dir, 'mock_model_response.json');
      if (fs.existsSync(mockPath)) {
        const mock = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
        const normalized = normalizeAnalysis({
          analysis: structuredClone(mock),
          caption: post.caption || '',
          usedImages: false,
          hasPostMedia: Boolean(post.media_url),
        });
        r.checks.push(...checkClassification(normalized, expected, 'normalize'));
      }

      // 4) remote (deployed handler + real model)
      if (REMOTE && expected.llm_checks && env.VITE_SUPABASE_URL) {
        try {
          const t0 = performance.now();
          const remote = await callRemote(input, env);
          r.remoteMs = Math.round(performance.now() - t0);
          if (remote?.error) {
            r.remoteChecks = [{ name: 'remote:invoke', pass: false, detail: `edge fn error: ${remote.error}` }];
          } else {
            r.remoteChecks = [{ name: 'remote:invoke', pass: true }, ...checkClassification(remote, expected, 'remote')];
          }
        } catch (e: any) {
          r.remoteChecks = [{ name: 'remote:invoke', pass: false, detail: `call failed: ${e.message}` }];
        }
      }
    } catch (e: any) {
      r.crashed = e.stack || e.message;
      r.checks.push({ name: 'no-crash', pass: false, detail: e.message });
    }
  }

  /* ── report ─────────────────────────────────────────────────────────── */
  const failed = (cs: Check[]) => cs.filter((c) => !c.pass);
  let passCases = 0, failCases = 0, remotePass = 0, remoteFail = 0;
  const lines: string[] = [];
  for (const r of results) {
    const f = failed(r.checks);
    const rf = r.remoteChecks ? failed(r.remoteChecks) : [];
    if (f.length === 0) passCases++; else failCases++;
    if (r.remoteChecks) { if (rf.length === 0) remotePass++; else remoteFail++; }
    const mark = f.length === 0 ? 'PASS' : 'FAIL';
    const rmark = r.remoteChecks ? (rf.length === 0 ? ' | remote PASS' : ' | remote FAIL') : '';
    lines.push(`${mark}${rmark}  ${r.folder}`);
    for (const c of [...f, ...rf]) lines.push(`       ✗ ${c.name}: ${c.detail ?? 'failed'}`);
  }

  const times = results.map((r) => r.remoteMs).filter((n): n is number => n != null).sort((a, b) => a - b);
  const latency = times.length
    ? `  ·  latency avg ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)}ms · p50 ${times[Math.floor(times.length / 2)]}ms · p95 ${times[Math.floor(times.length * 0.95)]}ms`
    : '';
  const summary = [
    '',
    `Deterministic: ${passCases}/${results.length} cases passed`,
    REMOTE ? `Remote (DEPLOYED fn — may lag local fixes): ${remotePass}/${remotePass + remoteFail} cases passed${latency}` : 'Remote layer skipped (run with --remote to hit the deployed classifier)',
    '',
  ];
  console.log(lines.join('\n'));
  console.log(summary.join('\n'));

  const md = [
    `# IG→Product extraction test report`,
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Deterministic:** ${passCases}/${results.length} passed${REMOTE ? `  ·  **Remote (deployed fn):** ${remotePass}/${remotePass + remoteFail} passed` : ''}`,
    '',
    '| case | deterministic | remote | failures |',
    '|---|---|---|---|',
    ...results.map((r) => {
      const f = failed(r.checks); const rf = r.remoteChecks ? failed(r.remoteChecks) : null;
      const fails = [...f, ...(rf ?? [])].map((c) => `${c.name}: ${c.detail ?? ''}`).join('<br>') || '—';
      return `| ${r.folder} | ${f.length === 0 ? '✅' : '❌'} | ${rf == null ? '–' : rf.length === 0 ? '✅' : '❌'} | ${fails} |`;
    }),
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'report.md'), md + '\n');
  fs.writeFileSync(path.join(ROOT, 'report.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`report written to test/report.md and test/report.json`);

  process.exitCode = failCases > 0 ? 1 : 0;
}

main();
