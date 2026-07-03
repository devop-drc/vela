-- Owner replies on product reviews. The reply is written ONLY through the
-- reply_to_review() RPC (security definer + ownership check), so shop owners
-- can respond publicly but can never edit a customer's rating or comment.

alter table public.product_reviews
  add column if not exists reply_text text,
  add column if not exists replied_at timestamptz;

create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.product_reviews r
     set reply_text = nullif(trim(p_reply), ''),
         replied_at = case when nullif(trim(p_reply), '') is null then null else now() end
   where r.id = p_review_id
     and r.business_id in (select b.id from public.businesses b where b.user_id = auth.uid());
  if not found then
    raise exception 'Review not found or not owned by you';
  end if;
end;
$$;

revoke all on function public.reply_to_review(uuid, text) from public;
grant execute on function public.reply_to_review(uuid, text) to authenticated;
