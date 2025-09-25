import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { productCategories, getCategoryAndType } from "@/lib/productTypes";
import { ProductViewMode } from "./product-detail/ProductViewMode";
import { ProductEditMode } from "./product-detail/ProductEditMode";
import { useShop } from "@/contexts/ShopContext";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  status: z.enum(['Active', 'Draft', 'Out of Stock']),
  caption: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  currency: z.string().optional(),
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
  media_gallery: string[] | null;
  caption: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: any;
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
  const { shopDetails, exchangeRates, convertCurrency } = useShop();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (product) {
      const displayPrice = convertCurrency(product.price);
      form.reset({
        name: product.name || "",
        status: product.status || "Draft",
        caption: product.caption || "",
        category: product.category || "",
        price: displayPrice,
        currency: shopDetails?.currency || 'USD',
        inventory: product.inventory || 0,
        tags: product.tags || [],
        pricing_type: product.pricing_type || 'one_time',
        billing_interval: product.billing_interval,
        details: product.details || { type: 'generic' },
      });
      const gallery = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
      setMediaItems(gallery);
    } else {
      setMediaItems([]);
    }
  }, [product, form.reset, shopDetails, convertCurrency]);
  
  useEffect(() => {
    if (isEditing) {
      const subscription = form.watch((value, { name }) => {
        if (name === 'category') {
          form.setValue("details.type", "", { shouldDirty: true });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [isEditing, form]);

  if (!product) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to upload.");
      setIsUploading(false);
      return;
    }

    const filePath = `${user.id}/${product.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('product-media').upload(filePath, file);

    if (error) {
      showError(`Upload failed: ${error.message}`);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(filePath);
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
    const { error } = await supabase.storage.from('product-media').remove([filePath]);

    if (error) {
      showError(`Failed to delete image: ${error.message}`);
    } else {
      setMediaItems(prev => prev.filter(url => url !== urlToDelete));
    }
  };

  const logFeedback = async (originalProduct: Product, newData: ProductFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const feedbackEntries = [];
    const fieldsToCompare: (keyof ProductFormData)[] = ['name', 'caption', 'category', 'price', 'currency', 'inventory'];

    for (const field of fieldsToCompare) {
      const originalValue = String(originalProduct[field as keyof Product] ?? '');
      const correctedValue = String(newData[field] ?? '');
      if (originalValue !== correctedValue) {
        feedbackEntries.push({
          user_id: user.id,
          product_id: originalProduct.id,
          field_name: field,
          original_value: originalValue,
          corrected_value: correctedValue,
        });
      }
    }
    
    const originalDetails = originalProduct.details || {};
    const correctedDetails = newData.details || {};
    for (const key in correctedDetails) {
        const originalValue = String(originalDetails[key] ?? '');
        const correctedValue = String(correctedDetails[key] ?? '');
        if (originalValue !== correctedValue) {
            feedbackEntries.push({
                user_id: user.id,
                product_id: originalProduct.id,
                field_name: `details.${key}`,
                original_value: originalValue,
                corrected_value: correctedValue,
            });
        }
    }

    if (feedbackEntries.length > 0) {
      await supabase.from('ai_feedback').insert(feedbackEntries);
    }
  };

  const handleSave = async (data: ProductFormData) => {
    setIsSubmitting(true);
    await logFeedback(product, data);

    const rate = exchangeRates && shopDetails ? exchangeRates[shopDetails.currency] : 1;
    const priceInUSD = data.price / (rate || 1);

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
        price: priceInUSD, currency: 'USD', inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
        tags: data.tags, pricing_type: data.pricing_type,
        billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
        details: cleanedDetails,
        media_gallery: mediaItems,
        media_url: mediaItems[0] || null,
        thumbnail_url: mediaItems[0] || null,
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setIsEditing(false); } }}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Product Details: {product.name}</DialogTitle>
            <DialogDescription>View or edit product details for {product.name}.</DialogDescription>
          </DialogHeader>
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
                isEditing={isEditing}
              />
            ) : (
              <ProductViewMode
                product={product}
                mediaItems={mediaItems}
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