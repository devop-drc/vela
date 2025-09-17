import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { AspectRatio } from "./ui/aspect-ratio";
import { getCategoryColor } from "@/lib/colorUtils";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Checkbox } from "./ui/checkbox";

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft';
  price: number;
  media_url: string;
  category: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelect: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onStatusChange: (productId: string, newStatus: 'Active' | 'Draft') => void;
}

const StatusToggle = ({ status, onToggle }: { status: 'Active' | 'Draft', onToggle: () => void }) => {
  return (
    <button
      onClick={onToggle}
      className="relative flex h-8 w-[84px] items-center rounded-full bg-muted"
    >
      <span className="w-1/2 text-center text-xs font-medium text-muted-foreground">Draft</span>
      <span className="w-1/2 text-center text-xs font-medium text-muted-foreground">Active</span>
      <motion.div
        className="absolute left-0 top-0 flex h-full w-1/2 items-center justify-center rounded-full bg-background shadow"
        animate={{ x: status === 'Active' ? '100%' : '0%' }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
      >
        <span className={cn(
          "text-xs font-bold",
          status === 'Active' ? 'text-green-600' : 'text-amber-600'
        )}>
          {status}
        </span>
      </motion.div>
    </button>
  );
};

export const ProductCard = ({ product, isSelected, onSelect, onEdit, onDelete, onStatusChange }: ProductCardProps) => {
  const categoryColor = getCategoryColor(product.category);

  return (
    <motion.div layout whileHover={{ y: -3, transition: { duration: 0.2 } }} className="relative">
      <div className={cn("absolute top-3 right-3 z-10 transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(product.id)}
          className="h-5 w-5 bg-white border-gray-400"
          aria-label={`Select ${product.name}`}
        />
      </div>
      <Card className="group w-full overflow-hidden rounded-xl border-0 shadow-md transition-shadow duration-300 hover:shadow-xl flex flex-col">
        <div className="relative cursor-pointer" onClick={() => onEdit(product)}>
          <AspectRatio ratio={1} className="overflow-hidden bg-muted">
            <img
              src={product.media_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </AspectRatio>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-4">
            <Badge variant="outline" className={cn("border-0 font-semibold", categoryColor.bg, categoryColor.text)}>
              {product.category || 'Uncategorized'}
            </Badge>
            <h3 className="mt-1 truncate text-lg font-bold text-white shadow-sm">
              {product.name}
            </h3>
          </div>
        </div>

        <div className="bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-extrabold">
              {product.pricing_type === 'subscription'
                ? `$${product.price ? product.price.toFixed(2) : '0.00'}`
                : `$${product.price ? product.price.toFixed(2) : 'N/A'}`}
              {product.pricing_type === 'subscription' && <span className="text-sm font-normal text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>}
            </p>
            <div className="flex items-center gap-1">
              <StatusToggle 
                status={product.status} 
                onToggle={() => onStatusChange(product.id, product.status === 'Active' ? 'Draft' : 'Active')} 
              />
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(product)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => onDelete(product.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};