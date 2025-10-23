import { useRef, useState, useEffect, useCallback, useMemo, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Controller, useFormContext } from "react-hook-form";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { TagInput } from "../TagInput";
import { Loader2, XCircle, PlusCircle, CheckCircle, Archive, Sparkles, Settings, Cloud, Package, Banknote, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import useAutosizeTextArea from "@/hooks/use-autosize-textarea";
import { supabase } from "@/integrations/supabase/client";
import { CreatableCombobox } from "../CreatableCombobox";
import { currencies } from "@/lib/currencies";
import { MediaItem } from "../MediaItem";
import { toast } from "sonner";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { useShop } from "@/contexts/ShopContext";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { showError, showSuccess } from "@/utils/toast";
import { OptionsManager } from "./OptionsManager";

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", label: "Active" },
  'Draft': { icon: Eye, color: "text-amber-600", label: "Draft" }, // Changed icon to Eye
  'Out of Stock': { icon: Package, color: "text-slate-600", label: "Out of Stock" }, // Changed icon to Package
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

export const ProductEditMode = ({ product, mediaItems, setMediaItems, handleImageUpload, handleImageDelete, isUploading, form, onCancel, onClose, onUpdate, isSubmitting, setIsSubmitting }: any) => {
    const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;
    const { shopDetails, convertCurrency } = useShop();
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [typeOptions, setTypeOptions] = useState<string[]>([]);
    const [typeAttributes, setTypeAttributes] = useState<any[]>([]);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    
    const pricingType = watch("pricing_type");
    const categoryValue = watch("category");
    const typeValue = watch("details.type");
    const statusValue = watch("status");
    const captionValue = watch("caption");
    const productType = watch("product_type");
    const currencyCode = watch("currency");

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { ref: rhfRef, ...captionProps } = register("caption");
    useAutosizeTextArea(textAreaRef.current, captionValue || "");

    // --- Initialization ---
    useEffect(() => {
        if (product && shopDetails) {
            // Convert price from product.currency (stored in DB, now always ALL) to shopDetails.currency (display)
            const priceInDisplayCurrency = convertCurrency(product.price, product.currency, shopDetails.currency);

            // Ensure details.options_v2 exists and is an array, and ensure is_default/isSelected are present
            const initialDetails = product.details || { type: 'generic' };
            if (!initialDetails.options_v2) {
                initialDetails.options_v2 = [];
            } else {
                initialDetails.options_v2 = initialDetails.options_v2.map((opt: any) => {
                    let hasExistingDefault = false;
                    
                    // 1. Check if any value already has is_default set to true
                    opt.values.forEach((val: any) => {
                        if (val.is_default) {
                            hasExistingDefault = true;
                        }
                    });

                    // 2. Process values, applying conversion and setting default only if needed
                    const processedValues = opt.values.map((val: any, index: number) => {
                        // CRITICAL FIX: Use product.currency as source for conversion
                        const priceDiffInDisplayCurrency = convertCurrency(val.price_difference, product.currency, shopDetails.currency);
                        
                        let isDefault = val.is_default;
                        
                        // FIX: Only set the first item as default if NO existing default was found AND the list is not empty.
                        if (!hasExistingDefault && index === 0 && opt.values.length > 0) {
                            isDefault = true; 
                        }

                        return {
                            ...val,
                            price_difference: priceDiffInDisplayCurrency, // <-- CONVERTED HERE
                            is_default: isDefault || false, // Ensure it's boolean
                            isSelected: false, // Always reset selection state on load
                        };
                    });

                    return { ...opt, values: processedValues };
                });
            }

            // 1. Initialize form with base product data
            form.reset({
                name: product.name || "",
                status: product.status || "Draft",
                caption: product.caption || "",
                category: product.category || "",
                price: priceInDisplayCurrency, // Set price in display currency for the form
                currency: shopDetails.currency || 'USD', // Always use shop's currency for the form's currency selector
                inventory: product.inventory || 0, // Base inventory
                tags: Array.isArray(product.tags) ? product.tags : [],
                pricing_type: product.pricing_type || 'one_time',
                billing_interval: product.billing_interval,
                details: initialDetails,
                product_type: product.product_type || 'physical',
            });
            const gallery = product.media_gallery?.length ? product.media_gallery : (product.media_url ? [product.media_url] : []);
            setMediaItems(gallery);
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
                // Use all attributes defined for the type
                setTypeAttributes(selectedType?.attributes || []);
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
            if (!user) throw new Error("User not authenticated.");
            
            const { data: analysis, error } = await supabase.functions.invoke('ai-product-classifier', { body: { caption, user_id: user.id } });
            if (error) throw error;
            if (analysis.error) throw new Error(analysis.error);
            if (!analysis.isProductPost) throw new Error("The AI couldn't identify this as a product. Try adding more detail.");
            
            // Update core fields
            if (analysis.categoryName) setValue('category', analysis.categoryName, { shouldDirty: true });
            if (analysis.typeName) setValue('details.type', analysis.typeName, { shouldDirty: true });
            
            // Update specifications and options (which are now combined in the details object)
            const newDetails: { [key: string]: any } = { type: analysis.typeName, options_v2: [] };
            
            // Merge specifications and options into newDetails
            if (analysis.specifications) {
                for (const [key, value] of Object.entries(analysis.specifications)) {
                    newDetails[key] = value;
                }
            }
            
            // Convert old options structure (simple array of values) into new options_v2 structure
            if (analysis.options) {
                const newOptionsV2: any[] = [];
                for (const [name, values] of Object.entries(analysis.options)) {
                    if (Array.isArray(values) && values.length > 0) {
                        newOptionsV2.push({
                            name: toTitleCase(name),
                            values: values.map((v, index) => ({
                                value: v,
                                price_difference: 0,
                                inventory: 10, // Default inventory
                                is_active: true,
                                is_default: index === 0, // Set the first value as default
                                isSelected: false, // Reset selection state
                            }))
                        });
                    }
                }
                newDetails.options_v2 = newOptionsV2;
            }

            // Update the form's details object
            setValue('details', newDetails, { shouldDirty: true });

            toast.success("AI analysis complete! Product details have been updated.", { id: toastId });
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsReanalyzing(false);
        }
    };

    const handleSave = async (data: any) => {
        setIsSubmitting(true);
        let error = null;
        
        try {
            // 1. Prepare details payload: only include fields present in the form/type attributes
            const cleanedDetails: { [key: string]: any } = { type: data.details.type };
            
            // Add all dynamic attributes (specs + options_v2)
            Object.entries(data.details).forEach(([key, value]) => {
                if (key !== 'type') {
                    if (key === 'options_v2' && Array.isArray(value)) {
                        // FIX: Filter out any options groups that somehow became empty
                        const filteredOptions = value.filter((option: any) => Array.isArray(option.values) && option.values.length > 0);

                        cleanedDetails[key] = filteredOptions.map((option: any) => ({
                            ...option,
                            values: option.values.map((val: any) => {
                                // Destructure to exclude temporary fields
                                const { isSelected, ...rest } = val;
                                
                                // CONVERT price_difference back from display currency (data.currency) to ALL before saving
                                const priceDiffInALL = convertCurrency(val.price_difference, data.currency, 'ALL');
                                
                                return { ...rest, price_difference: priceDiffInALL };
                            })
                        }));
                    } else {
                        cleanedDetails[key] = value;
                    }
                }
            });

            // 2. Convert price from form's display currency (data.currency) to ALL for storage
            // The price in the form is in the display currency. We must convert it back to ALL.
            const priceInALL = convertCurrency(data.price, data.currency, 'ALL');

            // 3. Update Supabase
            const { error: updateError } = await supabase.from('products').update({
                name: data.name, status: data.status, caption: data.caption, category: data.category,
                price: priceInALL, // Save price in ALL
                currency: 'ALL', // Always store currency as ALL
                inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
                tags: data.tags, pricing_type: data.pricing_type,
                billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
                details: cleanedDetails,
                media_gallery: mediaItems,
                media_url: mediaItems[0] || null,
                thumbnail_url: mediaItems[0] || null,
                product_type: data.product_type,
              }).eq('id', product.id);

            if (updateError) { 
                error = updateError;
                showError(`Failed to update product: ${error.message}`); 
                console.error("ProductEditor: Error updating product:", error); 
            } 
            else { 
                showSuccess("Product updated successfully!"); 
                if (onUpdate) onUpdate(); // Call onUpdate
            }
        } catch (e: any) {
            error = e;
            showError(`An unexpected error occurred: ${e.message}`);
            console.error("ProductEditor: Unexpected error during save:", e);
        } finally {
            setIsSubmitting(false);
            if (!error) {
                onClose();
            }
        }
    };

    const currentStatusConfig = statusConfig[statusValue as keyof typeof statusConfig];
    const StatusIcon = currentStatusConfig?.icon;

    // Find the currency symbol for display
    const currencySymbol = useMemo(() => {
        return currencies.find(c => c.code === currencyCode)?.symbol || currencyCode;
    }, [currencyCode]);

    // Filter attributes to only include those defined by the current type
    const attributesToRender = useMemo(() => {
        const attributeNames = new Set(typeAttributes.map(attr => attr.name));
        
        // Include all attributes defined in the type, plus any existing custom ones in details
        const existingDetailsKeys = Object.keys(getValues('details') || {}).filter(key => key !== 'type' && key !== 'options_v2');
        const allKeys = new Set([...attributeNames, ...existingDetailsKeys]);

        return Array.from(allKeys).map(key => {
            const typeAttr = typeAttributes.find(attr => attr.name === key);
            return {
                name: key,
                inputType: typeAttr?.inputType || 'text',
                isOption: typeAttr?.isOption || false,
            };
        }).sort((a, b) => {
            // Sort options (isOption: true) first, then specifications
            if (a.isOption && !b.isOption) return -1;
            if (!a.isOption && b.isOption) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [typeAttributes, getValues]);

    // Filter out attributes that are now handled by options_v2 (Color, Size, etc.)
    const specificationsToRender = attributesToRender.filter(attr => !attr.isOption);

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
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                    {mediaItems.map((url: string) => (
                      <div key={url} className="relative group">
                        <MediaItem src={url} alt="Thumbnail" className="h-16 w-16 rounded-md object-cover border" />
                        <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleImageDelete(url); }}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
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
                      <Controller control={control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className={cn("w-[140px] border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-muted/50", currentStatusConfig?.color)}>{StatusIcon ? (<div className="flex items-center gap-2"><StatusIcon className="h-4 w-4" /><span>{currentStatusConfig.label}</span></div>) : <SelectValue placeholder="Set status..." />}</SelectTrigger><SelectContent>{Object.entries(statusConfig).map(([status, { icon: Icon, color, label }]) => (<SelectItem key={status} value={status} className={color}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{label}</span></div></SelectItem>))}</SelectContent></Select>)} />
                    </div>
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <Textarea id="caption" {...captionProps} ref={(e) => { rhfRef(e); textAreaRef.current = e as HTMLTextAreaElement; }} placeholder="No description provided." className="border-0 border-b-2 rounded-none bg-transparent p-0 text-base text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors resize-none" />
                  <div className="flex items-center justify-end pt-4"><Button type="button" variant="outline" onClick={handleReanalyze} disabled={isReanalyzing}>{isReanalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-amber-400" />}Find Specs with AI</Button></div>
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
                        <div className="space-y-1 col-span-2"><Label htmlFor="price" className="text-xs">Base Price</Label><div className="flex items-center gap-2"><div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currencySymbol}</span><Input id="price" type="number" step="0.01" {...register("price")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-8" /></div><Controller name="currency" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="w-28 border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="USD" /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select>)} /></div>{errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}{errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}</div>
                        <AnimatePresence>{pricingType === 'one_time' && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-hidden"><div className="space-y-1"><Label htmlFor="inventory" className="text-xs">Base Stock</Label><Input id="inventory" type="number" {...register("inventory")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div></motion.div>)}{pricingType === 'subscription' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label className="text-xs">Interval</Label><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-full border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} />{errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}</motion.div>)}</AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Specifications (Fixed Details) */}
              {specificationsToRender.length > 0 && (
                <Card>
                  <CardHeader><CardTitleComponent className="text-base flex items-center gap-2"><Settings className="h-5 w-5" /> Specifications (Fixed Details)</CardTitleComponent></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {specificationsToRender.map((attr: any) => {
                      const Icon = getAttributeIcon(attr.name);
                      return (
                        <div key={attr.name} className="space-y-2">
                          <Label className="capitalize flex items-center gap-1.5"><Icon className="h-4 w-4" />{toTitleCase(attr.name)}</Label>
                          <AttributeInput control={control} fieldName={attr.name} inputType={attr.inputType} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Options Manager */}
              <OptionsManager />
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t"><Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product</Button></DialogFooter>
        </form>
      </motion.div>
    )
};