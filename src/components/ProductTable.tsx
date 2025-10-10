import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProductData";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductTableProps {
  isLoading: boolean;
  filteredAndSortedProducts: Product[];
  currentSelection: string[];
  handleSelectOne: (productId: string) => void;
  handleSelectAll: (checked: boolean) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  isLoading,
  filteredAndSortedProducts,
  currentSelection,
  handleSelectOne,
  handleSelectAll,
}) => {
  const { shopDetails, convertCurrency } = useShop();

  return (
    <ScrollArea className="flex-1">
      {isLoading ? (
        <div className="p-4 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-center text-muted-foreground">Loading products...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={currentSelection.length === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label="Select all products"
                />
              </TableHead>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={currentSelection.includes(product.id)}
                      onCheckedChange={() => handleSelectOne(product.id)}
                      aria-label={`Select ${product.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      product.status === 'Active' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      product.status === 'Draft' && 'bg-amber-100 text-amber-800 border-amber-300',
                      product.status === 'Out of Stock' && 'bg-slate-100 text-slate-800 border-slate-300'
                    )}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.price != null ? (
                      <>
                        {formatCurrency(convertCurrency(product.price, product.currency), shopDetails?.currency)}
                        {product.pricing_type === 'subscription' && (
                          <span className="text-xs font-light text-muted-foreground">
                            /{product.billing_interval === 'month' ? 'mo' : 'yr'}
                            {product.interval_repetitions && product.interval_repetitions > 1 && (
                              <span> x {product.interval_repetitions}</span>
                            )}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </ScrollArea>
  );
};