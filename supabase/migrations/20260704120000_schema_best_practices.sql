-- Schema best-practices pass. Everything here is written as idempotent,
-- self-adjusting DO blocks that read the LIVE catalog, so it is safe to re-run
-- and adapts to whatever the schema actually is. Migrations run in one
-- transaction — any error rolls the whole thing back, so a mistake can't leave
-- the database half-changed.
--
-- Recommendation-only items (NOT applied here — they need table rewrites or
-- app-behaviour guarantees the migration can't verify; do them deliberately):
--   • money columns stored as float/double → convert to numeric(12,2)
--     (products.price, orders.total_amount, promotions.discount_value, etc.)
--   • enum-like text columns (orders.status, products.status, sync_jobs.status,
--     order_disputes.status, subscriptions.status) → add CHECK constraints with
--     ALTER TABLE ... ADD CONSTRAINT ... CHECK (...) NOT VALID; then VALIDATE.
--   • FK columns the app always sets (order_items.order_id, product_variants.
--     product_id) → consider NOT NULL after confirming no null rows exist.


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RLS initplan optimization — the #1 Supabase RLS performance best practice.
--    A bare auth.uid()/auth.jwt() in a policy is re-evaluated once PER ROW.
--    Wrapping it as (select auth.uid()) makes Postgres treat it as an initplan,
--    evaluated ONCE per query. On large tables this is a big win and it changes
--    nothing about the policy's meaning (same scalar value).
--    This rewrites every public policy that still has a bare call.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  p record;
  nq text;
  nc text;
  stmt text;
  n int := 0;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        (qual       is not null and qual       ~ 'auth\.(uid|jwt)\(\)' and qual       !~* '\(\s*select\s+auth\.')
        or
        (with_check is not null and with_check ~ 'auth\.(uid|jwt)\(\)' and with_check !~* '\(\s*select\s+auth\.')
      )
  loop
    nq := p.qual;
    nc := p.with_check;

    if nq is not null and nq !~* '\(\s*select\s+auth\.' then
      nq := regexp_replace(nq, 'auth\.uid\(\)', '(select auth.uid())', 'g');
      nq := regexp_replace(nq, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
    end if;
    if nc is not null and nc !~* '\(\s*select\s+auth\.' then
      nc := regexp_replace(nc, 'auth\.uid\(\)', '(select auth.uid())', 'g');
      nc := regexp_replace(nc, 'auth\.jwt\(\)', '(select auth.jwt())', 'g');
    end if;

    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if nq is not null then stmt := stmt || format(' using (%s)', nq); end if;
    if nc is not null then stmt := stmt || format(' with check (%s)', nc); end if;

    execute stmt;
    n := n + 1;
    raise notice 'RLS initplan: optimized "%" on %.%', p.policyname, p.schemaname, p.tablename;
  end loop;
  raise notice 'RLS initplan: % policies optimized', n;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Foreign-key index coverage. Every single-column FK that isn't the leading
--    column of some existing index gets one. Unindexed FKs make joins and
--    cascade deletes seq-scan the child table. Skips FKs already covered
--    (including the ones added in 20260704100000_perf_indexes).
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
  idx text;
  n int := 0;
begin
  for r in
    select cl.relname as tbl, a.attname as col
    from pg_constraint c
    join pg_class cl     on cl.oid = c.conrelid
    join pg_attribute a  on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and array_length(c.conkey, 1) = 1              -- single-column FKs
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and i.indkey[0] = c.conkey[1]              -- an index leads with this column
      )
  loop
    idx := left('idx_' || r.tbl || '_' || r.col, 60);
    execute format('create index if not exists %I on public.%I (%I)', idx, r.tbl, r.col);
    n := n + 1;
    raise notice 'FK index: created % on %.%', idx, r.tbl, r.col;
  end loop;
  raise notice 'FK index: % created', n;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger coverage. Any table with an updated_at column but no
--    trigger that maintains it gets one, reusing the existing
--    public.update_updated_at_column() function. Keeps updated_at honest so it
--    can be trusted for cache invalidation / "recently changed" ordering.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  t record;
  n int := 0;
begin
  for t in
    select c.relname as tbl
    from pg_class c
    join pg_namespace ns on ns.oid = c.relnamespace
    join pg_attribute a  on a.attrelid = c.oid and a.attname = 'updated_at'
                        and a.attnum > 0 and not a.attisdropped
    where ns.nspname = 'public' and c.relkind = 'r'
      and not exists (
        select 1 from pg_trigger tg
        where tg.tgrelid = c.oid and not tg.tgisinternal
          and pg_get_triggerdef(tg.oid) ilike '%update_updated_at_column%'
      )
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.update_updated_at_column()',
      'set_' || t.tbl || '_updated_at', t.tbl
    );
    n := n + 1;
    raise notice 'updated_at trigger: added to %', t.tbl;
  end loop;
  raise notice 'updated_at trigger: % added', n;
end $$;
