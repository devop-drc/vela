-- Atomic order placement + cancellation/inventory restore.
-- These run the order write + stock changes inside a single transaction with
-- row locking, so concurrent orders can't oversell and a partial failure rolls
-- everything back (fixes the previous non-atomic create-order / Deno.raw
-- cancel-order inventory bugs).

-- ── place_order ──────────────────────────────────────────────────────────────
-- p_items: jsonb array of
--   { product_id, quantity, selected_options (jsonb|null), combination_key (text|null), unit_price_all (numeric) }
-- Prices are authoritative ALL values computed server-side by the edge function.
create or replace function public.place_order(
  p_business_id          uuid,
  p_customer_name        text,
  p_customer_email       text,
  p_payment_method       text,
  p_payment_status       text,
  p_shipping_address     text,
  p_shipping_city        text,
  p_shipping_zip         text,
  p_shipping_country     text,
  p_shipping_notes_seller  text,
  p_shipping_notes_courier text,
  p_total_amount         numeric,
  p_items                jsonb
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order      public.orders;
  v_item       jsonb;
  v_product_id uuid;
  v_qty        integer;
  v_combo      text;
  v_unit       numeric;
  v_sel        jsonb;
  v_pricing    text;
  v_base_inv   integer;
  v_var_id     uuid;
  v_var_inv    integer;
begin
  insert into public.orders (
    business_id, customer_name, customer_email, status, total_amount, currency,
    payment_method, payment_status, shipping_address, shipping_city, shipping_zip,
    shipping_country, shipping_notes_seller, shipping_notes_courier
  ) values (
    p_business_id, p_customer_name, p_customer_email, 'Pending', p_total_amount, 'ALL',
    p_payment_method, p_payment_status, p_shipping_address, p_shipping_city, p_shipping_zip,
    p_shipping_country, p_shipping_notes_seller, p_shipping_notes_courier
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::integer;
    v_combo      := nullif(v_item->>'combination_key', '');
    v_unit       := coalesce((v_item->>'unit_price_all')::numeric, 0);
    v_sel        := case when v_item->'selected_options' = 'null'::jsonb then null else v_item->'selected_options' end;

    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid_quantity';
    end if;

    -- Lock the product row so concurrent orders serialize on stock.
    select pricing_type, inventory into v_pricing, v_base_inv
      from public.products where id = v_product_id for update;
    if not found then
      raise exception 'product_not_found:%', v_product_id;
    end if;

    if v_pricing = 'one_time' then
      if v_combo is not null then
        select id, inventory into v_var_id, v_var_inv
          from public.product_variants
          where product_id = v_product_id and combination_key = v_combo
          for update;

        if v_var_id is not null then
          if v_var_inv < v_qty then
            raise exception 'insufficient_stock:%', v_product_id;
          end if;
          update public.product_variants set inventory = inventory - v_qty where id = v_var_id;
        else
          -- No matching variant row: fall back to base inventory.
          if v_base_inv < v_qty then
            raise exception 'insufficient_stock:%', v_product_id;
          end if;
          update public.products
            set inventory = inventory - v_qty,
                status = case when (inventory - v_qty) <= 0 then 'Out of Stock' else status end
            where id = v_product_id;
        end if;
      else
        if v_base_inv < v_qty then
          raise exception 'insufficient_stock:%', v_product_id;
        end if;
        update public.products
          set inventory = inventory - v_qty,
              status = case when (inventory - v_qty) <= 0 then 'Out of Stock' else status end
          where id = v_product_id;
      end if;
    end if;

    insert into public.order_items (order_id, product_id, quantity, price_at_purchase, selected_options)
    values (v_order.id, v_product_id, v_qty, v_unit, v_sel);
  end loop;

  return v_order;
end;
$$;

-- ── restore_order_inventory ──────────────────────────────────────────────────
-- Cancels an order and returns its stock to the right variant (or base product).
create or replace function public.restore_order_inventory(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders;
  v_rec     record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'Cancelled' then
    -- Already cancelled — don't restore twice.
    return v_order;
  end if;

  for v_rec in
    select oi.product_id,
           oi.quantity,
           p.pricing_type,
           (select string_agg(k || ':' || v, '|' order by k)
              from jsonb_each_text(oi.selected_options) as t(k, v)) as combo_key
      from public.order_items oi
      join public.products p on p.id = oi.product_id
     where oi.order_id = p_order_id
  loop
    if v_rec.pricing_type <> 'one_time' then
      continue;
    end if;

    if v_rec.combo_key is not null then
      update public.product_variants
        set inventory = inventory + v_rec.quantity
        where product_id = v_rec.product_id and combination_key = v_rec.combo_key;
      -- If the variant row vanished, fall back to base.
      if not found then
        update public.products set inventory = inventory + v_rec.quantity where id = v_rec.product_id;
      end if;
    else
      update public.products set inventory = inventory + v_rec.quantity where id = v_rec.product_id;
    end if;
  end loop;

  update public.orders
    set status = 'Cancelled', payment_status = 'refunded'
    where id = p_order_id
    returning * into v_order;

  return v_order;
end;
$$;
