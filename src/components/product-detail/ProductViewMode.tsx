import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Edit, Trash2 } from "lucide-react";
import { DialogFooter } from "../ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { MediaItem } from "../MediaItem";
import { useEffect, useState, useMemo } from "react"; // Import useMemo
import { supabase } from "@/integrations/supabase/client";
import { getAttributeIcon } from "@/lib/attributeIcons";

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

export const ProductViewMode = ({ product, mediaItems, onEdit, onDelete, isSubmitting }: any) => {
    const { shopDetails, convertCurrency } = useShop();
    const [attributes, setAttributes] = useState<any[]>([]);
    
    // Convert product price from its stored currency (now always ALL) to the shop's display currency
    const displayPrice = useMemo(() => {
        if (product.price == null || !shopDetails) return null; // Ensure shopDetails is available
        const converted = convertCurrency(product.price, product.currency, shopDetails.currency);
        return converted;
    }, [product.price, product.currency, convertCurrency, shopDetails]); // Add shopDetails to dependencies

    useEffect(() => {
      const fetchAttributes = async () => {
        if (!product.category || !product.details?.type) {
          setAttributes([]);
          return;
        }
        const { data: categoryData } = await supabase.from('categories').select('id').eq('name', product.category).single();
        if (categoryData) {
          const { data: typeData } = await supabase.from('types').select('attributes').eq('category_id', categoryData.id).eq('name', product.details.type).single();
          setAttributes(typeData?.attributes || []);
        } else {
          setAttributes([]);
        }
      };
      fetchAttributes();
    }, [product.category, product.details?.type]);
    
    const allDetails = attributes.filter(attr => {
        const value = product.details?.[attr.name];
        return value && (!Array.isArray(value) || value.length > 0);
    });

    const options = allDetails.filter(f => f.isOption);
    const specifications = allDetails.filter(f => !f.isOption);

    return (
      <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
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
                    {product.details?.type && <span> &middot; {product.details.type}</span>}
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
                  <div><Label className="text-sm">Price</Label><p className="font-semibold text-2xl">{product.pricing_type === 'subscription' ? `${formatCurrency(displayPrice, shopDetails?.currency)} / ${product.billing_interval}` : formatCurrency(displayPrice, shopDetails?.currency)}</p></div>
                  {product.pricing_type !== 'subscription' && (<div><Label className="text-sm">Inventory</Label><p className="font-semibold text-2xl">{product.inventory || 0}</p></div>)}
                </div>
              </div>
            </div>

            {(options.length > 0 || specifications.length > 0) && (
              <Card>
                <CardHeader><CardTitleComponent className="text-base">Options & Specifications</CardTitleComponent></CardHeader>
                <CardContent className="p-4 space-y-4">
                  {options.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold mb-3">Options & Variants</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                        {options.map(field => {
                          const value = product.details?.[field.name];
                          const Icon = getAttributeIcon(field.name);
                          return (
                            <DetailDisplayRow key={field.name} label={field.label || field.name.replace(/_/g, ' ')} icon={Icon}>
                              {Array.isArray(value) ? (
                                value.map(item => <Badge key={item} variant="outline">{item}</Badge>)
                              ) : (
                                <p className="text-base">{value}</p>
                              )}
                            </DetailDisplayRow>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {options.length > 0 && specifications.length > 0 && <hr />}
                  {specifications.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold mb-3">Specifications</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                        {specifications.map(field => {
                           const Icon = getAttributeIcon(field.name);
                           return (
                            <DetailDisplayRow key={field.name} label={field.label || field.name.replace(/_/g, ' ')} icon={Icon}>
                                <p className="text-base">{Array.isArray(product.details?.[field.name]) ? product.details?.[field.name].join(', ') : product.details?.[field.name]}</p>
                            </DetailDisplayRow>
                           )
                        })}
                      </div>
                    </div>
                  )}
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