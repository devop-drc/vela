-- High-tier schema fixes.

-- ── H2: payment_status never becomes 'paid' ──────────────────────────────────
-- Dashboard revenue/sales count orders with payment_status='paid', but nothing
-- ever set it. Mark an order paid when it reaches 'Fulfilled' (covers COD, where
-- cash is collected on delivery, and card orders once fulfilled).
create or replace function public.mark_order_paid_on_fulfill()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Fulfilled' and (new.payment_status is distinct from 'paid') then
    new.payment_status := 'paid';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_order_paid on public.orders;
create trigger trg_mark_order_paid
  before update on public.orders
  for each row execute function public.mark_order_paid_on_fulfill();

-- Backfill already-fulfilled orders.
update public.orders
  set payment_status = 'paid'
  where status = 'Fulfilled' and payment_status is distinct from 'paid';

-- ── H8: Instagram OAuth/webhook write columns + a bucket that didn't exist ────
-- instagram-auth / instagram-webhook persist these fields and upload the logo to
-- 'shop-assets'; without them the shop_details upsert failed entirely.
alter table public.shop_details
  add column if not exists followers_count integer,
  add column if not exists media_count    integer,
  add column if not exists username        text,
  add column if not exists website         text;

insert into storage.buckets (id, name, public)
  values ('shop-assets', 'shop-assets', true)
  on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'Public can view shop assets') then
    create policy "Public can view shop assets" on storage.objects
      for select to anon using (bucket_id = 'shop-assets');
  end if;
end $$;
