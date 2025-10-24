import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { formatCurrency } from "@/lib/formatters";
import { ProductStatusDropdown } from "./ProductStatusDropdown"; // Import ProductStatusDropdown
import { useShop } from "@/contexts/ShopContext"; // Import useShop
import { Badge } from "./ui/badge"; // Import Badge
import { cn } from "@/lib/utils"; // Import cn
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";

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
  details: { [key: string]: any }; // Keep details for specs
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
  showStatusColumn?: boolean; // New prop to control visibility of the status column
  selectableRowsMode?: 'checkbox' | 'row';
}

// Cache for variant stock summaries to avoid re-fetching constantly
const variantStockCache = new Map<string, { total: number, inStock: number, outOfStock: number, isLoading: boolean }>();

export const ProductTableView = ({ products, selectedProducts, onSelectAll, onSelectOne, onEdit, onDelete, showStatusColumn = true, selectableRowsMode = 'checkbox' }: ProductTableViewProps) => {
  const { shopDetails, convertCurrency } = useShop();
  const [stockSummaries, setStockSummaries] = useState(new Map<string, { total: number, inStock: number, outOfStock: number, isLoading: boolean }>());

  const fetchVariantStockSummary = useCallback(async (productId: string) => {
    if (variantStockCache.has(productId) && !variantStockCache.get(productId)?.isLoading) {
      return variantStockCache.get(productId);
    }

    // Set loading state in cache
    variantStockCache.set(productId, { total: 0, inStock: 0, outOfStock: 0, isLoading: true });
    setStockSummaries(new Map(variantStockCache));

    try {
      const { data, error } = await supabase
        .from('product_options')
        .select('option_values(inventory)')
        .eq('product_id', productId);

      if (error) throw error;

      let totalVariants = 0;
      let totalStock = 0;
      let outOfStockCount = 0;

      data.forEach(option => {
        (option.option_values || []).forEach((val: any) => {
          totalVariants++;
          totalStock += val.inventory;
          if (val.inventory <= 0) {
            outOfStockCount++;
          }
        });
      });

      const summary = {
        total: totalVariants,
        inStock: totalVariants - outOfStockCount,
        outOfStock: outOfStockCount,
        isLoading: false,
      };
      
      variantStockCache.set(productId, summary);
      return summary;

    } catch (e) {
      console.error(`Failed to fetch variant stock for ${productId}:`, e);
      variantStockCache.set(productId, { total: 0, inStock: 0, outOfStock: 0, isLoading: false });
      return variantStockCache.get(productId);
    } finally {
      setStockSummaries(new Map(variantStockCache));
    }
  }, []);

  useEffect(() => {
    // Trigger fetch for all products that might have variants
    products.forEach(p => {
      // Only fetch if we haven't already fetched and it's not a subscription product
      if (p.pricing_type === 'one_time' && !variantStockCache.has(p.id)) {
        fetchVariantStockSummary(p.id);
      }
    });
  }, [products, fetchVariantStockSummary]);

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

  const renderVariantStockSummary = (productId: string, pricingType: 'one_time' | 'subscription') => {
    if (pricingType === 'subscription') return 'N/A';
    
    const summary = stockSummaries.get(productId);

    if (summary?.isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    }

    if (summary && summary.total > 0) {
      return (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">{summary.total} variants</p>
          <p className={cn(summary.inStock > 0 ? 'text-emerald-600' : 'text-destructive')}>
            {summary.inStock} in stock / {summary.outOfStock} out of stock
          </p>
        </div>
      );
    }
    
    // If no options are found, display N/A
    return 'N/A';
  };

  if (!shopDetails) {
    return null; // Or a loading indicator
  }

  const isRowSelect = selectableRowsMode === 'row';

  return (
    <Table className="rounded-md border overflow-hidden">
      <TableHeader>
        <TableRow>
          {!isRowSelect && (
            <TableHead className="w-[50px]">
              <Checkbox
                checked={products.length > 0 && selectedProducts.length === products.length}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                aria-label="Select all rows"
              />
            </TableHead>
          )}
          <TableHead className="w-[80px]">Image</TableHead>
          <TableHead>Name</TableHead>
          {showStatusColumn && <TableHead>Status</TableHead>}
          <TableHead>Price</TableHead>
          <TableHead>Inventory</TableHead>
          <TableHead>Variant Stock</TableHead>
          <TableHead>Total Earned</TableHead>
          <TableHead className="text-right w-[150px]">Actions</TableHead>
        </TableRow>
      </TableHeader><TableBody>
        {products.length > 0 ? products.map((product) => (
          <TableRow
            key={product.id}
            data-state={selectedProducts.includes(product.id) && "selected"}
            className={cn(
              "group transition-colors",
              selectedProducts.includes(product.id) && "bg-primary/10"
            )}
            onClick={() => onSelectOne(product.id)}
          >
            {!isRowSelect && (
              <TableCell onClick={(e) => { e.stopPropagation(); }}>
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={() => onSelectOne(product.id)}
                  aria-label={`Select row for ${product.name}`}
                />
              </TableCell>
            )}
            <TableCell className="cursor-pointer py-3">
              <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
            </TableCell>
            <TableCell className="cursor-pointer py-3">
              <div className="font-medium flex items-center gap-2">
                {product.name}
                {getStockBadge(product.inventory, product.pricing_type)}
              </div>
            </TableCell>
            {showStatusColumn && (
              <TableCell className="cursor-pointer py-3">
                <Badge variant="outline" className={cn("font-normal", {
                  'bg-emerald-100 text-emerald-800 border-emerald-300': product.status === 'Active',
                  'bg-amber-100 text-amber-800 border-amber-300': product.status === 'Draft',
                  'bg-slate-100 text-slate-800 border-slate-300': product.status === 'Out of Stock',
                })}>
                  {product.status}
                </Badge>
              </TableCell>
            )}
            <TableCell className="cursor-pointer py-3">
              <div className="flex-1 text-sm text-muted-foreground">
                {product.price != null ? (
                  (() => {
                    // Convert product.price from its stored currency (product.currency) to shopDetails.currency
                    const convertedPrice = convertCurrency(product.price, product.currency, shopDetails.currency);
                    return formatCurrency(convertedPrice, shopDetails.currency);
                  })()
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </div>
            </TableCell>
            <TableCell className="cursor-pointer py-3">
              <div className="flex-1 text-sm text-muted-foreground">
                {product.pricing_type === 'one_time' ? (product.inventory !== null ? product.inventory : 'N/A') : 'N/A'}
              </div>
            </TableCell>
            <TableCell className="cursor-pointer py-3">
              {renderVariantStockSummary(product.id, product.pricing_type)}
            </TableCell>
            <TableCell className="cursor-pointer py-3">
              <div className="flex-1 text-sm font-medium">
                {product.total_earned !== undefined && product.total_earned !== null
                  ? formatCurrency(convertCurrency(product.total_earned, product.currency, shopDetails.currency), shopDetails.currency)
                  : formatCurrency(0, shopDetails.currency)}
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
            <TableCell colSpan={9} className="h-24 text-center">
              No products found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};