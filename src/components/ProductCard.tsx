import { Card } from "@/components/ui/card";
import { AspectRatio } from "./ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "./ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft';
  price: number | null;
  media_url: string;
  category: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isSelectionActive: boolean;
  onSelect: (productId: string) => void;
  onEdit: (product: Product) => void;
  onStatusChange: (productId: string, newStatus: 'Active' | 'Draft') => void;
}

const StatusToggle = ({ status, onToggle }: { status: 'Active' | 'Draft', onToggle: (e: React.MouseEvent) => void }) => {
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <button
      onClick={onToggle}
      onMouseDown={stopPropagation}
      className="relative flex h-9 w-24 items-center rounded-full bg-secondary p-1"
    >
      <span className="w-1/2 text-center text-xs font-medium text-muted-foreground">Draft</span>
      <span className="w-1/2 text-center text-xs font-medium text-muted-foreground">Active</span>
      <motion.div
        className="absolute top-1 left-1 flex h-7 w-1/2 items-center justify-center rounded-full bg-card shadow"
        animate={{ x: status === 'Active' ? '92%' : '0%' }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
      >
        <span className={cn(
          "text-xs font-bold",
          status === 'Active' ? 'text-emerald-500' : 'text-amber-500'
        )}>
          {status}
        </span>
      </motion.div>
    </button>
  );
};

export const ProductCard = ({ product, isSelected, isSelectionActive, onSelect, onEdit, onStatusChange }: ProductCardProps) => {
  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange(product.id, product.status === 'Active' ? 'Draft' : 'Active');
  };

  return (
    <motion.div layout whileHover={{ y: -5, transition: { duration: 0.2 } }} className="relative">
      <div className={cn("absolute top-4 right-4 z-10 transition-opacity", isSelectionActive || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(product.id)}
          className="h-6 w-6 bg-white/80 backdrop-blur-sm border-gray-400 rounded-md"
          aria-label={`Select ${product.name}`}
        />
      </div>
      <Card 
        onClick={() => onEdit(product)}
        className="group w-full overflow-hidden rounded-lg shadow-premium transition-shadow duration-300 flex flex-col cursor-pointer"
      >
        <AspectRatio ratio={1} className="overflow-hidden bg-muted">
          <img
            src={product.media_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>

        <div className="bg-card p-3 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {product.category || 'Uncategorized'}
            </p>
            <h3 className="mt-1 truncate text-lg font-medium tracking-tight">
              {product.name}
            </h3>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Price</p>
              {product.price != null ? (
                <p className="font-semibold text-xl">
                  {product.pricing_type === 'subscription'
                    ? `$${product.price.toFixed(2)}`
                    : `$${product.price.toFixed(2)}`}
                  {product.pricing_type === 'subscription' && <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>}
                </p>
              ) : (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Set Price
                </div>
              )}
            </div>
            <StatusToggle 
              status={product.status} 
              onToggle={handleStatusToggle} 
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};