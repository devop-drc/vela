import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

const saleSchema = z.object({
  type: z.enum(["percentage", "flat"]),
  value: z.coerce.number().min(0.01, "Value must be greater than 0"),
});

export type SaleFormData = z.infer<typeof saleSchema>;

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: SaleFormData) => void;
  productCount: number;
}

export const SaleModal = ({ isOpen, onClose, onApply, productCount }: SaleModalProps) => {
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: { type: "percentage", value: 10 },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Sale to {productCount} Products</DialogTitle>
          <DialogDescription>
            Set a discount that will be applied to the current price of the selected products. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onApply)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <Label htmlFor="percentage">Percentage Off (%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flat" id="flat" />
                    <Label htmlFor="flat">Flat Amount Off</Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Discount Value</Label>
            <Input id="value" type="number" step="0.01" {...register("value")} />
            {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};