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

              {/* Quick Options Preview (inline, like a real product page) */}
              {!isLoadingOptions && hasOptions && (
                <div className="space-y-3 pt-2 border-t">
                  {options.map((option: any) => {
                    const values = (option.option_values || []).filter((v: any) => v.is_active);
                    if (values.length === 0) return null;
                    return (
                      <div key={option.id}>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">{option.name}</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {values.map((val: any) => {
                            const priceDiff = convertCurrency(val.price_difference, product.currency, currencyCode);
                            return (
                              <div
                                key={val.id}
                                className={cn(
                                  "px-3 py-1.5 rounded-md text-sm border transition-colors",
                                  val.is_default
                                    ? "bg-primary/10 border-primary text-primary font-medium"
                                    : val.inventory <= 0
                                      ? "bg-muted/50 border-border text-muted-foreground line-through"
                                      : "bg-card border-border hover:border-primary/50"
                                )}
                              >
                                <span>{val.value}</span>
                                {priceDiff !== 0 && (
                                  <span className="text-[10px] ml-1 opacity-70">
                                    {priceDiff > 0 ? '+' : ''}{formatCurrency(priceDiff, currencyCode)}
                                  </span>
                                )}
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

          {/* Variants Summary */}
          {hasVariants && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4" />
                Variants
                <Badge variant="secondary" className="text-[10px] ml-1">{variants.length}</Badge>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {variants.slice(0, 12).map((v: any) => {
                  const optVals = v.option_values || {};
                  const totalPriceALL = (product.price || 0) + (v.price_difference || 0);
                  const displayTotal = convertCurrency(totalPriceALL, 'ALL', currencyCode);
                  return (
                    <div key={v.id} className="p-2.5 rounded-lg border bg-card text-xs space-y-1">
                      <div className="font-medium truncate">
                        {Object.values(optVals).join(' / ')}
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{formatCurrency(displayTotal, currencyCode)}</span>
                        <span className="flex items-center gap-0.5">
                          <Package className="h-2.5 w-2.5" />{v.inventory}
                        </span>
                      </div>
                      {v.sku && <div className="text-[10px] text-muted-foreground/60 truncate">{v.sku}</div>}
                    </div>
                  );
                })}
                {variants.length > 12 && (
                  <div className="p-2.5 rounded-lg border border-dashed bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                    +{variants.length - 12} more
                  </div>
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
