import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { TagInput } from "@/components/TagInput";
import { Loader2, XCircle, PlusCircle, CheckCircle, Archive, Sparkles, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { productCategories, getCategoryAndType } from "@/lib/productTypes";
import useAutosizeTextArea from "@/hooks/use-autosize-textarea";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ScrollArea } from "./ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { CreatableCombobox } from "./CreatableCombobox";
import { useShop } from "@/contexts/ShopContext";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  status: z.enum(['Active', 'Draft', 'Out of Stock']),
  caption: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be a positive number").optional().nullable(),
  currency: z.string().optional().nullable(),
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
  price: number | null;
  inventory: number;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_gallery: string[] | null;
  caption: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: any;
  currency: string | null;
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  product?: Product;
  post?: any;
  productData?: any;
}

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", label: "Active" },
  'Draft': { icon: XCircle, color: "text-amber-600", label: "Draft" },
  'Out of Stock': { icon: Archive, color: "text-slate-600", label: "Out of Stock" },
};

export const ProductDetailModal = ({ isOpen, onClose, onUpdate, product, post, productData }: ProductDetailModalProps) => {
  const { shopDetails } = useShop();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isFindingSpecs, setIsFindingSpecs] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const isCreateMode = !product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });
  const { register, handleSubmit, control, watch, setValue, getValues, reset } = form;

  useEffect(() => {
    const fetchOptions = async () => {
      const { data } = await supabase.from('categories').select('name');
      const dbCategories = data?.map(c => c.name) || [];
      const staticCategories = productCategories.map(c => c.label);
      setCategoryOptions([...new Set([...staticCategories, ...dbCategories])]);
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (isCreateMode && productData) {
      const details = productData.details || { type: 'generic' };
      if (details.type && typeof details.type === 'object' && details.type.value) {
        details.type = details.type.value;
      }
      reset({
        name: productData.name || "",
        status: 'Draft',
        caption: productData.description || post?.caption || "",
        category: productData.category || "generic",
        price: productData.price || 0,
        currency: productData.currency || shopDetails?.currency || 'USD',
        inventory: 10,
        tags: productData.tags || [],
        pricing_type: 'one_time',
        details: details,
      });
      setMediaItems(post?.media_url ? [post.media_url] : []);
    } else if (product) {
      reset({
        name: product.name || "",
        status: product.status || "Draft",
        caption: product.caption || "",
        category: product.category || "",
        price: product.price,
        currency: product.currency || 'USD',
        inventory: product.inventory || 0,
        tags: product.tags || [],
        pricing_type: product.pricing_type || 'one_time',
        billing_interval: product.billing_interval,
        details: product.details || { type: 'generic' },
      });
      const gallery = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
      setMediaItems(gallery);
    }
  }, [product, post, productData, isCreateMode, reset, shopDetails]);

  const pricingType = watch("pricing_type");
  const categoryValue = watch("category");
  const typeValue = watch("details.type");
  const statusValue = watch("status");
  const captionValue = watch("caption");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { ref: rhfRef, ...captionProps } = register("caption");
  useAutosizeTextArea(textAreaRef.current, captionValue || "");

  const { category, type } = getCategoryAndType(categoryValue, typeValue);
  const DetailsComponent = type?.component;

  useEffect(() => {
    const staticCategory = productCategories.find(c => c.label === categoryValue || c.value === categoryValue);
    const staticTypes = staticCategory ? staticCategory.types.map(t => t.label) : [];
    setTypeOptions(staticTypes);
    if (staticCategory && staticCategory.types.length > 0 && !staticTypes.includes(typeValue)) {
      setValue("details.type", staticCategory.types[0].value);
    }
  }, [categoryValue, typeValue, setValue]);

  const handleSave = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); setIsSubmitting(false); return; }

    const { type: currentTypeDefinition } = getCategoryAndType(data.category, data.details.type);
    const cleanedDetails: { [key: string]: any } = { type: data.details.type };
    if (currentTypeDefinition) {
      currentTypeDefinition.fields.forEach(field => {
        if (data.details[field.name] !== undefined) cleanedDetails[field.name] = data.details[field.name];
      });
    }

    const payload = {
      name: data.name, status: data.status, caption: data.caption, category: data.category,
      price: data.price, currency: data.currency, inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
      tags: data.tags, pricing_type: data.pricing_type,
      billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
      details: cleanedDetails,
      media_gallery: mediaItems, media_url: mediaItems[0] || null, thumbnail_url: mediaItems[0] || null,
    };

    if (isCreateMode) {
      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) { showError("Could not find business profile."); setIsSubmitting(false); return; }
      const { error } = await supabase.from('products').insert({ ...payload, business_id: business.id, instagram_post_id: post.id, media_type: post.media_type });
      if (error) { showError(`Failed to create product: ${error.message}`); } 
      else { showSuccess("Product created!"); onUpdate(); onClose(); }
    } else {
      const { error } = await supabase.from('products').update(payload).eq('id', product.id);
      if (error) { showError(`Failed to update product: ${error.message}`); } 
      else { showSuccess("Product updated!"); onUpdate(); onClose(); }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (isCreateMode) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) { showError(`Failed to delete product: ${error.message}`); } 
    else { showSuccess("Product deleted."); onUpdate(); onClose(); }
    setIsSubmitting(false); setIsDeleting(false);
  };

  // Other handlers like handleImageUpload, handleImageDelete, handleFindSpecs would go here...

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
          <motion.form key="edit" onSubmit={handleSubmit(handleSave)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>{isCreateMode ? "Create New Product" : `Edit: ${product.name}`}</DialogTitle>
              <DialogDescription>{isCreateMode ? "Create a new product from an Instagram post." : "Update the details for this product."}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
                  <div className="md:col-span-4">
                    <Carousel className="w-full rounded-lg overflow-hidden group">
                      <CarouselContent>
                        {mediaItems.map((url: string, index: number) => (
                          <CarouselItem key={index}><img src={url} alt={`Product image ${index + 1}`} className="object-cover w-full aspect-square bg-muted" /></CarouselItem>
                        ))}
                      </CarouselContent>
                      {mediaItems.length > 1 && <><CarouselPrevious className="left-2" /><CarouselNext className="right-2" /></>}
                    </Carousel>
                  </div>
                  <div className="md:col-span-6 flex flex-col space-y-4">
                    <div>
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <Controller name="category" control={control} render={({ field }) => (<CreatableCombobox options={categoryOptions} placeholder="Category..." {...field} />)} />
                        <Controller name="details.type" control={control} render={({ field }) => (<CreatableCombobox options={typeOptions} placeholder="Type..." {...field} disabled={!categoryValue} />)} />
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Input id="name" {...register("name")} placeholder="Product Name" className="w-auto border-0 border-b-2 rounded-none bg-transparent p-0 text-3xl font-bold tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors" />
                        <Controller control={control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className={cn("w-[140px] border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50", statusConfig[statusValue as keyof typeof statusConfig]?.color)}>{statusValue && statusConfig[statusValue as keyof typeof statusConfig] ? (<div className="flex items-center gap-2"><statusConfig[statusValue as keyof typeof statusConfig].icon className="h-4 w-4" /><span>{statusConfig[statusValue as keyof typeof statusConfig].label}</span></div>) : <SelectValue placeholder="Set status..." />}</SelectTrigger><SelectContent>{Object.entries(statusConfig).map(([status, { icon: Icon, color, label }]) => (<SelectItem key={status} value={status} className={color}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{label}</span></div></SelectItem>))}</SelectContent></Select>)} />
                      </div>
                      {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                    </div>
                    <Textarea id="caption" {...captionProps} ref={(e) => { rhfRef(e); textAreaRef.current = e as HTMLTextAreaElement; }} placeholder="No description provided." className="border-0 border-b-2 rounded-none bg-transparent p-0 text-base text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors resize-none" />
                    <div><Label>Tags</Label><Controller control={control} name="tags" render={({ field }) => <TagInput {...field} />} /></div>
                    <div className="space-y-2 pt-2">
                      <Label>Pricing & Inventory</Label>
                      <div className="flex items-center gap-4"><Controller control={control} name="pricing_type" render={({ field }) => (<ToggleGroup type="single" onValueChange={field.onChange} value={field.value} variant="outline" size="sm"><ToggleGroupItem value="one_time">One-time</ToggleGroupItem><ToggleGroupItem value="subscription">Subscription</ToggleGroupItem></ToggleGroup>)} /></div>
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="space-y-1 col-span-2">
                          <Label htmlFor="price" className="text-xs">Price</Label>
                          <div className="flex items-center gap-2"><Input id="price" type="number" step="0.01" {...register("price")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" /><Input {...register("currency")} className="w-20 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="USD" /></div>
                          {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}{errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
                        </div>
                        <AnimatePresence>
                          {pricingType === 'one_time' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label htmlFor="inventory" className="text-xs">Stock</Label><Input id="inventory" type="number" {...register("inventory")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</motion.div>)}
                          {pricingType === 'subscription' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label className="text-xs">Interval</Label><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-full border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} />{errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}</motion.div>)}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
                <Card>
                  <CardHeader><CardTitleComponent className="text-base">Options & Specifications</CardTitleComponent></CardHeader>
                  <CardContent>{DetailsComponent ? <DetailsComponent control={control} /> : <p className="text-sm text-muted-foreground text-center">Select a category and type to see specific details.</p>}</CardContent>
                </Card>
              </div>
            </ScrollArea>
            <DialogFooter className="p-4 border-t">
              {!isCreateMode && <Button type="button" variant="destructive" onClick={() => setIsDeleting(true)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
              <div className="flex-1" />
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="mr-2 h-4 w-4" />{isCreateMode ? "Create Product" : "Save Changes"}</Button>
            </DialogFooter>
          </motion.form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent><AlertDialogDescriptionComponent>This action cannot be undone. This will permanently delete the product.</AlertDialogDescriptionComponent></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete product</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};