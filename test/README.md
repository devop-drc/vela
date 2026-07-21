# Instagram → Product extraction test harness

Tests the `ai-product-classifier` pipeline end to end: mock Instagram posts
in, annotated product expectations out.

```bash
npm run test:extraction          # regenerate cases + deterministic suite (no API)
npm run test:extraction:remote   # ALSO hits the DEPLOYED edge fn with real Gemini
node test/run_extraction_tests.ts --filter=case_51   # one case
```

## Layout

```
test/
  generate_cases.ts          the single source of truth for all mock data —
                             edit THIS, not the folders, then re-run it
  run_extraction_tests.ts    the runner (Node 24 runs the .ts directly)
  case_<id>_<scenario>/
    input.json               mock IG payload (caption, media, children, user ctx)
    expected_behavior.json   human-annotated baseline
    mock_model_response.json a CORRECT Gemini structured output for the case
  report.md / report.json    written by every run (gitignored)
```

## Coverage

48 matrix cases — every combination of:

| axis | values |
|---|---|
| media | single image · 4-image carousel · video/reel · mixed carousel (img+video+img) |
| products | single · multi (3 distinct items) · variant (same item, 3 colors / 4 sizes) |
| caption | none · emoji-only · noisy lifestyle · highly detailed (price, sizes, specs) |

Plus 8 edge cases: missing price (no-hallucination guard), mixed currencies in
one caption, "20k lek" slang pricing (with a "5000L" shipping-threshold decoy),
multi-product caption with a single image, lifestyle caption over a product
photo, monthly subscription service, promotion-only post, emoji+price-only.

## What the runner checks

**Deterministic layer** (always, zero network — runs the exact `core.ts` code
the edge function imports):

- **media selection** — which media the pipeline sends to the model
  (video→thumbnail, carousel→first 3 children, image→url), and that every
  annotated product→media mapping references media the model actually receives
- **routing** — `isCaptionInsufficient()` against the annotation (drives
  image-analysis inclusion and the `_needsImageRetry` flag)
- **normalization** — `mock_model_response.json` is pushed through
  `normalizeAnalysis()` and compared field-by-field: single-vs-multi
  classification, product count, per-product name/price/currency/inventory,
  option groups (values as supersets), pricing type, promotion payload, and
  hallucination guards (`must_be_empty_or_zero`)

**Remote layer** (`--remote`) — invokes the deployed `ai-product-classifier`
with the same payloads and evaluates the same assertions against the live
model output. ⚠️ It tests the DEPLOYED revision: local prompt/logic fixes only
show up there after `npx supabase functions deploy ai-product-classifier`.

## Expected-behavior schema (annotator's guide)

```jsonc
{
  "annotation": "why this case exists, in one sentence",
  "routing": { "caption_insufficient": true, "image_analysis_expected": true },
  "media_selection": [{ "index": 0, "source": "media_url" }],
  "classification": {
    // EITHER a hard skip/retry expectation for unusable captions:
    "skip_or_image_retry": true
    // OR full extraction expectations:
    // "skip": false, "is_product_post": true, "is_multi": true,
    // "product_count": 3, "pricing_type": "one_time", "is_sale_or_promotion": false
  },
  "products": [{
    "name_keywords_any": ["kufje", "headphone"],  // case-insensitive, any-of
    "price": 2500, "currency": "ALL", "inventory": 15,
    "options_expect": { "size": ["S", "M", "L"] },  // group by fuzzy name, values ⊆ extracted
    "media_indices": [0]                             // annotation of which media show it
  }],
  "must_be_empty_or_zero": ["price"],  // hallucination guards
  "promotion_expect": { "discount_type": "percent", "discount_value": 20 },
  "llm_checks": true                    // whether the remote layer applies
}
```

## Engine bugs found & fixed by this harness (2026-07-20)

1. **No-caption posts could never reach image analysis** — `background-sync`
   sends `caption: ''` with `include_images: true`, but the classifier threw
   `"Caption is required"` on empty captions. Now media-only posts are valid
   input (`index.ts`).
2. **Pipeline logic was untestable** — the prompt, routing, media selection,
   heuristic multi-product parser and the whole normalization tail were inlined
   in the Deno handler. Extracted to `ai-product-classifier/core.ts`, imported
   by both the edge fn and this harness, so what's tested is what ships.
3. **Prompt gaps closed** (validated deterministically here, live after the
   next deploy): Albanian slang prices ("20k lek" = 20000 ALL) + never estimate
   a missing price; explicit single-vs-multi rule (variants ≠ products[]);
   per-item currencies in mixed-currency captions; subscription cues
   ("në muaj" → pricingType subscription); "N L" recognized as Lekë in the
   insufficiency router so priced captions aren't needlessly re-routed to
   image analysis.

## Phase-3 completion (2026-07-21) — remote suite green

Progression against the deployed classifier: 28/56 → 39 (deploy of pending
fixes) → 42 (thinking budget) → 49 (prompt round 2) → **56/56**.

Engine bugs found & fixed by the remote loop:
4. **`thinkingBudget: 0` + responseSchema truncation** — gemini-2.5-flash
   emitted legally-minimal 57-token objects (only `isProductPost` was
   schema-required) AND corrupted non-ASCII output (U+FFFD in Albanian
   diacritics). Fix: budget 512 + key fields nullable-but-REQUIRED.
5. **Emoji-bait fabrication** — "🔥🔥🛍️" produced "Various Products";
   prompt now forbids placeholder products on no-signal captions.
6. **Option values translated** — "e zezë" became "Black"; prompt now pins
   option values to the merchant's original wording (customers see them).

Test-harness bugs found by its own failures (fixed in the runner/fixtures):
- product matcher lacked consumption — expected 'phone' substring-matched
  result 'headphones', comparing one product against two expectations (the
  phantom "field bleed");
- option-GROUP names come back in the merchant's language ("Masat",
  "Ngjyra") — matcher now aliases bilingually;
- two model behaviors were re-classified as correct: "vetëm 20k + dërgesa
  falas" legitimately flags a promotion (case 51); a sale post may keep a
  product wrapper as long as the promotion payload is right (case 55).
