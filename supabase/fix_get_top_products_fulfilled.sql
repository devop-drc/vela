-- 2026-07-18: Top Sellers must only count items from FULFILLED orders.
-- The old version put the status condition on the orders join, but summed
-- oi.quantity joined by product alone — so every order item counted no matter
-- its order's status, and zero-sale products padded the top-5.

CREATE OR REPLACE FUNCTION public.get_top_products(p_business_id uuid)
 RETURNS TABLE(product_id uuid, name text, media_url text, total_sold bigint, price numeric, currency text, media_type text, thumbnail_url text, caption text, category text, tags text[], pricing_type text, billing_interval text, details jsonb, status text, inventory integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.id as product_id,
        p.name,
        p.media_url,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'Fulfilled'), 0) as total_sold,
        p.price,
        p.currency,
        p.media_type,
        p.thumbnail_url,
        p.caption,
        p.category,
        p.tags,
        p.pricing_type,
        p.billing_interval,
        p.details,
        p.status,
        p.inventory
    FROM
        public.products p
    LEFT JOIN
        public.order_items oi ON oi.product_id = p.id
    LEFT JOIN
        public.orders o ON oi.order_id = o.id
    WHERE
        p.business_id = p_business_id
    GROUP BY
        p.id, p.name, p.media_url, p.price, p.currency, p.media_type, p.thumbnail_url, p.caption, p.category, p.tags, p.pricing_type, p.billing_interval, p.details, p.status, p.inventory
    HAVING
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'Fulfilled'), 0) > 0
    ORDER BY
        total_sold DESC
    LIMIT 5;
END;
$function$;
