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
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const StorefrontProductCard = ({ product, shopSlug }: StorefrontProductCardProps) => {
  const { shopDetails, appearanceSettings } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;
  const categoryColor = getCategoryColor(product.category);

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
      <Link to={`/shop/${shopDetails?.slug}/product/${product.id}`}> {/* Ensure shopDetails.slug is used */}
        <Card className={cn(
          "group h-full flex flex-col overflow-hidden transition-shadow hover:shadow-xl", // Added group class and hover shadow
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
        )}>
          <CardContent className="p-0">
            <div className="aspect-square w-full overflow-hidden bg-muted">
              <MediaItem 
                src={product.media_url} 
                alt={product.name} 
                type={product.media_type} 
                className="object-cover transition-transform duration-300 group-hover:scale-105" // Added hover scale
              />
            </div>
          </CardContent>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-lg leading-tight mb-1">{product.name}</h3>
              {product.category && (
                <Badge 
                  variant="outline" 
                  className={cn("mb-2", categoryColor.bg, categoryColor.text, categoryColor.border)}
                >
                  {product.category}
                </Badge>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">{product.caption}</p>
            </div>
            <div className="mt-4">
              <p className="text-xl font-bold text-primary">
                {formatCurrency(product.price, product.currency || shopDetails?.currency)}
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