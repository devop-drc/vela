import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, MessageSquareText, CheckCircle, XCircle, ArrowUp, ArrowDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { StorefrontAnnouncement } from "@/types/storefront"; // Use new type
import * as LucideIcons from 'lucide-react'; // Import all Lucide icons
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Marquee } from "@/components/ui/marquee"; // Import Marquee for preview

// List of common Lucide icons for selection
const availableIcons: (keyof typeof LucideIcons)[] = [
  'Sparkles', 'MessageSquareText', 'Gift', 'Percent', 'DollarSign', 'Truck',
  'Star', 'Heart', 'Package', 'Tag', 'Info', 'CheckCircle', 'XCircle',
  'Bell', 'Megaphone', 'Award', 'Zap', 'Flame', 'Leaf', 'Gem', 'Crown',
  'ShoppingCart', 'Wallet', 'CreditCard', 'MapPin', 'User', 'Calendar',
  'Clock', 'Settings', 'Palette', 'Ruler', 'Layers', 'Weight', 'Cpu',
  'Camera', 'Wifi', 'Battery', 'Fingerprint', 'ScanText', 'Home', 'Book',
  'Monitor', 'Utensils', 'Car', 'Gamepad2', 'Tent', 'PawPrint', 'Music',
  'Plane', 'FlaskConical', 'Hammer', 'Lamp', 'Globe', 'Rocket', 'Scissors',
  'ScrollText', 'Shield', 'Snowflake', 'ToyBrick', 'TreePine', 'Watch', 'Wrench'
];

const storefrontAnnouncementSchema = z.object({
  message: z.string().min(1, "Message is required"),
  icon_name: z.custom<keyof typeof LucideIcons>(val => availableIcons.includes(val as keyof typeof LucideIcons), {
    message: "Invalid icon selected",
  }),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().int().min(0, "Display order must be a non-negative integer").default(0),
});

type StorefrontAnnouncementFormData = z.infer<typeof storefrontAnnouncementSchema>;

interface StorefrontAnnouncementEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  element: StorefrontAnnouncement | null;
}

export const StorefrontAnnouncementEditorModal = ({ isOpen, onClose, onSave, element }: StorefrontAnnouncementEditorModalProps) => {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<StorefrontAnnouncementFormData>({
    resolver: zodResolver(storefrontAnnouncementSchema),
  });

  useEffect(() => {
    if (element) {
      reset(element);
    } else {
      reset({ message: "", icon_name: "Sparkles", is_active: true, display_order: 0 });
    }
  }, [element, reset]);

  const onSubmit = async (data: StorefrontAnnouncementFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in.");
      return;
    }

    const payload = { ...data, user_id: user.id };
    let error;

    if (element) {
      ({ error } = await supabase.from("marquee_elements").update(payload).eq("id", element.id));
    } else {
      ({ error } = await supabase.from("marquee_elements").insert(payload));
    }

    if (error) {
      showError(`Failed to save storefront announcement: ${error.message}`);
    } else {
      showSuccess(`Storefront announcement ${element ? 'updated' : 'added'} successfully!`);
      onSave();
    }
  };

  const messageValue = watch('message');
  const selectedIconName = watch('icon_name');
  const IconComponent = (LucideIcons as any)[selectedIconName] || Sparkles;

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearchTerm, setIconSearchTerm] = useState('');

  const filteredIcons = useMemo(() => {
    return availableIcons.filter(icon =>
      icon.toLowerCase().includes(iconSearchTerm.toLowerCase())
    );
  }, [iconSearchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{element ? "Edit Storefront Announcement" : "Add New Storefront Announcement"}</DialogTitle>
          <DialogDescription>
            Create a scrolling message for your storefront.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" {...register("message")} placeholder="e.g., Flash Sale! Get 20% off all items this week!" rows={3} />
            {errors.message && <p className="text-sm text-destructive mt-1">{errors.message.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon_name">Icon</Label>
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
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {field.value || "Select icon..."}
                        </div>
                        <Sparkles className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search icon..."
                          value={iconSearchTerm}
                          onValueChange={setIconSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>No icon found.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="h-[200px]">
                              <div className="grid grid-cols-5 gap-2 p-2">
                                {filteredIcons.map((iconName) => {
                                  const Icon = (LucideIcons as any)[iconName];
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
              {errors.icon_name && <p className="text-sm text-destructive mt-1">{errors.icon_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input id="display_order" type="number" {...register("display_order", { valueAsNumber: true })} />
              {errors.display_order && <p className="text-sm text-destructive mt-1">{errors.display_order.message}</p>}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          {/* Live Preview */}
          <div className="space-y-2 pt-4">
            <Label>Live Preview</Label>
            <div className="border rounded-lg p-2 bg-muted/50">
              <Marquee pauseOnHover className="py-2 border-y-2 border-primary/20"> {/* Removed bg-primary/10 */}
                <div className="flex items-center gap-4 text-base font-semibold text-primary px-4"> {/* Adjusted gap and added horizontal padding */}
                  <IconComponent className="h-5 w-5 text-primary" />
                  <span>{messageValue || "Your announcement message will appear here."}</span>
                </div>
              </Marquee>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};