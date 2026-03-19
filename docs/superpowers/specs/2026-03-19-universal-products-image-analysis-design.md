# Design Spec: Universal Product Structure, Image Analysis & Radius Fix

**Date:** 2026-03-19
**Status:** Approved

---

## 1. Overview

Three changes to InstantShop:

1. **Gemini Vision image analysis** — When Instagram post captions are insufficient, analyze product images to extract details.
2. **Universal product structure** — Dedicated `product_specifications` table, `category_templates` seed system, and clear separation of specifications (fixed) vs options (customer-selectable) vs variants (combinations).
3. **Category & Type management page** — Admin page to manage system templates and custom categories/types with their associated specs and options.
4. **Radius fix** — Fix the broken border-radius adjustment in settings.

---

## 2. Image Analysis with Gemini Vision

### 2.1 Caption Quality Heuristic

Before the first Gemini API call, check if the caption is sufficient:

```
function isCaptionInsufficient(caption: string | null): boolean
  - caption is null or empty
  - caption is under 20 characters
  - caption is only hashtags (every word starts with #)
  - caption is only emojis (no alphanumeric characters)
  - caption has no price signals (no digits adjacent to currency symbols/codes)
```

If `isCaptionInsufficient` returns `true`, the first Gemini call includes images.

### 2.2 AI Fallback Retry

After the first Gemini call (caption-only), if:
- `isProductPost === false` AND the post has media, OR
- `isProductPost === true` but `productName` is missing or `price` is null

Then retry once with images attached.

### 2.3 Media Selection

For image analysis, select media to send:

| Post Type | What to Send |
|-----------|-------------|
| `IMAGE` | The single image (from `media_url`) |
| `VIDEO` | The thumbnail (from `thumbnail_url`) |
| `CAROUSEL_ALBUM` | Up to 3 child images via Instagram Graph API (`/{media_id}/children?fields=id,media_url,media_type,thumbnail_url`). For child videos, use their thumbnail. |

### 2.4 Gemini API Request Format (with images)

```json
{
  "contents": [{
    "parts": [
      { "text": "PROMPT_TEXT" },
      {
        "inline_data": {
          "mime_type": "image/jpeg",
          "data": "<base64_encoded_image>"
        }
      },
      {
        "inline_data": {
          "mime_type": "image/jpeg",
          "data": "<base64_encoded_image_2>"
        }
      }
    ]
  }],
  "tools": [{ "google_search": {} }],
  "generationConfig": { "responseMimeType": "application/json" }
}
```

Images are fetched from their URLs and base64-encoded in the edge function before sending to Gemini.

### 2.5 Prompt Additions

When images are included, append to the existing prompt:

```
IMPORTANT: The caption for this post is insufficient or missing. Product images have been provided.
Analyze the images carefully to identify:
- The product(s) shown (name, type, brand if visible)
- Visual attributes (color, material, condition)
- Any text visible in the image (price tags, labels, brand names)
- Product category based on visual appearance
Combine image analysis with any caption text available to produce the most accurate product details.
```

### 2.6 Implementation Location

All changes in `supabase/functions/ai-product-classifier/index.ts` and `supabase/functions/background-sync/index.ts`:

- New helper: `fetchImageAsBase64(url: string): Promise<{data: string, mimeType: string}>`
  - 10 second timeout per image fetch
  - Skip images larger than 4MB
  - Returns null on failure (graceful degradation)
- New helper: `getPostMedia(post, accessToken): Promise<ImagePart[]>` — handles carousel children
- Modified: `callGemini()` to accept optional image parts
- Modified: `background-sync` loop to check caption quality and handle retries

**Critical:** The existing `!post.caption` early-return skip in `background-sync` (line ~317) must be replaced with the `isCaptionInsufficient` check. Posts without captions should proceed to image analysis, not be skipped.

**Price signal regex** should align with existing pattern in `background-sync`: `/\b(ALL|EUR|USD|GBP|Lek|Leke)\b|\d+[\.,]?\d*\s?(ALL|EUR|USD|GBP)/i`

### 2.7 Caching

The `ai_analysis_cache` uses `instagram_post_id` as PK, so only one cache entry exists per post. When an image-enhanced analysis is performed, it overwrites any prior caption-only analysis (the image analysis is strictly better). No schema change needed — the cache simply stores the best available analysis.

---

## 3. Enhanced "Find Specs with AI" System (Cost-Optimized)

### 3.1 Cost Problem

Google Search grounding costs **$35 per 1,000 requests**. A naive two-pass approach (classify + spec search) would cost ~$0.07/product. For 100 products synced, that's $7 in grounding alone, plus token costs for images and text.

### 3.2 Solution: Product Intelligence Waterfall

A 4-level waterfall that resolves **everything** (classification + specs + options) from cheapest to most expensive. The key insight: once ANY user pays for AI classification and spec search for a product, that intelligence is cached globally and every future user gets it for free.

