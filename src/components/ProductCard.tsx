import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="overflow-hidden transition-all hover:shadow-lg group flex flex-col">
      <div className="overflow-hidden cursor-pointer" onClick={() => onEdit(product)}>
        <AspectRatio ratio={4 / 3} className="bg-muted">
          <img 
            src={product.media_url} 
            alt={product.name} 
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" 
          />
        </AspectRatio>
      </div>
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className={cn("font-normal", categoryColor.bg, categoryColor.text, categoryColor.border)}>
              {product.category || 'Uncategorized'}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold leading-tight truncate cursor-pointer" onClick={() => onEdit(product)}>{product.name}</h3>
        </div>
        <div className="flex items-end justify-between pt-2">
          <p className="text-2xl font-bold">
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
              className={cn("w-[70px]", product.status === 'Active' ? 'border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700' : 'border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700')}
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
      </CardContent>
    </Card>
  );
};