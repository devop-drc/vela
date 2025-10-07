import { useEffect } from "react";
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
import { Loader2, Sparkles, MessageSquareText, CheckCircle, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { MarqueeElement } from "@/pages/MarqueeSettings";
import * as LucideIcons from 'lucide-react'; // Import all Lucide icons

// List of common Lucide icons for selection
const availableIcons = [
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

const marqueeElementSchema = z.object({
  message: z.string().min(1, "Message is required"),
  icon_name: z.string().min(1, "Icon is required"),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().int().min(0, "Display order must be a non-negative integer").default(0),
});

type MarqueeElementFormData = z.infer<typeof marqueeElementSchema>;

interface MarqueeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  element: MarqueeElement | null;
}

export const MarqueeEditorModal = ({ isOpen, onClose, onSave, element }: MarqueeEditorModalProps) => {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<MarqueeElementFormData>({
    resolver: zodResolver(marqueeElementSchema),
  });

  useEffect(() => {
    if (element) {
      reset(element);
    } else {
      reset({ message: "", icon_name: "Sparkles", is_active: true, display_order: 0 });
    }
  }, [element, reset]);

  const onSubmit = async (data: MarqueeElementFormData) => {
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
      showError(`Failed to save marquee element: ${error.message}`);
    } else {
      showSuccess(`Marquee element ${element ? 'updated' : 'added'} successfully!`);
      onSave();
    }
  };

  const selectedIconName = watch('icon_name');
  const IconComponent = (LucideIcons as any)[selectedIconName] || Sparkles;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{element ? "Edit Marquee Element" : "Add New Marquee Element"}</DialogTitle>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="icon_name">
                      <IconComponent className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {availableIcons.map(icon => {
                        const Icon = (LucideIcons as any)[icon];
                        return (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              {Icon && <Icon className="h-4 w-4" />}
                              {icon}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Element
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};