```
┌─────────────────────────────────────────────────────┐
│ Instagram post arrives (caption + media)             │
└──────────────────────┬──────────────────────────────┘
                       ▼
            ┌──────────────────────┐
  Step 0    │  Heuristic Extract   │  FREE — Extract product name
            │  Product Name        │  from caption via regex
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
  Level 1   │  Global Product      │  FREE — Full classification +
            │  Intelligence        │  specs + options from shared
            │  Cache               │  cross-user cache
            └──────────┬───────────┘
                       │ no match
                       ▼
            ┌──────────────────────┐
  Level 2   │  User Product        │  FREE — Match against user's
            │  Reuse               │  own existing products
            └──────────┬───────────┘
                       │ no match
                       ▼
            ┌──────────────────────┐
  Level 3   │  Category Template   │  FREE — Fill from seed data
            │  Defaults            │  (partial, for known types)
            └──────────┬───────────┘
                       │ insufficient
                       ▼
            ┌──────────────────────┐
  Level 4   │  Gemini Flash +      │  PAID — Single AI call,
            │  Dynamic Retrieval   │  results cached globally
            │                      │  (one-time cost, free forever)
            └──────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Populate Global     │  Results saved to shared cache
            │  Intelligence Cache  │  → all future users get it FREE
            └──────────────────────┘
```

### 3.3 Step 0: Heuristic Product Name Extraction (Free)

Before hitting any database or AI, extract a candidate product name from the caption. This is needed to look up the global cache.

```typescript
function extractProductName(caption: string): string | null {
  if (!caption) return null;
  const lines = caption.split('\n').filter(l => l.trim());
  // First non-hashtag, non-emoji line is likely the product name
  for (const line of lines) {
    const cleaned = line.replace(/#\S+/g, '').replace(/[^\w\s\-&.'/]/g, '').trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return null;
}

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\b(the|a|an)\b/g, '')
    .trim();
}
```

### 3.4 Level 1: Global Product Intelligence Cache (Free)

The core optimization. A shared, cross-user cache of **complete product intelligence** — classification, specs, AND options. Once any user's sync processes an "iPhone 16 Pro", every future user gets the full classification + specs + options for free with zero AI calls.

**New table: `global_product_intelligence`** (replaces `global_spec_cache`)

```sql
CREATE TABLE public.global_product_intelligence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    normalized_name text NOT NULL,
    category_name text NOT NULL,
    type_name text NOT NULL,
    description text,                       -- generic product description
    tags jsonb DEFAULT '[]',                -- ["smartphone", "apple", "iphone"]
    specifications jsonb NOT NULL,          -- [{key, value, unit}, ...]
    options jsonb DEFAULT '[]',             -- [{name, common_values}, ...]
    source text DEFAULT 'ai_classified',    -- 'ai_classified' | 'manual' | 'seeded'
    confidence numeric DEFAULT 0.8,         -- quality score (0-1)
    reuse_count integer DEFAULT 0,          -- how many times reused across users
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(normalized_name, category_name, type_name)
);

CREATE INDEX idx_gpi_name_lookup
    ON public.global_product_intelligence(normalized_name);
CREATE INDEX idx_gpi_category_lookup
    ON public.global_product_intelligence(category_name, type_name);
CREATE INDEX idx_gpi_reuse_count
    ON public.global_product_intelligence(reuse_count DESC);

-- Readable by all authenticated users, writable only via service role
ALTER TABLE public.global_product_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read global product intelligence"
    ON public.global_product_intelligence
    FOR SELECT
    USING (auth.role() = 'authenticated');
```

**Lookup (using normalized name from Step 0):**
```sql
SELECT category_name, type_name, description, tags, specifications, options, confidence
FROM global_product_intelligence
WHERE normalized_name = :normalizedName
ORDER BY confidence DESC, reuse_count DESC
LIMIT 1
```

**If no exact match, try fuzzy:**
```sql
SELECT category_name, type_name, description, tags, specifications, options, confidence
FROM global_product_intelligence
WHERE normalized_name % :normalizedName   -- trigram similarity (pg_trgm)
  AND similarity(normalized_name, :normalizedName) > 0.6
ORDER BY similarity(normalized_name, :normalizedName) DESC
LIMIT 1
```

Requires: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` and `CREATE INDEX idx_gpi_name_trgm ON global_product_intelligence USING gin(normalized_name gin_trgm_ops);`

**If match found (confidence ≥ 0.7):**
- Use cached `category_name`, `type_name` as the product's classification — **skip AI classification entirely**
- Copy `specifications` to `product_specifications` table for this product
- Copy `options` to `product_options` + `option_values` tables
- Use cached `description` if the post caption is insufficient
- Use cached `tags`
- Increment `reuse_count`
- Mark source as `'global_intelligence'`
- **DONE — zero AI cost, zero grounding cost**

**Only the user-specific data comes from the caption:** price, inventory, specific option values selected (e.g., which colors this seller has), media URLs.

### 3.5 Level 2: User Product Reuse (Free)

When no global match exists but the user has a similar product in their own catalog, copy its intelligence.

**Matching logic:**

```sql
SELECT p.id, p.name, p.category,
       array_agg(json_build_object('key', ps.key, 'value', ps.value, 'unit', ps.unit)) as specs
FROM products p
LEFT JOIN product_specifications ps ON ps.product_id = p.id
WHERE p.user_id = :userId
  AND (
    p.name ILIKE '%' || :productName || '%'
    OR :productName ILIKE '%' || p.name || '%'
  )
  AND p.id != :currentProductId
  AND EXISTS (SELECT 1 FROM product_specifications WHERE product_id = p.id)
