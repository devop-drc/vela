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
import { getStockStatus } from "@/lib/stock";

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
  updated_at?: string | null; // Used to bust the variant-stock cache when a product changes
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

type StockSummary = { total: number, inStock: number, outOfStock: number, isLoading: boolean };

// Cache for variant stock summaries to avoid re-fetching constantly.
// Keyed by `${productId}:${updated_at}` so that editing a product (which bumps
// updated_at) busts the entry and forces a fresh fetch — without re-fetching on
// every render.
const variantStockCache = new Map<string, StockSummary>();

const cacheKeyFor = (p: { id: string; updated_at?: string | null }) => `${p.id}:${p.updated_at ?? ''}`;

export const ProductTableView = ({ products, selectedProducts, onSelectAll, onSelectOne, onEdit, onDelete, showStatusColumn = true, selectableRowsMode = 'checkbox' }: ProductTableViewProps) => {
  const { shopDetails, convertCurrency } = useShop();
  // Displayed summaries keyed by productId (the current cache key for that product).
  const [stockSummaries, setStockSummaries] = useState(new Map<string, StockSummary>());

  const fetchVariantStockSummary = useCallback(async (productId: string, cacheKey: string) => {
    const cached = variantStockCache.get(cacheKey);
    if (cached && !cached.isLoading) {
      setStockSummaries(prev => new Map(prev).set(productId, cached));
      return cached;
    }

    // Set loading state
    const loading: StockSummary = { total: 0, inStock: 0, outOfStock: 0, isLoading: true };
    variantStockCache.set(cacheKey, loading);
    setStockSummaries(prev => new Map(prev).set(productId, loading));

    let summary: StockSummary;
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('inventory')
        .eq('product_id', productId);

      if (error) throw error;

      let totalVariants = 0;
      let outOfStockCount = 0;

      (data || []).forEach((variant: any) => {
        totalVariants++;
        if ((variant.inventory ?? 0) <= 0) {
          outOfStockCount++;
        }
      });

      summary = {
        total: totalVariants,
        inStock: totalVariants - outOfStockCount,
        outOfStock: outOfStockCount,
        isLoading: false,
      };
    } catch (e) {
      console.error(`Failed to fetch variant stock for ${productId}:`, e);
      summary = { total: 0, inStock: 0, outOfStock: 0, isLoading: false };
    }

    variantStockCache.set(cacheKey, summary);
    setStockSummaries(prev => new Map(prev).set(productId, summary));
    return summary;
  }, []);

  useEffect(() => {
    // Fetch (or refresh) the variant stock for each non-subscription product.
    // The cache key includes updated_at, so an edited product re-fetches while
    // unchanged products are served from cache.
    products.forEach(p => {
      if (p.pricing_type !== 'one_time') return;
      const key = cacheKeyFor(p);
      const cached = variantStockCache.get(key);
      if (cached && !cached.isLoading) {
        // Ensure the displayed summary reflects the current cache entry.
        setStockSummaries(prev => prev.get(p.id) === cached ? prev : new Map(prev).set(p.id, cached));
      } else if (!cached) {
        fetchVariantStockSummary(p.id, key);
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
    const status = getStockStatus(inventory);
    if (status === "in") {
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">In Stock</Badge>;
    }
    if (status === "low" || status === "critical") {
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
          <TableHead>In stock</TableHead>
          <TableHead>Variants</TableHead>
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
            onClick={() => (isRowSelect ? onSelectOne(product.id) : onEdit(product))}
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
              <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md bg-muted" referrerPolicy="no-referrer" loading="lazy" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
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
                <Button variant="ghost" size="icon" aria-label={`Edit ${product.name}`} title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} title="Delete" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}>
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