import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Controller } from "react-hook-form";
import { DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { TagInput } from "@/components/TagInput";
import { Loader2, XCircle, PlusCircle, CheckCircle, Archive, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { productCategories, getCategoryAndType } from "@/lib/productTypes";
import useAutosizeTextArea from "@/hooks/use-autosize-textarea";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { CreatableCombobox } from "../CreatableCombobox";

const statusConfig = {
  'Active': { icon: CheckCircle, color: "text-emerald-600", label: "Active" },
  'Draft': { icon: XCircle, color: "text-amber-600", label: "Draft" },
  'Out of Stock': { icon: Archive, color: "text-slate-600", label: "Out of Stock" },
};

export const ProductEditMode = ({ product, mediaItems, handleImageUpload, handleImageDelete, isUploading, form, onCancel, isSubmitting }: any) => {
    const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;
    const [isFindingSpecs, setIsFindingSpecs] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [typeOptions, setTypeOptions] = useState<string[]>([]);

    const pricingType = watch("pricing_type");
    const categoryValue = watch("category");
    const typeValue = watch("details.type");
    const statusValue = watch("status");
    const captionValue = watch("caption");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { ref: rhfRef, ...captionProps } = register("caption");
    useAutosizeTextArea(textAreaRef.current, captionValue || "");

    const { category, type } = getCategoryAndType(categoryValue, typeValue);
    const DetailsComponent = type?.component;

    useEffect(() => {
      const fetchCategories = async () => {
          const { data } = await supabase.from('categories').select('name');
          const dbCategories = data?.map(c => c.name) || [];
          const staticCategories = productCategories.map(c => c.label);
          setCategoryOptions([...new Set([...staticCategories, ...dbCategories])]);
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
          
          const staticCategory = productCategories.find(c => c.label.toLowerCase() === categoryValue.toLowerCase() || c.value.toLowerCase() === categoryValue.toLowerCase());
          const staticTypes = staticCategory ? staticCategory.types.map(t => t.label) : [];

          if (categoryData) {
              const { data: dbTypes } = await supabase.from('types').select('name').eq('category_id', categoryData.id);
              const typeNames = dbTypes?.map(t => t.name) || [];
              setTypeOptions([...new Set([...staticTypes, ...typeNames])]);
          } else {
              setTypeOptions(staticTypes);
          }
      };
      fetchTypes();
    }, [categoryValue]);

    const handleFindSpecs = async () => {
      setIsFindingSpecs(true);
      const { name, category, details } = getValues();
      const { category: catInfo, type: typeInfo } = getCategoryAndType(category, details.type);

      try {
        const { data, error } = await supabase.functions.invoke('ai-spec-finder', {
          body: { productName: name, categoryName: catInfo?.label, typeName: typeInfo?.label },
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);

        // Merge new specs with existing details
        const currentDetails = getValues('details');
        const newDetails = { ...currentDetails, ...data };
        setValue('details', newDetails, { shouldDirty: true });
        showSuccess("AI has populated product specifications!");

      } catch (err: any) {
        showError(err.message || "Failed to find specifications.");
      } finally {
        setIsFindingSpecs(false);
      }
    };

    const currentStatusConfig = statusConfig[statusValue as keyof typeof statusConfig];
    const StatusIcon = currentStatusConfig?.icon;

    return (
      <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Update Product</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
                <div className="md:col-span-4">
                  <Carousel className="w-full rounded-lg overflow-hidden group">
                    <CarouselContent>
                      {mediaItems.map((url: string, index: number) => (
                        <CarouselItem key={index}>
                          <img src={url} alt={`${product.name} - image ${index + 1}`} className="object-cover w-full aspect-square bg-muted" />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {mediaItems.length > 1 && <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>}
                  </Carousel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mediaItems.map((url: string) => (
                      <div key={url} className="relative group">
                        <img src={url} className="h-16 w-16 rounded-md object-cover border" />
                        <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100" onClick={() => handleImageDelete(url)}><XCircle className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <Button asChild size="icon" variant="outline" className="h-16 w-16 rounded-md">
                      <label htmlFor="image-upload" className="cursor-pointer">
                        {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-6 w-6 text-muted-foreground" />}
                      </label>
                    </Button>
                    <Input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                  </div>
                </div>
                <div className="md:col-span-6 flex flex-col space-y-4">
                  <div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                      <Controller name="category" control={control} render={({ field }) => (
                        <CreatableCombobox options={categoryOptions} placeholder="Category..." {...field} />
                      )} />
                      <Controller name="details.type" control={control} render={({ field }) => (
                        <CreatableCombobox options={typeOptions} placeholder="Type..." {...field} disabled={!category?.types} />
                      )} />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Input id="name" {...register("name")} placeholder="Product Name" className="w-auto border-0 border-b-2 rounded-none bg-transparent p-0 text-3xl font-bold tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors" />
                      <Controller control={control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className={cn("w-[140px] border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50", currentStatusConfig?.color)}>{StatusIcon ? (<div className="flex items-center gap-2"><StatusIcon className="h-4 w-4" /><span>{currentStatusConfig.label}</span></div>) : <SelectValue placeholder="Set status..." />}</SelectTrigger><SelectContent>{Object.entries(statusConfig).map(([status, { icon: Icon, color, label }]) => (<SelectItem key={status} value={status} className={color}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{label}</span></div></SelectItem>))}</SelectContent></Select>)} />
                    </div>
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <Textarea
                    id="caption"
                    {...captionProps}
                    ref={(e) => {
                      rhfRef(e);
                      textAreaRef.current = e as HTMLTextAreaElement;
                    }}
                    placeholder="No description provided."
                    className="border-0 border-b-2 rounded-none bg-transparent p-0 text-base text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors resize-none"
                  />
                  <div>
                    <Label>Tags</Label>
                    <Controller control={control} name="tags" render={({ field }) => <TagInput {...field} />} />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label>Pricing & Inventory</Label>
                    <div className="flex items-center gap-4">
                        <Controller control={control} name="pricing_type" render={({ field }) => (<ToggleGroup type="single" onValueChange={field.onChange} value={field.value} variant="outline" size="sm"><ToggleGroupItem value="one_time">One-time</ToggleGroupItem><ToggleGroupItem value="subscription">Subscription</ToggleGroupItem></ToggleGroup>)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="space-y-1 col-span-2">
                            <Label htmlFor="price" className="text-xs">Price</Label>
                            <div className="flex items-center gap-2">
                                <Input id="price" type="number" step="0.01" {...register("price")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
                                <Input {...register("currency")} className="w-20 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" placeholder="USD" />
                            </div>
                            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                            {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
                        </div>
                        <AnimatePresence>
                            {pricingType === 'one_time' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label htmlFor="inventory" className="text-xs">Stock</Label><Input id="inventory" type="number" {...register("inventory")} className="w-full border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />{errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}</motion.div>)}
                            {pricingType === 'subscription' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1"><Label className="text-xs">Interval</Label><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-full border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} />{errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}</motion.div>)}
                        </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitleComponent className="text-base">Options & Specifications</CardTitleComponent>
                  <Button type="button" variant="outline" size="sm" onClick={handleFindSpecs} disabled={isFindingSpecs}>
                    {isFindingSpecs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Find Specs with AI
                  </Button>
                </CardHeader>
                <CardContent>
                  {DetailsComponent ? <DetailsComponent control={control} /> : <p className="text-sm text-muted-foreground text-center">Select a category and type to see specific details.</p>}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 border-t">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Product</Button>
          </DialogFooter>
        </form>
      </motion.div>
    )
};