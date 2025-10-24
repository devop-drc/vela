import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Package, Banknote, XCircle, Settings, CheckCircle, Archive, Minus, Plus, Eye, Loader2 } from "lucide-react";
import { DialogFooter } from "../ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { MediaItem } from "../MediaItem";
import { useMemo, useCallback, useState, useEffect } from "react";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

const DetailDisplayRow = ({ label, icon: Icon, children }: { label: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Label>
        <div className="font-medium flex flex-wrap items-center gap-1.5 text-base pt-1">
            {children}
        </div>
    </div>
);

// Helper to convert snake_case to Title Case for display
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const ProductViewMode = ({ product, mediaItems, onEdit, onDelete, isSubmitting }: any) => {
    const { shopDetails, convertCurrency } = useShop();
    const [options, setOptions] = useState<any[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);

    const currencyCode = shopDetails?.currency || 'USD';

    // Fetch options and values
    useEffect(() => {
        const fetchOptions = async () => {
            setIsLoadingOptions(true);
            if (!product?.id) {
                setOptions([]);
                setIsLoadingOptions(false);
                return;
            }
            const { data, error } = await supabase
                .from('product_options')
                .select(`
                    id,
                    name,
                    option_values (
                        id,
                        value,
                        price_difference,
                        inventory,
                        is_active,
                        is_default
                    )
                `)
                .eq('product_id', product.id)
                .order('display_order');

            if (error) {
                showError("Failed to load product options for view.");
                console.error("Error fetching product options for view:", error);
                setOptions([]);
            } else {
                setOptions(data || []);
            }
            setIsLoadingOptions(false);
        };
        fetchOptions();
    }, [product?.id]);


    // Convert product price from its stored currency (now always ALL) to the shop's display currency
    const displayPrice = useMemo(() => {
        if (!product || product.price == null || !shopDetails) return null;
        // Use product.currency as source (which is 'ALL' after refactor)
        const converted = convertCurrency(product.price, product.currency, shopDetails.currency);
        return converted;
    }, [product?.price, product?.currency, convertCurrency, shopDetails]);

    // Filter details into specifications (excluding options_v2 which is now deprecated)
    const specifications = useMemo(() => {
        const reservedKeys = new Set(['type', 'options_v2', 'options', 'variants']); 
        return Object.entries(product?.details || {})
            .filter(([key]) => !reservedKeys.has(key))
            .map(([key, value]) => ({ name: key, value }));
    }, [product?.details]);

    // After hooks: if product is not available, render nothing
    if (!product) return null;

    return (
      <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
              <div className="md:col-span-4">
                <Carousel className="w-full rounded-lg overflow-hidden group">
                  <CarouselContent>
                    {mediaItems.map((url: string, index: number) => (
                      <CarouselItem key={url || `media-${index}`}>
                        <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                          <MediaItem src={url} alt={`${product?.name ?? 'Product'} - image ${index + 1}`} />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {mediaItems.length > 1 && <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>}
                </Carousel>
              </div>
              <div className="md:col-span-6 flex flex-col space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    <span>{product.category || 'Uncategorized'}</span>
                    {product.details?.type && <span> &middot; {toTitleCase(product.details.type)}</span>}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 mt-1">
                    {product.name}
                    <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>{product.status}</Badge>
                  </h1>
                </div>
                <p className="text-base text-muted-foreground flex-1">{product.caption || 'No description provided.'}</p>
                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((t: string, i: number) => <Badge key={`${t}-${i}`} variant="secondary">{t}</Badge>)}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-sm">Base Price</Label>
                    <p className="font-semibold text-2xl">
                      {product.pricing_type === 'subscription' 
                        ? `${formatCurrency(displayPrice, currencyCode)} / ${product.billing_interval}` 
                        : formatCurrency(displayPrice, currencyCode)}
                    </p>
                  </div>
                  {product.pricing_type !== 'subscription' && (
                    <div>
                      <Label className="text-sm">Base Inventory</Label>
                      <p className="font-semibold text-2xl">{product.inventory || 0}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Specifications (Fixed Details) */}
            {specifications.length > 0 && (
              <Card>
                <CardHeader><CardTitleComponent className="text-base">Specifications</CardTitleComponent></CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    {specifications.map(field => {
                        const Icon = getAttributeIcon(field.name);
                        return (
                            <DetailDisplayRow key={field.name} label={toTitleCase(field.name)} icon={Icon}>
                                <p className="text-base">{Array.isArray(field.value) ? field.value.join(', ') : String(field.value)}</p>
                            </DetailDisplayRow>
                        );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Options V2 Display (Now using new tables) */}
            {isLoadingOptions ? (
                <Card><CardHeader><CardTitleComponent className="text-base">Customer Options</CardTitleComponent></CardHeader><CardContent className="p-4"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>
            ) : options.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Customer Options
                        </CardTitleComponent>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {options.map((option: any) => (
                            <div key={option.id} className="space-y-2 border-b pb-3 last:border-b-0 last:pb-0">
                                <Label className="font-semibold capitalize text-base">{option.name}</Label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {(option.option_values || []).map((val: any) => {
                                        // CRITICAL FIX: Use product.currency as source for conversion
                                        const priceDiff = convertCurrency(val.price_difference, product.currency, currencyCode); 
                                        const priceDiffFormatted = formatCurrency(priceDiff, currencyCode, 'en-US', true);
                                        const isActive = val.is_active;
                                        const isOOS = val.inventory <= 0;
                                        
                                        return (
                                            <div 
                                                key={val.id} 
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors",
                                                    // Determine base color based on active/stock status
                                                    isActive 
                                                        ? (isOOS 
                                                            ? "bg-slate-100 text-slate-800 border border-slate-300"
                                                            : "bg-emerald-100 text-emerald-800 border border-emerald-300")
                                                        : "bg-gray-100 text-gray-600 border border-gray-300",
                                                    val.is_default && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                                )}
                                                title={val.is_default ? "Default Selection" : undefined}
                                            >
                                                {/* Value Name */}
                                                <span className="flex items-center gap-1">
                                                    {val.value}
                                                    {val.is_default && (
                                                        <span className="text-xs font-normal opacity-80 ml-1 text-primary">
                                                            (Default)
                                                        </span>
                                                    )}
                                                </span>
                                                
                                                {/* Price Diff */}
                                                {priceDiff !== 0 && (
                                                    <span className="text-xs font-normal opacity-80">
                                                        ({priceDiffFormatted})
                                                    </span>
                                                )}
                                                
                                                {/* Inventory */}
                                                <span className="text-xs font-normal opacity-80 flex items-center gap-1">
                                                    <Package className="h-3 w-3" />
                                                    {val.inventory}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
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