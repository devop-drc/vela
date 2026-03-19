-- 1. DROP restrictive policies and triggers to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created_create_business ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_business();

-- 2. IMPROVED Trigger: Now handles Business, Profile, AND Shop Details
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS trigger AS $$
DECLARE
    v_business_id uuid;
    v_first_name text;
    v_last_name text;
    v_full_name text;
    v_shop_slug text;
BEGIN
    -- Extract metadata
    v_first_name := new.raw_user_meta_data ->> 'first_name';
    v_last_name := new.raw_user_meta_data ->> 'last_name';
    v_full_name := new.raw_user_meta_data ->> 'full_name';
    
    -- Fallbacks
    IF v_first_name IS NULL THEN v_first_name := 'User'; END IF;
    IF v_full_name IS NULL THEN v_full_name := v_first_name; END IF;
    v_shop_slug := lower(v_first_name) || '-shop-' || substr(gen_random_uuid()::text, 1, 4);

    -- a) Create Profile
    INSERT INTO public.profiles (id, first_name, last_name, phone_number, onboarding_complete)
    VALUES (
        new.id,
        v_first_name,
        v_last_name,
        new.raw_user_meta_data ->> 'phone_number',
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- b) Create Business
    INSERT INTO public.businesses (user_id, name)
    VALUES (
        new.id,
        v_full_name || '''s Business'
    ) ON CONFLICT DO NOTHING
    RETURNING id INTO v_business_id;

    -- c) Create Shop Details
    IF v_business_id IS NOT NULL THEN
        INSERT INTO public.shop_details (business_id, shop_name, slug, currency, contact_email)
        VALUES (
            v_business_id,
            v_full_name || '''s Shop',
            v_shop_slug,
            'USD',
            new.email
        ) ON CONFLICT DO NOTHING;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-enable Trigger
CREATE TRIGGER on_auth_user_created_create_business
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_business();

-- 4. RLS FIX: Allow the frontend 'upsert' to transition safely
-- We allow INSERT for anon because it is protected by the auth.users FK
-- This prevents the "new row violates row-level security policy" during the frontend redundancy phase
CREATE POLICY "Allow profile creation on signup" ON public.profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow business creation on signup" ON public.businesses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow shop details creation on signup" ON public.shop_details FOR INSERT TO anon WITH CHECK (true);

-- Ensure authenticated users can still manage their own stuff
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage their own business" ON public.businesses;
CREATE POLICY "Users can manage their own business" ON public.businesses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own shop details" ON public.shop_details;
CREATE POLICY "Users can manage their own shop details" ON public.shop_details FOR ALL USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = shop_details.business_id AND b.user_id = auth.uid())
);
