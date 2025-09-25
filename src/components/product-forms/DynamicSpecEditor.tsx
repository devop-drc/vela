import { Controller, Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DynamicSpecEditorProps {
  control: Control<any>;
  fields: string[];
}

export const DynamicSpecEditor = ({ control, fields }: DynamicSpecEditorProps) => {
  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No specifications added. Use the AI spec finder to populate this section.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      {fields.map(fieldName => (
        <div key={fieldName} className="space-y-2">
          <Label htmlFor={fieldName} className="capitalize">{fieldName.replace(/_/g, ' ')}</Label>
          <Controller
            name={`details.${fieldName}`}
            control={control}
            render={({ field }) => (
              <Input
                id={fieldName}
                {...field}
                value={field.value || ''}
                className="border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            )}
          />
        </div>
      ))}
    </div>
  );
};