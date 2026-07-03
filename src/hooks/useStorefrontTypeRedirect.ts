import { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useStorefront } from "@/contexts/StorefrontContext";
import { getStorefrontPath, type StorefrontType } from "@/lib/storefront";

/**
 * Forward visitors to the business's chosen storefront. If a shop set its type
 * to 'custom' but a visitor opens /instagramShop (or vice-versa), redirect to the
 * right one. The designer's preview iframe passes ?preview=1 to opt out.
 */
export const useStorefrontTypeRedirect = (expected: StorefrontType) => {
  const { shopDetails } = useStorefront();
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!shopDetails?.slug) return;
    if (new URLSearchParams(location.search).get("preview") === "1") return;
    const actual = (shopDetails.storefront_type as StorefrontType) || "instagram";
    if (actual !== expected) {
      navigate(getStorefrontPath(shopSlug || shopDetails.slug, actual), { replace: true });
    }
  }, [shopDetails?.slug, shopDetails?.storefront_type, expected, shopSlug, navigate, location.search]);
};