GROUP BY p.id
LIMIT 1
```

Also query `product_options` + `option_values` for the matched product.

**If match found with specs:**
- Copy all `product_specifications` rows to the new product
- Copy option structure (option names and common values)
- Copy category and type from matched product
- **Also populate `global_product_intelligence`** so future users benefit too
- Mark source as `'user_reuse'`
- Done — skip Levels 3-4

### 3.6 Level 3: Category Template Defaults (Free)

If no match anywhere, use `category_templates` seed data for partial fill. This level requires AI classification first (to know the category/type), so a Gemini Flash call happens here.

**Flow:**
1. Run Gemini Flash classification (caption-only, no grounding) to get `categoryName` and `typeName`
2. Look up `category_templates` for the classified type
3. For each `default_specifications` entry with `common_values`:
   - Use the first common value as a placeholder
4. For specifications without common values:
   - Leave empty — need Level 4 or manual input

**Sufficiency check:** If the template provides values for ≥80% of its own spec keys, consider it "sufficient" and skip Level 4. Otherwise, proceed to Level 4 to fill the gaps.

**Mark spec source as `'template_default'`** — visually distinguished in UI (lighter text, "estimated" badge).

### 3.7 Level 4: Single Gemini Call with Dynamic Retrieval (Paid, Last Resort)

Only reached for truly novel products. Uses **dynamic retrieval** to minimize grounding charges.

```json
{
  "tools": [{ "google_search": {} }],
  "tool_config": {
    "google_search_retrieval": {
      "dynamic_retrieval_config": {
        "mode": "MODE_DYNAMIC",
        "dynamic_threshold": 0.5
      }
    }
  }
}
```

**Single call prompt:**
```
Find the exact specifications for this product.

Product name: {productName}
Category: {categoryName}
Type: {typeName}
Caption/description: {caption}
Already known specs: {specs from Level 3 template, if any}

[Images attached if available — up to 3]

Expected specifications for this product type:
{templateSpecKeys with descriptions from category_templates}

Fill in accurate values for each specification. Use Google Search ONLY if the product
is not well-known or if the caption lacks specific details.
Return JSON: {
  "specifications": [{"key": "...", "value": "...", "unit": "..."}],
  "options": [{"name": "...", "common_values": ["..."]}],
  "description": "...",
  "tags": ["..."]
}
```

**After response — critically, populate global intelligence:**
1. Upsert results into `product_specifications` for this product
2. **Insert into `global_product_intelligence`** with the full classification + specs + options
3. Mark spec source as `'google_search'`
4. **This is a one-time cost. Every future user who sells this same product gets it for free.**

### 3.8 Global Intelligence Population Strategy

The `global_product_intelligence` table grows organically as users sync products. But we can accelerate it:

**Seeding popular products:**
- Pre-populate the cache with specs for top 500-1000 common products (iPhones, Samsung phones, Nike shoes, common electronics, etc.) using a one-time batch job
- Mark these as `source: 'seeded'`, `confidence: 0.9`
- Cost: ~$5-10 one-time for 1000 products via batch API with Flash

**Quality maintenance:**
- When multiple users classify the same product, compare results. If they agree, increase `confidence`
- If a user manually corrects specs, update the global cache (with `confidence` boost)
- Stale entries (>1 year old for electronics, >2 years for clothing) get `confidence` reduced and may trigger re-search

**Privacy:** The global cache stores product TYPES, not user-specific data. No user prices, inventory, media, or business information is shared. Only generic product intelligence (what specs does an iPhone 16 Pro have?).

### 3.9 Write Results to `product_specifications` Table

All four levels write to the same destination:

**In `ProductEditMode.tsx` (`handleReanalyze`):**
- Current: writes specs to `details` JSONB via `setValue('details', ...)`
- New: calls `find-product-specs` edge function which runs the waterfall and writes to `product_specifications`
- Then refresh the specs display from the table

**In `background-sync`:**
- After product creation, run the waterfall for each product
- Use `INSERT ... ON CONFLICT (product_id, key) DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit`

**In `upsert-combo-from-analysis`:**
- For each combo item product, run the waterfall and insert specs

### 3.10 Grounding in `analyze-instagram-posts`

**Problem:** `analyze-instagram-posts` (import preview) currently has no Google Search grounding.

**Fix:** Do NOT add grounding to `analyze-instagram-posts`. The import preview should stay fast and cheap — it's for quick preview, not final spec accuracy. Instead:
- Import preview checks `global_product_intelligence` first (free, instant)
- If no match, uses Gemini WITHOUT grounding for basic classification only
- After the user confirms import and the product is created, `background-sync` or the manual "Find specs" button runs the full waterfall
- This keeps import preview fast (~1-2s per post) and free of grounding charges

### 3.11 New Edge Function: `find-product-specs`

A dedicated function that runs the waterfall:

```typescript
// Input
{
  product_id: string,
  product_name: string,
  category?: string,       // optional — waterfall may resolve this
  type?: string,           // optional — waterfall may resolve this
  user_id: string,
  caption?: string,
  media_urls?: string[],   // for Level 4 image context
  force_search?: boolean   // skip Levels 1-3, go straight to Level 4
}

