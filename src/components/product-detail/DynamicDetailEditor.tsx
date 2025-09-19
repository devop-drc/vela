import { useFieldArray, Controller, Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { PlusCircle, Trash2 } from "lucide-react";

const inputTypes = ["input", "textarea", "tags", "switch", "select"];

const DetailInput = ({ control, index }: { control: Control<any>, index: number }) => {
    const type = control._getWatch(`details.${index}.type`);

    switch (type) {
        case 'textarea':
            return <Controller name={`details.${index}.value`} control={control} render={({ field }) => <Textarea {...field} />} />;
        case 'tags':
            return <Controller name={`details.${index}.value`} control={control} render={({ field }) => <TagInput {...field} />} />;
        case 'switch':
            return <Controller name={`details.${index}.value`} control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />;
        case 'select': // Note: This is a basic implementation. A real-world scenario might need an options field.
            return <Controller name={`details.${index}.value`} control={control} render={({ field }) => <Input {...field} placeholder="Enter value" />} />;
        case 'input':
        default:
            return <Controller name={`details.${index}.value`} control={control} render={({ field }) => <Input {...field} placeholder="Enter value" />} />;
    }
};

export const DynamicDetailEditor = ({ control }: { control: Control<any> }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "details",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
          <div className="col-span-4 space-y-1">
            <Label>Detail Name</Label>
            <Controller name={`details.${index}.name`} control={control} render={({ field }) => <Input {...field} />} />
          </div>
          <div className="col-span-5 space-y-1">
            <Label>Value</Label>
            <DetailInput control={control} index={index} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Input Type</Label>
            <Controller name={`details.${index}.type`} control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{inputTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="col-span-1">
            <Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => append({ name: "", value: "", type: "input", unit: null })}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Detail
      </Button>
    </div>
  );
};