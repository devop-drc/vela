import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Controller, useFieldArray } from "react-hook-form";
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
import { Loader2, XCircle, PlusCircle, CheckCircle, Archive, Sparkles, Move, Edit2, Package, Cloud } from "lucide-react";
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

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", label: "Active" },
  'Draft': { icon: XCircle, color: "text-amber-600", label: "Draft" },
  'Out of Stock': { icon: Archive, color: "text-slate-600", label: "Out of Stock" },
};

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

export const ProductEditMode = ({ product, mediaItems, setMediaItems, handleImageUpload, handleImageDelete, isUploading, form, onCancel, isSubmitting }: any) => {
    const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;
    const { shopDetails } = useShop();
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [typeOptions, setTypeOptions] = useState<string[]>([]);
    const [typeAttributes, setTypeAttributes] = useState<any[]>([]);
    const [isReanalyzing, setIsReanalyzing] = useState(false);
    
    const { fields: dynamicDetails, update, append, remove } = useFieldArray({ control, name: "dynamicDetails" });

    const pricingType = watch("pricing_type");
    const categoryValue = watch("category");
    const typeValue = watch("details.type");
    const statusValue = watch("status");
    const captionValue = watch("caption");
    const productType = watch("product_type");

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { ref: rhfRef, ...captionProps } = register("caption");
    useAutosizeTextArea(textAreaRef.current, captionValue || "");

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
              setTypeAttributes(selectedType?.attributes || []);
          } else {
              setTypeOptions([]);
              setTypeAttributes([]);
          }
      };
      fetchTypesAndAttributes();
    }, [categoryValue, typeValue]);

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
            if (analysis.categoryName) setValue('category', analysis.categoryName, { shouldDirty: true });
            if (analysis.typeName) setValue('details.type', analysis.typeName, { shouldDirty: true });
            if (analysis.attributes) {
                for (const attr of analysis.attributes) {
                    setValue(`details.${attr.name}`, attr.value, { shouldDirty: true });
                }
            }
            toast.success("AI analysis complete! Product details have been updated.", { id: toastId });
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        } finally {
            setIsReanalyzing(false);
        }
    };

    const toggleFieldSection = (index: number) => {
        const field = dynamicDetails[index];
        update(index, { ...field, isOption: !field.isOption });
    };

    const currentStatusConfig = statusConfig[statusValue as keyof typeof statusConfig];
    const StatusIcon = currentStatusConfig?.icon;

    const options = typeAttributes.filter(attr => attr.isOption);
    const specifications = typeAttributes.filter(attr => !attr.isOption);

    // Callback for reordering media items
    const handleReorderMedia = useCallback((newOrder: string[]) => {
      console.log("Attempting to reorder media:", newOrder);
      if (typeof setMediaItems === 'function') {
        setMediaItems(newOrder);
      } else {
        console.error("onReorder callback (setMediaItems) is NOT a function!");
      }
    }, [setMediaItems]);

    return (
      <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <DialogHeader className="sr-only"><DialogTitle>Update Product</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
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
                  <Reorder.Group axis="x" values={mediaItems} onReorder={handleReorderMedia} className="flex flex-wrap gap-2 overflow-x-auto pb-2">
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
                      <div className="w-fit min-w-[165px]"><Controller name="details.type" control={control} render={({ field }) => (<CreatableCombobox options={typeOptions} placeholder="Type..." {...field} disabled={!categoryValue} />)} /></div>
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
                    <Label>Pricing & Inventory</Label>
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
                        <div className="space-y-1 col-span-2"><Label htmlFor="price" className="text-xs">Price</Label><div className="flex items-center gap-2"><Input id="price" type="number" step="0.01" {...register("price")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" /><Controller name="currency" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="w-28 border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="USD" /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}</SelectContent></Select>)} /></div>{errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}{errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}</div>
                        <AnimatePresence>{pricingType === 'one_time' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden"><div className="space-y-1"><Label htmlFor="inventory" className="text-xs">Stock</Label><Input id="inventory" type="number" {...register("inventory")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</div></motion.div>)}{pricingType === 'subscription' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label className="text-xs">Interval</Label><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-full border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} />{errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}</motion.div>)}</AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end pt-4"><Button type="button" variant="outline" onClick={handleReanalyze} disabled={isReanalyzing}>{isReanalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-amber-400" />}Find Specs with AI</Button></div>
              {[ { title: "Options (for Variants)", fields: [...options, ...dynamicDetails.filter(f => f.isOption)] }, { title: "Specifications (Fixed Details)", fields: [...specifications, ...dynamicDetails.filter(f => !f.isOption)] } ].map(section => (
                <Card key={section.title}><CardHeader><CardTitleComponent className="text-base">{section.title}</CardTitleComponent></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((attr, index) => {
                    const Icon = getAttributeIcon(attr.name);
                    return (<div key={attr.name || attr.id} className="space-y-2"><Label className="capitalize flex items-center gap-1.5"><Icon className="h-4 w-4" />{attr.name.replace(/_/g, ' ')}</Label><AttributeInput control={control} fieldName={attr.name} inputType={attr.inputType} /></div>)
                  })}
                </CardContent></Card>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t"><Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product</Button></DialogFooter>
        </form>
      </motion.div>
    )
};