// Output
{
  category_name: string,
  type_name: string,
  description?: string,
  tags?: string[],
  specifications: [{ key: string, value: string, unit: string | null }],
  options?: [{ name: string, common_values: string[] }],
  source: 'global_intelligence' | 'user_reuse' | 'template_default' | 'google_search',
  cost: { grounding_used: boolean, tokens_used?: number, model_used: 'flash' | 'pro' | 'none' }
}
```

- `force_search: true` is used by the manual "Find specs with AI" button when the user explicitly wants fresh Google Search results regardless of cache
- When `source` is `'global_intelligence'`, `cost.model_used` is `'none'` — no AI call was made

### 3.12 Tiered Model Selection

Use the cheapest model that can handle each task. Only escalate to Pro for genuine edge cases.

| Task | Model | Cost (per 1M tokens) | Why |
|------|-------|---------------------|-----|
| Standard classification (clear caption) | **Flash** | $0.30 in / $2.50 out | Structured extraction, doesn't need complex reasoning |
| Image analysis (insufficient caption) | **Flash** | $0.30 in / $2.50 out | Vision works well on Flash |
| Level 4 spec search (grounding) | **Flash** | $0.30 in / $2.50 out | Google Search does the heavy lifting |
| Ambiguous/complex retry | **Pro** | $1.25 in / $10 out | Better reasoning for edge cases |

**Escalation trigger:** If Flash returns `isProductPost: false` on a post that has media, OR returns a product with no name and no price, retry once with Pro. Expected escalation rate: ~5% of products.

**Implementation:** Change `GEMINI_PRO_API_URL` to a model selector:
```typescript
function getGeminiUrl(model: 'flash' | 'pro' = 'flash'): string {
  const modelId = model === 'flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
}
```

### 3.13 Batch API for Background Sync (50% Off)

Background sync is not real-time — users already wait while watching the progress widget. Use Gemini's Batch API for 50% off all token costs.

**How it works:**
- Instead of individual `generateContent` calls per post, batch all classification requests into a single batch job
- Gemini processes them asynchronously (up to 24h, usually much faster)
- Poll for completion, then process all results at once

**Implementation in `background-sync`:**
1. Collect all posts needing analysis
2. Submit as a batch request to Gemini Flash
3. Update `sync_jobs.status = 'analyzing'` with progress polling
4. When batch completes, process all results and create products
5. Run spec waterfall for each product

**Batch API format:**
```typescript
// Submit batch
POST /v1beta/models/gemini-2.5-flash:batchGenerateContent
{
  "requests": [
    { "contents": [{ "parts": [{ "text": "prompt_for_post_1" }] }] },
    { "contents": [{ "parts": [{ "text": "prompt_for_post_2" }] }] },
    // ... up to 100 requests per batch
  ]
}
```

**Fallback:** If batch takes >5 minutes, fall back to individual calls so the user isn't waiting too long. Show estimated time in the sync widget.

### 3.14 Context Caching for System Prompt (90% Off Repeated Tokens)

The classifier system prompt (~2,000 tokens) is identical for every product. Context caching charges only 10% for cached tokens.

**Implementation:**
1. On first call in a sync session, create a cached content object with the system prompt + user keywords + category templates
2. Use `cachedContent` reference in subsequent calls
3. Cache TTL: 1 hour (covers a full sync session)

```typescript
// Create cache (once per sync session)
const cache = await fetch(`${GEMINI_BASE}/cachedContents`, {
  method: 'POST',
  body: JSON.stringify({
    model: 'models/gemini-2.5-flash',
    contents: [{ parts: [{ text: systemPrompt + keywordsContext + templateContext }] }],
    ttl: '3600s'
  })
});

