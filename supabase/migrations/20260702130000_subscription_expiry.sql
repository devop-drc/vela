-- Subscription lifecycle cron: expire finished trials and lapse unpaid
-- periods. RaiAccept's documented recurring model is one-click checkout
-- (consumer-present, saved card prefilled) — so instead of unattended
-- charging, the paywall locks and the user completes a one-click payment.

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
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'expire-subscriptions') then
      perform cron.unschedule('expire-subscriptions');
    end if;
    perform cron.schedule('expire-subscriptions', '*/30 * * * *', 'select public.expire_subscriptions()');
  end if;
end $$;
