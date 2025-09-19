import { Controller, Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SizeSelector } from "./SizeSelector";
import { ColorInput } from "./ColorInput";
import { clothingMaterials } from "@/lib/productData";

interface DetailFormProps {
  control: Control<any>;
}

const DetailField = ({ name, control, label, className, placeholder }: { name: string; control: Control<any>; label: string, className?: string, placeholder?: string }) => (
  <div className={`space-y-2 ${className}`}>
    <Label htmlFor={name}>{label}</Label>
    <Controller name={`details.${name}`} control={control} render={({ field }) => <Input id={name} {...field} value={field.value || ''} placeholder={placeholder} className="border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />} />
  </div>
);

export const ClothingDetailsForm = ({ control }: DetailFormProps) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Label>Available Sizes</Label>
      <Controller name="details.sizes" control={control} render={({ field }) => <SizeSelector {...field} />} />
    </div>
    <div className="space-y-2">
      <Label>Available Colors</Label>
      <Controller name="details.colors" control={control} render={({ field }) => <ColorInput {...field} />} />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      <div className="space-y-2">
        <Label>Material</Label>
        <Controller name="details.material" control={control} render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger className="border-0 border-b-2 rounded-none bg-transparent hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 data-[state=open]:bg-muted/50">
                <SelectValue placeholder="Select material..." />
            </SelectTrigger>
            <SelectContent>{clothingMaterials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        )} />
      </div>
      <DetailField name="reference_code" control={control} label="Reference Code" placeholder="e.g., SKU123" />
    </div>
  </div>
);

export const ElectronicsDetailsForm = ({ control }: DetailFormProps) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailField name="model_number" control={control} label="Model Number" placeholder="e.g., A2484" />
        <DetailField name="processor" control={control} label="Processor" placeholder="e.g., A15 Bionic" />
        <DetailField name="ram" control={control} label="RAM" placeholder="e.g., 6GB" />
        <DetailField name="storage" control={control} label="Storage" placeholder="e.g., 256GB" />
    </div>
);

export const ArtDetailsForm = ({ control }: DetailFormProps) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailField name="dimensions" control={control} label="Dimensions" placeholder="e.g., 24x36in" />
        <DetailField name="medium" control={control} label="Medium" placeholder="e.g., Oil on canvas" />
        <DetailField name="framed" control={control} label="Framing" placeholder="e.g., Oak, Unframed" />
    </div>
);

export const ServiceDetailsForm = ({ control }: DetailFormProps) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailField name="duration" control={control} label="Duration" placeholder="e.g., 60 minutes" />
        <DetailField name="format" control={control} label="Format" placeholder="e.g., Online, In-person" />
    </div>
);

export const GenericDetailsForm = () => <p className="text-sm text-muted-foreground text-center py-4">No specific details for this category.</p>;