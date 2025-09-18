import { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Edit, Trash2, Tag, FileText, DollarSign, Settings2, Palette, Ruler, Frame, ScanText, Cog } from "lucide-react";
import { TagInput } from "./TagInput";
import { productCategories, getCategoryAndType } from "@/lib/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const pricingType = watch("pricing_type");
  const categoryValue = watch("category");
  const typeValue = watch("details.type");

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

    const visibleDetails = type?.fields.filter(field => {
        const value = product.details?.[field.name];
        return value && (!Array.isArray(value) || value.length > 0);
    }) || [];
    const detailsCount = visibleDetails.length;
    const useCompactDetails = detailsCount > 0 && detailsCount <= 3;

    return (
      <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-6 md:gap-8">
          <div className="md:col-span-4">
            <button onClick={() => setIsMediaViewerOpen(true)} className="w-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-shadow hover:shadow-lg">
              <img src={product.media_url} alt={product.name} className="object-cover w-full aspect-square bg-muted" />
            </button>
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
            <p className="text-base text-muted-foreground">{product.caption || 'No description provided.'}</p>
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {product.tags.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
              </div>
            )}
            
            <Card>
              <CardHeader className="p-4"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Pricing</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 grid grid-cols-2 gap-4">
                <div><Label className="text-sm">Price</Label><p className="font-semibold text-xl">{product.pricing_type === 'subscription' ? `$${product.price?.toFixed(2)} / ${product.billing_interval}` : `$${product.price?.toFixed(2)}`}</p></div>
                {product.pricing_type !== 'subscription' && (<div><Label className="text-sm">Inventory</Label><p className="font-semibold text-xl">{product.inventory || 0}</p></div>)}
              </CardContent>
              {useCompactDetails && (
                <>
                  <div className="px-4 pb-2"><hr/></div>
                  <CardContent className="p-4 pt-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {visibleDetails.map(field => {
                        const value = product.details?.[field.name];
                        let icon = Tag;
                        if (field.name.includes('size') || field.name.includes('dimension')) icon = Ruler;
                        if (field.name.includes('color')) icon = Palette;
                        if (field.name.includes('framing')) icon = Frame;
                        if (field.name.includes('medium')) icon = ScanText;
                        if (field.name.includes('spec')) icon = Cog;

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
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>

        {!useCompactDetails && type && type.fields.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4" />Product Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                {visibleDetails.map(field => {
                  const value = product.details?.[field.name];
                  let icon = Tag;
                  if (field.name.includes('size') || field.name.includes('dimension')) icon = Ruler;
                  if (field.name.includes('color')) icon = Palette;
                  if (field.name.includes('framing')) icon = Frame;
                  if (field.name.includes('medium')) icon = ScanText;
                  if (field.name.includes('spec')) icon = Cog;

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
            </CardContent>
          </Card>
        )}
        
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" />Edit</Button>
          <Button variant="destructive" onClick={() => setIsDeleting(true)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
        </DialogFooter>
      </motion.div>
    );
  };

  const EditMode = () => (
    <motion.form key="edit" onSubmit={handleSubmit(handleSave)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <img src={product.media_url} alt={product.name} className="rounded-lg object-cover w-full aspect-square bg-muted" />
          <Card>
            <CardHeader><CardTitle className="text-base">Core Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Product Name</Label><Input id="name" {...register("name")} />{errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label htmlFor="caption">Description</Label><Textarea id="caption" {...register("caption")} rows={3} /></div>
              <div className="space-y-2"><Label htmlFor="tags">Tags</Label><Controller control={control} name="tags" render={({ field }) => <TagInput {...field} />} /></div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pricing & Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Status</Label><Controller control={control} name="status" render={({ field }) => (<RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="Draft" id="draft" /><Label htmlFor="draft">Draft</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Active" id="active" /><Label htmlFor="active">Active</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Out of Stock" id="out-of-stock" /><Label htmlFor="out-of-stock">Out of Stock</Label></div></RadioGroup>)} /></div>
              <div className="space-y-2"><Label>Pricing Model</Label><Controller control={control} name="pricing_type" render={({ field }) => (<RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="one_time" id="one_time" /><Label htmlFor="one_time">One-time</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="subscription" id="subscription" /><Label htmlFor="subscription">Subscription</Label></div></RadioGroup>)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="price">Price</Label><Input id="price" type="number" step="0.01" {...register("price")} />{errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}</div>
                <AnimatePresence>{pricingType !== 'subscription' && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><div className="space-y-2"><Label htmlFor="inventory">Inventory</Label><Input id="inventory" type="number" {...register("inventory")} />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div></motion.div>)}</AnimatePresence>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Categorization & Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Category</Label><Controller name="category" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger><SelectContent>{productCategories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}</SelectContent></Select>)} /></div>
                <div className="space-y-2"><Label>Type</Label><Controller name="details.type" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={!category?.types}><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger><SelectContent>{category?.types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>)} /></div>
              </div>
              <div className="pt-2">{DetailsComponent ? <DetailsComponent control={control} /> : <p className="text-sm text-muted-foreground text-center">Select a category and type to see specific details.</p>}</div>
            </CardContent>
          </Card>
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product</Button>
      </DialogFooter>
    </motion.form>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setIsEditing(false); } }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader><DialogTitle>{isEditing ? "Update Product" : product.name}</DialogTitle></DialogHeader>
          <AnimatePresence mode="wait">{isEditing ? <EditMode /> : <ViewMode />}</AnimatePresence>
        </DialogContent>
      </Dialog>
      <Dialog open={isMediaViewerOpen} onOpenChange={setIsMediaViewerOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-2 flex items-center justify-center bg-transparent border-none shadow-none">
          <img src={product.media_url} alt="Full size view" className="max-w-full max-h-full object-contain rounded-lg" />
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the product.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete product</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};