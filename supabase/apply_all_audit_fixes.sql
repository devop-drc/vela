-- ONE-PASTE AUDIT APPLICATION (approved 2026-07-16): reference codes + all audit fixes + signup-policy drops.
-- Paste into Supabase Dashboard > SQL Editor and Run. Then TEST a fresh user registration.

BEGIN;

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


-- ── Database audit fixes (2026-07-16, updated after live advisor run) ─────────
-- Run AFTER add_reference_codes.sql, in the Supabase SQL editor.
-- Section 0 is CRITICAL and safe. Sections 1–3 are safe. Section 4 changes
-- signup behavior — test registration afterwards.

-- 0) CRITICAL SECURITY — "Allow all" policies (flagged by the live advisor).
-- These legacy emergency-fix policies grant EVERYONE (including anonymous
-- visitors) full read/write/DELETE on profiles, businesses and shop_details.
-- Deleting a business cascades to all of a merchant's products. The proper
-- owner-scoped policies ("Users can manage their own …") already exist, so
-- dropping these restores correct access without breaking the app.
DROP POLICY IF EXISTS "Allow all for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow all for shop_details" ON public.shop_details;

-- 0b) SECURITY DEFINER functions callable via /rest/v1/rpc by anon.
-- Internal trigger/maintenance functions and order mutations are only ever
-- invoked by triggers or service-role edge functions — revoke client roles.
-- Review RPCs are used by the authenticated admin UI — revoke anon only.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = ANY(ARRAY[
      'place_order','restore_order_inventory','expire_subscriptions','rls_auto_enable',
      'handle_new_business','handle_new_user_design_settings','handle_new_user_registration',
      'handle_new_user_subscription','set_dispute_business_id','set_user_id_on_option_values',
      'set_spec_user_id','set_product_user_id','set_product_option_user_id',
      'set_product_variant_user_id','mark_order_paid_on_fulfill'])
  LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', r.sig); END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = ANY(ARRAY['reply_to_review','get_product_reviews_owner','has_role'])
  LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig); END LOOP;
END $$;

-- 0c) Pin search_path on public functions (advisor: function_search_path_mutable).
-- Pinned to 'public' (not '') because the bodies reference unqualified tables.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    BEGIN EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;

-- 1) CRITICAL — unique key the sync's upsert depends on.
-- background-sync upserts products with ON CONFLICT (instagram_post_id, user_id).
-- recreate_db.sql never declares this pair unique; if the live DB is missing it,
-- every sync upsert errors. (Full index, not partial: ON CONFLICT can't infer
-- partial indexes; NULL instagram_post_ids stay distinct so manual products are
-- unaffected.)
CREATE UNIQUE INDEX IF NOT EXISTS products_instagram_post_user_uidx
  ON public.products (instagram_post_id, user_id);

-- 2) Missing indexes for real query patterns.
-- Storefront loads active products per business:
CREATE INDEX IF NOT EXISTS idx_products_business_status
  ON public.products (business_id, status);
-- Public "My Orders" lookup is a case-insensitive email match:
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_lower
  ON public.orders (business_id, lower(customer_email));
-- Order lists sort per business by recency:
CREATE INDEX IF NOT EXISTS idx_orders_business_created
  ON public.orders (business_id, created_at DESC);
-- Sync widget polls the active job per user:
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_status
  ON public.sync_jobs (user_id, status);
-- Rating batches select by product ids (guarded — table added post-schema-file):
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_reviews') THEN
    CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews (product_id);
  END IF;
END $$;

-- 3) Retention: finished sync jobs carry large jsonb summaries and grow forever.
DELETE FROM public.sync_jobs
WHERE status IN ('completed', 'failed')
  AND updated_at < now() - interval '30 days';
-- Recommended: schedule this monthly with pg_cron:
--   select cron.schedule('purge-old-sync-jobs', '0 3 1 * *',
--     $$DELETE FROM public.sync_jobs WHERE status IN ('completed','failed') AND updated_at < now() - interval '30 days'$$);

-- 4) SECURITY — anon-writable signup tables (review before applying).
-- These legacy policies let ANY unauthenticated visitor insert rows into
-- profiles / businesses / shop_details (spam vector; shop_details slugs can be
-- squatted). Signup provisioning is handled by the SECURITY DEFINER triggers on
-- auth.users (handle_new_business, handle_new_user_design_settings), which
-- bypass RLS — so these anon policies should be droppable. TEST a fresh
-- registration after applying; if signup breaks, re-create the policy scoped
-- to authenticated + ownership instead.
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow business creation on signup" ON public.businesses;
DROP POLICY IF EXISTS "Allow shop details creation on signup" ON public.shop_details;

-- 5) Advisor-style note (apply when convenient): the "Users can manage their
-- own …" policies use bare auth.uid(), which Postgres re-evaluates per row.
-- Recreating them with (SELECT auth.uid()) = user_id lets the planner run it
-- once per query. Functionally identical — purely a performance win on large
-- tables. Run Supabase's Performance Advisor after deploy for the full list.


COMMIT;
