import { useState, useEffect } from "react";
import { deleteProductMedia } from "@/lib/productCleanup";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ProductViewMode } from "./product-detail/ProductViewMode";
import { ProductEditMode } from "./product-detail/ProductEditMode";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  status: z.enum(['Active', 'Draft', 'Out of Stock']),
  caption: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  currency: z.string().min(3, "Currency code is required").max(3),
  inventory: z.coerce.number().int().min(0, "Inventory must be a non-negative integer").optional(),
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
  category?: string;
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  details: any;
  currency: string | null;
  instagram_post_id?: string;
}

interface ProductEditorProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  /** Open directly in edit mode (used for newly-created products). */
  startInEdit?: boolean;
}

export const ProductEditor = ({ product, isOpen, onClose, onUpdate, startInEdit = false }: ProductEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);

  // New products should open straight into the edit form.
  useEffect(() => {
    if (isOpen && startInEdit) setIsEditing(true);
  }, [isOpen, startInEdit]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [mediaItems, setMediaItems] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [specs, setSpecs] = useState<any[]>([]);
  const [viewRefreshKey, setViewRefreshKey] = useState(0);
  const { shopDetails, convertCurrency } = useShop();
  const { user } = useAuth();

  // Fetch specs when product loads
  useEffect(() => {
    if (product?.id) {
      supabase
        .from('product_specifications')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order')
        .then(({ data }) => {
          if (data) setSpecs(data);
        });
    }
  }, [product?.id]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });
  
  useEffect(() => {
    if (product && shopDetails) {
      // Convert price from product.currency (stored in DB, now always ALL) to shopDetails.currency (display)
      const priceInDisplayCurrency = convertCurrency(product.price, product.currency, shopDetails.currency);

      // NOTE: We no longer initialize options_v2 here. It is fetched and managed by OptionsManager.
      
      form.reset({
        name: product.name || "",
        status: product.status || "Draft",
        caption: product.caption || "",
        category: product.category || "",
        price: priceInDisplayCurrency, // Set price in display currency for the form
        currency: shopDetails.currency || 'USD', // Always use shop's currency for the form's currency selector
        inventory: product.inventory || 0,
        tags: Array.isArray(product.tags) ? product.tags : [],
        pricing_type: product.pricing_type || 'one_time',
        billing_interval: product.billing_interval,
        details: product.details || { type: 'generic' },
      });
      const gallery = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
      setMediaItems(gallery);
    } else if (product) {
      // Fallback if shopDetails not loaded yet
      form.reset({
        name: product.name || "",
        status: product.status || "Draft",
        caption: product.caption || "",
        category: product.category || "",
        price: product.price || 0,
        currency: product.currency || 'ALL',
        inventory: product.inventory || 0,
        tags: product.tags || [],
        pricing_type: product.pricing_type || 'one_time',
        billing_interval: product.billing_interval,
        details: product.details || { type: 'generic' },
      });
    } else {
      setMediaItems([]);
    }
  }, [product, form.reset, shopDetails, convertCurrency]);
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    if (!user) {
      showError("You must be logged in to upload an image.");
      setIsUploading(false);
      return;
    }

    // Sanitize filename to avoid spaces and special characters that can break public URLs
    const rawName = file.name;
    const safeName = rawName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filePath = `${user.id}/${product!.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('product-media').upload(filePath, file, {
      // Timestamped path = immutable file; cache in the browser for a year so
      // product images reload instantly on repeat visits.
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || undefined,
    });

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

    if (!user) return;

    const filePath = `${user.id}/${product!.id}/${fileName}`;
    const { error } = await supabase.storage.from('product-media').remove([filePath]);

    if (error) {
      showError(`Failed to delete image: ${error.message}`);
    } else {
      setMediaItems(prev => prev.filter(url => url !== urlToDelete));
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    
    // Delete from AI analysis cache if instagram_post_id exists
    if (product?.instagram_post_id) {
      const { error: cacheError } = await supabase
        .from('ai_analysis_cache')
        .delete()
        .eq('instagram_post_id', product.instagram_post_id);
      if (cacheError) {
        console.error("Failed to delete AI analysis cache entry:", cacheError);
        showError(`Failed to clear AI cache: ${cacheError.message}`);
      }
    }

    // Delete from products table (cascades to options/variants/specs/reviews;
    // order history is preserved via SET NULL), then clean up storage media.
    const { error } = await supabase.from('products').delete().eq('id', product!.id);
    if (error) {
      showError(`Failed to delete product: ${error.message}`);
    } else {
      deleteProductMedia([product!]); // best-effort, never blocks
      showSuccess("Product deleted.");
      onUpdate(); // <-- Call onUpdate here to trigger parent refresh
      onClose();
    }
    setIsSubmitting(false); setIsDeleting(false);
  };

  const doClose = () => { onClose(); setIsEditing(false); };

  // Guard against losing edits: if the form has unsaved changes, confirm first.
  const attemptClose = () => {
    if (isEditing && form.formState.isDirty) {
      setShowDiscardConfirm(true);
    } else {
      doClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) attemptClose(); }}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Product Details: {product?.name}</DialogTitle>
            <DialogDescription>View or edit product details for {product?.name}.</DialogDescription>
          </DialogHeader>
          <AnimatePresence mode="wait">
            {isEditing ? (
              <FormProvider {...form}>
                <ProductEditMode
                  product={product}
                  mediaItems={mediaItems}
                  handleImageUpload={handleImageUpload}
                  handleImageDelete={handleImageDelete}
                  isUploading={isUploading}
                  form={{...form, handleSubmit: form.handleSubmit}}
                  onCancel={() => {
                    setIsEditing(false);
                    setViewRefreshKey(k => k + 1);
                    // Re-fetch specs after edit
                    if (product?.id) {
                      supabase.from('product_specifications').select('*').eq('product_id', product.id).order('display_order')
                        .then(({ data }) => { if (data) setSpecs(data); });
                    }
                  }}
                  onClose={onClose}
                  onUpdate={onUpdate}
                  isSubmitting={isSubmitting}
                  isEditing={isEditing}
                  setMediaItems={setMediaItems}
                  setIsSubmitting={setIsSubmitting}
                  specs={specs}
                  setSpecs={setSpecs}
                />
              </FormProvider>
            ) : (
              <ProductViewMode
                key={viewRefreshKey}
                product={product}
                mediaItems={mediaItems}
                onEdit={() => setIsEditing(true)}
                onDelete={() => setIsDeleting(true)}
                isSubmitting={isSubmitting}
                specs={specs}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent><AlertDialogDescriptionComponent>This action cannot be undone. This will permanently delete the product.</AlertDialogDescriptionComponent></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete product</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitleComponent>Discard your changes?</AlertDialogTitleComponent>
            <AlertDialogDescriptionComponent>You have unsaved changes to this product. If you leave now, they'll be lost.</AlertDialogDescriptionComponent>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDiscardConfirm(false); doClose(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};