import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/lib/colorUtils";
import { useStorefront } from "@/contexts/StorefrontContext";

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
  shopSlug: string;
  className?: string; // Add className prop
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const StorefrontProductCard = ({ product, shopSlug, className }: StorefrontProductCardProps) => {
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;
  // const categoryColor = getCategoryColor(product.category); // Removed dynamic category color

  // Convert product price to shop's display currency
  const displayPrice = convertCurrency(product.price, product.currency);

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }} className={className}>
      <Link to={`/shop/${shopDetails?.slug}/product/${product.id}`}>
        <Card className={cn(
          "group h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          "border border-input/50 hover:border-primary/70", // Subtle border, highlights on hover
          "shadow-sm hover:shadow-lg", // Softer shadow, more prominent on hover
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
        )}>
          <CardContent className="p-0">
            <div className="aspect-square w-full overflow-hidden bg-muted">
              <MediaItem 
                src={product.media_url} 
                alt={product.name} 
                type={product.media_type} 
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </CardContent>
          <div className="p-3 md:p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-base md:text-lg leading-tight mb-1 line-clamp-2">{product.name}</h3>
              {(product.category || product.details?.type) && (
                <div className="flex items-center gap-1 mb-2">
                  {product.category && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs bg-primary/10 text-primary border-primary/30")} // Changed to primary color
                    >
                      {product.category}
                    </Badge>
                  )}
                  {product.details?.type && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30"> {/* Changed to primary color */}
                      {product.details.type}
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{product.caption}</p>
            </div>
            <div className="mt-3 md:mt-4">
              <p className="text-lg md:text-xl font-bold text-primary">
                {formatCurrency(displayPrice, shopDetails?.currency)}
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