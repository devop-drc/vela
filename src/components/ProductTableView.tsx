import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, AlertTriangle } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { formatCurrency } from "@/lib/formatters";
import { ProductStatusDropdown } from "./ProductStatusDropdown"; // Import ProductStatusDropdown
import { useShop } from "@/contexts/ShopContext"; // Import useShop
import { Badge } from "./ui/badge"; // Import Badge
import { cn } from "@/lib/utils"; // Import cn

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
}

interface ProductWithSales extends Product {
  total_earned?: number;
  total_sold?: number;
}

interface ProductTableViewProps {
  products: ProductWithSales[];
  selectedProducts: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  // Removed onStatusChange as it's no longer needed directly in the table
  showStatusDropdown?: boolean; // New prop to control visibility
}

export const ProductTableView = ({ products, selectedProducts, onSelectAll, onSelectOne, onEdit, onDelete, showStatusDropdown = true }: ProductTableViewProps) => {
  const { shopDetails, convertCurrency } = useShop();

  const getStockBadge = (inventory: number | null, pricingType: 'one_time' | 'subscription') => {
    if (pricingType === 'subscription') {
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Subscription</Badge>;
    }
    if (inventory === null) {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">N/A</Badge>;
    }
    if (inventory > 10) {
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">In Stock</Badge>;
    }
    if (inventory > 0 && inventory <= 10) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Low Stock</Badge>;
    }
    return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Out of Stock</Badge>;
  };

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
          {showStatusDropdown && <TableHead>Status</TableHead>} {/* Conditionally render Status column */}
          <TableHead>Price</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>Total Earned</TableHead> {/* New column */}
          <TableHead className="text-right w-[150px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length > 0 ? products.map((product) => (
          <TableRow key={product.id} data-state={selectedProducts.includes(product.id) && "selected"} className="group">
            <TableCell onClick={(e) => e.stopPropagation()}> {/* Prevent checkbox click from triggering row click */}
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={() => onSelectOne(product.id)}
                aria-label={`Select row for ${product.name}`}
              />
            </TableCell>
            {/* Make the rest of the row clickable for selection */}
            <TableCell colSpan={showStatusDropdown ? 1 : 0} className="cursor-pointer" onClick={() => onSelectOne(product.id)}>
              <div className="flex items-center gap-4">
                <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
                <div className="flex flex-col flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {product.name}
                    {getStockBadge(product.inventory, product.pricing_type)}
                  </div>
                  {/* Removed ProductStatusDropdown from here */}
                </div>
              </div>
            </TableCell>
            {showStatusDropdown && ( // Conditionally render Status cell
              <TableCell className="cursor-pointer" onClick={() => onSelectOne(product.id)}>
                <ProductStatusDropdown 
                  currentStatus={product.status} 
                  onStatusChange={() => {}} // No-op as status change is handled elsewhere
                />
              </TableCell>
            )}
            <TableCell className="cursor-pointer" onClick={() => onSelectOne(product.id)}>
              <div className="flex-1 text-sm text-muted-foreground">
                {product.price != null ? (
                  formatCurrency(convertCurrency(product.price, product.currency), shopDetails?.currency)
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </div>
            </TableCell>
            <TableCell className="cursor-pointer" onClick={() => onSelectOne(product.id)}>
              <div className="flex-1 text-sm text-muted-foreground">
                {product.pricing_type === 'one_time' ? (product.inventory !== null ? product.inventory : 'N/A') : 'N/A'}
              </div>
            </TableCell>
            <TableCell className="cursor-pointer" onClick={() => onSelectOne(product.id)}>
              <div className="flex-1 text-sm font-medium"> {/* Display Total Earned */}
                {product.total_earned !== undefined && product.total_earned !== null
                  ? formatCurrency(convertCurrency(product.total_earned, product.currency), shopDetails?.currency)
                  : formatCurrency(0, shopDetails?.currency)}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={showStatusDropdown ? 8 : 7} className="h-24 text-center">
              No products found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};