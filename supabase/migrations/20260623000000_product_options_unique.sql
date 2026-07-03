-- The options editor saves with upsert(onConflict: 'product_id,name') on
-- product_options, but the table had no matching unique constraint, so adding
-- options failed with "no unique or exclusion constraint matching the ON CONFLICT
-- specification". Add the constraint (deduping any existing rows first; an option's
-- values cascade-delete with it).
delete from public.product_options a
using public.product_options b
where a.product_id = b.product_id
  and a.name = b.name
  and a.ctid > b.ctid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_options_product_id_name_key'
  ) then
    alter table public.product_options
      add constraint product_options_product_id_name_key unique (product_id, name);
  end if;
end $$;
