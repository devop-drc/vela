-- Reference codes (SKUs) for products and variants.
-- Run in the Supabase SQL editor BEFORE deploying the frontend build that
-- searches by SKU (src changes read products.sku).
--
-- • products.sku          — new column, auto-generated "P-XXXXXXXX" on insert
-- • product_variants.sku  — existing column, backfilled + auto-generated "V-XXXXXXXX"

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;

-- Backfill existing rows deterministically from their ids.
UPDATE public.products
SET sku = 'P-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE sku IS NULL OR sku = '';

UPDATE public.product_variants
SET sku = 'V-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE sku IS NULL OR sku = '';

-- Auto-generate on insert so every future product/variant (sync, importer,
-- manual add) gets a reference code without any application code needing to
-- know about the column.
CREATE OR REPLACE FUNCTION public.set_product_sku() RETURNS trigger AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'P-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_product_sku ON public.products;
CREATE TRIGGER trg_set_product_sku BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_product_sku();

CREATE OR REPLACE FUNCTION public.set_variant_sku() RETURNS trigger AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'V-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_variant_sku ON public.product_variants;
CREATE TRIGGER trg_set_variant_sku BEFORE INSERT ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.set_variant_sku();

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants (sku);
