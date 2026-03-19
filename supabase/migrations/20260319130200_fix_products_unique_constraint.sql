-- Drop the partial index that doesn't work with ON CONFLICT
DROP INDEX IF EXISTS idx_products_instagram_post_user;

-- Delete duplicate products (keep the most recently created one per instagram_post_id + user_id)
DELETE FROM products a
USING products b
WHERE a.instagram_post_id IS NOT NULL
  AND a.instagram_post_id = b.instagram_post_id
  AND a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Create a proper UNIQUE constraint (not partial — NULLs are distinct in PostgreSQL so this is safe)
ALTER TABLE public.products
  ADD CONSTRAINT products_instagram_post_id_user_id_key
  UNIQUE (instagram_post_id, user_id);
