import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const SIZES = ["2XS", "XS", "S", "M", "L", "XL", "2XL"];

interface SizeSelectorProps {
  value: string[];
  onChange: (sizes: string[]) => void;
}

export const SizeSelector = ({ value = [], onChange }: SizeSelectorProps) => {
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      value={value}
      onValueChange={onChange}
      className="flex-wrap justify-start"
    >
      {SIZES.map(size => (
        <ToggleGroupItem key={size} value={size} aria-label={`Toggle ${size}`}>
          {size}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};