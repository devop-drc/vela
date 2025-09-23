import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { useShop } from "@/contexts/ShopContext";
import { DynamicAttributeForm } from "./attributes/DynamicAttributeForm";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  caption: z.string().optional(),
  category_id: z.string().nullable(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  currency: z.string().min(3, "Currency code is required").max(3),
  inventory: z.coerce.number().int().min(0, "Inventory must be a positive integer").optional(),
  pricing_type: z.enum(['one_time', 'subscription']),
  attributes: z.record(z.any()).optional(),
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
  const { shopDetails } = useShop();
  const [categories, setCategories] = useState<any[]>([]);
  
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: productData?.name || "",
      caption: productData?.description || post?.caption || "",
      price: productData?.price || 0,
      currency: productData?.currency || shopDetails?.currency || 'USD',
      inventory: 10,
      pricing_type: 'one_time',
      attributes: {},
    }
  });

  const categoryId = watch("category_id");

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const onSubmit = async (data: ProductFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in."); return; }

    const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
    if (!business) { showError("Could not find your business profile."); return; }

    const { attributes, ...productFields } = data;
    
    const { data: newProduct, error: productError } = await supabase.from('products').insert({
      business_id: business.id,
      ...productFields,
      inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
      status: 'Draft',
      instagram_post_id: post.id,
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url,
      media_type: post.media_type,
    }).select().single();

    if (productError) { showError(`Failed to create product: ${productError.message}`); return; }

    if (attributes && Object.keys(attributes).length > 0) {
      const attributeValues = Object.entries(attributes).map(([attribute_id, value]) => ({
        product_id: newProduct.id,
        attribute_id,
        value_text: typeof value === 'string' ? value : null,
        value_number: typeof value === 'number' ? value : null,
        value_jsonb: Array.isArray(value) ? value : null,
      }));
      
      const { error: attrError } = await supabase.from('product_attribute_values').upsert(attributeValues);
      if (attrError) { showError(`Product created, but failed to save attributes: ${attrError.message}`); }
    }
    
    showSuccess("Product created successfully!"); 
    onSave(); 
    onClose();
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
              <div className="space-y-2"><Label htmlFor="caption">Description</Label><Textarea id="caption" {...register("caption")} rows={4} /></div>
            </div>
            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2"><Label>Category</Label><Controller name="category_id" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select>)} /></div>
              <div className="space-y-2"><Label>Pricing Model</Label><Controller name="pricing_type" control={control} render={({ field }) => (<RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="one_time" id="one_time" /><Label htmlFor="one_time">One-time</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="subscription" id="subscription" /><Label htmlFor="subscription">Subscription</Label></div></RadioGroup>)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <div className="flex items-center gap-2">
                    <Input id="price" type="number" step="0.01" {...register("price")} className="flex-1" />
                    <Input {...register("currency")} className="w-20" placeholder="USD" />
                  </div>
                  {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                  {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
                </div>
                <AnimatePresence>
                  {watch("pricing_type") === 'one_time' && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-hidden">
                      <div className="space-y-2"><Label htmlFor="inventory">Inventory</Label><Input id="inventory" type="number" {...register("inventory")} />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2"><Label>Specific Details</Label><Card><CardContent className="p-4"><DynamicAttributeForm categoryId={categoryId} control={control} /></CardContent></Card></div>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Product</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};