import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Edit, Trash2 } from "lucide-react";
import { getCategoryAndType } from "@/lib/productTypes";
import { DialogFooter } from "../ui/dialog";

const DetailDisplayRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <div className="font-medium flex flex-wrap items-center gap-1.5 text-base">
            {children}
        </div>
    </div>
);

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
        return `${currency} ${amount.toFixed(2)}`;
    }
}

export const ProductViewMode = ({ product, mediaItems, onEdit, onDelete, isSubmitting }: any) => {
    const { category, type } = getCategoryAndType(product.category, product.details?.type);
    const optionFieldNames = ['sizes', 'colors', 'framed'];
    
    const allDetails = type?.fields.filter(field => {
        const value = product.details?.[field.name];
        return value && (!Array.isArray(value) || value.length > 0);
    }) || [];

    const options = allDetails.filter(f => optionFieldNames.includes(f.name));
    const specifications = allDetails.filter(f => !optionFieldNames.includes(f.name));

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
                          <img src={url} alt={`${product.name} - image ${index + 1}`} className="object-cover w-full h-full" />
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
                    <span>{category?.label || 'Uncategorized'}</span>
                    {type && <span> &middot; {type.label}</span>}
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
                  <div><Label className="text-sm">Price</Label><p className="font-semibold text-2xl">{product.pricing_type === 'subscription' ? `${formatCurrency(product.price || 0, product.currency || 'USD')} / ${product.billing_interval}` : formatCurrency(product.price || 0, product.currency || 'USD')}</p></div>
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
                          return (
                            <DetailDisplayRow key={field.name} label={field.label}>
                              {field.name === 'colors' && Array.isArray(value) ? (
                                value.map(color => <div key={color} title={color} className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: color }} />)
                              ) : field.name === 'sizes' && Array.isArray(value) ? (
                                value.map(size => <Badge key={size} variant="outline" className="px-1.5 py-0.5 text-sm font-mono">{size}</Badge>)
                              ) : (
                                <p className="text-base">{Array.isArray(value) ? value.join(', ') : value}</p>
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
                        {specifications.map(field => (
                          <DetailDisplayRow key={field.name} label={field.label}>
                            <p className="text-base">{product.details?.[field.name]}</p>
                          </DetailDisplayRow>
                        ))}
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