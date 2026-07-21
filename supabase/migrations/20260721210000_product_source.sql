-- Product provenance: where each product came from.
--   'instagram' — created by the post sync
--   'manual'    — created by hand (wizard / inline add)
--   'import'    — created by the spreadsheet import
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('instagram', 'manual', 'import'));

-- Backfill: anything linked to an Instagram post at migration time came from
-- the sync (manual products published later get their id AFTER this runs).
UPDATE public.products SET source = 'instagram' WHERE instagram_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_source_idx ON public.products (user_id, source);
