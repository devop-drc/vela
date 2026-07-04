-- PII lockdown for product_reviews: the public-read policy exposed
-- customer_email to anyone via the REST API. Column-level grants keep the
-- public columns readable (storefront ratings/reviews) while the email is
-- only reachable through the owner-scoped RPC below.

revoke select on public.product_reviews from anon, authenticated;
grant select (id, product_id, order_id, business_id, customer_name, rating, comment, created_at, reply_text, replied_at)
  on public.product_reviews to anon, authenticated;

-- Shop owners see full reviews (incl. customer email) for their own products.
create or replace function public.get_product_reviews_owner(p_product_id uuid)
returns table (
  id uuid,
  customer_name text,
  customer_email text,
  rating int,
  comment text,
  created_at timestamptz,
  reply_text text,
  replied_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.customer_name, r.customer_email, r.rating, r.comment, r.created_at, r.reply_text, r.replied_at
  from public.product_reviews r
  where r.product_id = p_product_id
    and r.business_id in (select b.id from public.businesses b where b.user_id = auth.uid())
  order by r.created_at desc;
$$;

revoke all on function public.get_product_reviews_owner(uuid) from public;
grant execute on function public.get_product_reviews_owner(uuid) to authenticated;
