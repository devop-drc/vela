-- Shared server-side cache table for edge functions (tier 2 of the two-tier
-- cache in supabase/functions/_shared/cache.ts). UNLOGGED: contents are
-- disposable and rebuildable, so we trade crash-durability for write speed.

create unlogged table if not exists public.edge_cache (
  key        text primary key,
  value      jsonb not null,
  expires_at timestamptz not null
);

create index if not exists edge_cache_expires_at_idx on public.edge_cache (expires_at);

-- Only the service role may touch the cache: enable RLS and add no policies.
-- (Service role bypasses RLS; anon/authenticated get nothing via PostgREST.)
alter table public.edge_cache enable row level security;

-- Purge expired rows every 10 minutes when pg_cron is available (it is enabled
-- on hosted Supabase projects). Guarded so the migration also applies locally.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-edge-cache',
      '*/10 * * * *',
      $sql$ delete from public.edge_cache where expires_at < now() $sql$
    );
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $$;
