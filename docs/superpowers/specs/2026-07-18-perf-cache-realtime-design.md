# Perf, Cache & Realtime Overhaul — Design Spec (2026-07-18)

Approved design (owner chose: **no new infrastructure** — no hosted Redis; the cache
layer is built from edge-function isolate memory + a Postgres cache table + HTTP
caching). Audit findings backing every item: `docs/PERF_AUDIT.md`.

## Goals
1. Eliminate redundant DB / external-API work on the public storefront hot path.
2. Cut Gemini + Facebook Graph API spend via content-addressable caching and dedupe.
3. Stream the Vela chat reply (SSE); tighten existing websocket usage; keep webhooks.
4. Event-driven cache invalidation from every write path; TTLs only as safety nets.

## Architecture

### Two-tier server cache (`supabase/functions/_shared/cache.ts`)
- **Tier 1:** per-isolate in-memory Map with TTL + stale-while-revalidate. Absorbs
  repeat traffic on warm isolates; zero latency.
- **Tier 2:** `edge_cache` UNLOGGED Postgres table (`key text pk`, `value jsonb`,
  `expires_at timestamptz`). Shared across isolates/functions. Lazy expiry on read +
  pg_cron purge. UNLOGGED: contents are disposable by definition.
- API: `cacheGet(key)`, `cacheSet(key, value, ttlSeconds)`, `cacheDelete(prefixOrKey)`,
  `cached(key, ttl, fn)` (read-through, single-flight per isolate).
- Shared plumbing hoisted at the same time: `_shared/cors.ts`,
  `_shared/supabaseAdmin.ts` (memoized client) — removes ~24 copy-pasted copies.

### Keys & TTLs
| Key | Contents | TTL (mem/table) | Invalidated by |
|---|---|---|---|
| `pubshop:{slug}:{page}` | get-public-shop-data payload (minus per-visitor orders) | 60s / 300s | background-sync end, admin product/promo/marquee/shop writes, instagram-webhook |
| `pubprod:{slug}:{productId}` | get-public-product payload | 60s / 300s | product write |
| `iglogo:{userId}` | resolved IG profile-pic URL | 6h | instagram-webhook profile update |
| `aicap:{sha256(caption+keywordsHash)}` | classifier result (backed by ai_analysis_cache; key becomes content-addressable) | table-backed | keyword edits (new hash) |
| `rates:ALL` | exchange-rate map | 1h / 24h | external refresh |

Per-visitor data (customer order lookups) is **never** cached.

### HTTP caching
Public reads (`get-public-shop-data`, `get-public-product`, `exchange-rates`) accept
GET with query params and return
`Cache-Control: public, max-age=60, stale-while-revalidate=300`.
Contract: `GET {SUPABASE_URL}/functions/v1/get-public-shop-data?shopSlug=X&page=1&limit=N`
with the anon `apikey` header. POST bodies remain supported (backwards compatible;
order lookups stay POST + `Cache-Control: no-store`).

### Invalidation
`_shared/cache.ts` exports `invalidateShopCache(slugOrBusinessId)`; called from:
background-sync completion, apply-analysis-to-product, admin-api writes,
instagram-webhook, create-order / cancel-order (stock counts affect product payloads).
Client: admin mutations clear `pgcache:storefront:{slug}`.

### SSE
`chat` switches to Gemini `streamGenerateContent?alt=sse`, re-emitted as
`text/event-stream` via ReadableStream pass-through. `VelaChat.tsx` consumes with
`res.body.getReader()`, appending deltas to the last assistant message; falls back to
buffered JSON on stream failure. Sync progress stays on Supabase Realtime.

### Realtime tightening (client)
- One `NotificationSidebar` mount (JS `useIsMobile`, not CSS visibility).
- `business_id` filters on all `order_disputes` subscriptions.
- Instance-unique channel names in `useProductData`; id-scoped names for
  `sync-jobs` / `dashboard-*-feed`.
- Channel effects depend on primitive ids, not object identities.
- Safety-net poll 180s → 5min.

### Sync pipeline
- Server-side overlapping-sync guard in `background-sync` serve handler.
- Content-addressable caption cache (+ keywords hash) replacing per-post-id lookup.
- `instagram-posts` supports `since` for incremental quick syncs.
- `analyze-instagram-posts`: pro → flash + thinking off + schema + context hoisting +
  skip-imported + caption-hash cache + ai_usage logging.

## Explicitly out of scope (documented in PERF_AUDIT §5)
Full TanStack Query migration (91 call sites), realtime subscription bus,
`order_disputes` RLS audit.

## Error handling
Cache tiers fail open: any cache read/write error falls through to the underlying
query. SSE falls back to buffered response. GET endpoints keep POST compatibility so
stale clients keep working during deploy windows.

## Testing/verification
`npm run build` + lint; browser smoke test of storefront (cache headers visible in
devtools) and chat streaming; deploy of edge functions is a manual follow-up step.
