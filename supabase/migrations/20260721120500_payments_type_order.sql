-- Storefront order card payments insert payments.type='order', which the
-- original CHECK constraint didn't allow — every card payment attempt failed
-- before reaching RaiAccept. Originally a run-in-SQL-editor fix
-- (supabase/fix_payments_type_order.sql); promoted to a tracked migration.
alter table public.payments drop constraint if exists payments_type_check;
alter table public.payments add constraint payments_type_check
  check (type in ('trial_setup','initial','renewal','retry','order'));
