-- Per-locale overrides for customer-facing product text.
-- Shape: { "sq": { "name": "...", "caption": "..." } } — extensible per locale.
-- Base products.name/caption stay English-canonical (the AI classifier already
-- normalizes to English); the storefront picks translations[lang] with fallback.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS translations jsonb;

COMMENT ON COLUMN public.products.translations IS
  'Per-locale customer-facing text overrides, e.g. {"sq":{"name":"…","caption":"…"}}. Filled by ai-product-classifier (new syncs) and translate-products (backfill).';
