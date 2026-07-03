-- SaaS billing: plans, subscriptions, payments — the owner-facing paywall.
-- Pricing decisions (2026-07-02): Starter 990 / Pro 1,990 / Business 3,990 ALL/mo.
-- Annual = 2 months free on Pro & Business only. Card-upfront 7-day trial.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_all integer not null,
  annual_free_months integer not null default 0,
  features jsonb not null default '[]',
  product_limit integer, -- null = unlimited
  is_active boolean not null default true,
  display_order integer not null default 0
);

insert into public.plans (id, name, price_all, annual_free_months, features, product_limit, display_order) values
  ('starter',  'Starter',  990,  0, '["instagram_storefront","cod_orders","basic_analytics"]', 50, 1),
  ('pro',      'Pro',      1990, 2, '["unlimited_products","storefront_studio","card_payments","promotions","reviews","full_analytics"]', null, 2),
  ('business', 'Business', 3990, 2, '["everything_pro","priority_support","advanced_analytics","higher_ai_limits"]', null, 3)
on conflict (id) do update set
  price_all = excluded.price_all,
  annual_free_months = excluded.annual_free_months,
  features = excluded.features,
  product_limit = excluded.product_limit,
  display_order = excluded.display_order;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan_id text not null default 'pro' references public.plans(id),
  status text not null default 'incomplete'
    check (status in ('incomplete','trialing','active','past_due','canceled','expired')),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  raiaccept_customer_ref text,
  raiaccept_card_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount_all integer not null,
  currency text not null default 'ALL',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  type text not null default 'initial' check (type in ('trial_setup','initial','renewal','retry')),
  raiaccept_order_id text,
  raiaccept_transaction_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx  on public.payments(user_id);
create index if not exists payments_order_idx on public.payments(raiaccept_order_id);

alter table public.plans         enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;

drop policy if exists "plans are public"    on public.plans;
create policy "plans are public"    on public.plans         for select using (true);
drop policy if exists "own subscription"    on public.subscriptions;
create policy "own subscription"    on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "own payments"        on public.payments;
create policy "own payments"        on public.payments      for select using (auth.uid() = user_id);
-- All writes go through service-role edge functions only.

-- New signups get a subscription shell; the 7-day trial starts once the card
-- is tokenized via RaiAccept (owner decision: card required upfront).
create or replace function public.handle_new_user_subscription() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'pro', 'incomplete')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- Grandfather existing users into a fresh 7-day trial so the new paywall
-- doesn't lock anyone out on deploy.
insert into public.subscriptions (user_id, plan_id, status, trial_ends_at)
select id, 'pro', 'trialing', now() + interval '7 days' from auth.users
on conflict (user_id) do nothing;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
