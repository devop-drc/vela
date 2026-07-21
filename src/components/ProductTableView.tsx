import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, AlertTriangle, Instagram } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "./ui/checkbox";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext"; // Import useShop
import { StatusBadge } from "@/components/ui-app/StatusBadge"; // Canonical status chip
import { productStatusTone } from "@/lib/status"; // Canonical status → tone mapping
import { cn } from "@/lib/utils"; // Import cn
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { shopDetails, convertCurrency } = useShop();
  // Displayed summaries keyed by productId (the current cache key for that product).
  const [stockSummaries, setStockSummaries] = useState(new Map<string, StockSummary>());

  // Batch-fetch the variant stock for the given products in ONE query (avoids
  // the old N+1: a query per row). Groups the rows client-side into per-product
  // summaries and populates both the module cache (keyed by product+updated_at)
  // and the displayed state.
  const fetchVariantStocks = useCallback(async (missing: { id: string; cacheKey: string }[]) => {
    if (missing.length === 0) return;

    // Mark all pending products as loading (shared reference is fine).
    const loading: StockSummary = { total: 0, inStock: 0, outOfStock: 0, isLoading: true };
    missing.forEach(m => variantStockCache.set(m.cacheKey, loading));
    setStockSummaries(prev => {
      const next = new Map(prev);
      missing.forEach(m => next.set(m.id, loading));
      return next;
    });

    const byProduct = new Map<string, { total: number; outOfStock: number }>();
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('inventory, product_id')
        .in('product_id', missing.map(m => m.id));

      if (error) throw error;

      (data || []).forEach((variant: any) => {
        const agg = byProduct.get(variant.product_id) || { total: 0, outOfStock: 0 };
        agg.total++;
        if ((variant.inventory ?? 0) <= 0) agg.outOfStock++;
        byProduct.set(variant.product_id, agg);
      });
    } catch (e) {
      console.error('Failed to batch-fetch variant stock:', e);
    }

    setStockSummaries(prev => {
      const next = new Map(prev);
      missing.forEach(m => {
        const agg = byProduct.get(m.id) || { total: 0, outOfStock: 0 };
        const summary: StockSummary = {
          total: agg.total,
          inStock: agg.total - agg.outOfStock,
          outOfStock: agg.outOfStock,
          isLoading: false,
        };
        variantStockCache.set(m.cacheKey, summary);
        next.set(m.id, summary);
      });
      return next;
    });
  }, []);

  useEffect(() => {
    // Serve cached entries and collect the ones that still need fetching. The
    // cache key includes updated_at, so an edited product re-fetches while
    // unchanged products are served from cache.
    const missing: { id: string; cacheKey: string }[] = [];
    const restore = new Map<string, StockSummary>();
    products.forEach(p => {
      if (p.pricing_type !== 'one_time') return;
      const key = cacheKeyFor(p);
      const cached = variantStockCache.get(key);
      if (cached && !cached.isLoading) {
        restore.set(p.id, cached);
      } else if (!cached) {
        missing.push({ id: p.id, cacheKey: key });
      }
    });

    if (restore.size > 0) {
      setStockSummaries(prev => {
        let changed = false;
        const next = new Map(prev);
        restore.forEach((summary, id) => {
          if (prev.get(id) !== summary) { next.set(id, summary); changed = true; }
        });
        return changed ? next : prev;
      });
    }

    fetchVariantStocks(missing);
  }, [products, fetchVariantStocks]);

  const renderVariantStockSummary = (productId: string, pricingType: 'one_time' | 'subscription') => {
    if (pricingType === 'subscription') return t('products_ui.not_applicable');
    
    const summary = stockSummaries.get(productId);

    if (summary?.isLoading) {
      return <Spinner className="h-4 w-4 text-muted-foreground" />;
    }

    if (summary && summary.total > 0) {
      return (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">{t('products_ui.variants_count', { count: summary.total })}</p>
          <p className={cn(summary.inStock > 0 ? 'text-success' : 'text-destructive')}>
            {t('products_ui.stock_summary', { inStock: summary.inStock, outOfStock: summary.outOfStock })}
          </p>
        </div>
      );
    }
    
    // If no options are found, display N/A
    return t('products_ui.not_applicable');
  };

  if (!shopDetails) {
    return null; // Or a loading indicator
  }

  const isRowSelect = selectableRowsMode === 'row';

  return (
    <div className="overflow-x-auto">
    <Table className="rounded-md border overflow-hidden">
      <TableHeader>
        <TableRow>
          {!isRowSelect && (
            <TableHead className="w-[50px]">
              <Checkbox
                checked={products.length > 0 && selectedProducts.length === products.length}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                aria-label={t('products_ui.select_all_rows')}
              />
            </TableHead>
          )}
          <TableHead className="w-[80px]">{t('products_ui.image')}</TableHead>
          <TableHead>{t('products_ui.name')}</TableHead>
          {showStatusColumn && <TableHead>{t('products.status')}</TableHead>}
          <TableHead>{t('ig_status.column')}</TableHead>
          <TableHead>{t('products_ui.price')}</TableHead>
          <TableHead>{t('products_ui.in_stock')}</TableHead>
          <TableHead>{t('products_ui.variants')}</TableHead>
          <TableHead>{t('products_ui.total_earned')}</TableHead>
          <TableHead className="text-right w-[150px]">{t('products_ui.actions')}</TableHead>
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
                  aria-label={t('products_ui.select_row_for', { name: product.name })}
                />
              </TableCell>
            )}
            <TableCell className="cursor-pointer py-3">
              <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md bg-muted" referrerPolicy="no-referrer" loading="lazy" onError={(e) => { e.currentTarget.style.opacity = '0.3'; }} />
            </TableCell>
            <TableCell className="cursor-pointer py-3">
              <div className="font-medium">{product.name}</div>
            </TableCell>
            {showStatusColumn && (
              <TableCell className="cursor-pointer py-3">
                <StatusBadge tone={productStatusTone(product.status)} size="sm">
                  {t('status_labels.' + product.status.toLowerCase().replace(/\s+/g, '_'), { defaultValue: product.status })}
                </StatusBadge>
              </TableCell>
            )}
            <TableCell className="cursor-pointer py-3">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                (product as any).instagram_post_id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Instagram className="h-3 w-3" />
                {(product as any).instagram_post_id ? t('ig_status.on_instagram_short') : t('ig_status.shop_only_short')}
              </span>
            </TableCell>
            <TableCell className="cursor-pointer py-3">
              <div className="flex-1 text-sm text-muted-foreground">
                {product.price != null ? (
                  (() => {
                    // Convert product.price from its stored currency (product.currency) to shopDetails.currency
                    const convertedPrice = convertCurrency(product.price, product.currency, shopDetails.currency);
                    return formatCurrency(convertedPrice, shopDetails.currency);
                  })()
                ) : (
                  <span className="text-muted-foreground">{t('products_ui.not_applicable')}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="cursor-pointer py-3">
              <div className="flex-1 text-sm text-muted-foreground">
                {product.pricing_type === 'one_time' ? (product.inventory !== null ? product.inventory : t('products_ui.not_applicable')) : t('products_ui.not_applicable')}
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
                <Button variant="ghost" size="icon" aria-label={t('products_ui.edit_product_aria', { name: product.name })} title={t('common.edit')} onClick={(e) => { e.stopPropagation(); onEdit(product); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={t('products_ui.delete_product_aria', { name: product.name })} title={t('common.delete')} className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={10} className="h-24 text-center">
              {t('products_ui.no_products_found')}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    </div>
  );
};