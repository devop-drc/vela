import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";

export interface SpecTemplate {
  key: string;
  label: string;
  unit: string | null;
  common_values: string[] | null;
}

interface SpecificationEditorProps {
  specs: SpecTemplate[];
  onChange: (specs: SpecTemplate[]) => void;
}

export const SpecificationEditor = ({ specs, onChange }: SpecificationEditorProps) => {
  const handleChange = (index: number, field: keyof SpecTemplate, value: string) => {
    const updated = [...specs];
    if (field === "common_values") {
      updated[index] = {
        ...updated[index],
        common_values: value ? value.split(",").map((v) => v.trim()) : null,
      };
    } else if (field === "unit") {
      updated[index] = { ...updated[index], unit: value || null };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...specs, { key: "", label: "", unit: null, common_values: null }]);
  };

  const handleRemove = (index: number) => {
    onChange(specs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Specifications</Label>
      {specs.map((spec, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_80px_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            {index === 0 && <Label className="text-xs text-muted-foreground">Key</Label>}
            <Input
              value={spec.key}
              onChange={(e) => handleChange(index, "key", e.target.value)}
              placeholder="e.g. material"
            />
          </div>
          <div className="space-y-1">
            {index === 0 && <Label className="text-xs text-muted-foreground">Label</Label>}
            <Input
              value={spec.label}
              onChange={(e) => handleChange(index, "label", e.target.value)}
              placeholder="e.g. Material"
            />
          </div>
          <div className="space-y-1">
            {index === 0 && <Label className="text-xs text-muted-foreground">Unit</Label>}
            <Input
              value={spec.unit ?? ""}
              onChange={(e) => handleChange(index, "unit", e.target.value)}
              placeholder="e.g. cm"
            />
          </div>
          <div className="space-y-1">
            {index === 0 && <Label className="text-xs text-muted-foreground">Common Values</Label>}
            <Input
              value={spec.common_values?.join(", ") ?? ""}
              onChange={(e) => handleChange(index, "common_values", e.target.value)}
              placeholder="cotton, polyester, silk"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => handleRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Specification
      </Button>
    </div>
  );
};
