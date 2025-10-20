import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Package, DollarSign, XCircle, Settings, CheckCircle, Archive, Minus, Plus } from "lucide-react";
import { DialogFooter } from "../ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { MediaItem } from "../MediaItem";
import { useMemo } from "react";
import { getAttributeIcon } from "@/lib/attributeIcons";
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
    
    // CRITICAL FIX: Handle null product early to prevent crash
    if (!product) return null;

    const currencyCode = shopDetails?.currency || 'USD';

    // Convert product price from its stored currency (now always ALL) to the shop's display currency
    const displayPrice = useMemo(() => {
        if (product.price == null || !shopDetails) return null;
        const converted = convertCurrency(product.price, product.currency, shopDetails.currency);
        return converted;
    }, [product.price, product.currency, convertCurrency, shopDetails]);

    // Filter details into options (multi-value attributes) and specifications (single-value attributes)
    const allDetails = useMemo(() => {
        const reservedKeys = new Set(['type', 'options_v2']);
        return Object.entries(product.details || {})
            .filter(([key]) => !reservedKeys.has(key))
            .map(([key, value]) => ({ name: key, value, isOption: Array.isArray(value) }));
    }, [product.details]);

    // Options are now read from options_v2
    const optionsV2 = product.details?.options_v2 || [];
    const specifications = allDetails.filter(d => !d.isOption);

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

            {/* Options V2 Display */}
            {optionsV2.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitleComponent className="text-base flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Customer Options
                        </CardTitleComponent>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {optionsV2.map((option: any) => (
                            <div key={option.name} className="space-y-2 border-b pb-3 last:border-b-0 last:pb-0">
                                <Label className="font-semibold capitalize text-base">{option.name}</Label>
                                <div className="space-y-1">
                                    {option.values.map((val: any) => {
                                        const priceDiff = convertCurrency(val.price_difference, 'ALL', currencyCode);
                                        return (
                                            <div key={val.value} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className={cn("text-sm", val.is_active ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-gray-100 text-gray-600 border-gray-300")}>
                                                        {val.is_active ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                                        {val.value}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <DollarSign className="h-3 w-3" />
                                                        <span>{formatCurrency(priceDiff, currencyCode, 'en-US', true)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Package className="h-3 w-3" />
                                                        <span>{val.inventory} in stock</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
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