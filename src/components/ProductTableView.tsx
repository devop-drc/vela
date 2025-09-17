import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft';
  price: number;
  inventory: number;
  media_url: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
}

interface ProductTableViewProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onStatusChange: (productId: string, newStatus: 'Active' | 'Draft') => void;
}

export const ProductTableView = ({ products, onEdit, onDelete, onStatusChange }: ProductTableViewProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
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
          <TableRow key={product.id}>
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
              {product.pricing_type === 'subscription'
                ? `$${product.price ? product.price.toFixed(2) : '0.00'} / ${product.billing_interval}`
                : `$${product.price ? product.price.toFixed(2) : 'N/A'}`}
            </TableCell>
            <TableCell>{product.inventory}</TableCell>
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
            <TableCell colSpan={6} className="h-24 text-center">
              No products found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};