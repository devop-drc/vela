import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { TagInput } from "@/components/TagInput";
import { Loader2, XCircle, PlusCircle, CheckCircle, Archive, Sparkles, Move, Edit2, Package, Cloud, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import useAutosizeTextArea from "@/hooks/use-autosize-textarea";
import { supabase } from "@/integrations/supabase/client";
import { CreatableCombobox } from "../CreatableCombobox";
import { currencies } from "@/lib/currencies";
import { MediaItem } from "../MediaItem";
import { toast } from "sonner";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { VariantManager } from "./VariantManager"; // Use the new VariantManager

// Define types used by VariantManager locally
interface Option {
  id: string;
  name: string;
  values: string[];
}

interface Variant {
  id: string;
  name: string; // e.g., "Red / Small"
  optionValues: string[]; // e.g., ["Red", "Small"]
  priceDifference: number; // Difference from base price
  inventory: number;
  sku: string;
  disabled: boolean;
}

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", label: "Active" },
  'Draft': { icon: XCircle, color: "text-amber-600", label: "Draft" },
  'Out of Stock': { icon: Archive, color: "text-slate-600", label: "Out of Stock" },
};

// Helper to convert snake_case to Title Case for display
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const AttributeInput = ({ control, fieldName, inputType }: any) => {
  const name = `details.${fieldName}`;
  switch (inputType) {
    case 'number':
      return <Controller name={name} control={control} render={({ field }) => <Input type="number" {...field} value={field.value || ''} />} />;
    case 'tags':
      return <Controller name={name} control={control} render={({ field }) => <TagInput {...field} value={Array.isArray(field.value) ? field.value : (field.value ? [field.value] : [])} />} />;
    case 'color':
        return <Controller name={name} control={control} render={({ field }) => <Input type="color" {...field} value={field.value || '#000000'} className="h-10 w-16" />} />;
    default:
      return <Controller name={name} control={control} render={({ field }) => <Input {...field} value={field.value || ''} />} />;
  }
};

