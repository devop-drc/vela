-- Albanian-market default currency: new shops start in Lek, not USD.
-- Existing shops keep whatever they have (owners can change it in Settings).

ALTER TABLE public.shop_details
  ALTER COLUMN currency SET DEFAULT 'ALL';
