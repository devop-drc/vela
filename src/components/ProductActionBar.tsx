import React from 'react';
import { Button } from "@/components/ui/button";

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
  return (
    <div className="p-4 border-t flex justify-between items-center flex-shrink-0">
      <p className="text-sm text-muted-foreground">{selectedCount} products selected</p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={onApply} disabled={isApplyDisabled}>Apply</Button>
      </div>
    </div>
  );
};