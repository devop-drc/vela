# Performance & Realtime Audit — 2026-07-18

Full-app audit covering server-side caching, realtime (websockets), webhooks, SSE,
and client data-fetching. Produced by three parallel code audits (storefront data
paths; realtime + React Query; AI/sync/chat pipeline). Each finding lists status:
**FIXED** (this pass), **PARTIAL**, or **DEFERRED** (documented follow-up).

---

## 1. Public storefront data path

### 1.1 `get-public-shop-data` runs 9–10 DB round trips per invocation — FIXED
Every call runs 2 serial reads (`shop_details`+`businesses`, `subscriptions`+`plans`)
plus 7 parallel reads (design settings, products page, best-sellers RPC, 24-row
recommendation pool, promotions, marquee). No caching existed at any layer.
**Fix:** two-tier cache (per-isolate memory + `edge_cache` Postgres table) around the
shop-level payload, keyed `pubshop:{slug}:{page}`, TTL 60s memory / 300s table, with
explicit invalidation from write paths.

### 1.2 Pagination re-runs all shop-level work — FIXED
`fetchMoreProducts` (page>1) re-ran subscriptions, design settings, best-sellers,
recommendations, promotions, marquee, and the Instagram logo resolution, although the
client discards everything but `products`/`hasMore` beyond page 1
(`src/contexts/StorefrontContext.tsx:359-386`).
**Fix:** page>1 requests now short-circuit to the products query only.

### 1.3 `resolveInstagramLogo` calls Facebook Graph API per visitor — FIXED
Any shop without an uploaded logo paid up to 2 live `graph.facebook.com` calls per
storefront request (`get-public-shop-data/index.ts:93-131`), burning FB rate limit
proportional to traffic.
**Fix:** result cached in `edge_cache` (`iglogo:{userId}`, TTL 6h); resolved URL also
persisted back to `shop_details.logo_url` when found so subsequent requests skip the
path entirely.

### 1.4 Triple exchange-rate fetch per storefront page load — FIXED
`CurrencyContext` (global), `ShopContext` (global, no auth guard), and
`StorefrontContext` each independently fetched rates on mount: 3 reads of
`exchange_rates_cache` per load and, when stale, 3 racing calls to the external
exchangerate-api.com with 3 racing upserts.
**Fix:** shared `src/lib/exchangeRates.ts` singleton (module-level in-flight promise +
`pgcache` SWR) consumed by all three contexts; server side now dedupes concurrent
refreshes.

### 1.5 `InstagramProductCardFull` N+1: ~4 queries per card — FIXED
Each card on the Instagram-style feed ran its own `product_options`,
`product_variants`, `products.instagram_post_id`, and `combo_products` queries
(~40+ round trips for a 12-product feed), duplicating data the server already embeds
(`product_variants`) and bypassing the existing batching layer (`useVariantOptions`).
**Fix:** card now uses embedded variant data + the batched hooks. The quick-view
modal (`InstagramProductQuickViewModal`) had the same per-open `product_options`
query — also routed through the batched layer (second pass).

### 1.6 POST-only function invocation defeats HTTP caching — FIXED
All public reads used `supabase.functions.invoke` (POST), which is uncacheable.
**Fix:** `get-public-shop-data`, `get-public-product`, `exchange-rates` accept GET
with query params and reply with `Cache-Control: public, max-age=60,
stale-while-revalidate=300`; storefront call sites switched to GET fetch.

### 1.7 Stale-catalog invalidation gap in client `pageCache` — FIXED
The 24h `storefront:{slug}` snapshot was cleared only on shop-details save; product /
promotion / marquee edits never cleared it.
**Fix:** admin mutation paths now clear the storefront page cache for the shop slug.

## 2. AI / sync pipeline

### 2.1 `analyze-instagram-posts` — most expensive function in the app — FIXED
Preview classifier for the import picker used **gemini-2.5-pro** (10×+ the cost of
flash), no `thinkingBudget: 0`, no response schema, re-analyzed **every** post on
every picker open, fetched keywords + recent products per post (N+1), and logged
nothing to `ai_usage`.
**Fix:** switched to `gemini-2.5-flash` with `thinkingBudget: 0` + JSON schema,
hoisted context fetches out of the loop, skips already-imported posts, caches results
in `edge_cache` by caption hash, and logs to `ai_usage`.

### 2.2 AI caption cache not content-addressable — FIXED
`ai_analysis_cache` was keyed by `instagram_post_id`; identical captions on different
posts (restocks, repeat promos) each paid a fresh Gemini call
(`background-sync/index.ts:257-395`).
**Fix:** lookup keyed by `sha256(caption + keywordsHash)`; identical captions share
one analysis.

### 2.3 Keyword edits never invalidate cached analyses — FIXED
User keywords materially change extraction but were not part of any cache key.
**Fix:** keywords hash folded into the cache key (2.2), so keyword changes naturally
miss the stale entries.

