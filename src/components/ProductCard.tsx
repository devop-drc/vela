import { Card } from "@/components/ui/card";
import { AspectRatio } from "./ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "./ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { ProductStatusToggle } from "./ProductStatusToggle";
import { Badge } from "./ui/badge";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  price: number | null;
  media_url: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isSelectionModeActive: boolean;
  onSelect: (productId: string) => void;
  onEdit: (product: Product) => void;
  onStatusChange: (productId: string, newStatus: ProductStatus) => void;
}

export const ProductCard = ({ product, isSelected, isSelectionModeActive, onSelect, onEdit, onStatusChange }: ProductCardProps) => {
  const handleCardClick = () => {
    if (isSelectionModeActive) {
      onSelect(product.id);
    } else {
      onEdit(product);
    }
  };

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

        <div className="bg-card p-2.5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 truncate">
              {(product.tags || []).slice(0, 2).map(tag => <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>)}
            </div>
            <h3 className="mt-2 truncate font-semibold tracking-tight">
              {product.name}
            </h3>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Price</p>
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
            </div>
            <ProductStatusToggle 
              currentStatus={product.status} 
              onStatusChange={(newStatus) => onStatusChange(product.id, newStatus)} 
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};