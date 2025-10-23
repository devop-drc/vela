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
  id: string;
  value: string;
  price_difference: number;
  inventory: number;
  is_active: boolean;
  is_default: boolean;
}

interface ProductOption {
  id: string;
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
    // options_v2 is now deprecated, but we keep the structure for simple products
  };
}

// Internal type for form state
interface FormProduct {
  id: string;
  name: string;
  media_url: string;
  media_type: string | null;
  pricing_type: 'one_time' | 'subscription';
  baseInventory: number;
  options: ProductOption[];
}

const stockSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    baseInventory: z.coerce.number().int().min(0, "Inventory must be a non-negative integer").optional(),
    options: z.array(z.object({
      id: z.string(),
      values: z.array(z.object({
        id: z.string(),
        inventory: z.coerce.number().int().min(0, "Inventory must be a non-negative integer"),
      })),
    })).optional(),
  })),
  batchStockValue: z.string().optional(),
});

type StockFormData = z.infer<typeof stockSchema>;

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  products: Product[]; // Array of selected products (base product data)
}

export const StockAdjustmentModal = ({ isOpen, onClose, onSave, products: baseProducts }: StockAdjustmentModalProps) => {
  const [formProducts, setFormProducts] = useState<FormProduct[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [batchStockValue, setBatchStockValue] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Fetch user and detailed product data (including options/values)
  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      if (!user || baseProducts.length === 0) {
        setIsLoadingData(false);
        return;
      }

      const productIds = baseProducts.map(p => p.id);

      // Fetch all options and values for the selected products
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select(`
          product_id,
          id,
          name,
          option_values (
            id,
            value,
            price_difference,
            inventory,
            is_active,
            is_default
          )
        `)
        .in('product_id', productIds)
        .order('display_order')
        .order('created_at', { foreignTable: 'option_values', ascending: true });

      if (optionsError) {
        showError("Failed to load product variants.");
        console.error("Error fetching variants:", optionsError);
        setIsLoadingData(false);
        return;
      }

      const optionsMap = new Map<string, ProductOption[]>();
      (optionsData || []).forEach(opt => {
        const productId = opt.product_id;
        if (!optionsMap.has(productId)) {
          optionsMap.set(productId, []);
        }
        optionsMap.get(productId)!.push({
          id: opt.id,
          name: opt.name,
          values: opt.option_values as OptionValue[],
        });
      });

      const initialFormProducts: FormProduct[] = baseProducts.map(p => ({
        id: p.id,
        name: p.name,
        media_url: p.media_url,
        media_type: p.media_type,
        pricing_type: p.pricing_type,
        baseInventory: p.inventory || 0,
        options: optionsMap.get(p.id) || [],
      }));

      setFormProducts(initialFormProducts);
      setIsLoadingData(false);
    };

    fetchDetails();
  }, [baseProducts]);

  // 2. Prepare default values for RHF
  const defaultValues = useMemo(() => ({
    products: formProducts.map(p => ({
      id: p.id,
      baseInventory: p.baseInventory,
      options: p.options.map(opt => ({
        id: opt.id,
        values: opt.values.map(val => ({
          id: val.id,
          inventory: val.inventory,
        })),
      })),
    })),
  }), [formProducts]);

  const { register, handleSubmit, reset, setValue, control, getValues, formState: { errors, isSubmitting } } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!isLoadingData) {
      reset(defaultValues);
      setBatchStockValue('');
    }
  }, [isLoadingData, defaultValues, reset]);

  const handleBatchStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBatchStockValue(value);
    const numValue = parseInt(value);

    if (!isNaN(numValue) && numValue >= 0) {
      formProducts.forEach((product, productIndex) => {
        // 1. Update Base Inventory (if applicable)
        if (product.pricing_type === 'one_time' && product.options.length === 0) {
          setValue(`products.${productIndex}.baseInventory`, numValue, { shouldDirty: true });
        }

        // 2. Update Variant Inventory (if applicable)
        if (product.options.length > 0) {
          product.options.forEach((option, optionIndex) => {
            option.values.forEach((_, valueIndex) => {
              setValue(`products.${productIndex}.options.${optionIndex}.values.${valueIndex}.inventory`, numValue, { shouldDirty: true });
            });
          });
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
      const baseProductUpdates: { id: string; inventory: number; status: string }[] = [];
      const optionValueUpdates: { id: string; inventory: number; is_active: boolean }[] = [];

      data.products.forEach((productData) => {
        const product = formProducts.find(p => p.id === productData.id);
        if (!product) return;

        if (product.options.length > 0 && productData.options) {
          // Product with variants: calculate total stock and collect variant updates
          let totalVariantStock = 0;
          productData.options.forEach((optionData) => {
            optionData.values.forEach((valueData) => {
              totalVariantStock += valueData.inventory;
              optionValueUpdates.push({
                id: valueData.id,
                inventory: valueData.inventory,
                is_active: valueData.inventory > 0, // Set active if stock > 0
              });
            });
          });

          baseProductUpdates.push({
            id: product.id,
            inventory: totalVariantStock,
            status: totalVariantStock > 0 ? 'Active' : 'Out of Stock',
          });

        } else if (product.pricing_type === 'one_time' && productData.baseInventory !== undefined) {
          // Simple product: update base inventory
          baseProductUpdates.push({
            id: product.id,
            inventory: productData.baseInventory,
            status: productData.baseInventory > 0 ? 'Active' : 'Out of Stock',
          });
        }
      });

      // 1. Update Option Values (if any)
      if (optionValueUpdates.length > 0) {
        const { error: valuesError } = await supabase
          .from('option_values')
          .upsert(optionValueUpdates, { onConflict: 'id' });
        if (valuesError) throw new Error(`Failed to update variant stock: ${valuesError.message}`);
      }

      // 2. Update Base Products (inventory and status)
      if (baseProductUpdates.length > 0) {
        const { error: productsError } = await supabase
          .from('products')
          .upsert(baseProductUpdates, { onConflict: 'id' });
        if (productsError) throw new Error(`Failed to update base product stock/status: ${productsError.message}`);
      }

      showSuccess(`Stock updated for ${baseProducts.length === 1 ? '1 product' : `${baseProducts.length} products` }!`);
      onSave();
    } catch (err: any) {
      console.error("Failed to update stock:", err);
      showError(`Failed to update stock: ${err.message || "An unexpected error occurred."}`);
    }
  };

  const renderVariantInputs = (productIndex: number, product: FormProduct) => {
    if (product.options.length === 0) return null;

    return (
      <Accordion type="multiple" className="w-full mt-3 border rounded-md">
        {product.options.map((option, optionIndex) => (
          <AccordionItem key={option.id} value={option.id}>
            <AccordionTrigger className="px-3 py-2 text-sm font-semibold capitalize">{option.name}</AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="divide-y divide-muted">
                {option.values.map((value, valueIndex) => {
                  const fieldName = `products.${productIndex}.options.${optionIndex}.values.${valueIndex}`;
                  
                  return (
                    <div key={value.id} className="flex items-center justify-between gap-4 p-3 bg-background">
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

  if (isLoadingData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md flex flex-col h-auto">
          <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
          <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-md flex flex-col", formProducts.length > 1 ? "h-[90vh]" : "h-auto")}>
        <DialogHeader className="flex-shrink-0">
        {formProducts.length > 1 ? (
            <DialogTitle>Adjust Stock for {formProducts.length} Products</DialogTitle>
          ) : (
            <DialogTitle>Adjust Stock for 1 Product</DialogTitle>
          )}
          <DialogDescription>
            Set the new inventory level for the selected products and their variants. Products with stock &gt; 0 will be set as active.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          {formProducts.length > 1 && (
            <div className="flex-shrink-0 p-4 border-b">
              <Label htmlFor="batch-stock" className="font-medium">Set all stock to:</Label>
              <Input
                id="batch-stock"
                type="number"
                {...register("batchStockValue")}
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
              {formProducts.map((product, index) => (
                <div key={product.id} className="flex flex-col gap-3 p-3 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-4">
                    <MediaItem src={product.media_url} alt={product.name} type={product.media_type} className="h-16 w-16 object-cover rounded-md flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{product.pricing_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  {/* Base Inventory Input (Only for simple products without variants) */}
                  {product.pricing_type === 'one_time' && product.options.length === 0 && (
                    <div className="space-y-2">
                      <Label htmlFor={`products.${index}.baseInventory`} className="font-medium">Base Inventory</Label>
                      <Controller
                        name={`products.${index}.baseInventory`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            id={`products.${index}.baseInventory`}
                            type="number"
                            {...field}
                            className="w-24 mt-1"
                            min={0}
                            value={field.value === 0 ? '0' : field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        )}
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