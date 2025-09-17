import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { AspectRatio } from "./ui/aspect-ratio";
import { getCategoryColor } from "@/lib/colorUtils";
import { cn } from "@/lib/utils";

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
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onStatusChange: (productId: string, newStatus: 'Active' | 'Draft') => void;
}

export const ProductCard = ({ product, onEdit, onDelete, onStatusChange }: ProductCardProps) => {
  const categoryColor = getCategoryColor(product.category);

  return (
    <Card className="group w-full overflow-hidden rounded-xl border-0 shadow-md transition-shadow duration-300 hover:shadow-xl flex flex-col">
      <div className="relative cursor-pointer" onClick={() => onEdit(product)}>
        <AspectRatio ratio={1} className="overflow-hidden bg-muted">
          <img
            src={product.media_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </AspectRatio>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent" />
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onStatusChange(product.id, product.status === 'Active' ? 'Draft' : 'Active')}
              className={cn(
                "w-[75px] font-semibold", 
                product.status === 'Active' 
                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800' 
                  : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800'
              )}
            >
              {product.status}
            </Button>
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
  );
};