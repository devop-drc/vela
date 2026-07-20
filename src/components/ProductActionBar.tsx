import React from 'react';
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

interface ProductActionBarProps {
  selectedCount: number;
  onClose: () => void;
  onApply: () => void;
  isApplyDisabled: boolean;
}

export const ProductActionBar: React.FC<ProductActionBarProps> = ({
  selectedCount,
  onClose,
  onApply,
  isApplyDisabled,
}) => {
  const { t } = useTranslation();
  return (
    <div className="p-4 border-t flex justify-between items-center flex-shrink-0">
      <p className="text-sm text-muted-foreground">{t('products_ui.products_selected', { count: selectedCount })}</p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={onApply} disabled={isApplyDisabled}>{t('common.apply')}</Button>
      </div>
    </div>
  );
};