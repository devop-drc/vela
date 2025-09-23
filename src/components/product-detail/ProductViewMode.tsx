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

const DetailDisplayRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <div className="font-medium flex flex-wrap items-center gap-1.5 text-base">
            {children}
        </div>
    </div>
);

export const ProductViewMode = ({ product, mediaItems, attributeValues, onEdit, onDelete, isSubmitting }: any) => {
    const categoryName = product.categories?.name || 'Uncategorized';

    const renderAttributeValue = (attrValue: any) => {
        const value = attrValue.value_text ?? attrValue.value_number ?? attrValue.value_jsonb;
        if (attrValue.attributes.input_type === 'color' && typeof value === 'string') {
            return <div title={value} className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: value }} />;
        }
        if (Array.isArray(value)) {
            return value.map((item, index) => <Badge key={index} variant="outline">{item}</Badge>);
        }
        return <p className="text-base">{value}{attrValue.attributes.unit ? ` ${attrValue.attributes.unit}` : ''}</p>;
    };

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
                  <p className="text-sm font-medium text-muted-foreground">{categoryName}</p>
                  <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 mt-1">
                    {product.name}
                    <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>{product.status}</Badge>
                  </h1>
                </div>
                <p className="text-base text-muted-foreground flex-1">{product.caption || 'No description provided.'}</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><Label className="text-sm">Price</Label><p className="font-semibold text-2xl">{product.pricing_type === 'subscription' ? `${formatCurrency(product.price, product.currency)} / ${product.billing_interval}` : formatCurrency(product.price, product.currency)}</p></div>
                  {product.pricing_type !== 'subscription' && (<div><Label className="text-sm">Inventory</Label><p className="font-semibold text-2xl">{product.inventory || 0}</p></div>)}
                </div>
              </div>
            </div>

            {attributeValues.length > 0 && (
              <Card>
                <CardHeader><CardTitleComponent className="text-base">Specifications</CardTitleComponent></CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    {attributeValues.map((attrValue: any) => (
                      <DetailDisplayRow key={attrValue.attribute_id} label={attrValue.attributes.name}>
                        {renderAttributeValue(attrValue)}
                      </DetailDisplayRow>
                    ))}
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