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
import { CalendarIcon, Percent, DollarSign, Gift, Package, XCircle, Repeat, Truck } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
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
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, currencySymbol } from "@/lib/formatters";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

const promotionSchema = z.object({
  name: z.string().min(1, { message: i18n.t('promo_editor.name_required') }),
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
        message: i18n.t('promo_editor.discount_type_required'),
        path: ["value.discountType"],
      });
    }
    if (data.value?.discountValue === undefined || data.value.discountValue === null || data.value.discountValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('promo_editor.discount_value_required'),
        path: ["value.discountValue"],
      });
    }
  } else if (data.type === 'offer') {
    if (!data.value?.offerType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('promo_editor.offer_type_required'),
        path: ["value.offerType"],
      });
    }
    if (data.value?.offerType === 'free_shipping' && (data.value?.minOrderValue === undefined || data.value.minOrderValue < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t('promo_editor.min_order_required'),
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
  const { t } = useTranslation();
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [selectedProductNames, setSelectedProductNames] = useState<Array<{ id: string; name: string }>>([]);
  // Opt-in: also show this promotion as a scrolling banner on the storefront.
  const [createAnnouncement, setCreateAnnouncement] = useState(false);
  const { shopDetails } = useShop();
  const { user } = useAuth();

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
          setSelectedProductNames(data?.map(p => ({ id: p.id, name: p.name })) || []);
        }
      } else {
        setSelectedProductNames([]);
      }
    };
    fetchProductNames();
  }, [targetProducts]);

  const onSubmit = async (data: PromotionFormData) => {
    // user comes from AuthContext (cached session) — no per-save network round-
    // trip to getUser(), which could hang/fail and silently block the save.
    if (!user) {
      showError(t('categories.must_login'));
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
      showError(t('promo_editor.save_failed', { message: error.message }));
    } else {
      showSuccess(promotion ? t('promo_editor.updated_success') : t('promo_editor.added_success'));

      if (promotionId && createAnnouncement) {
        let announcementMessage = data.name;
        if (data.type === 'discount') {
          if (data.value?.discountType === 'percentage') announcementMessage = t('promo_editor.announcement_percent_off', { value: data.value.discountValue, name: data.name });
          if (data.value?.discountType === 'flat') announcementMessage = t('promo_editor.announcement_flat_off', { amount: formatCurrency(data.value.discountValue, shopDetails?.currency || 'USD'), name: data.name });
        } else if (data.type === 'offer' && data.value?.offerType === 'free_shipping') {
          announcementMessage = t('promo_editor.announcement_free_shipping', { name: data.name });
          if (data.value?.minOrderValue > 0) {
            announcementMessage += t('promo_editor.announcement_min_suffix', { amount: formatCurrency(data.value.minOrderValue, shopDetails?.currency || 'USD') });
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
          showSuccess(t('promo_editor.announcement_updated'));
        } else {
          await supabase.from('marquee_elements').insert(announcementPayload);
          showSuccess(t('promo_editor.announcement_created'));
        }
      }

      onSave();
    }
  };

  // Surface validation failures (discount type/value live in a conditional
  // section with no inline error), so "Save" never silently does nothing.
  const onInvalid = (errs: typeof errors) => {
    const first = Object.values(errs)[0] as { message?: string } | undefined;
    const nested = first && !first.message ? Object.values(first)[0] as { message?: string } | undefined : undefined;
    const message = first?.message || nested?.message;
    showError(message || t('promo_editor.check_fields'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90dvh] flex flex-col p-4 sm:p-6"> {/* Reverted DialogContent padding */}
        <DialogHeader className="pb-4">
          <DialogTitle>{promotion ? t('promo_editor.edit_title') : t('promo_editor.create_title')}</DialogTitle>
          <DialogDescription>
            {t('promo_editor.dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-4"> {/* Removed horizontal padding from ScrollArea, added right padding */}
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('promo_editor.name_label')}</Label>
                <Input id="name" {...register("name")} placeholder={t('promo_editor.name_placeholder')} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('promo_editor.type_label')}</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value: PromotionFormData['type']) => {
                      field.onChange(value);
                      if (value === 'discount') setValue('value', { discountType: "percentage", discountValue: 0 });
                      else if (value === 'offer') setValue('value', { offerType: "free_shipping", minOrderValue: 0 });
                    }} value={field.value}>
                      {/* SelectValue already renders the item's icon+label; a second
                          icon wrapper made the content wrap onto two lines on mobile */}
                      <SelectTrigger id="type" className="h-10 px-3 py-2">
                        <SelectValue placeholder={t('promo_editor.select_type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount"><span className="inline-flex items-center whitespace-nowrap"><Percent className="mr-2 h-4 w-4" /> {t('promo_editor.discount')}</span></SelectItem>
                        <SelectItem value="offer"><span className="inline-flex items-center whitespace-nowrap"><Gift className="mr-2 h-4 w-4" /> {t('promo_editor.offer')}</span></SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
              </div>

              {promotionType === 'discount' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">{t('promo_editor.discount_type_label')}</Label>
                    <Controller
                      name="value.discountType"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger id="discountType" className="h-10 px-3 py-2">
                            <SelectValue placeholder={t('promo_editor.select_discount_type')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage"><span className="inline-flex items-center whitespace-nowrap"><Percent className="mr-2 h-4 w-4" /> {t('promo_editor.percentage_off')}</span></SelectItem>
                            <SelectItem value="flat"><span className="inline-flex items-center whitespace-nowrap"><DollarSign className="mr-2 h-4 w-4" /> {t('promo_editor.flat_amount_off')}</span></SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.value?.discountType && <p className="text-sm text-destructive mt-1">{errors.value.discountType.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">{t('promo_editor.discount_value_label')}</Label>
                    <div className="relative">
                      {discountType === 'flat' && shopDetails?.currency && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {currencySymbol(shopDetails.currency)}
                        </span>
                      )}
                      <Input
                        id="discountValue"
                        type="number"
                        step="0.01"
                        {...register("value.discountValue", { valueAsNumber: true })}
                        placeholder={discountType === 'percentage' ? t('promo_editor.percentage_placeholder') : t('promo_editor.flat_placeholder')}
                        className={cn(discountType === 'flat' && "pl-8")}
                      />
                    </div>
                    {errors.value?.discountValue && <p className="text-sm text-destructive mt-1">{errors.value.discountValue.message}</p>}
                  </div>
                </div>
              )}

              {promotionType === 'offer' && (
                <div className="space-y-2">
                  <Label htmlFor="offerType">{t('promo_editor.offer_type_label')}</Label>
                  <Controller
                    name="value.offerType"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="offerType" className="h-10 px-3 py-2">
                          <SelectValue placeholder={t('promo_editor.select_offer_type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free_shipping"><span className="inline-flex items-center whitespace-nowrap"><Truck className="mr-2 h-4 w-4" /> {t('promo_editor.free_shipping')}</span></SelectItem>
                          {/* Add more offer types here */}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.value?.offerType && <p className="text-sm text-destructive mt-1">{errors.value.offerType.message}</p>}

                  {offerType === 'free_shipping' && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="minOrderValue">{t('promo_editor.min_order_label')}</Label>
                      <div className="relative">
                        {shopDetails?.currency && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            {currencySymbol(shopDetails.currency)}
                          </span>
                        )}
                        <Input
                          id="minOrderValue"
                          type="number"
                          step="0.01"
                          {...register("value.minOrderValue", { valueAsNumber: true })}
                          placeholder={t('promo_editor.min_order_placeholder')}
                          className="pl-8"
                        />
                      </div>
                      {errors.value?.minOrderValue && <p className="text-sm text-destructive mt-1">{errors.value.minOrderValue.message}</p>}
                    </div>
                  )}
                </div>
              )}

              {(promotionType === 'discount' || promotionType === 'offer') && (
                <div className="space-y-4 border p-4 rounded-lg">
                  <h3 className="font-semibold text-base flex items-center gap-2"><Package className="h-4 w-4" /> {t('promo_editor.target_products')}</h3>
                  <p className="text-sm text-muted-foreground">{t('promo_editor.target_products_desc')}</p>
                  <Button type="button" variant="outline" onClick={() => setIsProductSelectorOpen(true)} className="h-10 px-4 py-2">
                    {t('promo_editor.select_products_count', { count: targetProducts?.length || 0 })}
                  </Button>
                  {selectedProductNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedProductNames.map(({ id, name }) => (
                        <Badge key={id} variant="secondary" className="flex items-center gap-1">
                          {name}
                          <button type="button" onClick={() => setValue('target_products', targetProducts?.filter(pid => pid !== id) || [])} className="ml-1">
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t('promo_editor.start_date_label')}</Label>
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
                            {field.value ? format(field.value, "PPP") : <span>{t('promo_editor.pick_date')}</span>}
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
                  <Label htmlFor="endDate">{t('promo_editor.end_date_label')}</Label>
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
                            {field.value ? format(field.value, "PPP") : <span>{t('promo_editor.pick_date')}</span>}
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
                <Label htmlFor="repeat_interval" className="flex items-center gap-2"><Repeat className="h-4 w-4" /> {t('promo_editor.repeat_label')}</Label>
                <Controller
                  name="repeat_interval"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value) => field.onChange(value === '' ? 'none' : value)} value={field.value || 'none'}>
                      <SelectTrigger id="repeat_interval" className="h-10 px-3 py-2">
                        <SelectValue placeholder={t('promo_editor.no_repeat')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('promo_editor.no_repeat')}</SelectItem>
                        <SelectItem value="daily">{t('promo_editor.daily')}</SelectItem>
                        <SelectItem value="weekly">{t('promo_editor.weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('promo_editor.monthly')}</SelectItem>
                        <SelectItem value="yearly">{t('promo_editor.yearly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-base">{t('promo_editor.active_label')}</Label>
                  <p className="text-sm text-muted-foreground">{t('promo_editor.active_desc')}</p>
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

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="createAnnouncement" className="text-base">{t('promo_editor.banner_label')}</Label>
                  <p className="text-sm text-muted-foreground">{t('promo_editor.banner_desc')}</p>
                </div>
                <Switch
                  id="createAnnouncement"
                  checked={createAnnouncement}
                  onCheckedChange={setCreateAnnouncement}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 px-6 flex-shrink-0">
            <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              {t('promo_editor.save_promotion')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
        <DialogContent className="max-w-3xl h-[90dvh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{t('promo_editor.select_products_title')}</DialogTitle>
            <DialogDescription>{t('promo_editor.select_products_desc')}</DialogDescription>
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