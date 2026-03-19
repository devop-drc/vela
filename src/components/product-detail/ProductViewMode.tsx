import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Package, Settings, Loader2, Wrench, Layers, Tag, ChevronRight, Save, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { MediaItem } from "../MediaItem";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const ProductViewMode = ({ product, mediaItems, onEdit, onDelete, isSubmitting, specs }: { product: any; mediaItems: any[]; onEdit: () => void; onDelete: () => void; isSubmitting: boolean; specs?: any[] }) => {
  const { shopDetails, convertCurrency } = useShop();
  const [options, setOptions] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [stockModalOpen, setStockModalOpen] = useState(false);
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

  if (!product) return null;

  const hasSpecs = specs && specs.length > 0;
  const hasOptions = options.length > 0;
  const hasVariants = variants.length > 0;

  return (
    <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Hero: Media + Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-10 gap-5">
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
                <Badge variant={product.status === 'Active' ? 'default' : 'secondary'} className="mt-1">{product.status}</Badge>
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

              {/* Options — stock derived from variants */}
              {!isLoadingOptions && hasOptions && (
                <div className="space-y-2.5 pt-2 border-t">
                  {options.map((option: any) => {
                    const values = (option.option_values || []);
                    if (values.length === 0) return null;
                    return (
                      <div key={option.id} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">{option.name}</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {values.map((val: any) => {
                            const priceDiff = convertCurrency(val.price_difference, product.currency, currencyCode);
                            const priceDiffFormatted = formatCurrency(priceDiff, currencyCode, 'en-US', true);
                            const isActive = val.is_active;
                            // Derive stock from variants: sum inventory of all variants containing this option value
                            const derivedStock = variants.reduce((sum: number, v: any) => {
                              const vOpts = v.option_values || {};
                              if (Object.keys(vOpts).length === 0 && v.combination_key) {
                                v.combination_key.split('|').forEach((p: string) => { const [k, vl] = p.split('='); if (k && vl) vOpts[k] = vl; });
                              }
                              return vOpts[option.name] === val.value ? sum + (v.inventory || 0) : sum;
                            }, 0);
                            const stock = derivedStock;
                            const isOOS = stock <= 0;
                            const isCritical = stock > 0 && stock < 5;
                            const isLow = stock >= 5 && stock < 10;
                            return (
                              <div
                                key={val.id}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors",
                                  !isActive
                                    ? "bg-muted/50 text-muted-foreground border-border/50 opacity-50"
                                    : isOOS
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : isCritical
                                        ? "bg-red-50 text-red-600 border-red-200"
                                        : isLow
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200",
                                  val.is_default && "ring-1 ring-primary ring-offset-1"
                                )}
                              >
                                <span className="font-medium">{val.value}</span>
                                {priceDiff !== 0 && <span className="opacity-60">({priceDiffFormatted})</span>}
                                <span className="opacity-60 tabular-nums">{stock}</span>
                              </div>
                            );
                          })}
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
            <div>
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

          {/* Variants */}
          {hasVariants && (() => {
            // Preprocess variants with parsed optVals and effectiveStock
            const processedVariants = variants.map((v: any) => {
              let optVals = { ...(v.option_values || {}) };
              if (Object.keys(optVals).length === 0 && v.combination_key) {
                v.combination_key.split('|').forEach((part: string) => { const [key, val] = part.split('='); if (key && val) optVals[key] = val; });
              }
              let effectiveStock = v.inventory || 0;
              if (effectiveStock === 0 && Object.keys(optVals).length > 0) {
                let minStock = Infinity;
                Object.entries(optVals).forEach(([optName, optVal]) => {
                  const opt = options.find((o: any) => o.name === optName);
                  const ov = opt?.option_values?.find((x: any) => x.value === optVal);
                  if (ov) minStock = Math.min(minStock, ov.inventory || 0);
                });
                if (isFinite(minStock)) effectiveStock = minStock;
              }
              const totalPriceALL = (product.price || 0) + (v.price_difference || 0);
              const displayTotal = convertCurrency(totalPriceALL, 'ALL', currencyCode);
              return { ...v, optVals, effectiveStock, displayTotal };
            });

            // Filter
            let filtered = processedVariants;
            if (varSearch) {
              const s = varSearch.toLowerCase();
              filtered = filtered.filter(v => Object.values(v.optVals).join(' ').toLowerCase().includes(s) || (v.sku || '').toLowerCase().includes(s));
            }
            if (varFilter === 'oos') filtered = filtered.filter(v => v.effectiveStock <= 0);
            else if (varFilter === 'low') filtered = filtered.filter(v => v.effectiveStock > 0 && v.effectiveStock < 10);
            else if (varFilter === 'in_stock') filtered = filtered.filter(v => v.effectiveStock > 0);

            // Sort
            if (varSort === 'stock_asc') filtered.sort((a, b) => a.effectiveStock - b.effectiveStock);
            else if (varSort === 'stock_desc') filtered.sort((a, b) => b.effectiveStock - a.effectiveStock);
            else if (varSort === 'price_asc') filtered.sort((a, b) => a.displayTotal - b.displayTotal);
            else if (varSort === 'price_desc') filtered.sort((a, b) => b.displayTotal - a.displayTotal);

            return (
            <div>
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
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input placeholder="Search..." value={varSearch} onChange={(e) => setVarSearch(e.target.value)} className="h-7 pl-7 text-xs" />
                </div>
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
                <div className="max-h-[400px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No variants match your search</div>
                ) : filtered.map((v: any, i: number) => {
                  const isOOS = v.effectiveStock <= 0;
                  const isCritical = v.effectiveStock > 0 && v.effectiveStock < 5;
                  const isLow = v.effectiveStock >= 5 && v.effectiveStock < 10;
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
                        isOOS ? "text-red-700 bg-red-50 hover:bg-red-100" :
                        isCritical ? "text-red-600 bg-red-50 hover:bg-red-100" :
                        isLow ? "text-amber-600 bg-amber-50 hover:bg-amber-100" :
                        "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
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
            );
          })()}

          {/* Loading state */}
          {isLoadingOptions && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </ScrollArea>
      <DialogFooter className="p-4 border-t">
        <Button variant="outline" onClick={onEdit} disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" />Edit</Button>
        <Button variant="destructive" onClick={onDelete} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
      </DialogFooter>

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
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search variants..." value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
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
                const isOOS = currentStock <= 0;
                const isCritical = currentStock > 0 && currentStock < 5;
                const isLow = currentStock >= 5 && currentStock < 10;
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
                      isOOS ? "text-red-600" : isCritical ? "text-red-500" : isLow ? "text-amber-600" : "text-emerald-600"
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
                  setVariants(prev => prev.map(v => stockEdits[v.id] !== undefined ? { ...v, inventory: stockEdits[v.id] } : v));
                  setStockEdits({});
                  setStockModalOpen(false);
                } catch (e: any) {
                  showError('Failed to update stock: ' + (e.message || e));
                }
                setIsSavingStock(false);
              }}
            >
              {isSavingStock ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
