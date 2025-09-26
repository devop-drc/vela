import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/TagInput";
import { SizeSelector } from "@/components/product-forms/SizeSelector";
import { ColorInput } from "@/components/product-forms/ColorInput";

interface DynamicProductAttributesProps {
  control: any;
  attributes: { name: string; inputType: string; possibleValues?: string[] }[];
}

const renderField = (control: any, attribute: any) => {
  const name = `details.${attribute.name}`;
  const commonProps = {
    className: "border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
  };

  switch (attribute.inputType) {
    case 'number':
      return <Controller name={name} control={control} render={({ field }) => <Input type="number" {...field} value={field.value || ''} {...commonProps} />} />;
    case 'dropdown':
      return <Controller name={name} control={control} render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger {...commonProps}><SelectValue placeholder={`Select ${attribute.name}...`} /></SelectTrigger>
          <SelectContent>{attribute.possibleValues?.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
        </Select>
      )} />;
    case 'tags':
      return <Controller name={name} control={control} render={({ field }) => <TagInput {...field} />} />;
    case 'color':
      return <Controller name={name} control={control} render={({ field }) => <ColorInput {...field} />} />;
    case 'sizes':
        return <Controller name={name} control={control} render={({ field }) => <SizeSelector {...field} />} />;
    default:
      return <Controller name={name} control={control} render={({ field }) => <Input {...field} value={field.value || ''} {...commonProps} />} />;
  }
};

export const DynamicProductAttributes = ({ control, attributes }: DynamicProductAttributesProps) => {
  if (!attributes || attributes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No attributes defined for this product type.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      {attributes.map((attr) => (
        <div key={attr.name} className="space-y-2">
          <Label className="capitalize">{attr.name.replace(/_/g, ' ')}</Label>
          {renderField(control, attr)}
        </div>
      ))}
    </div>
  );
};