-- Order items need to remember which variant/options the customer chose, both
-- for order history display and so the public "My Orders" lookup query (which
-- selects order_items.selected_options) does not error out.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_options jsonb;
