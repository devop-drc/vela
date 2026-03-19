-- EMERGENCY AUTH & TRIGGER RESET (v3.3)
-- Run this if you see "Database error finding user" or "unexpected_failure"

-- 1. DEEP CLEAN (Remove failed registration attempts)
-- This clears orphan data that might be causing unique constraint conflicts
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.businesses WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 2. DROP ALL ONBOARDING TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created_create_business ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_create_design_settings ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_business();
DROP FUNCTION IF EXISTS public.handle_new_user_design_settings();

-- 3. MINIMALIST TRIGGER (Isolates the problem)
-- We'll start with just the Profile. We can add Business/Shop later manually or via frontend.
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, onboarding_complete)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data ->> 'first_name', 'User'),
        COALESCE(new.raw_user_meta_data ->> 'last_name', ''),
        true
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.design_settings (user_id, settings)
    VALUES (new.id, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-ENABLE MINIMAL TRIGGER
CREATE TRIGGER on_auth_user_created_minimal
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

-- 5. BROADEN RLS FOR SIGNUP (Ensure Anon can transition)
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
CREATE POLICY "Allow profile creation on signup" ON public.profiles FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow business creation on signup" ON public.businesses;
CREATE POLICY "Allow business creation on signup" ON public.businesses FOR INSERT TO anon WITH CHECK (true);
