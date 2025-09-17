import { useForm } from "react-hook-form";
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

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  inventory: z.coerce.number().int().min(0, "Inventory must be a positive integer"),
  features: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  productData: any;
  post: any;
}

export const EditProductModal = ({ isOpen, onClose, onSave, productData, post }: EditProductModalProps) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: productData?.name || "",
      description: productData?.description || post?.caption || "",
      category: productData?.category || "",
      price: productData?.price || 0,
      inventory: productData?.inventory || 0,
      features: (productData?.features || []).join(", "),
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to create a product.");
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      showError("Could not find your business. Please contact support.");
      return;
    }

    const { error } = await supabase.from('products').insert({
      business_id: business.id,
      name: data.name,
      caption: data.description,
      category: data.category,
      price: data.price,
      inventory: data.inventory,
      features: data.features ? data.features.split(',').map(f => f.trim()) : null,
      status: 'Draft',
      instagram_post_id: post.id,
      media_url: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
    });

    if (error) {
      showError(`Failed to create product: ${error.message}`);
    } else {
      showSuccess("Product created successfully!");
      onSave();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
          <DialogDescription>
            The AI has generated the following details. Review, edit, and save to create the product.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
             <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...register("category")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} rows={3} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="features">Features (comma-separated)</Label>
            <Textarea id="features" {...register("features")} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" {...register("price")} />
              {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventory">Inventory</Label>
              <Input id="inventory" type="number" {...register("inventory")} />
              {errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};