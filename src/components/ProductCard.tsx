import { Card } from "@/components/ui/card";
import { AspectRatio } from "./ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "./ui/checkbox";
import { AlertTriangle, Palette, Ruler, Tag, Frame, ScanText, Cog } from "lucide-react";
import { ProductStatusDropdown } from "./ProductStatusDropdown";
import { Badge } from "./ui/badge";
import { getCategoryAndType } from "@/lib/productTypes";
import { formatCurrency } from "@/lib/formatters";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';
type GridSizeType = 'sm' | 'md' | 'lg';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  thumbnail_url?: string;
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: {
    [key: string]: any;
  };
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isSelectionModeActive: boolean;
  gridSize: GridSizeType;
  onSelect: (productId: string) => void;
  onEdit: (product: Product) => void;
  onStatusChange: (productId: string, newStatus: ProductStatus) => void;
}

const DetailRow = ({ icon: Icon, children }: { icon: React.ElementType, children: React.ReactNode }) => (
  <div className="flex items-start gap-2 text-xs text-muted-foreground">
    <Icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
    <div className="flex flex-wrap items-center gap-1.5">{children}</div>
  </div>
);

export const ProductCard = ({ product, isSelected, isSelectionModeActive, gridSize, onSelect, onEdit, onStatusChange }: ProductCardProps) => {
  const handleCardClick = () => {
    if (isSelectionModeActive) {
      onSelect(product.id);
    } else {
      onEdit(product);
    }
  };

  const { details, caption, category: categoryValue } = product;
  const { category: categoryInfo, type: typeInfo } = getCategoryAndType(categoryValue, details?.type);

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
            src={product.thumbnail_url || product.media_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>

        <div className="bg-card p-3 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              <span>{categoryInfo?.label || product.category || 'Uncategorized'}</span>
              {typeInfo && <span> &middot; {typeInfo.label}</span>}
            </div>

            <h3 className="font-semibold tracking-tight leading-snug">
              {product.name}
            </h3>

            {(gridSize === 'md' || gridSize === 'lg') && caption && (
              <p className="text-xs text-muted-foreground line-clamp-2">{caption}</p>
            )}
            
            {gridSize === 'lg' && typeInfo?.fields && (
              <div className="space-y-1.5 pt-1">
                {typeInfo.fields.map(field => {
                  const value = details?.[field.name];
                  if (!value || (Array.isArray(value) && value.length === 0)) return null;

                  let icon = Tag;
                  if (field.name.includes('size') || field.name.includes('dimension')) icon = Ruler;
                  if (field.name.includes('color')) icon = Palette;
                  if (field.name.includes('framing')) icon = Frame;
                  if (field.name.includes('medium')) icon = ScanText;
                  if (field.name.includes('spec')) icon = Cog;

                  return (
                    <DetailRow key={field.name} icon={icon}>
                      {field.name === 'colors' && Array.isArray(value) ? (
                        value.map(color => (
                          <div 
                            key={color} 
                            title={color}
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))
                      ) : field.name === 'sizes' && Array.isArray(value) ? (
                        value.map(size => <Badge key={size} variant="outline" className="px-1.5 py-0 text-xs font-mono">{size}</Badge>)
                      ) : (
                        <span className="font-medium">{Array.isArray(value) ? value.join(', ') : value}</span>
                      )}
                    </DetailRow>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-end justify-between pt-2">
            {product.price != null ? (
              <p className="font-semibold text-lg">
                {formatCurrency(product.price, product.currency)}
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