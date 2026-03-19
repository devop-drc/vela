-- Add unique constraint on (instagram_post_id, user_id) for products table
-- This enables upsert on re-sync to update existing products instead of creating duplicates
-- Only applies where instagram_post_id is not null (manually created products don't have one)

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_instagram_post_user
    ON public.products (instagram_post_id, user_id)
    WHERE instagram_post_id IS NOT NULL;
