-- Use this to manually confirm users if they are stuck due to email rate limits
-- Run this in the Supabase SQL Editor

UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmation_token = NULL,
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Also ensure the profile exists (insurance in case triggers were off momentarily)
INSERT INTO public.profiles (id, onboarding_complete)
SELECT id, true FROM auth.users
ON CONFLICT (id) DO NOTHING;
