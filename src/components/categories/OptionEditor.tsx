import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";

export interface OptionTemplate {
  name: string;
  common_values: string[];
}

interface OptionEditorProps {
  options: OptionTemplate[];
  onChange: (options: OptionTemplate[]) => void;
}

export const OptionEditor = ({ options, onChange }: OptionEditorProps) => {
  const handleChange = (index: number, field: keyof OptionTemplate, value: string) => {
    const updated = [...options];
    if (field === "common_values") {
      updated[index] = {
        ...updated[index],
        common_values: value ? value.split(",").map((v) => v.trim()) : [],
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...options, { name: "", common_values: [] }]);
  };

  const handleRemove = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Options (Variants)</Label>
      {options.map((option, index) => (
        <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
          <div className="space-y-1">
            {index === 0 && <Label className="text-xs text-muted-foreground">Name</Label>}
            <Input
              value={option.name}
              onChange={(e) => handleChange(index, "name", e.target.value)}
              placeholder="e.g. Size"
            />
          </div>
          <div className="space-y-1">
            {index === 0 && <Label className="text-xs text-muted-foreground">Common Values</Label>}
            <Input
              value={option.common_values.join(", ")}
              onChange={(e) => handleChange(index, "common_values", e.target.value)}
              placeholder="S, M, L, XL"
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
        Add Option
      </Button>
    </div>
  );
};
