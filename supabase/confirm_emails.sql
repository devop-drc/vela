-- FINAL AUTH CONFIRMATION FIX
-- Run this to confirm all users and ensure future signups work without email confirmation

-- 1. Confirm all existing users
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmation_token = NULL,
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. (Optional but helpful) Set default for future users if the Dashboard setting isn't sticking
-- Note: This is usually handled by the Supabase Dashboard, but this command ensures the DB reflects it
-- ALTER TABLE auth.users ALTER COLUMN email_confirmed_at SET DEFAULT now();