// Use cache in each call (90% cheaper for cached portion)
const response = await fetch(getGeminiUrl('flash'), {
  body: JSON.stringify({
    cachedContent: cache.name,
    contents: [{ parts: [{ text: productCaption }] }]  // only the variable part
  })
});
```

**Savings:** For 100 products, the ~2K token prompt is sent once instead of 100 times. At Flash pricing: saves ~$0.054 per 100 products (small individually but adds up).

**Note:** Context caching has a minimum token requirement (typically 32K tokens). If the system prompt + keywords + templates don't meet this threshold, concatenate the templates for all 65 types into the cached context to pad it. This is free to cache and makes template lookups instant.

### 3.15 Heuristic Pre-Filter (Skip AI Entirely)

Many Instagram product captions follow predictable patterns. A regex-based parser can extract product info without any AI call.

**Heuristic parser triggers (skip Gemini if ALL conditions met):**
1. Caption contains a clear price signal: `(\d+[\.,]?\d*)\s*(ALL|EUR|USD|GBP|Lek)`
2. First line of caption looks like a product name (>3 chars, not all hashtags)
3. Product name matches a known category template type

**Parser extracts:**
```typescript
function heuristicParse(caption: string): HeuristicResult | null {
  const priceMatch = caption.match(/(\d+[\.,]?\d*)\s*(ALL|EUR|USD|GBP|Lek|€|\$)/i);
  const refMatch = caption.match(/ref\.?\s*code\s*:\s*([A-Za-z0-9\-]+)/i);
  const stockMatch = caption.match(/stock\s*:\s*(\d+)/i);
  const lines = caption.split('\n').filter(l => l.trim());
  const name = lines[0]?.replace(/#\S+/g, '').trim();

  if (!priceMatch || !name || name.length < 3) return null;

  return {
    productName: name,
    price: parseFloat(priceMatch[1].replace(',', '.')),
    currency: normalizeCurrency(priceMatch[2]),
    reference_code: refMatch?.[1] || null,
    inventory: stockMatch ? parseInt(stockMatch[1]) : 10,
    confidence: 'heuristic'
  };
}
```

**When heuristic succeeds:**
- Create product with parsed data (name, price, currency, inventory)
- Still run the spec waterfall to get specifications
- Still let AI classify category/type in the background (low priority, can be batched)
- Mark product as `needs_ai_review: true` so the user knows it was heuristic-parsed

**When heuristic fails:**
- Proceed to Gemini Flash classification as normal

**Expected hit rate:** ~30% of posts (well-structured Albanian/English product captions with clear pricing).

### 3.16 Free Tier Maximization

Google provides generous free quotas that small shops may never exceed:

| Resource | Free Quota | Typical Usage (100 products) |
|----------|-----------|------------------------------|
| Gemini 2.5 Flash requests | 250/day | ~70 (after heuristic filter) |
| Gemini 2.5 Pro requests | 100/day | ~5 (escalation only) |
| Google Search grounding | 1,500/day on paid tier | ~20 (Level 4 only) |

**For shops syncing <250 products/day, classification is completely free.**

**Implementation:** Track daily API usage in a simple counter (in-memory or `sync_jobs` metadata). When approaching free tier limits:
- Switch to batch mode (which has separate, higher limits)
- Queue remaining products for next day if limits hit
- Show user: "Free daily limit reached. Remaining products will be processed tomorrow."

### 3.17 Cost Projections (All Optimizations Combined)

**Scenario A: New platform (first users, empty global cache)**

| Step | Products | AI Calls | Cost |
|---|---|---|---|
| Heuristic pre-filter (skip AI) | 30 | 0 | $0 |
| Global intelligence (empty, no hits) | 0 | 0 | $0 |
| User product reuse | 10 | 0 | $0 |
| Template defaults (sufficient) | 15 | 1 Flash each (classification) | Free tier |
| Level 4 search (novel products) | 45 | 1 Flash + grounding each | Free tier (1,500/day) |
| **Total for first 100 products** | **100** | | **~$0.00** (within free tier) |

All 100 products now populate `global_product_intelligence`. **Every future user benefits.**

**Scenario B: Mature platform (global cache has ~5,000 products)**

| Step | Products | AI Calls | Cost |
|---|---|---|---|
| Heuristic pre-filter | 30 | 0 | $0 |
| **Global intelligence (cache hit!)** | **55** | **0** | **$0** |
| User product reuse | 5 | 0 | $0 |
| Template defaults | 5 | 1 Flash each | Free tier |
| Level 4 search (truly novel only) | 5 | 1 Flash + grounding each | Free tier |
| **Total for 100 products** | **100** | **~10 AI calls** | **~$0.00** |

**90% of products resolved with zero AI cost.** Only ~5 truly novel products per 100 need any AI at all.

**Scenario C: Heavy user, 500 products/day, exceeding free tier**

| Component | Cost per Product | 500 Products |
|---|---|---|
| Global intelligence hits (~60%) | $0 | $0 |
| Flash classification (batch, cached) for remainder | ~$0.0005 | ~$0.10 |
| Level 4 grounding (~5% of total) | ~$0.0018 | ~$0.44 |
| Pro escalation (~2% of total) | ~$0.0004 | ~$0.04 |
| **Total** | **~$0.001/product** | **~$0.58** |

**Cost comparison over time:**

| Approach | First 100 Products | After 5,000 cached | 500/day heavy user |
|---|---|---|---|
| Original design (Pro + always-grounding) | $7.00 | $7.00 | $35.00 |
| **Final design (all optimizations)** | **~$0.00** | **~$0.00** | **~$0.58** |

**Key insight:** The cost approaches zero as the global cache grows. After the first few thousand products are classified across all users, the platform effectively runs for free. AI costs become a rounding error.

---

## 4. Universal Product Structure

### 4.1 New Table: `product_specifications`

```sql
CREATE TABLE public.product_specifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    key text NOT NULL,
    value text NOT NULL,
    unit text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(product_id, key)
);

CREATE INDEX idx_product_specifications_user_id ON public.product_specifications(user_id);
CREATE INDEX idx_product_specifications_product_id ON public.product_specifications(product_id);

-- Auto-populate user_id from product owner (for edge function inserts that only know product_id)
CREATE OR REPLACE FUNCTION set_spec_user_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        SELECT user_id INTO NEW.user_id FROM public.products WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_spec_user_id_trigger
    BEFORE INSERT ON public.product_specifications
    FOR EACH ROW EXECUTE FUNCTION set_spec_user_id();

-- RLS
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own product specifications"
    ON public.product_specifications
    FOR ALL
    USING (user_id = auth.uid());

-- Public storefront can read specs for active products
CREATE POLICY "Public read product specifications for active products"
    ON public.product_specifications
    FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_specifications.product_id
        AND p.status = 'Active'
    ));
```

### 4.2 New Table: `category_templates`

System-level templates defining expected specs and options per category/type. These are global (not per-user) and serve as defaults. Users can also create custom categories/types.

```sql
CREATE TABLE public.category_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name text NOT NULL,
    type_name text NOT NULL,
    default_specifications jsonb NOT NULL DEFAULT '[]',
    default_options jsonb NOT NULL DEFAULT '[]',
    is_system boolean DEFAULT true,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Separate unique indexes to handle NULL user_id correctly
CREATE UNIQUE INDEX idx_category_templates_system
    ON public.category_templates (category_name, type_name)
    WHERE user_id IS NULL;

