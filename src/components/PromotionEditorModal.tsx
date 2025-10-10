import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, Percent, DollarSign, Gift, Package, XCircle, Repeat, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ProductSelector } from "./ProductSelector";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { Switch } from "@/components/ui/switch";

const promotionSchema = z.object({
  name: z.string().min(1, "Promotion name is required"),
  type: z.enum(['discount', 'offer']),
  value: z.any(),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  is_active: z.boolean().default(true),
  target_products: z.array(z.string()).optional().nullable(),
  repeat_interval: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'none']).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === 'discount') {
    if (!data.value?.discountType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Discount type is required.",
        path: ["value.discountType"],
      });
    }
    if (data.value?.discountValue === undefined || data.value.discountValue === null || data.value.discountValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Discount value must be greater than 0.",
        path: ["value.discountValue"],
      });
    }
  } else if (data.type === 'offer') {
    if (!data.value?.offerType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Offer type is required.",
        path: ["value.offerType"],
      });
    }
    if (data.value?.offerType === 'free_shipping' && (data.value?.minOrderValue === undefined || data.value.minOrderValue < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum order value is required for free shipping.",
        path: ["value.minOrderValue"],
      });
    }
  }
});

type PromotionFormData = z.infer<typeof promotionSchema>;

interface Promotion {
  id: string;
  name: string;
  type: 'discount' | 'offer';
  value: any;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  target_products: string[] | null;
  repeat_interval: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none' | null;
}

interface PromotionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  promotion: Promotion | null;
}

