import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, PlusCircle, MinusCircle, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { ScrollArea } from "./ui/scroll-area";
import { MediaItem } from "./MediaItem";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

interface OptionValue {
  value: string;
  price_difference: number;
  inventory: number;
  is_active: boolean;
  is_default: boolean;
}

interface ProductOption {
  name: string;
  values: OptionValue[];
}

interface Product {
  id: string;
  name: string;
  media_url: string;
  media_type: string | null;
  inventory: number;
  pricing_type: 'one_time' | 'subscription';
  details: {
    options_v2?: ProductOption[];
  };
}

const stockSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    baseInventory: z.coerce.number().int().min(0, "Inventory must be a non-negative integer").optional(),
    variants: z.array(z.object({
      optionIndex: z.number(),
      valueIndex: z.number(),
      value: z.string(),
      inventory: z.coerce.number().int().min(0, "Inventory must be a non-negative integer"),
    })).optional(),
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
  const defaultValues = useMemo(() => ({
    products: products.map(p => {
      const variants = p.details?.options_v2?.flatMap((option, optionIndex) => 
        option.values.map((value, valueIndex) => ({
          optionIndex,
          valueIndex,
          value: value.value,
          inventory: value.inventory || 0,
        }))
      ) || [];
      return {
        id: p.id,
        baseInventory: p.inventory || 0,
        variants: variants,
      };
    }),
  }), [products]);

  const { register, handleSubmit, reset, setValue, control, getValues, formState: { errors, isSubmitting } } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues,
  });

  const [batchStockValue, setBatchStockValue] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    reset(defaultValues);
    setBatchStockValue('');
  }, [defaultValues, reset]);

  const handleBatchStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBatchStockValue(value);
    const numValue = parseInt(value);

    if (!isNaN(numValue) && numValue >= 0) {
      products.forEach((product, productIndex) => {
        // 1. Update Base Inventory (if applicable)
        if (product.pricing_type === 'one_time' && !product.details?.options_v2?.length) {
          setValue(`products.${productIndex}.baseInventory`, numValue, { shouldDirty: true });
        }

        // 2. Update Variant Inventory (if applicable)
        if (product.details?.options_v2?.length) {
          // We need to iterate through the form's variant structure, not the product's original structure
          const formVariants = getValues(`products.${productIndex}.variants`);
          if (formVariants) {
            formVariants.forEach((_, variantIndex) => {
              setValue(`products.${productIndex}.variants.${variantIndex}.inventory`, numValue, { shouldDirty: true });
            });
          }
        }
      });
    }
  };

  const onSubmit = async (data: StockFormData) => {
    if (!userId) {
      showError("User not authenticated.");
      return;
    }

    try {
      const updatePromises = data.products.map(async (productData, productIndex) => {
        const product = products[productIndex];
        
        // 1. Prepare base product update payload
        const updatePayload: { inventory?: number; status?: string; details?: any } = {};
        
        if (product.pricing_type === 'one_time' && !product.details?.options_v2?.length) {
          // Update base inventory only if it's a simple product
          updatePayload.inventory = productData.baseInventory;
          updatePayload.status = (productData.baseInventory || 0) > 0 ? 'Active' : 'Out of Stock';
        }

        // 2. Handle Variant Updates
        if (product.details?.options_v2?.length && productData.variants) {
          const newOptionsV2 = JSON.parse(JSON.stringify(product.details.options_v2)); // Deep clone existing structure
          let totalVariantStock = 0;
          
          productData.variants.forEach(variantData => {
            const option = newOptionsV2[variantData.optionIndex];
            if (option) {
              const value = option.values[variantData.valueIndex];
              if (value) {
                value.inventory = variantData.inventory;
                totalVariantStock += variantData.inventory;
              }
            }
          });

          updatePayload.details = { ...product.details, options_v2: newOptionsV2 };
          
          // Update base inventory to reflect total variant stock
          updatePayload.inventory = totalVariantStock;
          updatePayload.status = totalVariantStock > 0 ? 'Active' : 'Out of Stock';
        }

        // 3. Execute update
        if (Object.keys(updatePayload).length > 0) {
          const { error: individualError } = await supabase
            .from('products')
            .update(updatePayload)
            .eq('id', productData.id);
          if (individualError) throw individualError;
        }
      });

      await Promise.all(updatePromises);

      showSuccess(`Stock updated for ${products.length === 1 ? '1 product' : `${products.length} products` }!`);
      onSave();
      onClose();
    } catch (err: any) {
      console.error("Failed to update stock:", err);
      showError(`Failed to update stock: ${err.message || "An unexpected error occurred."}`);
    }
  };

  const renderVariantInputs = (productIndex: number, product: Product) => {
    if (!product.details?.options_v2?.length) return null;

    const optionsV2 = product.details.options_v2;
    let variantIndexCounter = 0;

    return (
      <Accordion type="multiple" className="w-full mt-3 border rounded-md">
        {optionsV2.map((option, optionIndex) => (
          <AccordionItem key={option.name} value={option.name}>
            <AccordionTrigger className="px-3 py-2 text-sm font-semibold capitalize">{option.name}</AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="divide-y divide-muted">
                {option.values.map((value, valueIndex) => {
                  // Calculate the flat index for RHF form array access
                  const variantIndex = product.details.options_v2!.slice(0, optionIndex).reduce((sum, opt) => sum + opt.values.length, 0) + valueIndex;
                  const fieldName = `products.${productIndex}.variants.${variantIndex}`;
                  
                  return (
                    <div key={value.value} className="flex items-center justify-between gap-4 p-3 bg-background">
                      <Label className="text-sm font-medium flex-1">{value.value}</Label>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <Controller
                          name={`${fieldName}.inventory`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              {...field}
                              className="w-20 text-right h-8 text-sm"
                              min={0}
                              value={field.value === 0 ? '0' : field.value}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-md flex flex-col", products.length > 1 ? "h-[90vh]" : "h-auto")}>
        <DialogHeader className="flex-shrink-0">
        {products.length > 1 ? (
            <DialogTitle>Adjust Stock for {products.length} Products</DialogTitle>
          ) : (
            <DialogTitle>Adjust Stock for 1 Product</DialogTitle>
          )}
          <DialogDescription>
            Set the new inventory level for the selected products and their variants. Products with stock > 0 will be set as active.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          {products.length > 1 && (
            <div className="flex-shrink-0 p-4 border-b">
              <Label htmlFor="batch-stock" className="font-medium">Set all stock to:</Label>
              <Input
                id="batch-stock"
                type="number"
                value={batchStockValue}
                onChange={handleBatchStockChange}
                className="w-full mt-1"
                min={0}
                placeholder="Enter value to apply to all base/variant stocks"
              />
            </div>
          )}
          <ScrollArea className="flex-1 py-4">
            <div className="space-y-4 pr-4">
              {products.map((product, index) => (
                <div key={product.id} className="flex flex-col gap-3 p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-4">
                    <MediaItem src={product.media_url} alt={product.name} type={product.media_type} className="h-16 w-16 object-cover rounded-md flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{product.pricing_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  {/* Base Inventory Input (Only for simple products) */}
                  {product.pricing_type === 'one_time' && !product.details?.options_v2?.length && (
                    <div className="space-y-2">
                      <Label htmlFor={`products.${index}.baseInventory`} className="font-medium">Base Inventory</Label>
                      <Input
                        id={`products.${index}.baseInventory`}
                        type="number"
                        {...register(`products.${index}.baseInventory`, { valueAsNumber: true })}
                        className="w-24 mt-1"
                        min={0}
                      />
                      {errors.products?.[index]?.baseInventory && <p className="text-sm text-destructive mt-1">{errors.products[index]?.baseInventory?.message}</p>}
                    </div>
                  )}

                  {/* Variant Inventory Inputs */}
                  {renderVariantInputs(index, product)}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !userId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};