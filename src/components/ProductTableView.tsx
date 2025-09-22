import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, AlertTriangle } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { formatCurrency } from "@/lib/formatters";

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft';
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
}

interface ProductTableViewProps {
  products: Product[];
  selectedProducts: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onStatusChange: (productId: string, newStatus: 'Active' | 'Draft') => void;
}

export const ProductTableView = ({ products, selectedProducts, onSelectAll, onSelectOne, onEdit, onDelete, onStatusChange }: ProductTableViewProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">
            <Checkbox
              checked={products.length > 0 && selectedProducts.length === products.length}
              onCheckedChange={(checked) => onSelectAll(!!checked)}
              aria-label="Select all rows"
            />
          </TableHead>
          <TableHead className="w-[80px]">Image</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead className="text-right w-[150px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length > 0 ? products.map((product) => (
          <TableRow key={product.id} data-state={selectedProducts.includes(product.id) && "selected"}>
            <TableCell>
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={() => onSelectOne(product.id)}
                aria-label={`Select row for ${product.name}`}
              />
            </TableCell>
            <TableCell>
              <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
            </TableCell>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onStatusChange(product.id, product.status === 'Active' ? 'Draft' : 'Active')}
                className={product.status === 'Active' ? 'text-green-600 hover:text-green-700' : 'text-amber-600 hover:text-amber-700'}
              >
                {product.status}
              </Button>
            </TableCell>
            <TableCell>
              {product.price != null ? (
                <span>
                  {product.pricing_type === 'subscription'
                    ? `${formatCurrency(product.price, product.currency)} / ${product.billing_interval}`
                    : formatCurrency(product.price, product.currency)}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Manual Entry
                </span>
              )}
            </TableCell>
            <TableCell>
              {product.pricing_type === 'subscription' 
                ? <span className="text-emerald-600">Available</span> 
                : product.inventory}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(product)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(product.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No products found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};