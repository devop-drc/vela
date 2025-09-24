import { Control, Controller, useFieldArray } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/TagInput";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";

interface DynamicDetailFieldsProps {
  control: Control<any>;
  details: { [key: string]: { value: any; inputType: string; options?: string[] } };
}

const renderField = (control: Control<any>, fieldName: string, fieldData: any) => {
  const name = `details.${fieldName}.value`;
  switch (fieldData.inputType) {
    case 'number':
      return <Controller name={name} control={control} render={({ field }) => <Input type="number" {...field} value={field.value || ''} />} />;
    case 'dropdown':
      return <Controller name={name} control={control} render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger><SelectValue placeholder={`Select ${fieldName}...`} /></SelectTrigger>
          <SelectContent>{fieldData.options?.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
        </Select>
      )} />;
    case 'tags':
      return <Controller name={name} control={control} render={({ field }) => <TagInput {...field} />} />;
    case 'color':
        return <Controller name={name} control={control} render={({ field }) => <Input type="color" {...field} value={field.value || '#000000'} className="h-10 w-16" />} />;
    default:
      return <Controller name={name} control={control} render={({ field }) => <Input {...field} value={field.value || ''} />} />;
  }
};

export const DynamicDetailFields = ({ control, details }: DynamicDetailFieldsProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');

    const { fields, append, remove } = useFieldArray({ control, name: "dynamicDetails" });

    const handleAddField = () => {
        if (!newFieldName) return;
        append({
            key: newFieldName.toLowerCase().replace(/\s/g, '_'),
            label: newFieldName,
            inputType: newFieldType,
            value: ''
        });
        setNewFieldName('');
        setNewFieldType('text');
        setIsAdding(false);
    };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(details).map(([key, fieldData]) => {
            if (key === 'type') return null;
            return (
                <div key={key} className="space-y-2">
                    <Label className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    {renderField(control, key, fieldData)}
                </div>
            )
        })}
        {fields.map((field: any, index) => (
            <div key={field.id} className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="capitalize">{field.label}</Label>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <Controller name={`dynamicDetails.${index}.value`} control={control} render={({ field: rhfField }) => <Input {...rhfField} />} />
            </div>
        ))}
      </div>
      {isAdding ? (
        <div className="flex items-end gap-2 p-2 border rounded-md">
            <div className="flex-1 space-y-1"><Label>Field Name</Label><Input value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="e.g., Material" /></div>
            <div className="space-y-1"><Label>Field Type</Label><Select value={newFieldType} onValueChange={setNewFieldType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="color">Color</SelectItem></SelectContent></Select></div>
            <Button onClick={handleAddField}>Add</Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setIsAdding(true)} className="w-full"><PlusCircle className="mr-2 h-4 w-4" />Add Custom Field</Button>
      )}
    </div>
  );
};