export const ProductEditMode = ({ product, mediaItems, setMediaItems, handleImageUpload, handleImageDelete, isUploading, form, onCancel, isSubmitting, setIsSubmitting }: any) => {
    const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;
    const { shopDetails, convertCurrency } = useShop();
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [typeOptions, setTypeOptions] = useState<string[]>([]);
    const [typeAttributes, setTypeAttributes] = useState<any[]>([]);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    
    // New state for variants
    const [productOptions, setProductOptions] = useState<Option[]>([]);
    const [productVariants, setProductVariants] = useState<Variant[]>([]);

    const pricingType = watch("pricing_type");
    const categoryValue = watch("category");
    const typeValue = watch("details.type");
    const statusValue = watch("status");
    const captionValue = watch("caption");
    const productType = watch("product_type");
    const basePrice = watch("price");
    const baseInventory = watch("inventory");

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { ref: rhfRef, ...captionProps } = register("caption");
    useAutosizeTextArea(textAreaRef.current, captionValue || "");

    // --- Initialization ---
    useEffect(() => {
        if (product && shopDetails) {
            const priceInDisplayCurrency = convertCurrency(product.price, product.currency, shopDetails.currency);

            // 1. Initialize Options and Variants from product.details
            // Ensure IDs are present for Reorder.Group in VariantManager
            const initialOptions: Option[] = (product.details?.options || []).map((opt: any) => ({
                ...opt,
                id: opt.id || crypto.randomUUID(),
            }));
            const initialVariants: Variant[] = product.details?.variants || [];
            
            setProductOptions(initialOptions);
            setProductVariants(initialVariants);

            // 2. Initialize form with base product data
            form.reset({
                name: product.name || "",
                status: product.status || "Draft",
                caption: product.caption || "",
                category: product.category || "",
                price: priceInDisplayCurrency, // Base price in display currency
                currency: shopDetails.currency || 'USD', // Always use shop's currency for the form's currency selector
                inventory: product.inventory || 0, // Base inventory (sum of variants or single stock)
                tags: Array.isArray(product.tags) ? product.tags : [],
                pricing_type: product.pricing_type || 'one_time',
                billing_interval: product.billing_interval,
                // Specifications are stored directly in details, excluding 'options' and 'variants'
                details: {
                    type: product.details?.type || 'generic',
                    ...Object.fromEntries(Object.entries(product.details || {}).filter(([k]) => k !== 'type' && k !== 'options' && k !== 'variants'))
                }
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
    }, [product, form.reset, shopDetails, convertCurrency, setMediaItems]);

    // --- Metadata Fetching ---
    useEffect(() => {
      const fetchCategories = async () => {
          const { data } = await supabase.from('categories').select('name');
          setCategoryOptions(data?.map(c => c.name) || []);
      };
      fetchCategories();
    }, []);

    useEffect(() => {
      const fetchTypesAndAttributes = async () => {
          if (!categoryValue) {
              setTypeOptions([]);
              setTypeAttributes([]);
              return;
          }
          const { data: categoryData } = await supabase.from('categories').select('id').eq('name', categoryValue).single();
          if (categoryData) {
              const { data: dbTypes } = await supabase.from('types').select('name, attributes').eq('category_id', categoryData.id);
              setTypeOptions(dbTypes?.map(t => t.name) || []);
              
              const selectedType = dbTypes?.find(t => t.name === typeValue);
              // Filter attributes to only include specifications (isOption: false)
              setTypeAttributes(selectedType?.attributes?.filter((attr: any) => !attr.isOption) || []);
          } else {
              setTypeOptions([]);
              setTypeAttributes([]);
          }
      };
      fetchTypesAndAttributes();
    }, [categoryValue, typeValue]);

    // --- Handlers ---
    const handleReanalyze = async () => {
        setIsReanalyzing(true);
        const toastId = toast.loading("AI is analyzing your description...");
        try {
            const caption = getValues('caption');
            if (!caption) throw new Error("Please provide a description for the AI to analyze.");
            const { data: { user } = {} } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in.");
            
            const { data: analysis, error } = await supabase.functions.invoke('ai-product-classifier', { body: { caption, user_id: user.id } });
            if (error) throw error;
            if (analysis.error) throw new Error(analysis.error);
            if (!analysis.isProductPost) throw new Error("The AI couldn't identify this as a product. Try adding more detail.");
            
            // Update core fields
            if (analysis.categoryName) setValue('category', analysis.categoryName, { shouldDirty: true });
            if (analysis.typeName) setValue('details.type', analysis.typeName, { shouldDirty: true });
            
            // Update specifications (direct details)
            if (analysis.specifications) {
                for (const [key, value] of Object.entries(analysis.specifications)) {
                    setValue(`details.${key}`, value, { shouldDirty: true });
                }
            }

            // Update options (for VariantManager)
            if (analysis.options) {
                const newOptions: Option[] = Object.entries(analysis.options).map(([name, values]) => ({
                    id: crypto.randomUUID(), // Assign new IDs for new options
                    name: toTitleCase(name),
                    values: Array.isArray(values) ? values.map(String) : [String(values)],
                }));
                setProductOptions(newOptions);
                setProductVariants([]); // Reset variants to force regeneration based on new options
            }

            toast.success("AI analysis complete! Product details have been updated.", { id: toastId });
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsReanalyzing(false);
        }
    };

    const handleVariantManagerUpdate = useCallback((options: Option[], variants: Variant[]) => {
        setProductOptions(options);
        setProductVariants(variants);
    }, []);

    const handleSave = async (data: any) => {
        setIsSubmitting(true);
        
        // 1. Prepare details payload: merge specifications and new variant data
        const cleanedDetails: { [key: string]: any } = { type: data.details.type };
        
        // Add specifications (non-option fields)
        Object.entries(data.details).forEach(([key, value]) => {
            if (key !== 'type') {
                cleanedDetails[key] = value;
            }
        });

        // 2. Determine base price and inventory for the main product record
        const activeVariants = productVariants.filter(v => !v.disabled);
        const hasVariants = activeVariants.length > 0;

        // Convert price from form's display currency (data.currency) to ALL for storage
        let priceInALL = convertCurrency(data.price, data.currency, 'ALL');
        let baseInventoryForDB = data.pricing_type === 'one_time' ? data.inventory : 0;

        if (hasVariants) {
            // If variants exist, set base price to the lowest active variant price
            const activePrices = activeVariants.map(v => data.price + v.priceDifference);
            const lowestFinalPrice = activePrices.length > 0 ? Math.min(...activePrices) : data.price;
            
            priceInALL = convertCurrency(lowestFinalPrice, data.currency, 'ALL');
            
            // Set base inventory to the sum of all active variant inventories
            baseInventoryForDB = activeVariants.reduce((sum, v) => sum + v.inventory, 0);

            // Add options and variants to details
            cleanedDetails.options = productOptions;
            cleanedDetails.variants = activeVariants;
        } else {
            // If no variants, remove options/variants keys
            delete cleanedDetails.options;
            delete cleanedDetails.variants;
        }

        // 3. Update Supabase
        const { error } = await supabase.from('products').update({
            name: data.name, status: data.status, caption: data.caption, category: data.category,
            price: priceInALL, // Save calculated base price in ALL
            currency: 'ALL', // Always store currency as ALL
            inventory: baseInventoryForDB, // Save calculated total inventory
            tags: data.tags, pricing_type: data.pricing_type,
            billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
            details: cleanedDetails,
            media_gallery: mediaItems,
            media_url: mediaItems[0] || null,
            thumbnail_url: mediaItems[0] || null,
          }).eq('id', product.id);

        if (error) { showError(`Failed to update product: ${error.message}`); console.error("ProductEditor: Error updating product:", error); } 
        else { showSuccess("Product updated successfully!"); onUpdate(); onCancel(); }
        setIsSubmitting(false);
    };

    const currentStatusConfig = statusConfig[statusValue as keyof typeof statusConfig];
    const StatusIcon = currentStatusConfig?.icon;

    // Filter specifications to only include those defined by the current type, plus any existing custom ones
    const specificationKeys = new Set(typeAttributes.map(attr => attr.name));
    const specificationsToRender = Object.entries(getValues('details') || {})
        .filter(([key]) => key !== 'type' && key !== 'options' && key !== 'variants' && (specificationKeys.has(key) || !productOptions.some(o => o.name.toLowerCase() === key.toLowerCase())));

    const hasVariants = productVariants.length > 0;

    return (
      <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <form onSubmit={handleSubmit(handleSave)} className="flex-1 flex flex-col min-h-0">
          <DialogHeader className="sr-only"><DialogTitle>Update Product</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
                <div className="md:col-span-4">
                  {mediaItems.length > 0 && (
                      <Carousel className="w-full rounded-lg overflow-hidden border mb-4">
                          <CarouselContent>
                              {mediaItems.map((url: string, index: number) => (
                                  <CarouselItem key={index}>
                                      <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                                          <MediaItem src={url} alt={`${product.name} - media ${index + 1}`} type={index === 0 ? product.media_type : null} />
                                      </div>
                                  </CarouselItem>
                              ))}
                          </CarouselContent>
                          {mediaItems.length > 1 && (
                              <>
                                  <CarouselPrevious className="left-2" />
                                  <CarouselNext className="right-2" />
                              </>
                          )}
                      </Carousel>
                  )}
                  <Reorder.Group axis="x" values={mediaItems} onReorder={setMediaItems} className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                    {mediaItems.map((url: string) => (
                      <Reorder.Item key={url} value={url} className="relative group cursor-grab active:cursor-grabbing">
                        <MediaItem src={url} alt="Thumbnail" className="h-16 w-16 rounded-md object-cover border" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleImageDelete(url); }}><XCircle className="h-4 w-4" /></Button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      Add Media
                    </label>
                  </Button>
                  <Input id="image-upload" type="file" className="hidden" accept="image/*,video/*" onChange={handleImageUpload} disabled={isUploading} />
                </div>
                <div className="md:col-span-6 flex flex-col space-y-4">
                  <div>
                    <div className="flex shrink gap-4 text-sm font-medium">
                      <div className="w-fit min-w-[165px]"><Controller name="category" control={control} render={({ field }) => (<CreatableCombobox options={categoryOptions} placeholder="Category..." {...field} />)} /></div>
                      <div className="w-fit min-w-[165px]"><Controller name="details.type" control={control} render={({ field }) => (<CreatableCombobox options={typeOptions} placeholder="Type..." {...field} />)} /></div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Input id="name" {...register("name")} placeholder="Product Name" className="w-auto border-0 border-b-2 rounded-none bg-transparent p-0 text-3xl font-bold tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors" />
                      <Controller control={control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className={cn("w-[140px] border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50", currentStatusConfig?.color)}>{StatusIcon ? (<div className="flex items-center gap-2"><StatusIcon className="h-4 w-4" /><span>{currentStatusConfig.label}</span></div>) : <SelectValue placeholder="Set status..." />}</SelectTrigger><SelectContent>{Object.entries(statusConfig).map(([status, { icon: Icon, color, label }]) => (<SelectItem key={status} value={status} className={color}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{label}</span></div></SelectItem>))}</SelectContent></Select>)} />
                    </div>
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <Textarea id="caption" {...captionProps} ref={(e) => { rhfRef(e); textAreaRef.current = e as HTMLTextAreaElement; }} placeholder="No description provided." className="border-0 border-b-2 rounded-none bg-transparent p-0 text-base text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors resize-none" />
                  <div><Label>Tags</Label><Controller control={control} name="tags" render={({ field }) => <TagInput {...field} value={Array.isArray(field.value) ? field.value : (field.value ? [field.value] : [])} />} /></div>
                  <div className="space-y-2 pt-2">
                    <Label>Pricing Model</Label>
                    <div className="flex items-center gap-4">
                      <Controller control={control} name="pricing_type" render={({ field }) => (<ToggleGroup type="single" onValueChange={field.onChange} value={field.value} variant="outline" size="sm"><ToggleGroupItem value="one_time">One-time</ToggleGroupItem><ToggleGroupItem value="subscription">Subscription</ToggleGroupItem></ToggleGroup>)} />
                      <Controller control={control} name="product_type" render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="physical" id="product-type-physical" />
                            <Label htmlFor="product-type-physical" className="flex items-center gap-1"><Package className="h-4 w-4" /> Physical</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="digital" id="product-type-digital" />
                            <Label htmlFor="product-type-digital" className="flex items-center gap-1"><Cloud className="h-4 w-4" /> Digital</Label>
                          </div>
                        </RadioGroup>
                      )} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="space-y-1 col-span-2"><Label htmlFor="price" className="text-xs">Base Price</Label><div className="flex items-center gap-2"><Input id="price" type="number" step="0.01" {...register("price")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" disabled={hasVariants} /><Controller name="currency" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="w-28 border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="USD" /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select>)} /></div>{errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}{errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}</div>
                        <AnimatePresence>{pricingType === 'one_time' && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-hidden"><div className="space-y-1"><Label htmlFor="inventory" className="text-xs">Base Stock</Label><Input id="inventory" type="number" {...register("inventory")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" disabled={hasVariants} />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div></motion.div>)}{pricingType === 'subscription' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label className="text-xs">Interval</Label><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-full border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} />{errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}</motion.div>)}</AnimatePresence>
                    </div>
                    {hasVariants && (
                        <p className="text-xs text-muted-foreground mt-1">Base Price/Stock fields are disabled because variants are active. The lowest variant price and total variant stock will be used for the main product listing.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end pt-4"><Button type="button" variant="outline" onClick={handleReanalyze} disabled={isReanalyzing}>{isReanalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-amber-400" />}Find Specs with AI</Button></div>
              
              {/* Variant Manager */}
              <VariantManager
                initialOptions={productOptions}
                initialVariants={productVariants}
                basePrice={basePrice}
                baseInventory={baseInventory}
                onUpdate={handleVariantManagerUpdate}
              />

              {/* Specifications (Fixed Details) */}
              <Card>
                <CardHeader><CardTitleComponent className="text-base flex items-center gap-2"><Settings className="h-5 w-5" /> Specifications (Fixed Details)</CardTitleComponent></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {specificationsToRender.map(([key, value]) => {
                    const Icon = getAttributeIcon(key);
                    return (
                      <div key={key} className="space-y-2">
                        <Label className="capitalize flex items-center gap-1.5"><Icon className="h-4 w-4" />{toTitleCase(key)}</Label>
                        <AttributeInput control={control} fieldName={key} inputType={typeAttributes.find(attr => attr.name === key)?.inputType || 'text'} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t"><Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product</Button></DialogFooter>
        </form>
      </motion.div>
    )
};