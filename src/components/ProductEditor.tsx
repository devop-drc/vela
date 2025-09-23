import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ProductViewMode } from "./product-detail/ProductViewMode";
import { ProductEditMode } from "./product-detail/ProductEditMode";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  status: z.enum(['Active', 'Draft', 'Out of Stock']),
  caption: z.string().optional(),
  category_id: z.string().nullable(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  currency: z.string().optional(),
  inventory: z.coerce.number().int().min(0, "Inventory must be a positive integer").optional(),
  pricing_type: z.enum(['one_time', 'subscription']),
  billing_interval: z.enum(['month', 'year']).optional().nullable(),
  attributes: z.record(z.any()).optional(),
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
  media_gallery: string[] | null;
  caption: string;
  category_id: string | null;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  currency: string | null;
}

interface ProductEditorProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ProductEditor = ({ product, isOpen, onClose, onUpdate }: ProductEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attributeValues, setAttributeValues] = useState<any[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    const setupForm = async () => {
      if (product) {
        // Fetch attribute values for this product
        const { data: attributeData } = await supabase
          .from('product_attribute_values')
          .select('*, attributes(*)')
          .eq('product_id', product.id);
        
        setAttributeValues(attributeData || []);

        const formattedAttributes = (attributeData || []).reduce((acc, val) => {
          const key = val.attributes.id;
          const value = val.value_text ?? val.value_number ?? val.value_jsonb;
          acc[key] = value;
          return acc;
        }, {} as any);

        form.reset({
          name: product.name || "",
          status: product.status || "Draft",
          caption: product.caption || "",
          category_id: product.category_id || null,
          price: product.price || 0,
          currency: product.currency || 'USD',
          inventory: product.inventory || 0,
          pricing_type: product.pricing_type || 'one_time',
          billing_interval: product.billing_interval,
          attributes: formattedAttributes,
        });
        const gallery = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
        setMediaItems(gallery);
      } else {
        setMediaItems([]);
        setAttributeValues([]);
      }
    };
    setupForm();
  }, [product, form.reset]);

  if (!product) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showError("You must be logged in to upload."); setIsUploading(false); return; }

    const filePath = `${user.id}/${product.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('design-assets').upload(filePath, file);

    if (error) { showError(`Upload failed: ${error.message}`); } 
    else {
      const { data: { publicUrl } } = supabase.storage.from('design-assets').getPublicUrl(filePath);
      setMediaItems(prev => [...prev, publicUrl]);
    }
    setIsUploading(false);
  };

  const handleImageDelete = async (urlToDelete: string) => {
    const fileName = urlToDelete.split('/').pop();
    if (!fileName) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = `${user.id}/${product.id}/${fileName}`;
    const { error } = await supabase.storage.from('design-assets').remove([filePath]);

    if (error) { showError(`Failed to delete image: ${error.message}`); } 
    else { setMediaItems(prev => prev.filter(url => url !== urlToDelete)); }
  };

  const handleSave = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const { attributes, ...productFields } = data;

    const { error: productError } = await supabase.from('products').update({
        ...productFields,
        inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
        billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
        media_gallery: mediaItems,
        media_url: mediaItems[0] || null,
        thumbnail_url: mediaItems[0] || null,
      }).eq('id', product.id);

    if (productError) { showError(`Failed to update product: ${productError.message}`); setIsSubmitting(false); return; }

    if (attributes) {
      const attributeValuesToUpsert = Object.entries(attributes).map(([attribute_id, value]) => ({
        product_id: product.id,
        attribute_id,
        value_text: typeof value === 'string' ? value : null,
        value_number: typeof value === 'number' ? value : null,
        value_jsonb: Array.isArray(value) ? value : null,
      }));
      const { error: attrError } = await supabase.from('product_attribute_values').upsert(attributeValuesToUpsert);
      if (attrError) { showError(`Product updated, but failed to save attributes: ${attrError.message}`); }
    }
    
    showSuccess("Product updated successfully!"); 
    onUpdate(); 
    setIsEditing(false);
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) { showError(`Failed to delete product: ${error.message}`); } 
    else { showSuccess("Product deleted."); onUpdate(); onClose(); }
    setIsSubmitting(false); setIsDeleting(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setIsEditing(false); } }}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="sr-only"><DialogTitle>Product Details: {product.name}</DialogTitle><DialogDescription>View or edit product details for {product.name}.</DialogDescription></DialogHeader>
          <AnimatePresence mode="wait">
            {isEditing ? (
              <ProductEditMode
                product={product}
                mediaItems={mediaItems}
                handleImageUpload={handleImageUpload}
                handleImageDelete={handleImageDelete}
                isUploading={isUploading}
                form={{...form, handleSubmit: form.handleSubmit(handleSave)}}
                onCancel={() => setIsEditing(false)}
                isSubmitting={isSubmitting}
              />
            ) : (
              <ProductViewMode
                product={product}
                mediaItems={mediaItems}
                attributeValues={attributeValues}
                onEdit={() => setIsEditing(true)}
                onDelete={() => setIsDeleting(true)}
                isSubmitting={isSubmitting}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent><AlertDialogDescriptionComponent>This action cannot be undone. This will permanently delete the product.</AlertDialogDescriptionComponent></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete product</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};