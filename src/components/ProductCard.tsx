import { Card } from "@/components/ui/card";
import { AspectRatio } from "./ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "./ui/checkbox";
import { AlertTriangle, Boxes, Tag, Palette, Ruler } from "lucide-react";
import { ProductStatusDropdown } from "./ProductStatusDropdown";
import { Badge } from "./ui/badge";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  price: number | null;
  inventory: number;
  media_url: string;
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: {
    sizes?: string[];
    colors?: string[];
    [key: string]: any;
  };
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isSelectionModeActive: boolean;
  onSelect: (productId: string) => void;
  onEdit: (product: Product) => void;
  onStatusChange: (productId: string, newStatus: ProductStatus) => void;
}

const DetailRow = ({ icon: Icon, children }: { icon: React.ElementType, children: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
    <div className="flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
);

export const ProductCard = ({ product, isSelected, isSelectionModeActive, onSelect, onEdit, onStatusChange }: ProductCardProps) => {
  const handleCardClick = () => {
    if (isSelectionModeActive) {
      onSelect(product.id);
    } else {
      onEdit(product);
    }
  };

  const { details, caption, tags } = product;

  return (
    <motion.div layout whileHover={{ y: -5, transition: { duration: 0.2 } }} className="relative">
      <div className={cn("absolute top-3 right-3 z-10 transition-opacity", isSelectionModeActive ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(product.id)}
          className="h-6 w-6 bg-white/80 backdrop-blur-sm border-gray-400 rounded-md"
          aria-label={`Select ${product.name}`}
        />
      </div>
      <Card 
        onClick={handleCardClick}
        className={cn(
          "group w-full overflow-hidden rounded-lg shadow-sm transition-all duration-300 flex flex-col cursor-pointer",
          isSelectionModeActive && "shadow-md",
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <AspectRatio ratio={1} className="overflow-hidden bg-muted">
          <img
            src={product.media_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>

        <div className="bg-card p-3 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <Tag className="h-3 w-3" />
                <span className="truncate font-medium">{product.category || 'Uncategorized'}</span>
              </div>
              {product.pricing_type !== 'subscription' && (
                <div className="flex items-center gap-1.5">
                  <Boxes className="h-3 w-3" />
                  <span>{product.inventory} in stock</span>
                </div>
              )}
            </div>
            <h3 className="font-semibold tracking-tight leading-snug">
              {product.name}
            </h3>
            {caption && <p className="text-xs text-muted-foreground line-clamp-2">{caption}</p>}
            
            <div className="space-y-1.5 pt-1">
              {details?.sizes?.length > 0 && (
                <DetailRow icon={Ruler}>
                  {details.sizes.map(size => <Badge key={size} variant="outline" className="px-1.5 py-0 text-xs font-mono">{size}</Badge>)}
                </DetailRow>
              )}
              {details?.colors?.length > 0 && (
                <DetailRow icon={Palette}>
                  {details.colors.map(color => <Badge key={color} variant="outline" className="px-1.5 py-0 text-xs">{color}</Badge>)}
                </DetailRow>
              )}
            </div>

            {tags?.length > 0 && (
              <div className="flex items-center gap-1.5 truncate pt-1">
                {tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="font-normal text-xs">{tag}</Badge>)}
              </div>
            )}
          </div>
          <div className="flex items-end justify-between mt-3">
            {product.price != null ? (
              <p className="font-semibold text-lg">
                {`$${product.price.toFixed(2)}`}
                {product.pricing_type === 'subscription' && <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>}
              </p>
            ) : (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Set Price
              </div>
            )}
            <ProductStatusDropdown 
              currentStatus={product.status} 
              onStatusChange={(newStatus) => onStatusChange(product.id, newStatus)} 
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};