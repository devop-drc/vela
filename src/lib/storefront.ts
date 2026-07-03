// Storefront type + homepage template shared helpers.

export type StorefrontType = "instagram" | "custom";

export const HOMEPAGE_TEMPLATES = ["classic", "minimal", "showcase", "magazine"] as const;
export type HomepageTemplate = (typeof HOMEPAGE_TEMPLATES)[number];

export const HOMEPAGE_TEMPLATE_META: Record<HomepageTemplate, { label: string; description: string }> = {
  classic: { label: "Classic", description: "Hero banner with every section — categories, best sellers, new arrivals." },
  minimal: { label: "Minimal", description: "Clean and simple: compact hero, then a large product grid." },
  showcase: { label: "Showcase", description: "Bold full-bleed hero (image/video) with large featured products." },
  magazine: { label: "Magazine", description: "Editorial layout — split hero and alternating featured rows." },
};

/** Build the public path for a shop's chosen storefront (e.g. "/shop/acme"). */
export const getStorefrontPath = (shopSlug: string, type: StorefrontType | string | null | undefined): string => {
  const base = type === "custom" ? "/shop" : "/instagramShop";
  return `${base}/${shopSlug}`;
};

/** Build the absolute storefront URL for sharing. */
export const getStorefrontUrl = (
  shopSlug: string,
  type: StorefrontType | string | null | undefined,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string => `${origin}${getStorefrontPath(shopSlug, type)}`;
