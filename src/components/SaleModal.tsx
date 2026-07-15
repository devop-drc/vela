import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { Percent, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { currencySymbol } from "@/lib/formatters";

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
  const { shopDetails } = useShop();
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: { type: "percentage", value: 10 },
  });

  const saleType = watch("type");

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
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <ToggleGroupItem value="percentage" className="gap-1.5">
                    <Percent className="h-3.5 w-3.5" /> Percentage Off
                  </ToggleGroupItem>
                  <ToggleGroupItem value="flat" className="gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Flat Amount Off
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Discount Value</Label>
            <div className="relative">
              {saleType === "flat" && shopDetails?.currency && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {currencySymbol(shopDetails.currency)}
                </span>
              )}
              <Input
                id="value"
                type="number"
                step="0.01"
                {...register("value")}
                className={cn(saleType === "flat" && "pl-8", saleType === "percentage" && "pr-8")}
              />
              {saleType === "percentage" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              )}
            </div>
            {errors.value && <p className="text-sm text-destructive mt-1">{errors.value.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              Apply Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
