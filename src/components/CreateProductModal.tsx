import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { TagInput } from "./TagInput";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { productCategories, getCategoryAndType } from "@/lib/productTypes";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  currency: z.string().optional(),
  inventory: z.coerce.number().int().min(0, "Inventory must be a positive integer").optional(),
  tags: z.array(z.string()).optional(),
  pricing_type: z.enum(['one_time', 'subscription']),
  details: z.any(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  productData: any;
  post: any;
}

export const CreateProductModal = ({ isOpen, onClose, onSave, productData, post }: CreateProductModalProps) => {
  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: productData?.name || "",
      description: productData?.description || post?.caption || "",
      category: productData?.category || "generic",
      price: productData?.price || 0,
      currency: productData?.currency || 'USD',
      inventory: 10,
      tags: productData?.tags || [],
      pricing_type: 'one_time',
      details: productData?.details || { type: 'generic' },
    },
  });

  const pricingType = useWatch({ control, name: "pricing_type" });
  const categoryValue = useWatch({ control, name: "category" });
  const typeValue = useWatch({ control, name: "details.type" });

  const { category, type } = getCategoryAndType(categoryValue, typeValue);
  const DetailsComponent = type?.component;

  useEffect(() => {
    // When category changes, reset the type to the first available one
    const newCategory = productCategories.find(c => c.value === categoryValue);
    if (newCategory && newCategory.types.length > 0) {
      setValue("details.type", newCategory.types[0].value);
    }
  }, [categoryValue, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in to create a product."); return; }

    const { data: business, error: businessError } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) { showError("Could not find your business profile."); return; }

    const { error } = await supabase.from('products').insert({
      business_id: business.id,
      name: data.name,
      caption: data.description,
      category: data.category,
      price: data.price,
      currency: data.currency,
      inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
      tags: data.tags,
      details: data.details,
      pricing_type: data.pricing_type,
      status: 'Draft',
      instagram_post_id: post.id,
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url,
      media_type: post.media_type,
    });

    if (error) { showError(`Failed to create product: ${error.message}`); } 
    else { showSuccess("Product created successfully!"); onSave(); onClose(); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Product from Post</DialogTitle>
          <DialogDescription>The AI has generated the following details. Review, edit, and save.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Left Column */}
            <div className="space-y-4">
              <Card className="overflow-hidden h-fit"><CardContent className="p-0"><img src={post.media_url} alt="Instagram Post" className="w-full h-auto object-cover aspect-square" /></CardContent></Card>
              <div className="space-y-2"><Label htmlFor="name">Product Name</Label><Input id="name" {...register("name")} />{errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}</div>
              <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" {...register("description")} rows={4} /></div>
              <div className="space-y-2"><Label>Tags</Label><Controller name="tags" control={control} render={({ field }) => <TagInput {...field} placeholder="Add tag..." />} /></div>
            </div>
            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Category</Label><Controller name="category" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger><SelectContent>{productCategories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}</SelectContent></Select>)} /></div>
                <div className="space-y-2"><Label>Type</Label><Controller name="details.type" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={!category?.types}><SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger><SelectContent>{category?.types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>)} /></div>
              </div>
              <div className="space-y-2"><Label>Pricing Model</Label><Controller name="pricing_type" control={control} render={({ field }) => (<RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="one_time" id="one_time" /><Label htmlFor="one_time">One-time</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="subscription" id="subscription" /><Label htmlFor="subscription">Subscription</Label></div></RadioGroup>)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="flex items-center gap-2">
                    <Input id="price" type="number" step="0.01" {...register("price")} className="flex-1" />
                    <Input {...register("currency")} className="w-20" placeholder="USD" />
                  </div>
                  {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                </div>
                <AnimatePresence>
                  {pricingType === 'one_time' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-hidden">
                      <div className="space-y-2"><Label htmlFor="inventory">Inventory</Label><Input id="inventory" type="number" {...register("inventory")} />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2"><Label>Specific Details</Label><Card><CardContent className="p-4">{DetailsComponent ? <DetailsComponent control={control} /> : <p>Select a category and type.</p>}</CardContent></Card></div>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Product</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};