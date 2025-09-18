import { TagInput } from "@/components/TagInput";
import { forwardRef } from 'react';

interface ColorInputProps {
  value: string[];
  onChange: (colors: string[]) => void;
}

export const ColorInput = forwardRef<HTMLDivElement, ColorInputProps>(({ value, onChange }, ref) => {
  // In a future iteration, this could be enhanced to show color swatches.
  // For now, it provides a clean tag-based input for color names.
  return (
    <TagInput
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder="Add color name (e.g., Red, Navy Blue)"
    />
  );
});
ColorInput.displayName = "ColorInput";