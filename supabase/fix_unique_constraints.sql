-- FIX UNIQUE CONSTRAINTS (v3.5)
-- Fixes the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- 1. Businesses: Add UNIQUE constraint to user_id (1-to-1 relationship)
-- First clean up any accidental duplicates (should be none given previous failures)
DELETE FROM public.businesses a USING public.businesses b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id;

ALTER TABLE public.businesses 
DROP CONSTRAINT IF EXISTS businesses_user_id_unique;

ALTER TABLE public.businesses 
ADD CONSTRAINT businesses_user_id_unique UNIQUE (user_id);

-- 2. Shop Details: Add UNIQUE constraint to business_id (1-to-1 relationship)
DELETE FROM public.shop_details a USING public.shop_details b
WHERE a.ctid < b.ctid AND a.business_id = b.business_id;

ALTER TABLE public.shop_details 
DROP CONSTRAINT IF EXISTS shop_details_business_id_unique;

ALTER TABLE public.shop_details 
ADD CONSTRAINT shop_details_business_id_unique UNIQUE (business_id);

-- 3. Profiles: (Already has Primary Key, but let's be sure)
-- No changes needed if id is PK.

-- 4. Correct the typo in combo_option_values constraint (Bonus Fix)
ALTER TABLE public.combo_option_values 
DROP CONSTRAINT IF EXISTS combo_option_values_item_option_id_fkey;

ALTER TABLE public.combo_option_values 
ADD CONSTRAINT combo_option_values_item_option_id_fkey 
FOREIGN KEY (item_option_id) REFERENCES public.combo_item_options(id) ON DELETE CASCADE;
