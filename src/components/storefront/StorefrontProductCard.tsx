import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/contexts/StorefrontContext";
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

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'offer';
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
}

interface StorefrontProductCardProps {
  product: Product;
  shopSlug: string;
  className?: string;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const StorefrontProductCard = ({ product, shopSlug, className }: StorefrontProductCardProps) => {
  const { shopDetails, appearanceSettings, convertCurrency, promotions } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;

  // Convert product price to shop's display currency
  const displayPrice = convertCurrency(product.price, product.currency);

  const isOutOfStock = product.status === 'Out of Stock' || (product.pricing_type === 'one_time' && product.inventory <= 0);

  const activePromotions = promotions.filter(promo => {
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

  const getPromotionBadge = (promo: Promotion) => {
    switch (promo.type) {
      case 'discount':
        if (promo.value?.discountType === 'percentage') return `${promo.value.discountValue}% OFF`;
        if (promo.value?.discountType === 'flat') return `-${formatCurrency(promo.value.discountValue, shopDetails?.currency)} OFF`;
        return 'Discount';
      case 'offer':
        if (promo.value?.offerType === 'free_shipping') return 'Free Shipping';
        return 'Offer';
      default: return null;
    }
  };

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }} className={className}>
      <Link 
        to={`/shop/${shopDetails?.slug}/product/${product.id}`} 
        onClick={(e) => { if (isOutOfStock) e.preventDefault(); }}
        className={cn(isOutOfStock && "pointer-events-none")}
      >
        <Card className={cn(
          "group h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          "border border-input/50 hover:border-primary/70",
          "shadow-sm hover:shadow-lg",
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
          isOutOfStock && "opacity-60 grayscale"
        )}>
          <CardContent className="p-0 relative">
            <div className="aspect-square w-full overflow-hidden bg-muted">
              <MediaItem 
                src={product.media_url} 
                alt={product.name} 
                type={product.media_type} 
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            {isOutOfStock && (
              <Badge variant="destructive" className="absolute top-2 left-2 text-xs md:text-sm">
                Out of Stock
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
              <p className="text-lg md:text-xl font-bold text-primary">
                {displayPrice != null ? formatCurrency(displayPrice, shopDetails?.currency) : 'N/A'}
                {product.pricing_type === 'subscription' && (
                  <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                )}
              </p>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
};