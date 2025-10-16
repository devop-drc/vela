"use client";

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ShopDetails as StorefrontShopDetails, Promotion as StorefrontPromotion } from "@/contexts/StorefrontContext";

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
  externalShopDetails?: StorefrontShopDetails | null;
  externalConvertCurrency?: (amount: number | null | undefined, fromCurrency?: string) => number;
  externalPromotions?: StorefrontPromotion[];
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

  const activePromotions = effectivePromotions.filter(promo => {
    if (!promo.is_active) return false;
    const now = new Date();
    const startDate = promo.start_date ? new Date(promo.start_date) : null;
    const endDate = promo.end_date ? new Date(promo.end_date) : null;

    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;

    if (promo.target_products && promo.target_products.length > 0) {
      return promo.target_products.includes(product.id);
    }
    return true;
  });

  let discountedPrice = originalDisplayPrice;
  let hasDiscount = false;

  if (activePromotions.length > 0 && originalDisplayPrice !== null) {
    const firstDiscount = activePromotions.find(p => p.type === 'discount');
    if (firstDiscount && firstDiscount.value) {
      if (firstDiscount.value.discountType === 'percentage') {
        discountedPrice = originalDisplayPrice * (1 - firstDiscount.value.discountValue / 100);
        hasDiscount = true;
      } else if (firstDiscount.value.discountType === 'flat') {
        discountedPrice = originalDisplayPrice - firstDiscount.value.discountValue;
        hasDiscount = true;
      }
      discountedPrice = Math.max(0, discountedPrice);
    }
  }

  const getPromotionBadge = (promo: StorefrontPromotion) => {
    switch (promo.type) {
      case 'discount':
        if (promo.value?.discountType === 'percentage') return `${promo.value.discountValue}% OFF`;
        if (promo.value?.discountType === 'flat') return `-${formatCurrency(promo.value.discountValue, effectiveShopDetails?.currency)} OFF`;
        return 'Discount';
      case 'offer':
        if (promo.value?.offerType === 'free_shipping') return 'Free Shipping';
        return 'Offer';
      default: return null;
    }
  };

  if (!effectiveShopDetails) {
    return null;
  }

  const mediaUrl = product.thumbnail_url || product.media_url;

  return (
    <motion.div variants={itemVariants} whileHover={{ opacity: 0.8 }} className={className}>
      <Link
        to={`/instagramShop/${shopSlug}/products/${product.id}`} // Link to the new products feed page
      >
        <Card className={cn(
          "group h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          "border-none shadow-none rounded-none", // Instagram-like styling
          isOutOfStock && "opacity-80"
        )}>
          <CardContent className={cn("p-0 relative")}>
            <div className="aspect-square w-full overflow-hidden bg-gray-100">
              <MediaItem
                src={mediaUrl}
                alt={product.name}
                type={product.media_type}
                className={cn("object-cover transition-transform duration-300 group-hover:scale-105", isOutOfStock && "grayscale")}
              />
            </div>
            {isOutOfStock && (
              <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-amber-500 text-white">
                Coming Soon
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
    </motion.div>
  );
};