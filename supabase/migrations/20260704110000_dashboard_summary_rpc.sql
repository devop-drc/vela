-- Dashboard summary RPC.
--
-- Replaces the dashboard's client-side aggregation (src/pages/Index.tsx), which
-- downloaded every order in the date range plus every product and computed
-- stats/chart buckets in JS, with a single aggregate query.
--
-- Currency nuance: the client converts each order's amount to the shop currency
-- with live exchange rates (ShopContext.convertCurrency). To keep displayed
-- numbers identical, this function does NOT convert currencies — it returns
-- per-currency sums (total_revenue and each chart bucket's revenue are jsonb
-- objects keyed by currency) and the client keeps converting.
--
-- p_timezone: chart buckets were previously keyed by the browser's local date
-- (toLocaleString), so bucketing must happen in the caller's timezone, not UTC.
-- The client passes its IANA timezone; defaults to UTC.

create or replace function public.get_dashboard_summary(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_granularity text,
  p_timezone text default 'UTC'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_granularity text := lower(coalesce(p_granularity, 'day'));
  v_tz text := coalesce(nullif(p_timezone, ''), 'UTC');
  v_result jsonb;
begin
  if v_granularity not in ('day', 'week', 'month') then
    raise exception 'invalid granularity: %', p_granularity;
  end if;

  -- SECURITY DEFINER bypasses RLS: only the business owner may read its summary.
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.user_id = auth.uid()
  ) then
    raise exception 'access denied';
  end if;

  with filtered_orders as (
    select
      o.total_amount,
      coalesce(o.currency, 'ALL') as currency,
      o.created_at,
      o.status::text as status,
      o.customer_email,
      (o.status::text = 'Fulfilled' and o.payment_status = 'paid') as is_paid_fulfilled,
      date_trunc(v_granularity, o.created_at at time zone v_tz) as bucket
    from public.orders o
    where o.business_id = p_business_id
      and (p_from is null or o.created_at >= p_from)
      and (p_to is null or o.created_at <= p_to)
  ),
  revenue_by_currency as (
    select currency, sum(total_amount) as amount
    from filtered_orders
    where is_paid_fulfilled
    group by currency
  ),
  bucket_revenue as (
    select bucket, currency, sum(total_amount) as amount
    from filtered_orders
    where is_paid_fulfilled
    group by bucket, currency
  ),
  bucket_revenue_json as (
    select bucket, jsonb_object_agg(currency, amount) as revenue
    from bucket_revenue
    group by bucket
  ),
  bucket_stats as (
    select
      bucket,
      count(*) as orders,
      count(distinct coalesce(customer_email, '')) filter (where is_paid_fulfilled) as clients
    from filtered_orders
    group by bucket
  ),
  status_counts as (
    select status, count(*) as cnt
    from filtered_orders
    group by status
  ),
  product_counts as (
    select
      count(*) as total_products,
      count(*) filter (where p.status = 'Active') as active_products
    from public.products p
    where p.business_id = p_business_id
  )
  select jsonb_build_object(
    'total_revenue', coalesce((select jsonb_object_agg(currency, amount) from revenue_by_currency), '{}'::jsonb),
    'sales_count', (select count(*) from filtered_orders where is_paid_fulfilled),
    'pending_orders', (select count(*) from filtered_orders where status not in ('Fulfilled', 'Cancelled')),
    'customers', (select count(distinct coalesce(customer_email, '')) from filtered_orders where is_paid_fulfilled),
    'active_products', (select active_products from product_counts),
    'total_products', (select total_products from product_counts),
    'first_order_at', (select to_char(min(created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from filtered_orders),
    'last_order_at', (select to_char(max(created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from filtered_orders),
    'orders_by_status', coalesce((select jsonb_object_agg(status, cnt) from status_counts), '{}'::jsonb),
    -- Bucket timestamps are local wall-time in v_tz (no offset suffix), so the
    -- client's `new Date(bucket)` lands on the same local day/month as before.
    'chart', coalesce((
      select jsonb_agg(jsonb_build_object(
        'bucket', to_char(b.bucket, 'YYYY-MM-DD"T"HH24:MI:SS'),
        'orders', b.orders,
        'clients', b.clients,
        'revenue', coalesce(r.revenue, '{}'::jsonb)
      ) order by b.bucket)
      from bucket_stats b
      left join bucket_revenue_json r on r.bucket = b.bucket
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_summary(uuid, timestamptz, timestamptz, text, text) from public;
revoke all on function public.get_dashboard_summary(uuid, timestamptz, timestamptz, text, text) from anon;
grant execute on function public.get_dashboard_summary(uuid, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.get_dashboard_summary(uuid, timestamptz, timestamptz, text, text) to service_role;
