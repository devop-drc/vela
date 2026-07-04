-- Perf: indexes for hot query paths that currently seq-scan.
-- sync_jobs is read on every dashboard load (latest active job per user) and
-- had no index; rows accumulate with every sync ever run.
create index if not exists idx_sync_jobs_user_created
  on public.sync_jobs (user_id, created_at desc);

-- Orders are listed newest-first per business on Orders/Dashboard/Admin.
create index if not exists idx_orders_business_created
  on public.orders (business_id, created_at desc);

-- Storefront product queries always filter business + status (public shop
-- shows Active only; admin filters by status tabs).
create index if not exists idx_products_business_status
  on public.products (business_id, status);

-- ── order_disputes: add business_id so realtime subscriptions can be scoped ──
-- Without it, every dashboard received every dispute event database-wide and
-- ran a follow-up query just to discover it wasn't theirs.
alter table public.order_disputes add column if not exists business_id uuid;

update public.order_disputes d
set business_id = o.business_id
from public.orders o
where d.order_id = o.id and d.business_id is null;

create or replace function public.set_dispute_business_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.business_id is null then
    select business_id into new.business_id from public.orders where id = new.order_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dispute_business on public.order_disputes;
create trigger trg_dispute_business
  before insert on public.order_disputes
  for each row execute function public.set_dispute_business_id();

create index if not exists idx_order_disputes_business on public.order_disputes (business_id);
create index if not exists idx_order_disputes_order on public.order_disputes (order_id);

-- ── sync_jobs hygiene: rows carry large jsonb (analysis_result, summary) and
-- accumulate forever. Nightly prune keeps two weeks of history.
do $$
begin
  perform cron.unschedule('prune-sync-jobs');
exception when others then null;
end $$;

select cron.schedule(
  'prune-sync-jobs',
  '0 3 * * *',
  $$delete from public.sync_jobs where created_at < now() - interval '14 days'$$
);
