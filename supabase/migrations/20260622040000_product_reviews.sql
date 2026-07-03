-- Guest product reviews. A customer can review a product only after the order
-- containing it is marked received/paid (status 'Fulfilled'). Submission is
-- validated + inserted by the submit-review edge function (service role); the
-- public can read reviews to show them on the storefront. No login required.
create table if not exists public.product_reviews (
  id            uuid default gen_random_uuid() primary key,
  product_id    uuid not null references public.products(id)   on delete cascade,
  order_id      uuid not null references public.orders(id)     on delete cascade,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  customer_name text,
  customer_email text not null,
  rating        int  not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz default now(),
  constraint product_reviews_order_product_key unique (order_id, product_id)
);

create index if not exists idx_product_reviews_product on public.product_reviews(product_id);
create index if not exists idx_product_reviews_business on public.product_reviews(business_id);

alter table public.product_reviews enable row level security;

-- Anyone may read reviews (they're shown publicly on the storefront).
-- Inserts happen only through the service-role edge function (no insert policy),
-- so guests can't forge reviews for orders that aren't theirs / not delivered.
do $$
begin
  if not exists (select 1 from pg_policy where polname = 'Public can read product reviews') then
    create policy "Public can read product reviews" on public.product_reviews
      for select to anon, authenticated using (true);
  end if;
end $$;