CREATE UNIQUE INDEX idx_category_templates_user
    ON public.category_templates (category_name, type_name, user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX idx_category_templates_is_system ON public.category_templates(is_system, category_name);
CREATE INDEX idx_category_templates_user_id ON public.category_templates(user_id);

-- RLS
ALTER TABLE public.category_templates ENABLE ROW LEVEL SECURITY;

-- System templates readable by all (including anon for storefront)
CREATE POLICY "System templates are readable by all"
    ON public.category_templates
    FOR SELECT
    USING (is_system = true);

CREATE POLICY "Users can manage their own custom templates"
    ON public.category_templates
    FOR ALL
    USING (user_id = auth.uid());
```

**Relationship with existing `categories` and `types` tables:** The existing per-user `categories` and `types` tables remain for product categorization (the actual category/type assigned to each product). `category_templates` is a separate reference library that provides default specs and options. When AI classifies a product, it looks up `category_templates` to know what to extract, then writes the category name to `products.category` and upserts into `categories`/`types` as before. The template is consulted, not replaced.

#### `default_specifications` format:
```json
[
  { "key": "material", "label": "Material", "unit": null, "common_values": ["Cotton", "Polyester", "Silk", "Wool", "Linen"] },
  { "key": "weight", "label": "Weight", "unit": "grams", "common_values": null },
  { "key": "care_instructions", "label": "Care Instructions", "unit": null, "common_values": ["Machine Wash", "Hand Wash", "Dry Clean Only"] }
]
```

#### `default_options` format:
```json
[
  { "name": "Size", "common_values": ["XS", "S", "M", "L", "XL", "XXL"] },
  { "name": "Color", "common_values": ["Black", "White", "Red", "Blue", "Green", "Grey", "Navy", "Brown", "Pink", "Beige"] }
]
```

### 4.3 Seed Data (13 Categories, ~65 Types)

#### Clothing & Apparel

| Type | Specifications | Options |
|------|---------------|---------|
| T-Shirts | material, fit (Regular/Slim/Oversized), gender, care_instructions, season | Size, Color |
| Hoodies & Sweatshirts | material, fit, gender, weight_gsm, care_instructions | Size, Color |
| Pants & Jeans | material, fit, gender, rise (Low/Mid/High), closure | Size, Color, Length |
| Dresses & Skirts | material, gender, length, occasion, care_instructions | Size, Color |
| Jackets & Coats | material, gender, insulation, waterproof, season | Size, Color |
| Shoes & Sneakers | upper_material, gender, sole_material, closure_type | Size, Color |
| Underwear & Socks | material, gender, pack_count | Size, Color |
| Accessories | material, gender, season | Size, Color |

#### Electronics & Tech

| Type | Specifications | Options |
|------|---------------|---------|
| Smartphones | processor, gpu, screen_size, resolution, battery_mah, os, camera_mp, weight, connectivity | Storage, RAM, Color |
| Laptops | processor, gpu, screen_size, resolution, battery_wh, os, weight, ports | Storage, RAM, Color |
| Tablets | processor, screen_size, resolution, battery_mah, os, weight, connectivity | Storage, RAM, Color |
| Headphones & Earbuds | driver_size, frequency_response, impedance, battery_life, noise_cancelling, connectivity | Color |
| Smartwatches | processor, screen_size, battery_life, water_resistance, os, sensors | Color, Band |
| Cameras | sensor_size, megapixels, iso_range, video_resolution, weight, lens_mount | Color, Kit |
| Gaming Consoles | processor, gpu, storage, resolution_output, weight | Edition, Bundle |
| Computer Accessories | connectivity, compatibility, dimensions, weight | Color, Size |
| Speakers | driver_size, power_watts, battery_life, connectivity, water_resistance | Color |
| Power Banks & Chargers | capacity_mah, output_watts, ports, weight | Color |

#### Home & Living

| Type | Specifications | Options |
|------|---------------|---------|
| Furniture | material, dimensions, weight, weight_capacity, assembly_required | Color, Size |
| Decor | material, dimensions, weight | Color, Style |
| Kitchenware | material, dimensions, dishwasher_safe, capacity | Color, Size |
| Bedding & Textiles | material, thread_count, dimensions, care_instructions | Size, Color |
| Lighting | wattage, lumens, color_temperature, dimensions, bulb_type | Color, Size |
| Storage & Organization | material, dimensions, weight_capacity | Color, Size |

#### Beauty & Personal Care

| Type | Specifications | Options |
|------|---------------|---------|
| Skincare | ingredients, volume, skin_type, spf, cruelty_free | Size |
| Makeup | ingredients, finish, coverage, cruelty_free | Shade, Size |
| Haircare | ingredients, volume, hair_type | Size |
| Fragrances | notes_top, notes_middle, notes_base, concentration, gender | Size |
| Nail Care | finish, ingredients, cruelty_free | Color |
| Tools & Devices | material, power_source, battery_life, weight | Color |

#### Art & Handmade

| Type | Specifications | Options |
|------|---------------|---------|
| Paintings | medium, dimensions, artist, year, signed | Frame |
| Prints & Posters | print_method, paper_type, dimensions, edition | Size, Frame |
| Sculptures | material, dimensions, weight, artist | Size |
| Handmade Jewelry | material, gemstone, weight, hypoallergenic | Size, Metal |
| Pottery & Ceramics | material, dimensions, technique, dishwasher_safe | Color, Size |
| Candles & Wax | wax_type, scent, burn_time, weight | Size, Scent |

#### Food & Beverages

| Type | Specifications | Options |
|------|---------------|---------|
| Snacks | ingredients, allergens, nutritional_info, net_weight, shelf_life | Size, Flavor |
| Beverages | ingredients, volume, allergens, caffeine_content | Size, Flavor |
| Baked Goods | ingredients, allergens, net_weight, shelf_life | Size, Flavor |
| Meal Kits | ingredients, servings, prep_time, allergens, calories | Portion |
| Coffee & Tea | origin, roast_level, process, net_weight | Size, Grind |
| Supplements | ingredients, dosage, servings, certifications | Size, Flavor |

#### Sports & Fitness

| Type | Specifications | Options |
|------|---------------|---------|
| Equipment | material, dimensions, weight, weight_capacity | Size, Color |
| Sports Clothing | material, fit, gender, moisture_wicking | Size, Color |
| Supplements | ingredients, servings, dosage, certifications | Size, Flavor |
| Sports Footwear | material, gender, sole_type, terrain | Size, Color |
| Accessories | material, dimensions, weight | Size, Color |

#### Books & Media

| Type | Specifications | Options |
|------|---------------|---------|
| Physical Books | author, pages, language, publisher, isbn, year | Format |
| E-books | author, pages, language, file_format | — |
| Music (Physical) | artist, label, year, genre, tracks | Format |
| Online Courses | instructor, duration, level, language, modules | Plan |

#### Services

| Type | Specifications | Options |
|------|---------------|---------|
| Consulting | duration, delivery_method, includes | Package, Duration |
| Design Services | deliverables, revisions, turnaround_time, format | Package |
| Photography | duration, deliverables, location, edited_photos_count | Package |
| Tutoring & Lessons | subject, duration, level, delivery_method | Duration, Frequency |
| Repair & Maintenance | warranty, turnaround_time, includes | Type |
| Subscriptions | billing_cycle, includes, access_level | Plan, Duration |

#### Automotive & Parts

| Type | Specifications | Options |
|------|---------------|---------|
| Car Parts | compatibility, material, dimensions, weight, oem_aftermarket | — |
| Car Accessories | material, compatibility, dimensions | Color, Size |
| Tools | material, drive_size, weight, set_count | Set |

#### Toys & Games

| Type | Specifications | Options |
|------|---------------|---------|
| Toys | age_range, material, dimensions, battery_required, safety_certifications | Color |
| Board Games | age_range, players, play_time, language | Edition |
| Puzzles | pieces, dimensions, age_range, material | — |
| Video Games | platform, genre, esrb_rating, players, language | Edition, Platform |

#### Pet Supplies

| Type | Specifications | Options |
|------|---------------|---------|
| Pet Food | animal_type, ingredients, allergens, net_weight, life_stage | Size, Flavor |
| Pet Toys | animal_type, material, dimensions, durability | Size, Color |
| Pet Accessories | animal_type, material, dimensions | Size, Color |
| Pet Health | animal_type, ingredients, dosage, volume | Size |

#### Bags & Luggage

| Type | Specifications | Options |
|------|---------------|---------|
| Backpacks | material, capacity_liters, dimensions, weight, laptop_compartment | Color, Size |
| Handbags & Purses | material, dimensions, closure_type, gender | Color |
| Luggage & Suitcases | material, capacity_liters, dimensions, weight, wheels, tsa_lock | Size, Color |
| Wallets & Cardholders | material, card_slots, dimensions, rfid_blocking | Color |

### 4.4 Migration: `products.details` → `product_specifications`

A one-time migration script that:

1. For each product with non-empty `details` JSONB:
   - Extract key-value pairs that are NOT `type`, `options`, `options_v2`, `variants`, `Brand`
   - Skip array values (those are legacy options, already in `product_options`)
   - Skip null values and nested object values
   - Coerce numeric values to text via `::text`
   - Insert using `INSERT ... ON CONFLICT (product_id, key) DO NOTHING`
   - Set `user_id` from the product's `user_id` column
2. Keep `details` column for backward compatibility but stop writing specs to it
3. Update all frontend reads to use `product_specifications` instead of `details`

### 4.5 AI Prompt Updates

Update the Gemini prompt in `ai-product-classifier` to:

1. Reference the `category_templates` system — include the matching template's expected specs and options when a category/type is identified
2. Enforce the distinction:
   - **Specifications**: Fixed product attributes that describe what the product IS. Not selectable by customer. Examples: material, processor, screen_size, battery_mah.
   - **Options**: Attributes the customer CHOOSES when purchasing. Create variant combinations. Examples: color, size, storage, RAM.
3. Return specs as: `"specifications": [{"key": "material", "value": "Cotton", "unit": null}, ...]`
4. Return options as before: `"options": {"Size": [...], "Color": [...]}`

### 4.6 Product Creation Flow Changes

When a product is created (from AI or manually):

1. Look up `category_templates` for the category/type
2. Pre-populate specification fields from template defaults
3. Pre-populate option fields from template defaults
4. AI fills in actual values; user can edit
5. Save specs to `product_specifications` table
6. Save options to `product_options` + `option_values` tables
7. Generate variants from options as before

---

## 5. Category & Type Management Page

### 5.1 Route

`/categories` — New protected route in `App.tsx`, added to sidebar navigation.

### 5.2 Page Structure

```
Categories & Types Management Page
├── Header: "Categories & Types" + "Add Category" button
├── Tab bar: "System Templates" | "My Custom"
│
├── Category List (accordion/collapsible)
│   ├── Category Card: "Clothing & Apparel" [Edit] [Delete (custom only)]
│   │   ├── Type: "T-Shirts" [Edit] [Delete (custom only)]
│   │   │   ├── Specifications: material, fit, gender, care_instructions, season
│   │   │   └── Options: Size, Color
│   │   ├── Type: "Hoodies & Sweatshirts" [Edit] [Delete]
│   │   └── + Add Type
│   │
│   ├── Category Card: "Electronics & Tech"
│   │   ├── Type: "Smartphones" [Edit] [Delete]
│   │   └── ...
│   └── ...
│
└── Modals:
    ├── Add/Edit Category Modal
    │   └── Fields: Category Name
    ├── Add/Edit Type Modal
    │   ├── Fields: Type Name
    │   ├── Specifications Editor (add/remove/reorder specs)
    │   │   └── Per spec: key, label, unit (optional), common_values (tag input)
    │   └── Options Editor (add/remove/reorder options)
    │       └── Per option: name, common_values (tag input)
    └── Delete Confirmation Modal
```

### 5.3 Behavior

**System templates:**
- Read-only by default (marked with a badge)
- Users can "Duplicate as Custom" to make an editable copy
- Users cannot delete system templates

**Custom templates:**
- Fully editable (CRUD)
- Created by user via "Add Category" / "Add Type" buttons
- `is_system = false`, `user_id = auth.uid()`
- Appear in "My Custom" tab and also in the combined view

**Template usage:**
- When AI classifies a product, it checks custom templates first (user-specific), then falls back to system templates
- When user manually creates a product and selects a category/type, the template pre-populates spec and option fields

### 5.4 Components

| Component | Purpose |
|-----------|---------|
| `src/pages/Categories.tsx` | Page component with tabs, search, category list |
| `src/components/categories/CategoryCard.tsx` | Collapsible category with its types |
| `src/components/categories/TypeCard.tsx` | Type display with specs and options |
| `src/components/categories/CategoryEditorModal.tsx` | Add/edit category |
| `src/components/categories/TypeEditorModal.tsx` | Add/edit type with spec/option editors |
| `src/components/categories/SpecificationEditor.tsx` | Manage spec list with key, label, unit, common values |
| `src/components/categories/OptionEditor.tsx` | Manage option list with name and common values |

---

## 6. Radius Fix

### 6.1 Root Cause

The `InstagramShopLayout` component (`src/components/storefront/InstagramShopLayout.tsx`) contains `applyInstagramShopSettingsToDOM()` which:

1. **Removes all custom CSS properties** from `document.documentElement` (line ~29-36)
2. **Hardcodes `--radius: 0.5rem`** (line ~64)
3. **Injects a `<style>` tag with `!important`** overriding `--radius` (line ~79)

When a user navigates from the Instagram Shop layout back to the dashboard, the hardcoded values and `!important` overrides can persist, making the radius slider appear non-functional.

### 6.2 Fix

1. **`AppearanceContext.tsx`**: Export a `restoreSettings()` method via context (or export `applySettingsToDOM` directly). Currently `applySettingsToDOM` is a module-level function not exposed to other components.
2. **`InstagramShopLayout.tsx`**: On unmount (cleanup function in `useEffect`), call the exported `restoreSettings()` to re-apply the user's saved design settings.
3. **Remove the `!important`** from the injected `<style>` tag — the inline styles on `documentElement` already have sufficient specificity.
4. **`AppearanceContext.tsx`**: Ensure `applySettingsToDOM` is called on mount and after any navigation that could have overridden CSS variables.

---

## 7. Files Changed

### New Files
- `supabase/functions/find-product-specs/index.ts` — Dedicated Pass 2 spec-finding edge function
- `src/pages/Categories.tsx` — Category & Type management page
- `src/components/categories/CategoryCard.tsx` — Collapsible category with types
- `src/components/categories/TypeCard.tsx` — Type display with specs and options
- `src/components/categories/CategoryEditorModal.tsx` — Add/edit category
- `src/components/categories/TypeEditorModal.tsx` — Add/edit type with spec/option editors
- `src/components/categories/SpecificationEditor.tsx` — Manage spec list
- `src/components/categories/OptionEditor.tsx` — Manage option list

### Modified Files
- `supabase/functions/ai-product-classifier/index.ts` — Switch to Flash by default, tiered model selection, image analysis, template-guided prompts, heuristic pre-filter, context caching, batch support, new spec output format
- `supabase/functions/analyze-instagram-posts/index.ts` — No grounding change (stays fast for preview)
- `supabase/functions/background-sync/index.ts` — Heuristic pre-filter, caption quality check, retry logic, image fetching, batch API support, calls `find-product-specs` waterfall, context caching per session, write specs to `product_specifications` table
- `supabase/functions/upsert-combo-from-analysis/index.ts` — Write specs to `product_specifications` table
- `supabase/recreate_db.sql` — New tables (`product_specifications`, `category_templates`, `global_product_intelligence`), seed data, indexes (including `pg_trgm` for fuzzy matching), RLS policies, triggers
- `src/App.tsx` — New `/categories` route
- `src/components/layout/Sidebar.tsx` — Add categories link
- `src/components/layout/BottomNav.tsx` — Add categories link (if applicable)
- `src/components/storefront/InstagramShopLayout.tsx` — Radius fix (remove `!important`, cleanup restores settings)
- `src/components/settings/AppearancePanel.tsx` — Verify radius slider works
- `src/contexts/AppearanceContext.tsx` — Export `restoreSettings()`, ensure settings restoration after layout switches
- `src/components/product-detail/ProductEditMode.tsx` — "Find specs with AI" button now calls `find-product-specs`, reads/writes `product_specifications` table instead of `details` JSONB
- `src/components/product-detail/ProductEditor.tsx` — Read specs from `product_specifications`, show template defaults
- `src/components/product-forms/*` — Use new spec/option structure
- `src/components/storefront/StorefrontProductDetail.tsx` — Display specs from `product_specifications` table
- `src/components/InstagramPostModal.tsx` — Benefits from grounding in `analyze-instagram-posts`
