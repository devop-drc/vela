import { TagInput } from "@/components/TagInput";

interface ColorInputProps {
  value: string[];
  onChange: (colors: string[]) => void;
}

export const ColorInput = ({ value, onChange }: ColorInputProps) => {
  // In a future iteration, this could be enhanced to show color swatches.
  // For now, it provides a clean tag-based input for color names.
  return (
    <TagInput
      value={value}
      onChange={onChange}
      placeholder="Add color name (e.g., Red, Navy Blue)"
    />
  );
};