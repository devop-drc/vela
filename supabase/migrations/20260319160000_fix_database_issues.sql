-- Fix #1: Add missing business_id column to combo_products
ALTER TABLE public.combo_products ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_combo_products_business ON public.combo_products(business_id);

-- Fix #2: Fix ai_analysis_cache primary key to be composite (instagram_post_id, user_id)
-- First drop the old single-column PK, then add composite PK
-- Handle potential duplicates first by keeping the newest entry per (instagram_post_id, user_id)
DELETE FROM public.ai_analysis_cache a
USING public.ai_analysis_cache b
WHERE a.instagram_post_id = b.instagram_post_id
  AND a.user_id = b.user_id
  AND a.created_at < b.created_at;

ALTER TABLE public.ai_analysis_cache DROP CONSTRAINT IF EXISTS ai_analysis_cache_pkey;
ALTER TABLE public.ai_analysis_cache ADD PRIMARY KEY (instagram_post_id, user_id);

-- Fix #3: Add missing performance indexes
CREATE INDEX IF NOT EXISTS idx_option_values_option ON public.option_values(option_id);
CREATE INDEX IF NOT EXISTS idx_combo_item_options_item ON public.combo_item_options(combo_item_id);
CREATE INDEX IF NOT EXISTS idx_combo_option_values_option ON public.combo_option_values(item_option_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user ON public.sync_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_product ON public.ai_feedback(product_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user ON public.ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_product_options_product ON public.product_options(product_id);

-- Fix #4: Backfill business_id on existing combo_products from user's business
UPDATE public.combo_products cp
SET business_id = b.id
FROM public.businesses b
WHERE cp.user_id = b.user_id
  AND cp.business_id IS NULL;
