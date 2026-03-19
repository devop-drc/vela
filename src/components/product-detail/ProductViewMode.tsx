import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Package, Settings, Loader2, Wrench, Layers, Tag, ChevronRight } from "lucide-react";
import { DialogFooter } from "../ui/dialog";
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

              {/* Options with typed badges */}
              {!isLoadingOptions && hasOptions && (
                <div className="space-y-3 pt-2 border-t">
                  {options.map((option: any) => {
                    const values = (option.option_values || []);
                    if (values.length === 0) return null;
                    return (
                      <div key={option.id} className="space-y-2">
                        <Label className="font-semibold capitalize text-sm">{option.name}</Label>
                        <div className="flex flex-wrap gap-2">
                          {values.map((val: any) => {
                            const priceDiff = convertCurrency(val.price_difference, product.currency, currencyCode);
                            const priceDiffFormatted = formatCurrency(priceDiff, currencyCode, 'en-US', true);
                            const isActive = val.is_active;
                            const isOOS = val.inventory <= 0;
                            return (
                              <div
                                key={val.id}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                                  isActive
                                    ? (isOOS
                                        ? "bg-slate-100 text-slate-800 border-slate-300"
                                        : "bg-emerald-100 text-emerald-800 border-emerald-300")
                                    : "bg-gray-100 text-gray-500 border-gray-300",
                                  val.is_default && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                )}
                              >
                                <span className="flex items-center gap-1">
                                  {val.value}
                                  {val.is_default && <span className="text-xs font-normal text-primary">(Default)</span>}
                                </span>
                                {priceDiff !== 0 && <span className="text-xs font-normal opacity-70">({priceDiffFormatted})</span>}
                                <span className="text-xs font-normal opacity-70 flex items-center gap-0.5">
                                  <Package className="h-3 w-3" />{val.inventory}
                                </span>
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
          {hasVariants && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4" />
                Variants
                <Badge variant="secondary" className="text-[10px] ml-1">{variants.length}</Badge>
              </h3>
              <div className="space-y-2">
                {variants.slice(0, 16).map((v: any) => {
                  // Use option_values JSONB, or parse from combination_key as fallback
                  let optVals = v.option_values || {};
                  if (Object.keys(optVals).length === 0 && v.combination_key) {
                    // Parse "Color=Red|Size=M" format
                    v.combination_key.split('|').forEach((part: string) => {
                      const [key, val] = part.split('=');
                      if (key && val) optVals[key] = val;
                    });
                  }
                  const totalPriceALL = (product.price || 0) + (v.price_difference || 0);
                  const displayTotal = convertCurrency(totalPriceALL, 'ALL', currencyCode);
                  const isOOS = v.inventory <= 0;
                  return (
                    <div key={v.id} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border",
                      isOOS ? "bg-muted/30 opacity-60" : "bg-card"
                    )}>
                      {/* Option badges with type labels */}
                      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                        {Object.entries(optVals).map(([optName, optVal]) => (
                          <Badge key={optName} variant="outline" className="text-xs font-normal gap-1">
                            <span className="text-muted-foreground">{optName}:</span>
                            <span className="font-medium">{String(optVal)}</span>
                          </Badge>
                        ))}
                      </div>
                      {/* Price */}
                      <span className={cn("text-sm font-semibold whitespace-nowrap", isOOS && "line-through")}>
                        {formatCurrency(displayTotal, currencyCode)}
                      </span>
                      {/* Stock */}
                      <span className={cn(
                        "text-xs whitespace-nowrap flex items-center gap-1",
                        isOOS ? "text-destructive" : v.inventory <= 5 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        <Package className="h-3 w-3" />
                        {isOOS ? 'Out of stock' : `${v.inventory} in stock`}
                      </span>
                      {/* SKU */}
                      {v.sku && <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap hidden sm:block">{v.sku}</span>}
                    </div>
                  );
                })}
                {variants.length > 16 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{variants.length - 16} more variants
                  </p>
                )}
              </div>
            </div>
          )}

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
    </motion.div>
  );
};
