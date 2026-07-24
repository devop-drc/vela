import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronsUpDown, MessageSquareText, CalendarIcon, Repeat } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { StorefrontAnnouncement } from "@/types/storefront";
import { getIcon, ICON_NAMES } from '@/lib/iconLibrary';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Marquee from "react-fast-marquee"; // Import react-fast-marquee
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

// List of common Lucide icons for selection
const availableIcons = ICON_NAMES;

const storefrontAnnouncementSchema = z.object({
  message: z.string().min(1, "announcement_editor.message_required"),
  icon_name: z.string().min(1, "announcement_editor.icon_required"),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().int().min(0, "announcement_editor.display_order_int").default(0),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  repeat_interval: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'none']).optional().nullable(),
});

type StorefrontAnnouncementFormData = z.infer<typeof storefrontAnnouncementSchema>;

interface StorefrontAnnouncementEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  element: StorefrontAnnouncement | null;
}

export const StorefrontAnnouncementEditorModal = ({ isOpen, onClose, onSave, element }: StorefrontAnnouncementEditorModalProps) => {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<StorefrontAnnouncementFormData>({
    resolver: zodResolver(storefrontAnnouncementSchema),
    defaultValues: { message: "", icon_name: "Sparkles", is_active: true, display_order: 0, start_date: null, end_date: null, repeat_interval: 'none' },
  });

  useEffect(() => {
    if (element) {
      reset({
        ...element,
        start_date: element.start_date ? new Date(element.start_date) : null,
        end_date: element.end_date ? new Date(element.end_date) : null,
        repeat_interval: element.repeat_interval || 'none',
      });
    } else {
      reset({ message: "", icon_name: "Sparkles", is_active: true, display_order: 0, start_date: null, end_date: null, repeat_interval: 'none' });
    }
  }, [element, reset]);

  const onSubmit = async (data: StorefrontAnnouncementFormData) => {
    // getSession() reads the token from local storage (instant, offline-safe);
    // getUser() makes a network round-trip that can hang/fail on a slow backend
    // and was silently blocking saves.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      showError(t("announcement_editor.must_login"));
      return;
    }

    // Only the editable columns — never spread id/created_at/updated_at back in.
    const fields = {
      message: data.message,
      icon_name: data.icon_name,
      is_active: data.is_active,
      display_order: data.display_order,
      start_date: data.start_date ? data.start_date.toISOString() : null,
      end_date: data.end_date ? data.end_date.toISOString() : null,
      repeat_interval: data.repeat_interval === 'none' ? null : data.repeat_interval,
    };
    let error;

    if (element) {
      // RLS enforces ownership on update; user_id isn't needed (and mustn't change).
      ({ error } = await supabase.from("marquee_elements").update(fields).eq("id", element.id));
    } else {
      ({ error } = await supabase.from("marquee_elements").insert({ ...fields, user_id: user.id }));
    }

    if (error) {
      showError(t("announcement_editor.save_failed", { message: error.message }));
    } else {
      showSuccess(element ? t("announcement_editor.saved_updated") : t("announcement_editor.saved_added"));
      onSave();
    }
  };

  // Surface validation failures that would otherwise make "Save" silently do
  // nothing (the date/repeat fields have no inline error text).
  const onInvalid = (errs: typeof errors) => {
    const first = Object.values(errs)[0]?.message as string | undefined;
    showError(first ? t(first) : t("announcement_editor.check_fields", "Please check the announcement fields and try again."));
  };

  const messageValue = watch('message');
  const selectedIconName = watch('icon_name');
  const IconComponent = getIcon(selectedIconName);

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearchTerm, setIconSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    return availableIcons.filter(icon =>
      icon.toLowerCase().includes(iconSearchTerm.toLowerCase())
    );
  }, [iconSearchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl h-[90dvh] flex flex-col p-4 sm:p-6"> {/* Reverted DialogContent padding */}
        <DialogHeader className="pb-4">
          <DialogTitle>{element ? t("announcement_editor.edit_title") : t("announcement_editor.add_title")}</DialogTitle>
          <DialogDescription>
            {t("announcement_editor.modal_desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-4"> {/* Removed horizontal padding from ScrollArea, added right padding */}
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="message">{t("announcement_editor.message")}</Label>
                <Textarea id="message" {...register("message")} placeholder={t("announcement_editor.message_placeholder")} rows={3} className="h-auto min-h-[80px] px-3 py-2" />
                {errors.message && <p className="text-sm text-destructive mt-1">{t(errors.message.message)}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="icon_name">{t("announcement_editor.icon")}</Label>
                  <Controller
                    name="icon_name"
                    control={control}
                    render={({ field }) => (
                      <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={iconPickerOpen}
                            className="w-full justify-between h-10 px-3 py-2"
                          >
                            <div className="flex items-center gap-2"> {/* Wrapper for icon and text */}
                              <IconComponent className="h-4 w-4" />
                              {field.value || t("announcement_editor.select_icon")}
                            </div>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[min(300px,calc(100vw-2.5rem))] p-0">
                          <Command>
                            <CommandInput
                              placeholder={t("announcement_editor.search_icon")}
                              value={iconSearchTerm}
                              onValueChange={setIconSearchTerm}
                            />
                            <CommandList>
                              <CommandEmpty>{t("announcement_editor.no_icon_found")}</CommandEmpty>
                              <CommandGroup>
                                <ScrollArea className="h-[200px]">
                                  <div className="grid grid-cols-5 gap-2 p-2">
                                    {filteredIcons.map((iconName) => {
                                      const Icon = getIcon(iconName);
                                      return (
                                        <CommandItem
                                          key={iconName}
                                          value={iconName}
                                          onSelect={() => {
                                            field.onChange(iconName);
                                            setIconPickerOpen(false);
                                            setIconSearchTerm('');
                                          }}
                                          className="flex flex-col items-center justify-center p-2 cursor-pointer hover:bg-accent rounded-md"
                                        >
                                          {Icon && <Icon className="h-5 w-5" />}
                                          <span className="text-xs mt-1 truncate w-full text-center">{iconName}</span>
                                        </CommandItem>
                                      );
                                    })}
                                  </div>
                                </ScrollArea>
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.icon_name && <p className="text-sm text-destructive mt-1">{t(errors.icon_name.message)}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">{t("announcement_editor.display_order")}</Label>
                  <Input id="display_order" type="number" {...register("display_order", { valueAsNumber: true })} />
                  {errors.display_order && <p className="text-sm text-destructive mt-1">{t(errors.display_order.message)}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t("announcement_editor.start_date")}</Label>
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
                            {field.value ? format(field.value, "PPP") : <span>{t("announcement_editor.pick_date")}</span>}
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
                  <Label htmlFor="endDate">{t("announcement_editor.end_date")}</Label>
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
                            {field.value ? format(field.value, "PPP") : <span>{t("announcement_editor.pick_date")}</span>}
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
                <Label htmlFor="repeat_interval" className="flex items-center gap-2"><Repeat className="h-4 w-4" /> {t("announcement_editor.repeat")}</Label>
                <Controller
                  name="repeat_interval"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={(value) => field.onChange(value === '' ? 'none' : value)} value={field.value || 'none'}>
                      <SelectTrigger id="repeat_interval" className="h-10 px-3 py-2">
                        <div className="flex items-center gap-2"> {/* Wrapper for icon and text */}
                          <Repeat className="h-4 w-4" />
                          <SelectValue placeholder={t("announcement_editor.no_repeat")} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("announcement_editor.no_repeat")}</SelectItem>
                        <SelectItem value="daily">{t("announcement_editor.daily")}</SelectItem>
                        <SelectItem value="weekly">{t("announcement_editor.weekly")}</SelectItem>
                        <SelectItem value="monthly">{t("announcement_editor.monthly")}</SelectItem>
                        <SelectItem value="yearly">{t("announcement_editor.yearly")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="text-base">{t("announcement_editor.active")}</Label>
                  <p className="text-sm text-muted-foreground">{t("announcement_editor.active_desc")}</p>
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

              {/* Live Preview */}
              <div className="space-y-2 pt-4">
                <Label>{t("announcement_editor.live_preview")}</Label>
                <div className="border rounded-lg p-2 bg-muted/50">
                  <Marquee pauseOnHover className="py-2 border-y-2 border-primary/20 bg-primary/10">
                    <div className="flex items-center gap-4 text-base font-semibold text-primary px-4">
                      <IconComponent className="h-5 w-5 text-primary" />
                      <span>{messageValue || t("announcement_editor.preview_placeholder")}</span>
                    </div>
                  </Marquee>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 px-6 flex-shrink-0">
            <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              {t("announcement_editor.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};