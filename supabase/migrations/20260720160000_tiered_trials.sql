-- Tiered trials (owner decision 2026-07-20):
--   • The trial length depends on the tier the user picks at signup —
--     Business 7 days, Pro 14 days, Starter 30 days ("shorter taste of the
--     best thing / longer taste of the basic thing").
--   • The trial can be switched from Billing; the remaining time is
--     recalculated PROPORTIONALLY (consumed fraction carries over) so
--     switching can never mint extra trial time.
--   • One trial per account — trial_started_at records consumption forever.
--   • Cancelled/abandoned payment attempts get their own terminal status so
--     Billing can show them in a separate "failed" table.

-- 1) Plan-specific trial length
alter table public.plans add column if not exists trial_days integer not null default 7;
update public.plans set trial_days = 30 where id = 'starter';
update public.plans set trial_days = 14 where id = 'pro';
update public.plans set trial_days = 7  where id = 'business';

-- Features list: the trial badge is now plan-specific.
update public.plans set features =
  (features - 'trial_7_days') || '["trial_30_days"]'::jsonb
  where id = 'starter' and features ? 'trial_7_days';
update public.plans set features =
  (features - 'trial_7_days') || '["trial_14_days"]'::jsonb
  where id = 'pro' and features ? 'trial_7_days';
-- business keeps trial_7_days

-- 2) Trial consumption tracking (needed for proportional switching AND as
--    the one-trial-per-account flag).
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
update public.subscriptions
   set trial_started_at = trial_ends_at - interval '7 days'
 where trial_ends_at is not null and trial_started_at is null;

-- 3) Payments: 'canceled' terminal status for user-abandoned attempts.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending','paid','failed','refunded','canceled'));

-- 4) Lifecycle cron: also close out stale pending payment intents (user
--    opened the hosted form and never finished) so history stays truthful.
create or replace function public.expire_subscriptions() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.subscriptions
     set status = 'expired'
   where status = 'trialing'
     and trial_ends_at is not null
     and trial_ends_at < now();

  update public.subscriptions
     set status = 'past_due'
   where status = 'active'
     and current_period_end is not null
     and current_period_end < now();

  update public.payments
     set status = 'canceled'
   where status = 'pending'
     and created_at < now() - interval '24 hours';
end $$;
