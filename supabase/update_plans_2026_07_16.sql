-- Pricing restructure (owner decision 2026-07-16). Run in the SQL editor.
-- • Free plan removed → Starter is 500 ALL/mo: 10 products, cash-on-delivery
--   only, basic analytics.
-- • Pro: 100 active products, card + COD, advanced analytics, promotions &
--   offers management, product reviews. Annual = 1 month gifted.
-- • Business: everything in Pro + priority support, full analytics, higher AI
--   usage limits, full Storefront Studio access. Annual = 2 months gifted.
-- • Every plan starts with the 7-day free trial (trial logic is plan-agnostic).

insert into public.plans (id, name, price_all, annual_free_months, features, product_limit, is_active, display_order) values
  ('starter',  'Starter',  500,  0,
    '["products_10","instagram_storefront","cod_only","basic_analytics","trial_7_days"]', 10, true, 1),
  ('pro',      'Pro',      1990, 1,
    '["products_100","card_and_cod","advanced_analytics","promotions","reviews","trial_7_days"]', 100, true, 2),
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

-- If a separate 'free' plan row ever existed, retire it (kept for history,
-- hidden from the billing page).
update public.plans set is_active = false where id = 'free';
