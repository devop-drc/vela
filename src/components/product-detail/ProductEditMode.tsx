import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Controller } from "react-hook-form";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TagInput } from "../TagInput";
import { Loader2, XCircle, PlusCircle, CheckCircle, Sparkles, Settings, Cloud, Package, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import useAutosizeTextArea from "@/hooks/use-autosize-textarea";
import { supabase } from "@/integrations/supabase/client";
import { CreatableCombobox } from "../CreatableCombobox";
import { currencies } from "@/lib/currencies";
import { MediaItem } from "../MediaItem";
import { toast } from "sonner";
import { useShop } from "@/contexts/ShopContext";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel";
import { showError, showSuccess } from "@/utils/toast";
import CombinedVariantManager from "./CombinedVariantManager";

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", label: "Active" },
  'Draft': { icon: Eye, color: "text-amber-600", label: "Draft" }, // Changed icon to Eye
  'Out of Stock': { icon: Package, color: "text-slate-600", label: "Out of Stock" }, // Changed icon to Package
};



export const ProductEditMode = ({ product, mediaItems, setMediaItems, handleImageUpload, handleImageDelete, isUploading, form, onCancel, onClose, onUpdate, isSubmitting, setIsSubmitting, specs, setSpecs }: any) => {
    const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;
    const { shopDetails, convertCurrency } = useShop();
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [typeOptions, setTypeOptions] = useState<string[]>([]);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Ref for combined options + variants manager
    const combinedManagerRef = useRef<{ handleSaveCombined: () => Promise<boolean> }>(null);

    const pricingType = watch("pricing_type");
    const categoryValue = watch("category");
    const statusValue = watch("status");
    const captionValue = watch("caption");
    const currencyCode = watch("currency");
    const baseInventory = watch("inventory");
    // Removed optionsV2 watch as it's now managed externally

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { ref: rhfRef, ...captionProps } = register("caption");
    useAutosizeTextArea(textAreaRef.current, captionValue || "");

    // --- Initialization ---
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
                inventory: product.inventory || 0, // Base inventory
                tags: Array.isArray(product.tags) ? product.tags : [],
                pricing_type: product.pricing_type || 'one_time',
                billing_interval: product.billing_interval,
                details: product.details || { type: 'generic' }, // Keep details for specs
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
        const fetchTypes = async () => {
            if (!categoryValue) {
                setTypeOptions([]);
                return;
            }
            const { data: categoryData } = await supabase.from('categories').select('id').eq('name', categoryValue).single();
            if (categoryData) {
                const { data: dbTypes } = await supabase.from('types').select('name').eq('category_id', categoryData.id);
                setTypeOptions(dbTypes?.map(t => t.name) || []);
            } else {
                setTypeOptions([]);
            }
        };
        fetchTypes();
    }, [categoryValue]);

    // --- Auto-Update Status/Inventory (Simplified for base product only) ---
    useEffect(() => {
        if (pricingType === 'one_time') {
            // If options are managed externally, base inventory is just the base inventory field
            // We rely on the OptionsManager to update the base inventory field if variants exist.
            
            // Update status based on base stock (if no variants exist, or if variants are managed externally)
            const newStatus = (baseInventory || 0) > 0 ? 'Active' : 'Out of Stock';
            if (statusValue !== newStatus) {
                setValue('status', newStatus, { shouldDirty: true });
            }
        } else {
            // For subscriptions, inventory is always 0 and status is always Active/Draft
            if (baseInventory !== 0) {
                setValue('inventory', 0, { shouldDirty: true });
            }
        }
    }, [baseInventory, pricingType, statusValue, setValue]);


    // --- Handlers ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndexStr = e.dataTransfer.getData('text/plain');
        const dragIndex = parseInt(dragIndexStr, 10);
        if (isNaN(dragIndex) || dragIndex === dropIndex) return;
        setMediaItems((prev: string[]) => {
            const next = [...prev];
            const [moved] = next.splice(dragIndex, 1);
            next.splice(dropIndex, 0, moved);
            return next;
        });
    };
    const handleFindSpecs = async () => {
        setIsReanalyzing(true);
        const toastId = toast.loading("Finding specs with AI...");
        try {
            if (!product?.id) throw new Error("Please save the product before analyzing so variants can be created.");
            const { data: { user } = {} } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated.");

            const { data, error } = await supabase.functions.invoke('find-product-specs', {
              body: {
                product_id: product.id,
                product_name: product.name || getValues('name'),
                category: product.category || getValues('category'),
                type: product.details?.type || getValues('details.type'),
                user_id: user.id,
                caption: product.caption || getValues('caption'),
                force_search: false
              }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            if (data?.specifications?.length > 0) {
              // Refresh specs from DB
              const { data: refreshed } = await supabase
                .from('product_specifications')
                .select('*')
                .eq('product_id', product.id)
                .order('display_order');
              if (refreshed) setSpecs(refreshed);
              toast.success(`Found ${data.specifications.length} specs (source: ${data.source})`, { id: toastId });
            } else {
              toast.success('No additional specifications found', { id: toastId });
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to find specs', { id: toastId });
        } finally {
            setIsReanalyzing(false);
        }
    };


    const handleSave = async (data: any) => {
        setIsSubmitting(true);
        let error = null;
        
        try {
            // Save combined options + variants in one go
            const combinedSaved = await combinedManagerRef.current?.handleSaveCombined?.();
            if (combinedSaved === false) {
                throw new Error("Failed to save product options/variants.");
            }

            // 2. Prepare details payload: only include fields present in the form/type attributes
            const cleanedDetails: { [key: string]: any } = { type: data.details.type };
            
            // Add all dynamic attributes (specs)
            Object.entries(data.details).forEach(([key, value]) => {
                // Exclude options_v2 and internal keys, only keep specs
                if (key !== 'type' && key !== 'options_v2') {
                    cleanedDetails[key] = value;
                }
            });

            // 3. Convert price from form's display currency (data.currency) to ALL for storage
            const priceInALL = convertCurrency(data.price, data.currency, 'ALL');

            // 4. Update Supabase
            const { error: updateError } = await supabase.from('products').update({
                name: data.name, status: data.status, caption: data.caption, category: data.category,
                price: priceInALL, // Save price in ALL
                currency: 'ALL', // Always store currency as ALL
                inventory: data.pricing_type === 'one_time' ? data.inventory : 0,
                tags: data.tags, pricing_type: data.pricing_type,
                billing_interval: data.pricing_type === 'subscription' ? data.billing_interval : null,
                details: cleanedDetails, // Save cleaned details (specs only)
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
                // Save edited specs to product_specifications table
                if (specs && specs.length > 0) {
                  for (let i = 0; i < specs.length; i++) {
                    const spec = specs[i];
                    await supabase.from('product_specifications').upsert({
                      product_id: product.id,
                      user_id: product.user_id,
                      key: spec.key,
                      value: spec.value,
                      unit: spec.unit || null,
                      display_order: i
                    }, { onConflict: 'product_id,key' });
                  }
                }
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


    return (
      <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <form onSubmit={handleSubmit(handleSave)} className="flex-1 flex flex-col min-h-0">
          <DialogHeader className="sr-only"><DialogTitle>Update Product</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
                <div className="md:col-span-4">
                  {mediaItems.length > 0 && (
                      <Carousel className="w-full rounded-lg overflow-hidden group">
                          <CarouselContent>
                              {mediaItems.map((url: string, index: number) => (
                                  <CarouselItem key={index}>
                                      <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
                                          <MediaItem src={url} alt={`${product?.name ?? 'Product'} - media ${index + 1}`} type={index === 0 ? (product?.media_type ?? undefined) : undefined} />
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
                  <div className="flex flex-wrap gap-1 overflow-x-auto py-2 -m-0.5">
                    {mediaItems.map((url: string, index: number) => (
                      <div
                        key={url}
                        className="relative group m-0.5 cursor-move"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        title="Drag to reorder"
                      >
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
              
              {/* Specifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Specifications
                    {specs && specs.length > 0 && <Badge variant="secondary" className="text-[10px] h-5">{specs.length}</Badge>}
                  </h3>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleFindSpecs} disabled={isReanalyzing}>
                    {isReanalyzing ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1.5 h-3 w-3 text-amber-400" />}Find with AI
                  </Button>
                </div>
                {specs && specs.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    {specs.map((spec: any, idx: number) => (
                      <div key={spec.id || idx} className={cn("grid grid-cols-[1fr_1.5fr_70px_28px] items-center gap-1.5 px-2 py-1.5", idx % 2 === 0 ? "bg-muted/30" : "bg-card")}>
                        <Input value={spec.key} placeholder="e.g. material" onChange={(e) => setSpecs(specs.map((s: any, i: number) => i === idx ? { ...s, key: e.target.value } : s))} className="h-7 text-xs border-0 bg-transparent capitalize focus-visible:ring-1 px-2" />
                        <Input value={spec.value} placeholder="e.g. Cotton" onChange={(e) => setSpecs(specs.map((s: any, i: number) => i === idx ? { ...s, value: e.target.value } : s))} className="h-7 text-xs border-0 bg-transparent focus-visible:ring-1 px-2" />
                        <Input value={spec.unit || ''} placeholder="unit" onChange={(e) => setSpecs(specs.map((s: any, i: number) => i === idx ? { ...s, unit: e.target.value } : s))} className="h-7 text-[10px] border-0 bg-transparent text-muted-foreground focus-visible:ring-1 px-2" />
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-destructive" onClick={() => setSpecs(specs.filter((_: any, i: number) => i !== idx))}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">No specifications yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Click "Find with AI" or add manually below</p>
                  </div>
                )}
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setSpecs([...(specs || []), { key: '', value: '', unit: '' }])}>
                  <PlusCircle className="mr-1.5 h-3 w-3" />Add specification
                </Button>
              </div>

              {/* Combined Options + Variants Manager */}
              {product?.id && (
                <CombinedVariantManager
                  ref={combinedManagerRef}
                  key={refreshKey}
                  productId={product.id}
                  basePriceALL={product.price}
                  displayCurrency={currencyCode}
                  convertCurrency={convertCurrency}
                />
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t"><Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product</Button></DialogFooter>
        </form>
      </motion.div>
    )
};