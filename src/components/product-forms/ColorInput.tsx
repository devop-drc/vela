import { TagInput } from "@/components/TagInput";
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ColorInputProps {
  value: string[];
  onChange: (colors: string[]) => void;
}

export const ColorInput = forwardRef<HTMLDivElement, ColorInputProps>(({ value, onChange }, ref) => {
  const { t } = useTranslation();
  // In a future iteration, this could be enhanced to show color swatches.
  // For now, it provides a clean tag-based input for color names.
  return (
    <TagInput
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={t('products_ui.add_color_placeholder')}
    />
  );
});
ColorInput.displayName = "ColorInput";