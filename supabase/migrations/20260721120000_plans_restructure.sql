-- Pricing restructure (owner decision 2026-07-16) — originally shipped as a
-- run-in-SQL-editor file (supabase/update_plans_2026_07_16.sql) and never
-- applied; promoted to a tracked migration 2026-07-21.
--
-- One deliberate difference from the original file: the per-plan trial
-- badges reflect the TIERED trials that 20260720160000_tiered_trials.sql
-- introduced (Starter 30d / Pro 14d / Business 7d) instead of the flat
-- trial_7_days the July-16 file predates. trial_days columns are re-asserted
-- for the same reason (the upsert would otherwise be the only row-touch).

insert into public.plans (id, name, price_all, annual_free_months, features, product_limit, is_active, display_order) values
  ('starter',  'Starter',  500,  0,
    '["products_10","instagram_storefront","cod_only","basic_analytics","trial_30_days"]', 10, true, 1),
  ('pro',      'Pro',      1990, 1,
    '["products_100","card_and_cod","advanced_analytics","promotions","reviews","trial_14_days"]', 100, true, 2),
  ('business', 'Business', 3990, 2,
    '["everything_pro","priority_support","full_analytics","higher_ai_limits","storefront_studio","trial_7_days"]', null, true, 3)
on conflict (id) do update set
  name = excluded.name,
  price_all = excluded.price_all,
  annual_free_months = excluded.annual_free_months,
  features = excluded.features,
  product_limit = excluded.product_limit,
  is_active = excluded.is_active,
  display_order = excluded.display_order;

update public.plans set trial_days = 30 where id = 'starter';
update public.plans set trial_days = 14 where id = 'pro';
update public.plans set trial_days = 7  where id = 'business';

-- If a separate 'free' plan row ever existed, retire it.
update public.plans set is_active = false where id = 'free';
