-- Each business chooses which public storefront their share link points to:
-- 'instagram' (the fixed Instagram-style /instagramShop) or 'custom' (the
-- fully customisable /shop). Defaults to 'instagram' (the app's signature look).
alter table public.shop_details
  add column if not exists storefront_type text not null default 'instagram'
  check (storefront_type in ('instagram', 'custom'));
