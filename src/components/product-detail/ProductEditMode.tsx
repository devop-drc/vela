import { useRef, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle as CardTitleComponent } from "@/components/ui/card";
import { TagInput } from "@/components/TagInput";
import { Loader2, XCircle, PlusCircle, CheckCircle, Archive, Sparkles, Tag, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import useAutosizeTextArea from "@/hooks/use-autosize-textarea";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { DynamicDetailForm } from "../product-forms/DynamicDetailForm";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const statusConfig = {
  'Active': { icon: CheckCircle, color: 'text-emerald-600', label: 'Active' },
  'Draft': { icon: XCircle, color: 'text-amber-600', label: 'Draft' },
  'Out of Stock': { icon: Archive, color: 'text-slate-600', label: 'Out of Stock' },
};

const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];

export const ProductEditMode = ({ product, mediaItems, handleImageUpload, handleImageDelete, isUploading, form, onCancel, isSubmitting }: any) => {
    const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = form;
    const [isFindingSpecs, setIsFindingSpecs] = useState(false);

    const pricingType = watch("pricing_type");
    const categoryValue = watch("category");
    const typeValue = watch("details.type");
    const statusValue = watch("status");
    const captionValue = watch("caption");
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { ref: rhfRef, ...captionProps } = register("caption");
    useAutosizeTextArea(textAreaRef.current, captionValue || "");

    const handleFindSpecs = async () => {
      setIsFindingSpecs(true);
      const { name, category, details } = getValues();
      try {
        const { data, error } = await supabase.functions.invoke('ai-spec-finder', {
          body: { productName: name, categoryName: category, typeName: details.type },
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);

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

    return (
      <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col min-h-0">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <DialogHeader className="sr-only"><DialogTitle>Update Product</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
                <div className="md:col-span-4">
                  <Carousel className="w-full rounded-lg overflow-hidden group">
                    <CarouselContent>{mediaItems.map((url: string, index: number) => (<CarouselItem key={index}><img src={url} alt={`${product.name} - image ${index + 1}`} className="object-cover w-full aspect-square bg-muted" /></CarouselItem>))}</CarouselContent>
                    {mediaItems.length > 1 && <><CarouselPrevious className="left-2" /><CarouselNext className="right-2" /></>}
                  </Carousel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mediaItems.map((url: string) => (<div key={url} className="relative group"><img src={url} className="h-16 w-16 rounded-md object-cover border" /><Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100" onClick={() => handleImageDelete(url)}><XCircle className="h-4 w-4" /></Button></div>))}
                    <Button asChild size="icon" variant="outline" className="h-16 w-16 rounded-md"><label htmlFor="image-upload" className="cursor-pointer">{isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-6 w-6 text-muted-foreground" />}</label></Button>
                    <Input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                  </div>
                </div>
                <div className="md:col-span-6 flex flex-col space-y-4">
                  <div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                      <Input {...register("category")} placeholder="Category" className="w-auto border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50 h-9 px-2" />
                      <Input {...register("details.type")} placeholder="Product Type" className="w-auto border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50 h-9 px-2" />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Input id="name" {...register("name")} placeholder="Product Name" className="w-auto border-0 border-b-2 rounded-none bg-transparent p-0 text-3xl font-bold tracking-tight focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors flex-1" />
                      <Controller control={control} name="status" render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className={cn("w-[140px] border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50", statusConfig[statusValue as keyof typeof statusConfig]?.color)}>{statusValue && statusConfig[statusValue as keyof typeof statusConfig] ? (<div className="flex items-center gap-2"><statusConfig[statusValue as keyof typeof statusConfig].icon className="h-4 w-4" /><span>{statusConfig[statusValue as keyof typeof statusConfig].label}</span></div>) : <SelectValue placeholder="Set status..." />}</SelectTrigger><SelectContent>{Object.entries(statusConfig).map(([status, { icon: Icon, color, label }]) => (<SelectItem key={status} value={status} className={color}><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{label}</span></div></SelectItem>))}</SelectContent></Select>)} />
                    </div>
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <Textarea id="caption" {...captionProps} ref={(e) => { rhfRef(e); textAreaRef.current = e as HTMLTextAreaElement; }} placeholder="No description provided." className="border-0 border-b-2 rounded-none bg-transparent p-0 text-base text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-auto hover:bg-muted/50 transition-colors resize-none" />
                  <div><Label>Tags</Label><Controller control={control} name="tags" render={({ field }) => <TagInput {...field} />} /></div>
                  <div className="space-y-2 pt-2">
                    <Label>Pricing & Inventory</Label>
                    <div className="flex items-center gap-4">
                      <Controller control={control} name="pricing_type" render={({ field }) => (
                        <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
                          <Tooltip><TooltipTrigger asChild><Button type="button" variant={field.value === 'one_time' ? 'background' : 'ghost'} size="icon" onClick={() => field.onChange('one_time')} className="h-8 w-8"><Tag className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>One-time Purchase</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button type="button" variant={field.value === 'subscription' ? 'background' : 'ghost'} size="icon" onClick={() => field.onChange('subscription')} className="h-8 w-8"><Repeat className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Subscription</TooltipContent></Tooltip>
                        </div>
                      )} />
                      <div className="flex-1 flex items-center gap-2">
                        <Input id="price" type="number" step="0.01" {...register("price")} className="w-24 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <Controller name="currency" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="w-24 border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="USD" /></SelectTrigger><SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>)} />
                        <AnimatePresence>
                          {pricingType === 'one_time' && (<motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center gap-2 overflow-hidden"><Label htmlFor="inventory" className="text-sm text-muted-foreground">Stock:</Label><Input id="inventory" type="number" {...register("inventory")} className="w-20 border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" /></motion.div>)}
                          {pricingType === 'subscription' && (<motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center gap-2 overflow-hidden"><Controller name="billing_interval" control={control} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value || undefined}><SelectTrigger className="w-28 border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50"><SelectValue placeholder="Interval" /></SelectTrigger><SelectContent><SelectItem value="month">/ month</SelectItem><SelectItem value="year">/ year</SelectItem></SelectContent></Select>)} /></motion.div>)}
                        </AnimatePresence>
                      </div>
                    </div>
                    {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                    {errors.inventory && <p className="text-sm text-destructive mt-1">{errors.inventory.message}</p>}
                    {errors.billing_interval && <p className="text-sm text-destructive mt-1">{errors.billing_interval.message}</p>}
                  </div>
                </div>
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitleComponent className="text-base">Options & Specifications</CardTitleComponent>
                  <Button type="button" variant="outline" size="sm" onClick={handleFindSpecs} disabled={isFindingSpecs}>{isFindingSpecs ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Find Specs with AI</Button>
                </CardHeader>
                <CardContent><DynamicDetailForm control={control} type={typeValue} /></CardContent>
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