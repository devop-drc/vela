import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Package, Settings, Wrench, Layers, Tag, ChevronRight, Save, Filter, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductReviewsManager } from "./ProductReviewsManager";
import { useProductRating } from "@/hooks/useProductRating";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui-app";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { MediaItem } from "../MediaItem";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { getStockStatus, syncDerivedStockFromVariants, parseVariantOptionValues } from "@/lib/stock";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { productStatusTone, toneTint, toneText, type StatusTone } from "@/lib/status";
import { useReveal } from "@/lib/anim";

const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

// Map the 4-state stock status onto a semantic tone (critical + out → danger).
const toStockTone = (n: number): StatusTone => {
  const s = getStockStatus(n);
  return s === "out" || s === "critical" ? "danger" : s === "low" ? "warning" : "success";
};

export const ProductViewMode = ({ product, mediaItems, onEdit, onDelete, isSubmitting, specs }: { product: any; mediaItems: any[]; onEdit: () => void; onDelete: () => void; isSubmitting: boolean; specs?: any[] }) => {
  const { shopDetails, convertCurrency } = useShop();
  const [options, setOptions] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const ratingSummary = useProductRating(product?.id);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'oos'>('all');
  // Variant list search/filter/sort in view mode
  const [varSearch, setVarSearch] = useState('');
  const [varFilter, setVarFilter] = useState<'all' | 'in_stock' | 'low' | 'oos'>('all');
  const [varSort, setVarSort] = useState<'default' | 'stock_asc' | 'stock_desc' | 'price_asc' | 'price_desc'>('default');

  const currencyCode = shopDetails?.currency || 'USD';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingOptions(true);
      if (!product?.id) { setOptions([]); setVariants([]); setIsLoadingOptions(false); return; }

      const [optRes, varRes] = await Promise.all([
        supabase.from('product_options').select('id, name, option_values(id, value, price_difference, inventory, is_active, is_default)').eq('product_id', product.id).order('display_order'),
        supabase.from('product_variants').select('*').eq('product_id', product.id).eq('is_active', true),
      ]);

      if (optRes.error) showError("Failed to load options.");
      if (varRes.error) showError("Failed to load variants.");
      setOptions(optRes.data || []);
      setVariants(varRes.data || []);
      setIsLoadingOptions(false);
    };
    fetchData();
  }, [product?.id]);

  const displayPrice = useMemo(() => {
    if (!product || product.price == null || !shopDetails) return null;
    return convertCurrency(product.price, product.currency, shopDetails.currency);
  }, [product?.price, product?.currency, convertCurrency, shopDetails]);

  // Precompute variants once (parse option values, effective stock, display
  // total) so search/filter keystrokes don't re-parse & re-convert everything.
  const processedVariants = useMemo(() => {
    if (!product) return [] as any[];
    return variants.map((v: any) => {
      const optVals = parseVariantOptionValues(v);
      // product_variants.inventory is the single source of truth.
      const effectiveStock = v.inventory || 0;
      const totalPriceALL = (product.price || 0) + (v.price_difference || 0);
      const displayTotal = convertCurrency(totalPriceALL, 'ALL', currencyCode);
      return { ...v, optVals, effectiveStock, displayTotal, stockTone: toStockTone(effectiveStock) };
    });
  }, [variants, product?.price, product?.currency, currencyCode, convertCurrency]);

  // Per-option-value derived stock + formatted price diff, memoized so option
  // chips don't run an O(values × variants) reduce on every render.
  const optionData = useMemo(() => {
    if (!product) return [] as any[];
    return options.map((option: any) => {
      const values = (option.option_values || []).map((val: any) => {
        const priceDiff = convertCurrency(val.price_difference, product.currency, currencyCode);
        const priceDiffFormatted = formatCurrency(priceDiff, currencyCode, 'en-US', true);
        const derivedStock = processedVariants.reduce(
          (sum: number, v: any) => (v.optVals[option.name] === val.value ? sum + (v.effectiveStock || 0) : sum),
          0,
        );
        return { ...val, priceDiff, priceDiffFormatted, derivedStock, stockTone: toStockTone(derivedStock) };
      });
      return { ...option, values };
    });
  }, [options, processedVariants, product?.currency, currencyCode, convertCurrency]);

  // Derive the filtered/sorted variant list separately (only recomputes on
  // search/filter/sort changes, not on every parent render).
  const filteredVariants = useMemo(() => {
    let list = processedVariants;
    if (varSearch) {
      const s = varSearch.toLowerCase();
      list = list.filter((v: any) => Object.values(v.optVals).join(' ').toLowerCase().includes(s) || (v.sku || '').toLowerCase().includes(s));
    }
    if (varFilter === 'oos') list = list.filter((v: any) => v.effectiveStock <= 0);
    else if (varFilter === 'low') list = list.filter((v: any) => v.effectiveStock > 0 && v.effectiveStock < 10);
    else if (varFilter === 'in_stock') list = list.filter((v: any) => v.effectiveStock > 0);
    list = [...list];
    if (varSort === 'stock_asc') list.sort((a: any, b: any) => a.effectiveStock - b.effectiveStock);
    else if (varSort === 'stock_desc') list.sort((a: any, b: any) => b.effectiveStock - a.effectiveStock);
    else if (varSort === 'price_asc') list.sort((a: any, b: any) => a.displayTotal - b.displayTotal);
    else if (varSort === 'price_desc') list.sort((a: any, b: any) => b.displayTotal - a.displayTotal);
    return list;
  }, [processedVariants, varSearch, varFilter, varSort]);

  const contentRef = useReveal<HTMLDivElement>({}, [isLoadingOptions]);

  if (!product) return null;

  const hasSpecs = specs && specs.length > 0;
  const hasOptions = options.length > 0;
  const hasVariants = variants.length > 0;

  return (
    <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 overflow-y-auto">
        {/* With variants present, wide screens split into two columns:
            media + details + specs on the left, the variants table on the
            right — so long variant lists don't push the specs off-screen. */}
        <div
          ref={contentRef}
          className={cn(
            'p-4 space-y-5',
            hasVariants && 'xl:grid xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] xl:items-start xl:gap-6 xl:space-y-0'
          )}
        >
          <div className="min-w-0 space-y-5">
          {/* Hero: Media + Core Info */}
          <div data-reveal className="grid grid-cols-1 md:grid-cols-10 gap-5">
            <div className="md:col-span-4">
              <Carousel className="w-full rounded-lg overflow-hidden">
                <CarouselContent>
                  {mediaItems.map((url: string, index: number) => (
                    <CarouselItem key={url || `media-${index}`}>
                      <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                        <MediaItem src={url} alt={`${product?.name ?? 'Product'} - ${index + 1}`} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {mediaItems.length > 1 && <><CarouselPrevious className="left-2" /><CarouselNext className="right-2" /></>}
              </Carousel>
            </div>
            <div className="md:col-span-6 flex flex-col gap-3">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{product.category || 'Uncategorized'}</span>
                {product.details?.type && <><ChevronRight className="h-3 w-3" /><span>{toTitleCase(product.details.type)}</span></>}
              </div>

              {/* Name + Status */}
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
                <StatusBadge tone={productStatusTone(product.status)} className="mt-1">{product.status}</StatusBadge>
              </div>

              {/* Price + Inventory */}
              <div className="flex items-baseline gap-4 pt-1">
                <span className="text-3xl font-bold">
                  {product.pricing_type === 'subscription'
                    ? `${formatCurrency(displayPrice, currencyCode)} / ${product.billing_interval}`
                    : formatCurrency(displayPrice, currencyCode)}
                </span>
                {product.pricing_type !== 'subscription' && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />{product.inventory || 0} in stock
                  </span>
                )}
              </div>

              {/* Description */}
              {product.caption && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.caption}</p>
              )}

              {/* Tags */}
              {product.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((t: string, i: number) => (
                    <Badge key={`${t}-${i}`} variant="outline" className="text-xs font-normal">
                      <Tag className="h-2.5 w-2.5 mr-1" />{t}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Options loading skeleton — keeps the panel's shape while data loads */}
              {isLoadingOptions && (
                <div className="space-y-2.5 pt-2 border-t">
                  <Skeleton className="h-3 w-16" />
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-16 rounded-md" />)}
                  </div>
                </div>
              )}

              {/* Options — stock derived from variants */}
              {!isLoadingOptions && hasOptions && (
                <div className="space-y-2.5 pt-2 border-t">
                  {optionData.map((option: any) => {
                    if (!option.values || option.values.length === 0) return null;
                    return (
                      <div key={option.id} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">{option.name}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {option.values.map((val: any) => (
                            <div
                              key={val.id}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors",
                                !val.is_active
                                  ? "bg-muted/50 text-muted-foreground border-border/50 opacity-50"
                                  : toneTint[val.stockTone as StatusTone],
                                val.is_default && "ring-1 ring-primary ring-offset-1"
                              )}
                            >
                              <span className="font-medium">{val.value}</span>
                              {val.priceDiff !== 0 && <span className="opacity-60">({val.priceDiffFormatted})</span>}
                              <span className="opacity-60 tabular-nums">{val.derivedStock}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Specifications */}
          {hasSpecs && (
            <div data-reveal>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4" />
                Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
                {specs!.map((spec: any, i: number) => (
                  <div key={spec.key || i} className={cn(
                    "flex justify-between py-2.5 text-sm border-b border-dashed",
                    i >= specs!.length - (specs!.length % 2 === 0 ? 2 : 1) && "border-b-0"
                  )}>
                    <span className="text-muted-foreground capitalize">{spec.key.replace(/_/g, ' ')}</span>
                    <span className="font-medium text-right">{spec.value}{spec.unit ? ` ${spec.unit}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="min-w-0 space-y-5">
          {/* Variants */}
          {hasVariants && (
            <div data-reveal>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Variants
                  <Badge variant="secondary" className="text-xs">{variants.length}</Badge>
                </h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setStockModalOpen(true)}>
                  <Package className="mr-1.5 h-3 w-3" />Manage Stock
                </Button>
              </div>

              {/* Search + Filter + Sort toolbar */}
              <div className="flex gap-1.5 mb-2">
                <SearchInput
                  value={varSearch}
                  onValueChange={setVarSearch}
                  placeholder="Search variants…"
                  containerClassName="h-7 flex-1"
                  className="text-xs"
                />
                <Select value={varFilter} onValueChange={(v) => setVarFilter(v as any)}>
                  <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="oos">OOS</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={varSort} onValueChange={(v) => setVarSort(v as any)}>
                  <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="stock_asc">Stock &uarr;</SelectItem>
                    <SelectItem value="stock_desc">Stock &darr;</SelectItem>
                    <SelectItem value="price_asc">Price &uarr;</SelectItem>
                    <SelectItem value="price_desc">Price &darr;</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Variant</span>
                  <span className="w-24 text-right">Price</span>
                  <span className="w-28 text-right">Stock</span>
                </div>
                <div className="max-h-[400px] xl:max-h-[62vh] overflow-y-auto">
                {filteredVariants.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No variants match your search</div>
                ) : filteredVariants.map((v: any, i: number) => {
                  const status = getStockStatus(v.effectiveStock);
                  const isOOS = status === 'out';
                  const isCritical = status === 'critical';
                  const isLow = status === 'low';
                  const stockTone: StatusTone = v.stockTone;
                  return (
                    <div key={v.id || i} className={cn(
                      "grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 items-center",
                      i % 2 === 0 ? "bg-card" : "bg-muted/20",
                      isOOS && "opacity-50"
                    )}>
                      <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                        {Object.entries(v.optVals).map(([optName, optVal]: [string, any]) => (
                          <span key={optName} className="inline-flex items-center text-xs">
                            <span className="text-muted-foreground/70 mr-1">{optName}:</span>
                            <span className="font-medium bg-muted/60 px-1.5 py-0.5 rounded">{String(optVal)}</span>
                          </span>
                        ))}
                        {v.sku && <span className="text-xs text-muted-foreground/40 ml-1">{v.sku}</span>}
                      </div>
                      <span className={cn("w-24 text-right text-sm font-medium tabular-nums", isOOS && "line-through")}>
                        {formatCurrency(v.displayTotal, currencyCode)}
                      </span>
                      <button onClick={() => setStockModalOpen(true)} className={cn(
                        "w-28 text-right text-xs font-medium flex items-center justify-end gap-1 rounded px-2 py-1 transition-colors cursor-pointer",
                        stockTone === "danger" ? "text-destructive bg-destructive/10 hover:bg-destructive/20" :
                        stockTone === "warning" ? "text-warning bg-warning/10 hover:bg-warning/20" :
                        "text-success bg-success/10 hover:bg-success/20"
                      )}>
                        <Package className="h-3 w-3" />
                        {isOOS ? 'OOS' : isCritical ? `${v.effectiveStock} critical` : isLow ? `${v.effectiveStock} low` : `${v.effectiveStock}`}
                      </button>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}

          {/* Variants loading skeleton — reserves the section's shape so content
              fades in without a layout jump. */}
          {isLoadingOptions && (
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <div className="rounded-lg border overflow-hidden divide-y">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </ScrollArea>
      {/* flex-col (not the DialogFooter default col-reverse) so the stacked
          mobile order is Reviews → Edit → Delete — destructive action last. */}
      <DialogFooter className="p-4 border-t flex-col gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => setReviewsOpen(true)} disabled={isSubmitting} className="mr-auto">
          <Star className="mr-2 h-4 w-4" />
          Reviews{ratingSummary && ratingSummary.count > 0 ? ` (${ratingSummary.count} · ★ ${ratingSummary.avg.toFixed(1)})` : ''}
        </Button>
        <Button variant="outline" onClick={onEdit} disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" />Edit</Button>
        <Button variant="destructive" onClick={onDelete} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      </DialogFooter>

      <ProductReviewsManager open={reviewsOpen} onOpenChange={setReviewsOpen} productId={product.id} productName={product.name} />

      {/* Stock Management Modal */}
      <Dialog open={stockModalOpen} onOpenChange={(open) => { if (!open) { setStockSearch(''); setStockFilter('all'); } setStockModalOpen(open); }}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Manage Variant Stock
              <Badge variant="secondary" className="text-xs ml-auto">{variants.length} variants</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Search + Filter */}
          <div className="flex gap-2 shrink-0">
            <SearchInput
              value={stockSearch}
              onValueChange={setStockSearch}
              placeholder="Search variants…"
              containerClassName="h-8 flex-1"
              className="text-xs"
            />
            <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as any)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <Filter className="h-3 w-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low">Low (&lt;10)</SelectItem>
                <SelectItem value="oos">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-1">
              {variants.filter((v: any) => {
                // Search filter
                const optVals = v.option_values || {};
                const searchStr = Object.values(optVals).join(' ').toLowerCase() + ' ' + (v.sku || '').toLowerCase();
                if (stockSearch && !searchStr.includes(stockSearch.toLowerCase())) return false;
                // Stock filter
                const s = stockEdits[v.id] ?? (v.inventory || 0);
                if (stockFilter === 'oos' && s > 0) return false;
                if (stockFilter === 'low' && (s >= 10 || s <= 0)) return false;
                if (stockFilter === 'in_stock' && s <= 0) return false;
                return true;
              }).map((v: any, i: number) => {
                let optVals = v.option_values || {};
                if (Object.keys(optVals).length === 0 && v.combination_key) {
                  v.combination_key.split('|').forEach((part: string) => {
                    const [key, val] = part.split('=');
                    if (key && val) optVals[key] = val;
                  });
                }
                const currentStock = stockEdits[v.id] ?? (v.inventory || 0);
                const status = getStockStatus(currentStock);
                const isOOS = status === 'out';
                const isCritical = status === 'critical';
                const isLow = status === 'low';
                const stockTone: StatusTone = (isOOS || isCritical) ? "danger" : isLow ? "warning" : "success";
                return (
                  <div key={v.id || i} className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg",
                    i % 2 === 0 ? "bg-muted/30" : ""
                  )}>
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {Object.entries(optVals).map(([k, val]) => (
                        <span key={k} className="text-xs">
                          <span className="text-muted-foreground/60">{k}: </span>
                          <span className="font-medium">{String(val)}</span>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon" className="h-6 w-6 text-xs"
                        onClick={() => setStockEdits(prev => ({ ...prev, [v.id]: Math.max(0, currentStock - 1) }))}
                      >-</Button>
                      <Input type="number" min={0} value={currentStock}
                        onChange={(e) => setStockEdits(prev => ({ ...prev, [v.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="h-6 w-14 text-center text-xs tabular-nums"
                      />
                      <Button type="button" variant="outline" size="icon" className="h-6 w-6 text-xs"
                        onClick={() => setStockEdits(prev => ({ ...prev, [v.id]: currentStock + 1 }))}
                      >+</Button>
                    </div>
                    <span className={cn(
                      "text-xs w-12 text-right font-medium",
                      toneText[stockTone]
                    )}>
                      {isOOS ? 'OOS' : currentStock}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-3 border-t flex items-center">
            <span className="text-xs text-muted-foreground mr-auto">
              {Object.keys(stockEdits).length > 0 ? `${Object.keys(stockEdits).length} changed` : 'No changes'}
            </span>
            <Button variant="outline" size="sm" onClick={() => { setStockEdits({}); setStockModalOpen(false); }}>Cancel</Button>
            <Button size="sm"
              disabled={isSavingStock || Object.keys(stockEdits).length === 0}
              onClick={async () => {
                setIsSavingStock(true);
                try {
                  const updates = Object.entries(stockEdits).map(([id, inventory]) =>
                    supabase.from('product_variants').update({ inventory }).eq('id', id)
                  );
                  await Promise.all(updates);
                  // Compute the post-edit variant set so we can sync derived stock.
                  const nextVariants = variants.map(v => stockEdits[v.id] !== undefined ? { ...v, inventory: stockEdits[v.id] } : v);
                  // Sync option_values.inventory (derived sum per value) and the
                  // product's base inventory/status — mirroring VariantsManager's
                  // save — so option chips, the products list, and the storefront
                  // all agree without requiring a full variant save.
                  await syncDerivedStockFromVariants(product.id, nextVariants);
                  setVariants(nextVariants);
                  setStockEdits({});
                  setStockModalOpen(false);
                } catch (e: any) {
                  showError('Failed to update stock: ' + (e.message || e));
                }
                setIsSavingStock(false);
              }}
            >
              {isSavingStock ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
