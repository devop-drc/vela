-- The public storefront endpoint scopes products by business_id; products
-- created by older sync paths may only carry user_id and would be invisible
-- to shoppers. Backfill from the owner's business (no-op when already set).

update public.products p
set business_id = b.id
from public.businesses b
where p.business_id is null
  and p.user_id = b.user_id;
