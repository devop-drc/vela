import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { AspectRatio } from "./ui/aspect-ratio";
import { getCategoryColor } from "@/lib/colorUtils";
import { cn } from "@/lib/utils";
import { Switch } from "./ui/switch";

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

  const handleStatusToggle = (checked: boolean) => {
    onStatusChange(product.id, checked ? 'Active' : 'Draft');
  };

  return (
    <Card className="group relative w-full overflow-hidden rounded-xl border-0 shadow-md transition-shadow duration-300 hover:shadow-xl">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => onEdit(product)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => onDelete(product.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AspectRatio ratio={1} className="overflow-hidden">
        <img
          src={product.media_url}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </AspectRatio>

      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 via-black/50 to-transparent p-4">
        <Badge variant="outline" className={cn("border-0 font-semibold", categoryColor.bg, categoryColor.text)}>
          {product.category || 'Uncategorized'}
        </Badge>
        <h3 className="mt-1 truncate text-lg font-bold text-white shadow-sm cursor-pointer" onClick={() => onEdit(product)}>
          {product.name}
        </h3>
      </div>

      <div className="bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-extrabold">
            {product.pricing_type === 'subscription'
              ? `$${product.price ? product.price.toFixed(2) : '0.00'}`
              : `$${product.price ? product.price.toFixed(2) : 'N/A'}`}
            {product.pricing_type === 'subscription' && <span className="text-sm font-normal text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>}
          </p>
          <div className="flex items-center gap-2">
            <Switch
              checked={product.status === 'Active'}
              onCheckedChange={handleStatusToggle}
              id={`status-switch-${product.id}`}
            />
            <label htmlFor={`status-switch-${product.id}`} className={cn("text-sm font-medium cursor-pointer", product.status === 'Active' ? 'text-green-600' : 'text-amber-600')}>
              {product.status}
            </label>
          </div>
        </div>
      </div>
    </Card>
  );
};