import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { Loader2, Edit, Trash2, CheckCircle, XCircle, Tag, FileText, ListChecks, DollarSign, Boxes, X } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  caption: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  inventory: z.coerce.number().int().min(0, "Inventory must be a positive integer"),
  features: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pricing_type: z.enum(['one_time', 'subscription']),
  billing_interval: z.enum(['month', 'year']).optional().nullable(),
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
  status: string;
  price: number;
  inventory: number;
  media_url: string;
  caption: string;
  category: string;
  features: string[];
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const TagInput = ({ value = [], onChange }: { value: string[], onChange: (tags: string[]) => void }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <Input
        id="tags"
        placeholder="Add a tag and press Enter..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="flex flex-wrap gap-2">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button onClick={() => removeTag(tag)} className="rounded-full hover:bg-muted-foreground/20">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};

export const ProductDetailModal = ({ product, isOpen, onClose, onUpdate }: ProductDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const pricingType = watch("pricing_type");

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || "",
        caption: product.caption || "",
        category: product.category || "",
        price: product.price || 0,
        inventory: product.inventory || 0,
        features: (product.features || []).join(", "),
        tags: product.tags || [],
        pricing_type: product.pricing_type || 'one_time',
        billing_interval: product.billing_interval,
      });
    }
  }, [product, reset]);

  if (!product) return null;

  const handleSave = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from('products')
      .update({
        name: data.name,
        caption: data.caption,
        category: data.category,
        price: data.price,
        inventory: data.inventory,
        features: data.features ? data.features.split(',').map(f => f.trim()) : null,
        tags: data.tags,
        pricing_type: data.pricing_type,
        billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
      })
      .eq('id', product.id);

    if (error) {
      showError(`Failed to update product: ${error.message}`);
    } else {
      showSuccess("Product updated successfully!");
      onUpdate();
      setIsEditing(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      showError(`Failed to delete product: ${error.message}`);
    } else {
      showSuccess("Product deleted.");
      onUpdate();
      onClose();
    }
    setIsSubmitting(false);
    setIsDeleting(false);
  };

  const handleTogglePublish = async () => {
    setIsSubmitting(true);
    const newStatus = product.status === 'Active' ? 'Draft' : 'Active';
    const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', product.id);
    if (error) {
      showError(`Failed to update status: ${error.message}`);
    } else {
      showSuccess(`Product is now ${newStatus.toLowerCase()}.`);
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const ViewMode = () => (
    <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <img src={product.media_url} alt={product.name} className="rounded-lg object-cover w-full aspect-square bg-muted" />
        <div className="space-y-4">
          <div className="flex items-start gap-3"><Tag className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" /><div><Label className="text-xs text-muted-foreground">Category</Label><p className="font-medium">{product.category || 'N/A'}</p></div></div>
          <div className="flex items-start gap-3"><FileText className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" /><div><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm">{product.caption || 'No description.'}</p></div></div>
          {product.features?.length > 0 && (
            <div className="flex items-start gap-3"><ListChecks className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" /><div><Label className="text-xs text-muted-foreground">Features</Label><ul className="list-disc list-inside text-sm">{product.features.map((f, i) => <li key={i}>{f}</li>)}</ul></div></div>
          )}
          {product.tags?.length > 0 && (
            <div className="flex items-start gap-3"><Tag className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" /><div><Label className="text-xs text-muted-foreground">Tags</Label><div className="flex flex-wrap gap-2">{product.tags.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}</div></div></div>
          )}
          <div className="flex items-center gap-8 pt-2">
            <div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-muted-foreground" /><div><Label className="text-xs text-muted-foreground">Price</Label><p className="text-lg font-semibold">{product.pricing_type === 'subscription' ? `$${product.price?.toFixed(2)} / ${product.billing_interval}` : `$${product.price?.toFixed(2)}`}</p></div></div>
            <div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-muted-foreground" /><div><Label className="text-xs text-muted-foreground">Inventory</Label><p className="text-lg font-semibold">{product.inventory || 0}</p></div></div>
          </div>
        </div>
      </div>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isSubmitting}><Edit className="mr-2 h-4 w-4" />Edit</Button>
        <Button variant="destructive" onClick={() => setIsDeleting(true)} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
        <Button onClick={handleTogglePublish} disabled={isSubmitting}>
          {product.status === 'Active' ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
          {product.status === 'Active' ? 'Unpublish' : 'Publish'}
        </Button>
      </DialogFooter>
    </motion.div>
  );

  const EditMode = () => (
    <motion.form key="edit" onSubmit={handleSubmit(handleSave)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="name">Product Name</Label><Input id="name" {...register("name")} />{errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="category">Category</Label><Input id="category" {...register("category")} /></div>
      <div className="space-y-2"><Label htmlFor="caption">Description</Label><Textarea id="caption" {...register("caption")} rows={3} /></div>
      <div className="space-y-2"><Label htmlFor="features">Features (comma-separated)</Label><Textarea id="features" {...register("features")} rows={2} /></div>
      <div className="space-y-2"><Label htmlFor="tags">Tags</Label><Controller control={control} name="tags" render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />} /></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start border p-4 rounded-lg">
        <div className="space-y-2">
          <Label>Pricing Model</Label>
          <Controller control={control} name="pricing_type" render={({ field }) => (
            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4">
              <div className="flex items-center space-x-2"><RadioGroupItem value="one_time" id="one_time" /><Label htmlFor="one_time">One-time</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="subscription" id="subscription" /><Label htmlFor="subscription">Subscription</Label></div>
            </RadioGroup>
          )} />
        </div>
        <AnimatePresence>
          {pricingType === 'subscription' && (
            <motion.div key="interval" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
              <Label htmlFor="billing_interval">Billing Interval</Label>
              <Controller control={control} name="billing_interval" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <SelectTrigger><SelectValue placeholder="Select interval..." /></SelectTrigger>
                  <SelectContent><SelectItem value="month">Monthly</SelectItem><SelectItem value="year">Yearly</SelectItem></SelectContent>
                </Select>
              )} />
              {errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="price">Price</Label><Input id="price" type="number" step="0.01" {...register("price")} />{errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="inventory">Inventory</Label><Input id="inventory" type="number" {...register("inventory")} />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div>
      </div>
      <DialogFooter className="pt-4">
        <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
      </DialogFooter>
    </motion.form>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setIsEditing(false); } }}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4">{product.name}<Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>{product.status}</Badge></DialogTitle>
            <DialogDescription>View, edit, and manage your product details here.</DialogDescription>
          </DialogHeader>
          <AnimatePresence mode="wait">{isEditing ? <EditMode /> : <ViewMode />}</AnimatePresence>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the product.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete product</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};