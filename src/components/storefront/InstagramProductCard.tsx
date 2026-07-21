"use client";

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { activePromotionsFor, computePrice, promotionBadgeLabel } from "@/storefront/lib/pricing";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/lib/anim";
import { cn } from "@/lib/utils";
// Use generic types for external props to avoid tight coupling to context types

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  media_gallery: string[] | null;
  media_type: string | null;
  thumbnail_url?: string;
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: any;
  product_type: 'physical' | 'digital';
}

interface InstagramProductCardProps {
  product: Product;
  shopSlug: string;
  className?: string;
  externalShopDetails?: any | null;
  externalConvertCurrency?: (amount: number | null | undefined, fromCurrency?: string) => number;
  externalPromotions?: any[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { y: 0, opacity: 1 },
};

export const InstagramProductCard = ({
  product,
  shopSlug,
  className,
  externalShopDetails,
  externalConvertCurrency,
  externalPromotions,
}: InstagramProductCardProps) => {
  // These contexts are not directly used in this component, but are passed down
  // from the parent (InstagramProfilePage) for consistency in prop drilling.
  // The actual conversion logic is handled by externalConvertCurrency prop.

  const effectiveShopDetails = externalShopDetails;
  const effectiveConvertCurrency = externalConvertCurrency;
  const effectivePromotions = externalPromotions || [];

  const originalDisplayPrice = effectiveConvertCurrency ? effectiveConvertCurrency(product.price, product.currency) : product.price;

  const isOutOfStock = product.status === 'Out of Stock' || (product.pricing_type === 'one_time' && product.inventory <= 0);

  const activePromotions = activePromotionsFor(effectivePromotions as any, product.id);
  const { discounted: discountedPrice, hasDiscount } = computePrice(originalDisplayPrice, activePromotions);

  const getPromotionBadge = (promo: any) =>
    promotionBadgeLabel(promo, undefined, (v) => formatCurrency(v, effectiveShopDetails?.currency));

  if (!effectiveShopDetails) {
    return null;
  }

  const mediaUrl = product.thumbnail_url || product.media_url;

  return (
    <Reveal from="up" className={`${className} transition-opacity duration-200 hover:opacity-80`}>
      <Link
        to={`/instagramShop/${shopSlug}/products/${product.id}`} // Link to the new products feed page
      >
        <Card className={cn(
          "group h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          "border-none shadow-none rounded-none", // Instagram-like styling
          isOutOfStock && "opacity-80"
        )}>
          <CardContent className={cn("p-0 relative")}>
            <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
              <MediaItem
                src={mediaUrl}
                alt={product.name}
                type={product.media_type}
                className={cn("w-full h-full object-cover transition-transform duration-300 group-hover:scale-105", isOutOfStock && "grayscale")}
              />
            </div>
            {isOutOfStock && (
              <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-amber-500 text-white">
                Sold Out
              </Badge>
            )}
            {activePromotions.length > 0 && !isOutOfStock && (
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                {activePromotions.map(promo => (
                  <Badge key={promo.id} className={cn(
                    "text-white text-xs",
                    "bg-green-500"
                  )}>
                    {getPromotionBadge(promo)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </Reveal>
  );
};