export const PromotionEditorModal = ({ isOpen, onClose, onSave, promotion }: PromotionEditorModalProps) => {
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const { shopDetails } = useShop();

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      type: 'discount',
      is_active: true,
      value: {},
      target_products: [],
      repeat_interval: 'none',
    }
  });

  const promotionType = watch('type');
  const targetProducts = watch('target_products');
  const discountType = watch('value.discountType');
  const offerType = watch('value.offerType');

  useEffect(() => {
    if (promotion) {
      reset({
        name: promotion.name,
        type: promotion.type,
        value: promotion.value,
        start_date: promotion.start_date ? new Date(promotion.start_date) : null,
        end_date: promotion.end_date ? new Date(promotion.end_date) : null,
        is_active: promotion.is_active,
        target_products: promotion.target_products || [],
        repeat_interval: promotion.repeat_interval || 'none',
      });
    } else {
      reset({
        name: "",
        type: 'discount',
        value: { discountType: "percentage", discountValue: 0 },
        start_date: null,
        end_date: null,
        is_active: true,
        target_products: [],
        repeat_interval: 'none',
      });
    }
  }, [promotion, reset]);

  useEffect(() => {
    const fetchProductNames = async () => {
      if (targetProducts && targetProducts.length > 0) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name')
          .in('id', targetProducts);
        if (error) {
          console.error("Error fetching product names:", error);
          setSelectedProductNames([]);
        } else {
          setSelectedProductNames(data?.map(p => p.name) || []);
        }
      } else {
        setSelectedProductNames([]);
      }
    };
    fetchProductNames();
  }, [targetProducts]);

  const onSubmit = async (data: PromotionFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in.");
      return;
    }

    const payload = {
      ...data,
      user_id: user.id,
      start_date: data.start_date ? data.start_date.toISOString() : null,
      end_date: data.end_date ? data.end_date.toISOString() : null,
      repeat_interval: data.repeat_interval === 'none' ? null : data.repeat_interval,
    };

    let error;
    let promotionId = promotion?.id;

    if (promotion && promotion.id) {
      ({ error } = await supabase.from("promotions").update(payload).eq("id", promotion.id));
    } else {
      const { data: newPromotion, error: insertError } = await supabase.from("promotions").insert(payload).select('id').single();
      if (insertError) {
        error = insertError;
      } else {
        promotionId = newPromotion?.id;
      }
    }

    if (error) {
      showError(`Failed to save promotion: ${error.message}`);
    } else {
      showSuccess(`Promotion ${promotion ? 'updated' : 'added'} successfully!`);

      if (promotionId) {
        let announcementMessage = data.name;
        if (data.type === 'discount') {
          if (data.value?.discountType === 'percentage') announcementMessage = `${data.value.discountValue}% OFF - ${data.name}`;
          if (data.value?.discountType === 'flat') announcementMessage = `${formatCurrency(data.value.discountValue, shopDetails?.currency || 'USD')} OFF - ${data.name}`;
        } else if (data.type === 'offer' && data.value?.offerType === 'free_shipping') {
          announcementMessage = `FREE SHIPPING - ${data.name}`;
          if (data.value?.minOrderValue > 0) {
            announcementMessage += ` (Min. ${formatCurrency(data.value.minOrderValue, shopDetails?.currency || 'USD')})`;
          }
        }

        const announcementPayload = {
          user_id: user.id,
          message: announcementMessage,
          icon_name: data.type === 'discount' ? 'Percent' : 'Gift',
          is_active: data.is_active,
          display_order: 0,
          start_date: payload.start_date,
          end_date: payload.end_date,
          repeat_interval: payload.repeat_interval,
        };

        const { data: existingAnnouncement, error: fetchAnnounceError } = await supabase
          .from('marquee_elements')
          .select('id')
          .eq('user_id', user.id)
          .eq('message', announcementMessage)
          .maybeSingle();

        if (fetchAnnounceError) {
          console.error("Error checking for existing announcement:", fetchAnnounceError);
        }

        if (existingAnnouncement) {
          await supabase.from('marquee_elements').update(announcementPayload).eq('id', existingAnnouncement.id);
          showSuccess("Storefront announcement updated!");
        } else {
          await supabase.from('marquee_elements').insert(announcementPayload);
          showSuccess("Storefront announcement created!");
        }
      }

      onSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{promotion ? "Edit Promotion" : "Create New Promotion"}</DialogTitle>
          <DialogDescription>
            Define your marketing campaigns, discounts, and special offers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Promotion Name</Label>
                <Input id="name" {...register("name")} placeholder="e.g., Summer Sale, Free Shipping" className="h-10 px-3 py-2" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Promotion Type</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value: PromotionFormData['type']) => {
                      field.onChange(value);
                      if (value === 'discount') setValue('value', { discountType: "percentage", discountValue: 0 });
                      else if (value === 'offer') setValue('value', { offerType: "free_shipping", minOrderValue: 0 });
                    }} value={field.value}>
                      <SelectTrigger id="type" className="h-10 px-3 py-2">
                        {field.value === 'discount' ? <Percent className="mr-2 h-4 w-4" /> : <Gift className="mr-2 h-4 w-4" />}
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount"><Percent className="mr-2 h-4 w-4" /> Discount</SelectItem>
                        <SelectItem value="offer"><Gift className="mr-2 h-4 w-4" /> Offer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
              </div>

              {promotionType === 'discount' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type</Label>
                    <Controller
                      name="value.discountType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="discountType" className="h-10 px-3 py-2">
                            {field.value === 'percentage' ? <Percent className="mr-2 h-4 w-4" /> : <DollarSign className="mr-2 h-4 w-4" />}
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage"><Percent className="mr-2 h-4 w-4" /> Percentage Off</SelectItem>
                            <SelectItem value="flat"><DollarSign className="mr-2 h-4 w-4" /> Flat Amount Off</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.value?.discountType && <p className="text-sm text-destructive mt-1">{errors.value.discountType.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">Discount Value</Label>
                    <div className="relative">
                      {discountType === 'flat' && shopDetails?.currency && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {shopDetails.currency === 'USD' ? '$' : shopDetails.currency === 'EUR' ? '€' : shopDetails.currency}
                        </span>
                      )}
                      <Input
                        id="discountValue"
                        type="number"
                        step="0.01"
                        {...register("value.discountValue", { valueAsNumber: true })}
                        placeholder={discountType === 'percentage' ? "e.g., 15" : "e.g., 10.00"}
                        className={cn("h-10 px-3 py-2", discountType === 'flat' && "pl-8")}
                      />
                    </div>
                    {errors.value?.discountValue && <p className="text-sm text-destructive mt-1">{errors.value.discountValue.message}</p>}
                  </div>
                </div>
              )}

              {promotionType === 'offer' && (
                <div className="space-y-2">
                  <Label htmlFor="offerType">Offer Type</Label>
                  <Controller
                    name="value.offerType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="offerType" className="h-10 px-3 py-2">
                          <Gift className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Select offer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free_shipping"><Truck className="mr-2 h-4 w-4" /> Free Shipping</SelectItem>
                          {/* Add more offer types here */}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.value?.offerType && <p className="text-sm text-destructive mt-1">{errors.value.offerType.message}</p>}

                  {offerType === 'free_shipping' && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="minOrderValue">Minimum Order Value for Free Shipping</Label>
                      <div className="relative">
                        {shopDetails?.currency && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {shopDetails.currency === 'USD' ? '$' : shopDetails.currency === 'EUR' ? '€' : shopDetails.currency}
                          </span>
                        )}
                        <Input
                          id="minOrderValue"
                          type="number"
                          step="0.01"
                          {...register("value.minOrderValue", { valueAsNumber: true })}
                          placeholder="e.g., 50.00"
                          className="h-10 px-3 py-2 pl-8"
                        />
                      </div>
                      {errors.value?.minOrderValue && <p className="text-sm text-destructive mt-1">{errors.value.minOrderValue.message}</p>}
                    </div>
                  )}
                </div>
              )}

              {(promotionType === 'discount' || promotionType === 'offer') && (
                <div className="space-y-4 border p-4 rounded-lg">
                  <h3 className="font-semibold text-base flex items-center gap-2"><Package className="h-4 w-4" /> Target Products</h3>
                  <p className="text-sm text-muted-foreground">Select specific products this promotion applies to. Leave empty to apply to all products.</p>
                  <Button type="button" variant="outline" onClick={() => setIsProductSelectorOpen(true)} className="h-10 px-4 py-2">
                    Select Products ({targetProducts?.length || 0})
                  </Button>
                  {selectedProductNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedProductNames.map(name => (
                        <Badge key={name} variant="secondary" className="flex items-center gap-1">
                          {name}
                          <button type="button" onClick={() => setValue('target_products', targetProducts?.filter(id => id !== name) || [])} className="ml-1">
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date (Optional)</Label>
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 px-3 py-2",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal h-10 px-3 py-2",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeat_interval" className="flex items-center gap-2"><Repeat className="h-4 w-4" /> Repeat (Optional)</Label>
                <Controller
                  name="repeat_interval"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value) => field.onChange(value === '' ? 'none' : value)} value={field.value || 'none'}>
                      <SelectTrigger id="repeat_interval" className="h-10 px-3 py-2">
                        <SelectValue placeholder="No repeat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No repeat</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-base">Active</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable this promotion.</p>
                </div>
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 px-6 flex-shrink-0">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Promotion
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Select Products</DialogTitle>
            <DialogDescription>Choose which products this promotion applies to.</DialogDescription>
          </DialogHeader>
          <ProductSelector
            selectedProductIds={targetProducts || []}
            onSelectionChange={(ids) => setValue('target_products', ids)}
            onClose={() => setIsProductSelectorOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};