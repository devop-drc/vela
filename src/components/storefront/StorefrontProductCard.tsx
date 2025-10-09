import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStorefront, ShopDetails as StorefrontShopDetails, DesignSettings as StorefrontDesignSettings, Promotion as StorefrontPromotion } from "@/contexts/StorefrontContext"; // Import types
import { useShop } from "@/contexts/ShopContext"; // Import useShop for dashboard context
import { useAppearance } from "@/contexts/AppearanceContext"; // Import useAppearance for dashboard context
import { Percent, Gift } from "lucide-react";

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
}

interface StorefrontProductCardProps {
  product: Product;
  shopSlug: string; // This is always passed
  className?: string;
  // Optional props for when used outside StorefrontProvider (e.g., in Dashboard)
  externalShopDetails?: StorefrontShopDetails | null;
  externalAppearanceSettings?: StorefrontDesignSettings | null;
  externalConvertCurrency?: (amount: number | null | undefined, fromCurrency?: string) => number;
  externalPromotions?: StorefrontPromotion[];
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const StorefrontProductCard = ({
  product,
  shopSlug,
  className,
  externalShopDetails,
  externalAppearanceSettings,
  externalConvertCurrency,
  externalPromotions,
}: StorefrontProductCardProps) => {
  // Attempt to get context values from StorefrontProvider, but don't throw if context is undefined
  let contextShopDetails: StorefrontShopDetails | null = null;
  let contextAppearanceSettings: StorefrontDesignSettings | null = null;
  let contextConvertCurrency: ((amount: number | null | undefined, fromCurrency?: string) => number) | undefined = undefined;
  let contextPromotions: StorefrontPromotion[] | undefined = undefined;

  try {
    // This will only work if inside StorefrontProvider
    const storefrontContext = useStorefront();
    contextShopDetails = storefrontContext.shopDetails;
    contextAppearanceSettings = storefrontContext.appearanceSettings;
    contextConvertCurrency = storefrontContext.convertCurrency;
    contextPromotions = storefrontContext.promotions;
  } catch (e) {
    // Expected error if not in StorefrontProvider, ignore
  }

  // Fallback to external props or dashboard context if storefront context is not available
  const { shopDetails: adminShopDetails, convertCurrency: adminConvertCurrency } = useShop();
  const { settings: adminAppearanceSettings } = useAppearance();

  const effectiveShopDetails = externalShopDetails || contextShopDetails || adminShopDetails;
  const effectiveConvertCurrency = externalConvertCurrency || contextConvertCurrency || adminConvertCurrency;
  const effectiveAppearanceSettings = externalAppearanceSettings || contextAppearanceSettings || adminAppearanceSettings;
  const effectivePromotions = externalPromotions || contextPromotions || [];

  const blurEnabled = effectiveAppearanceSettings?.blurEnabled;

  // Convert product price to shop's display currency
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
    return true; // Applies to all products if target_products is empty
  });

  let discountedPrice = originalDisplayPrice;
  let hasDiscount = false;

  if (activePromotions.length > 0 && originalDisplayPrice !== null) {
    // For simplicity, apply the first active discount found.
    // In a real scenario, you might have logic to apply the best discount or combine them.
    const firstDiscount = activePromotions.find(p => p.type === 'discount');
    if (firstDiscount && firstDiscount.value) {
      if (firstDiscount.value.discountType === 'percentage') {
        discountedPrice = originalDisplayPrice * (1 - firstDiscount.value.discountValue / 100);
        hasDiscount = true;
      } else if (firstDiscount.value.discountType === 'flat') {
        discountedPrice = originalDisplayPrice - firstDiscount.value.discountValue;
        hasDiscount = true;
      }
      discountedPrice = Math.max(0, discountedPrice); // Ensure price doesn't go below zero
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

  // If no effectiveShopDetails, we can't render the card meaningfully
  if (!effectiveShopDetails) {
    return null;
  }

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }} className={className}>
      <Link
        to={`/shop/${effectiveShopDetails.slug}/product/${product.id}`}
      >
        <Card className={cn(
          "group h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          "border border-input/50 hover:border-primary/70",
          "shadow-sm hover:shadow-lg",
          blurEnabled ? "bg-card/70 backdrop-blur-[20px]" : "bg-card",
          isOutOfStock && "opacity-80" // Apply opacity for out of stock
        )}>
          <CardContent className="p-0 relative">
            <div className="aspect-square w-full overflow-hidden bg-muted">
              <MediaItem
                src={product.media_url}
                alt={product.name}
                type={product.media_type}
                className={cn("object-cover transition-transform duration-300 group-hover:scale-105", isOutOfStock && "grayscale")}
              />
            </div>
            {isOutOfStock && (
              <Badge variant="secondary" className="absolute top-2 left-2 text-xs md:text-sm bg-amber-500 text-white">
                Coming Soon
              </Badge>
            )}
            {activePromotions.length > 0 && !isOutOfStock && (
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                {activePromotions.map(promo => (
                  <Badge key={promo.id} className="bg-emerald-500 text-white text-xs md:text-sm">
                    {getPromotionBadge(promo)}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
          <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-base md:text-lg leading-tight mb-1 line-clamp-2">{product.name}</h3>
              {(product.category || product.details?.type) && (
                <div className="flex items-center gap-1 mb-2">
                  {product.category && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs bg-primary/10 text-primary border-primary/30")}
                    >
                      {product.category}
                    </Badge>
                  )}
                  {product.details?.type && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      {product.details.type}
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{product.caption}</p>
            </div>
            <div className="mt-3 md:mt-4">
              {hasDiscount && originalDisplayPrice !== null ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-sm text-muted-foreground line-through">
                    {formatCurrency(originalDisplayPrice, effectiveShopDetails?.currency)}
                  </p>
                  <p className="text-lg md:text-xl font-bold text-primary">
                    {formatCurrency(discountedPrice, effectiveShopDetails?.currency)}
                    {product.pricing_type === 'subscription' && (
                      <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-lg md:text-xl font-bold text-primary">
                  {originalDisplayPrice != null ? formatCurrency(originalDisplayPrice, effectiveShopDetails?.currency) : 'N/A'}
                  {product.pricing_type === 'subscription' && (
                    <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
};