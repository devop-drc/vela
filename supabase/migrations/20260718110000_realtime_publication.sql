-- Codify realtime publication membership for every table the app subscribes to
-- (orders + order_disputes were only ever added via the dashboard; products and
-- sync_jobs come from recreate_db.sql). Idempotent: skips tables already
-- published. RLS note: order_disputes/orders have owner-scoped RLS policies,
-- which Supabase Realtime enforces for postgres_changes — cross-tenant events
-- are filtered server-side even without a channel filter.

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'supabase_realtime publication missing; skipping';
    return;
  end if;
  foreach t in array array['products', 'sync_jobs', 'orders', 'order_disputes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Realtime RLS checks require replica identity to include old row data on
-- UPDATE/DELETE; FULL is Supabase's recommended setting for tables with
-- per-tenant policies consumed via postgres_changes.
alter table public.orders replica identity full;
alter table public.order_disputes replica identity full;
