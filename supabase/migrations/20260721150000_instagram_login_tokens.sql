-- Instagram business login (direct IG login, no Facebook): long-lived tokens
-- last ~60 days and must be refreshed, so track their expiry.
ALTER TABLE public.integrations
  ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone;

COMMENT ON COLUMN public.integrations.token_expires_at IS
  'Expiry of the long-lived token. Only set for provider ''instagram'' (direct IG login, ~60d, refreshed by periodic-sync); legacy ''facebook'' rows have NULL.';