### 2.4 No server-side sync dedupe — FIXED
`background-sync` inserted a new `sync_jobs` row unconditionally; only a client-side
button disable prevented overlapping syncs (second tab / race / direct call →
double Gemini spend + racing upserts). The webhook path already had a guard.
**Fix:** the serve handler now returns the existing job id when a `starting` /
`in_progress` job exists for the user.

### 2.5 Full Graph API re-pagination every sync — FIXED
`instagram-posts` re-fetched the merchant's entire post history (up to 10 pages ×
100) on every sync, including quick syncs that only need the diff.
**Fix:** quick syncs pass `since` (derived from the newest synced post) to the Graph
API call chain.

### 2.6 `chat` waits for the full Gemini response — FIXED
`generateContent` + a spinner until the whole reply landed.
**Fix:** `streamGenerateContent?alt=sse` pass-through; the edge function re-emits
`text/event-stream`, `VelaChat` renders tokens incrementally with fallback to the
buffered path on error.

## 3. Realtime (websockets) & polling

### 3.1 `NotificationSidebar` mounts twice on every dashboard route — FIXED
`DashboardLayout.tsx:179-182` used CSS visibility (`hidden md:block` / `md:hidden`),
so desktop *and* mobile instances both mounted: 2× fetches, 2× orders channel,
2× disputes channel, 2× the 180s poll.
**Fix:** real `useIsMobile()` conditional; one instance mounts.

### 3.2 Unfiltered `order_disputes` subscriptions — FIXED
`App.tsx:120` and `NotificationSidebar.tsx:593` subscribed with **no filter**,
receiving every tenant's dispute rows and discarding client-side.
**Fix:** `business_id=eq.{id}` filters added. **RLS verified (second pass):**
`order_disputes` has RLS enabled with an owner-scoped policy
(`recreate_db.sql:856`) and a `business_id` column + stamping trigger
(`20260704100000_perf_indexes.sql`), so Realtime already filtered cross-tenant
events server-side — the unfiltered subscriptions were waste, not a leak.
Publication membership for `orders`/`order_disputes` was dashboard-only config;
now codified in `20260718110000_realtime_publication.sql` (+ replica identity
FULL).

### 3.3 3× duplicate subscriptions per table — FIXED
`orders` was watched by up to 3 channels simultaneously (Index, ActivityFeed,
NotificationSidebar), `order_disputes` likewise.
**Fix:** duplicate mount removed (3.1), filters tightened, and (second pass) a
shared `RealtimeHubContext` now holds ONE channel per business for
orders/disputes/products; Index, ActivityFeed, and NotificationSidebar consume
it via `subscribe()`. Only `App.tsx`'s global dispute toast keeps its own
channel (it lives outside the dashboard layout).

### 3.4 Reachable channel-name collision in `useProductData` — FIXED
`products_channel_${userId}` is not instance-unique; Products page → Promotion editor
→ product picker mounts two instances with the same topic.
**Fix:** per-instance channel suffix (the pattern NotificationSidebar already uses).

### 3.5 Channels torn down on unrelated state changes — FIXED
`ActivityFeed` (deps `[shopDetails, convertCurrency]`) and `Index` rebuilt their
channels on every shop-details object replacement.
**Fix:** effects now depend on `shopDetails?.id` only; the rest read via refs.

### 3.6 Static channel names / 180s poll — FIXED
`sync-jobs` and the three `dashboard-*-feed` names are static strings relying on
"mounts once". Names now scoped by user/business id. NotificationSidebar's safety-net
poll relaxed to 5 minutes (realtime covers the event-driven part; low-stock remains
poll-only by nature).

## 4. Webhooks
Already present and sound: `instagram-webhook` (auto quick-sync on new posts, with
dedupe guard) and `raiaccept-webhook` (payments). This pass added cache invalidation
duties to the write paths they trigger. No new webhook endpoints were needed.

## 5. Follow-up status (second pass, 2026-07-18)
- **TanStack React Query — REMOVED.** Zero `useQuery`/`useMutation` call sites
  existed; all 91 `supabase.from()` reads are hand-rolled fetches with the
  `pageCache.ts` SWR layer doing React Query's job. Decision: removed the unused
  provider, dependency, and its dedicated 26 kB bundle chunk rather than carry
  dead weight. If server-state management is ever wanted, re-adopt deliberately
  with a migration plan.
- **RLS audit for realtime** — done, no leak; publication membership codified
  (see 3.2).
- **Shared realtime bus** — done (see 3.3).
- **`edge_cache` hygiene** — pg_cron purge ships in the migration; applied when
  the migration lands on the hosted project.
- **DEPLOYED 2026-07-19**: all 12 changed edge functions deployed via CLI
  (verify_jwt flags preserved; public GET readers flipped to no-verify-jwt),
  both migrations applied by the owner via the SQL editor. Verified live:
  GET endpoints return 200 + Cache-Control (warm ~500ms, was ~4s cold with
  9-10 queries/request), chat streams `text/event-stream`, storefront loads
  via GET with zero fallbacks/errors. Note: migrations were applied manually,
  so `supabase db push` may re-run them later — both are idempotent.
