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

const DetailField = ({ name, control, label }: { name: string; control: Control<any>; label: string }) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Controller name={`details.${name}`} control={control} render={({ field }) => <Input id={name} {...field} value={field.value || ''} />} />
  </div>
);

export const ClothingDetailsForm = ({ control }: DetailFormProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Available Sizes</Label>
      <Controller name="details.sizes" control={control} render={({ field }) => <SizeSelector {...field} />} />
    </div>
    <div className="space-y-2">
      <Label>Available Colors</Label>
      <Controller name="details.colors" control={control} render={({ field }) => <ColorInput {...field} />} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Material</Label>
        <Controller name="details.material" control={control} render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger><SelectValue placeholder="Select material..." /></SelectTrigger>
            <SelectContent>{clothingMaterials.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        )} />
      </div>
      <DetailField name="reference_code" control={control} label="Reference Code" />
    </div>
  </div>
);

export const ElectronicsDetailsForm = ({ control }: DetailFormProps) => (
    <div className="grid grid-cols-2 gap-4">
        <DetailField name="model_number" control={control} label="Model Number" />
        <DetailField name="processor" control={control} label="Processor" />
        <DetailField name="ram" control={control} label="RAM" />
        <DetailField name="storage" control={control} label="Storage" />
    </div>
);

export const ArtDetailsForm = ({ control }: DetailFormProps) => (
    <div className="space-y-4">
        <DetailField name="dimensions" control={control} label="Dimensions" />
        <DetailField name="medium" control={control} label="Medium" />
        <DetailField name="framed" control={control} label="Framing" />
    </div>
);

export const ServiceDetailsForm = ({ control }: DetailFormProps) => (
    <div className="space-y-4">
        <DetailField name="duration" control={control} label="Duration" />
        <DetailField name="format" control={control} label="Format" />
    </div>
);

export const GenericDetailsForm = () => <p className="text-sm text-muted-foreground text-center py-4">No specific details for this category.</p>;