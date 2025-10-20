import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Package, DollarSign, XCircle, Settings } from "lucide-react";
import { DialogFooter } from "../ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { MediaItem } from "../MediaItem";
import { useMemo } from "react";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { cn } from "@/lib/utils";

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
    
    // CRITICAL FIX: Ensure product is defined before accessing properties
    if (!product) {
        console.log("ProductViewMode: Rendering null because product is null.");
        return null;
    }
    console.log("ProductViewMode: Rendering for product:", product.id);

    // Convert product price from its stored currency (now always ALL) to the shop's display currency
    const displayBasePrice = useMemo(() => {
        if (product.price == null || !shopDetails) return null;
        // product.price is the calculated lowest final price stored in ALL
        const converted = convertCurrency(product.price, product.currency, shopDetails.currency);
        return converted;
    }, [product.price, product.currency, convertCurrency, shopDetails]);

    // Extract options (new additive model)
    const options = product.details?.options || [];
    const hasOptions = options.length > 0;
    const currencyCode = shopDetails?.currency || 'USD';

    // Filter out options and variants from general details to get specifications
    const specifications = useMemo(() => {
        const reservedKeys = new Set(['type', 'options', 'variants']);
        return Object.entries(product.details || {})
            .filter(([key]) => !reservedKeys.has(key))
            .map(([key, value]) => ({ name: key, value }));
    }, [product.details]);

    // Calculate price range based on additive options
    const { minPrice, maxPrice } = useMemo(() => {
        if (!hasOptions || displayBasePrice === null) return { minPrice: displayBasePrice, maxPrice: displayBasePrice };

        const base = displayBasePrice;
        
        // Calculate min/max total adjustment
        const minAdjustment = options.reduce((min, opt: any) => {
            if (opt.values.length === 0) return min;
            const minDiff = Math.min(...opt.values.map((v: any) => v.priceDifference));
            return min + minDiff;
        }, 0);

        const maxAdjustment = options.reduce((max, opt: any) => {
            if (opt.values.length === 0) return max;
            const maxDiff = Math.max(...opt.values.map((v: any) => v.priceDifference));
            return max + maxDiff;
        }, 0);

        return {
            minPrice: base + minAdjustment,
            maxPrice: base + maxAdjustment,
        };
    }, [hasOptions, options, displayBasePrice]);

    // Inventory is always the base inventory from the product record
    const totalInventory = product.inventory || 0;

    return (
      <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
              <div className="md:col-span-4">
                <Carousel className="w-full rounded-lg overflow-hidden group">
                  <CarouselContent>
                    {mediaItems.map((url: string, index: number) => (
                      <CarouselItem key={index}>
                        <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                          <MediaItem src={url} alt={`${product.name} - image ${index + 1}`} />
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
                    {product.tags.map((t: string, i: number) => <Badge key={i} variant="secondary">{t}</Badge>)}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <Label className="text-sm">Price</Label>
                    <p className="font-semibold text-2xl">
                      {hasOptions && minPrice !== maxPrice ? (
                          `${formatCurrency(minPrice, currencyCode)} - ${formatCurrency(maxPrice, currencyCode)}`
                      ) : (
                          formatCurrency(displayBasePrice, currencyCode)
                      )}
                      {product.pricing_type === 'subscription' && (
                        <span className="text-sm font-light text-muted-foreground">/{product.billing_interval}</span>
                      )}
                    </p>
                    {hasOptions && <p className="text-xs text-muted-foreground">Price range based on options.</p>}
                  </div>
                  {product.pricing_type !== 'subscription' && (
                    <div>
                      <Label className="text-sm">Inventory</Label>
                      <p className="font-semibold text-2xl">{totalInventory}</p>
                      <p className="text-xs text-muted-foreground">Total stock available.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Options Display */}
            {hasOptions && (
                <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Customer Options
                        </CardTitleComponent>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {options.map((option: any) => (
                            <div key={option.id} className="space-y-2">
                                <Label className="font-semibold capitalize">{option.name}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {option.values.map((value: any) => (
                                        <Badge key={value.value} variant="outline" className="text-sm">
                                            {value.value}
                                            {value.priceDifference !== 0 && (
                                                <span className={cn("ml-1 font-mono text-xs", value.priceDifference > 0 ? "text-emerald-600" : "text-destructive")}>
                                                    ({formatCurrency(value.priceDifference, currencyCode, 'en-US', true)})
                                                </span>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

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
          </div>
        </ScrollArea>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onEdit} disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="destructive" onClick={onDelete} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
        </DialogFooter>
      </motion.div>
    );
};