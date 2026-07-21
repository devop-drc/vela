-- The dyqani-yt demo merchant (seeded internal account, powers the landing
-- hero film and public demos) sat at subscription status 'incomplete', so the
-- 2026-07-20 lifecycle gate in get-public-shop-data/create-order correctly
-- took its storefront offline. Internal accounts get a long-lived active
-- Business subscription (same treatment the owner gave the mediadesk test
-- account). Keyed by shop slug — no emails in the repo.
update public.subscriptions s
   set plan_id = 'business',
       status = 'active',
       billing_cycle = 'annual',
       current_period_start = now(),
       current_period_end = '2027-05-31T21:59:59Z'
 where s.user_id in (
   select b.user_id
     from public.businesses b
     join public.shop_details sd on sd.business_id = b.id
    where sd.slug = 'dyqani-yt'
 );
