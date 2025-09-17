import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { AspectRatio } from "./ui/aspect-ratio";

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
  const handleStatusToggle = (checked: boolean) => {
    onStatusChange(product.id, checked ? 'Active' : 'Draft');
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg group">
      <div className="overflow-hidden cursor-pointer" onClick={() => onEdit(product)}>
        <AspectRatio ratio={4 / 3}>
          <img 
            src={product.media_url} 
            alt={product.name} 
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" 
          />
        </AspectRatio>
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.category || 'Uncategorized'}</p>
          <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>{product.status}</Badge>
        </div>
        <h3 className="text-lg font-semibold truncate h-7 cursor-pointer" onClick={() => onEdit(product)}>{product.name}</h3>
        <div className="flex items-center justify-between pt-2">
          <p className="text-xl font-bold">
            {product.pricing_type === 'subscription'
              ? `$${product.price ? product.price.toFixed(2) : '0.00'}/${product.billing_interval === 'month' ? 'mo' : 'yr'}`
              : `$${product.price ? product.price.toFixed(2) : 'N/A'}`}
          </p>
          <div className="flex items-center gap-2">
            <Switch
              checked={product.status === 'Active'}
              onCheckedChange={handleStatusToggle}
              aria-label="Toggle product status"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};