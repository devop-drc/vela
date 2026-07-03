-- One-time reconciliation of legacy "jumbled" variant/stock data.
-- 1) Remove orphan legacy variants whose combination_key uses the old "Name=Value"
--    format AND have empty option_values, when a canonical "Name:Value" sibling
--    already exists (the storefront only ever targets the canonical rows, so the
--    legacy rows are phantom stock). Sibling-less legacy rows are left untouched
--    for manual review rather than risk deleting real stock.
-- 2) Re-sync each product's base inventory + status to the sum of its variants.
-- 3) Re-sync each option value's inventory to the sum of matching variants.
-- 4) Remove QA test orders created during deploy verification.
-- 5) Widen money columns so very large legitimate orders can't overflow.

begin;

-- 1) Delete orphan legacy "=" variants that duplicate a canonical ":" sibling.
delete from public.product_variants legacy
where legacy.combination_key like '%=%'
  and (legacy.option_values is null or legacy.option_values = '{}'::jsonb)
  and exists (
    select 1 from public.product_variants canon
    where canon.product_id = legacy.product_id
      and canon.combination_key = replace(legacy.combination_key, '=', ':')
  );

-- 2) Re-sync base inventory + status from variant sums (products that have variants).
update public.products p
set inventory = sub.total,
    status = case
               when p.pricing_type <> 'subscription' and p.status <> 'Draft'
                 then (case when sub.total > 0 then 'Active' else 'Out of Stock' end)
               else p.status
             end
from (
  select product_id, sum(coalesce(inventory, 0)) as total
  from public.product_variants
  group by product_id
) sub
where p.id = sub.product_id;

-- 3) Re-sync each option value's inventory to the sum of variants containing it.
update public.option_values ov
set inventory = (
  select coalesce(sum(coalesce(v.inventory, 0)), 0)
  from public.product_variants v
  join public.product_options po on po.id = ov.option_id
  where v.product_id = po.product_id
    and v.option_values ->> po.name = ov.value
);

-- 4) Clean up QA verification orders (order_items cascade on delete).
delete from public.orders where lower(customer_email) = 'qa-test@example.com';

-- 5) Widen money columns (numeric(10,2) maxed at ~100M; allow large orders).
alter table public.orders       alter column total_amount     type numeric(14,2);
alter table public.order_items  alter column price_at_purchase type numeric(14,2);

commit;
