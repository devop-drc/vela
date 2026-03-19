-- Migrate product specifications from details JSONB to product_specifications table
-- Idempotent: safe to run multiple times
--
-- This migration extracts key-value pairs from the existing `details` JSONB column
-- on the products table and inserts them into the new product_specifications table.
--
-- Skipped keys (reserved): type, options, options_v2, variants, Brand
-- Skipped values: arrays (legacy options), nested objects, null values
-- Numeric values are coerced to text
-- Uses ON CONFLICT DO NOTHING for idempotency

INSERT INTO public.product_specifications (product_id, user_id, key, value, display_order)
SELECT
    p.id as product_id,
    p.user_id,
    kv.key,
    CASE
        WHEN jsonb_typeof(kv.value) = 'number' THEN kv.value::text
        WHEN jsonb_typeof(kv.value) = 'string' THEN kv.value #>> '{}'
        ELSE kv.value::text
    END as value,
    row_number() OVER (PARTITION BY p.id ORDER BY kv.key) as display_order
FROM public.products p,
     jsonb_each(p.details) AS kv(key, value)
WHERE p.details IS NOT NULL
  AND p.details != '{}'::jsonb
  AND kv.key NOT IN ('type', 'options', 'options_v2', 'variants', 'Brand')
  AND jsonb_typeof(kv.value) != 'array'
  AND jsonb_typeof(kv.value) != 'object'
  AND jsonb_typeof(kv.value) != 'null'
ON CONFLICT (product_id, key) DO NOTHING;
