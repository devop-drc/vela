import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Edit, Trash2, CheckCircle, XCircle, Archive, PlayCircle } from "lucide-react";
import { TagInput } from "./TagInput";
import { productCategories, getCategoryAndType } from "@/lib/productTypes";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  status: z.enum(['Active', 'Draft', 'Out of Stock']),
  caption: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  inventory: z.coerce.number().int().min(0, "Inventory must be a positive integer").optional(),
  tags: z.array(z.string()).optional(),
  pricing_type: z.enum(['one_time', 'subscription']),
  billing_interval: z.enum(['month', 'year']).optional().nullable(),
  details: z.any(),
}).refine(data => {
    if (data.pricing_type === 'subscription' && !data.billing_interval) {
        return false;
    }
    return true;
}, {
    message: "Interval is required for subscriptions.",
    path: ["billing_interval"],
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number;
  inventory: number;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: any;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  'Draft': { icon: XCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  'Out of Stock': { icon: Archive, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
};

const DetailDisplayRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="flex flex-col">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <div className="font-medium flex flex-wrap items-center gap-1.5 text-base">
            {children}
        </div>
    </div>
);

export const ProductDetailModal = ({ product, isOpen, onClose, onUpdate }: ProductDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const pricingType = watch("pricing_type");
  const categoryValue = watch("category");
  const typeValue = watch("details.type");
  const statusValue = watch("status");

  const { category, type } = getCategoryAndType(categoryValue, typeValue);
  const DetailsComponent = type?.component;

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || "",
        status: product.status || "Draft",
        caption: product.caption || "",
        category: product.category || "generic",
        price: product.price || 0,
        inventory: product.inventory || 0,
        tags: product.tags || [],
        pricing_type: product.pricing_type || 'one_time',
        billing_interval: product.billing_interval,
        details: product.details || { type: 'generic' },
      });
    }
  }, [product, reset]);
  
  useEffect(() => {
    const newCategory = productCategories.find(c => c.value === categoryValue);
    if (newCategory && newCategory.types.length > 0 && typeValue !== newCategory.types[0].value) {
      setValue("details.type", newCategory.types[0].value);
    }
  }, [categoryValue, setValue, typeValue]);

  if (!product) return null;

  const handleSave = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const { type: currentTypeDefinition } = getCategoryAndType(data.category, data.details.type);
    const cleanedDetails: { [key: string]: any } = { type: data.details.type };

    if (currentTypeDefinition) {
        currentTypeDefinition.fields.forEach(field => {
            if (data.details[field.name] !== undefined) {
                cleanedDetails[field.name] = data.details[field.name];
            }
        });
    }

    const { error } = await supabase.from('products').update({
        name: data.name, status: data.status, caption: data.caption, category: data.category,
        price: data.price, inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
        tags: data.tags, pricing_type: data.pricing_type,
        billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
        details: cleanedDetails,
      }).eq('id', product.id);

    if (error) { showError(`Failed to update product: ${error.message}`); } 
    else { showSuccess("Product updated successfully!"); onUpdate(); setIsEditing(false); }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) { showError(`Failed to delete product: ${error.message}`); } 
    else { showSuccess("Product deleted."); onUpdate(); onClose(); }
    setIsSubmitting(false); setIsDeleting(false);
  };

  const ViewMode = () => {
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
                    <CarouselItem>
                      <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                        {product.media_type === 'VIDEO' ? (
                          <>
                            <video src={product.media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <PlayCircle className="h-16 w-16 text-white/80" />
                            </div>
                          </>
                        ) : (
                          <img src={product.media_url} alt={product.name} className="object-cover w-full h-full" />
                        )}
                      </div>
                    </CarouselItem>
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
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
                    {product.tags.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div><Label className="text-sm">Price</Label><p className="font-semibold text-2xl">{product.pricing_type === 'subscription' ? `$${product.price?.toFixed(2)} / ${product.billing_interval}` : `$${product.price?.toFixed(2)}`}</p></div>
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
          <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="destructive" onClick={() => setIsDeleting(true)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
        </DialogFooter>
      </motion.div>
    );
  };

  const EditMode = () => (
    <motion.form key="edit" onSubmit={handleSubmit(handleSave)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
      <DialogHeader className="sr-only">
        <DialogTitle>Update Product</DialogTitle>
      </DialogHeader>
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
            <div className="md:col-span-4">
              <img src={product.media_url} alt={product.name} className="rounded-lg object-cover w-full aspect-square bg-muted" />
            </div>
            <div className="md:col-span-6 flex flex-col space-y-4">
              <div>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <Controller name="category" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50 h-9"><SelectValue placeholder="Category..." /></SelectTrigger><SelectContent>{productCategories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}</SelectContent></Select>)} />
                  <Controller name="details.type" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={!category?.types}><SelectTrigger className="border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50 h-9"><SelectValue placeholder="Type..." /></SelectTrigger><SelectContent>{category?.types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>)} />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Input id="name" {...register("name")} placeholder="Product Name" className="border-0 border-b-2 rounded-none bg-transparent p-0 text-3xl font-bold tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors flex-1" />
                  <Controller control={control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className={cn("w-[140px] border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50", statusConfig[statusValue as keyof typeof statusConfig]?.color)}><SelectValue placeholder="Set status..." /></SelectTrigger><SelectContent>{Object.entries(statusConfig).map(([status, { icon: Icon, color, label }]) => (<SelectItem key={status} value={status} className={color}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{label}</span></div></SelectItem>))}</SelectContent></Select>)} />
                </div>
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <Textarea id="caption" {...register("caption")} placeholder="No description provided." className="border-0 border-b-2 rounded-none bg-transparent p-0 text-base text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors resize-none flex-1" />
              <div>
                <Label>Tags</Label>
                <Controller control={control} name="tags" render={({ field }) => <TagInput {...field} />} />
              </div>
              <div className="space-y-2 pt-2">
                <Label>Pricing & Inventory</Label>
                <div className="flex items-center gap-4">
                  <Controller control={control} name="pricing_type" render={({ field }) => (<ToggleGroup type="single" onValueChange={field.onChange} value={field.value} variant="outline" size="sm"><ToggleGroupItem value="one_time">One-time</ToggleGroupItem><ToggleGroupItem value="subscription">Subscription</ToggleGroupItem></ToggleGroup>)} />
                  <div className="flex-1 flex items-center gap-2">
                    <Input id="price" type="number" step="0.01" {...register("price")} className="w-24 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
                    <AnimatePresence>
                      {pricingType === 'one_time' && (<motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center gap-2 overflow-hidden"><Label htmlFor="inventory" className="text-sm text-muted-foreground">Stock:</Label><Input id="inventory" type="number" {...register("inventory")} className="w-20 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" /></motion.div>)}
                      {pricingType === 'subscription' && (<motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center gap-2 overflow-hidden"><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-28 border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} /></motion.div>)}
                    </AnimatePresence>
                  </div>
                </div>
                {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                {errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}
                {errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}
              </div>
            </div>
          </div>
          <Card>
            <CardHeader><CardTitleComponent className="text-base">Options & Specifications</CardTitleComponent></CardHeader>
            <CardContent>
              {DetailsComponent ? <DetailsComponent control={control} /> : <p className="text-sm text-muted-foreground text-center">Select a category and type to see specific details.</p>}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
      <DialogFooter className="p-4 border-t">
        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product</Button>
      </DialogFooter>
    </motion.form>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setIsEditing(false); } }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Product Details: {product.name}</DialogTitle>
            <DialogDescription>View or edit product details for {product.name}.</DialogDescription>
          </DialogHeader>
          <AnimatePresence mode="wait">{isEditing ? <EditMode /> : <ViewMode />}</AnimatePresence>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent><AlertDialogDescriptionComponent>This action cannot be undone. This will permanently delete the product.</AlertDialogDescriptionComponent></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete product</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};