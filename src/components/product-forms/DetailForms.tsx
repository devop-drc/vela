import { Controller, Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/TagInput";

interface DetailFormProps {
  control: Control<any>;
}

const DetailField = ({ name, control, label }: { name: string; control: Control<any>; label: string }) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Controller name={`details.${name}`} control={control} render={({ field }) => <Input id={name} {...field} />} />
  </div>
);

export const ClothingDetailsForm = ({ control }: DetailFormProps) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2 col-span-2">
      <Label>Sizes</Label>
      <Controller name="details.sizes" control={control} render={({ field }) => <TagInput {...field} placeholder="Add size..." />} />
    </div>
    <DetailField name="material" control={control} label="Material" />
    <DetailField name="reference_code" control={control} label="Reference Code" />
    <div className="space-y-2 col-span-2">
      <Label>Colors</Label>
      <Controller name="details.colors" control={control} render={({ field }) => <TagInput {...field} placeholder="Add color..." />} />
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