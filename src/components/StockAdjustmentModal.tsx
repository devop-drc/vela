import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ScrollArea } from "./ui/scroll-area";
import { MediaItem } from "./MediaItem";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  media_url: string;
  media_type: string | null;
  inventory: number;
}

const stockSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    inventory: z.coerce.number().int().min(0, "Inventory must be a non-negative integer"),
  })),
});

type StockFormData = z.infer<typeof stockSchema>;

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  products: Product[]; // Array of selected products
}

export const StockAdjustmentModal = ({ isOpen, onClose, onSave, products }: StockAdjustmentModalProps) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      products: products.map(p => ({ id: p.id, inventory: p.inventory || 0 })),
    },
  });

  useEffect(() => {
    reset({
      products: products.map(p => ({ id: p.id, inventory: p.inventory || 0 })),
    });
  }, [products, reset]);

  const onSubmit = async (data: StockFormData) => {
    setIsSubmitting(true);
    const updates = data.products.map(p => ({
      id: p.id,
      inventory: p.inventory,
      status: p.inventory > 0 ? 'Active' : 'Out of Stock', // Set to Active if stock > 0, else Out of Stock
    }));

    try {
      const { error } = await supabase.from('products').upsert(updates);
      if (error) throw error;

      showSuccess(`Stock updated for ${updates.length} product(s)!`);
      onSave();
      onClose();
    } catch (err: any) {
      console.error("Failed to update stock:", err);
      showError(`Failed to update stock: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-md", products.length > 1 && "max-h-[90vh] flex flex-col")}>
        <DialogHeader>
          <DialogTitle>Adjust Stock for {products.length} Product(s)</DialogTitle>
          <DialogDescription>
            Set the new inventory level for the selected product(s). Products with stock greater than 0 will be marked as 'Active'.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className={cn("space-y-4", products.length > 1 && "flex-1 flex flex-col overflow-hidden")}>
          <ScrollArea className={cn("py-4", products.length > 1 && "flex-1")}>
            <div className="space-y-4 pr-4">
              {products.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4 p-3 border rounded-md bg-muted/50">
                  <MediaItem src={product.media_url} alt={product.name} type={product.media_type} className="h-16 w-16 object-cover rounded-md" />
                  <div className="flex-1">
                    <Label htmlFor={`products.${index}.inventory`} className="font-medium">{product.name}</Label>
                    <Input
                      id={`products.${index}.inventory`}
                      type="number"
                      {...register(`products.${index}.inventory`, { valueAsNumber: true })}
                      className="w-24 mt-1"
                      min={0}
                    />
                    {errors.products?.[index]?.inventory && <p className="text-sm text-destructive mt-1">{errors.products[index]?.inventory?.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};