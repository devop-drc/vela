import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { forwardRef } from "react";
import { useTranslation } from 'react-i18next';

const SIZES = ["2XS", "XS", "S", "M", "L", "XL", "2XL"];

interface SizeSelectorProps {
  value: string[];
  onChange: (sizes: string[]) => void;
}

export const SizeSelector = forwardRef<HTMLDivElement, SizeSelectorProps>(({ value = [], onChange }, ref) => {
  const { t } = useTranslation();
  return (
    <ToggleGroup
      ref={ref}
      type="multiple"
      variant="outline"
      value={value}
      onValueChange={onChange}
      className="flex-wrap justify-start"
    >
      {SIZES.map(size => (
        <ToggleGroupItem key={size} value={size} aria-label={t('products_ui.toggle_size_aria', { size })}>
          {size}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
});
SizeSelector.displayName = "SizeSelector";