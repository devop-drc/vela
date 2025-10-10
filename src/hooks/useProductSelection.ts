import { useState, useEffect, useCallback } from "react";
import { Product } from './useProductData';

interface UseProductSelectionProps {
  initialSelectedProductIds: string[];
  filteredAndSortedProducts: Product[];
}

interface UseProductSelectionResult {
  currentSelection: string[];
  handleSelectOne: (productId: string) => void;
  handleSelectAll: (checked: boolean) => void;
}

export const useProductSelection = ({
  initialSelectedProductIds,
  filteredAndSortedProducts,
}: UseProductSelectionProps): UseProductSelectionResult => {
  const [currentSelection, setCurrentSelection] = useState<string[]>(initialSelectedProductIds);

  // Update currentSelection if initialSelectedProductIds changes
  useEffect(() => {
    setCurrentSelection(initialSelectedProductIds);
  }, [initialSelectedProductIds]);

  const handleSelectOne = useCallback((productId: string) => {
    setCurrentSelection(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setCurrentSelection(filteredAndSortedProducts.map(p => p.id));
    } else {
      setCurrentSelection([]);
    }
  }, [filteredAndSortedProducts]);

  return {
    currentSelection,
    handleSelectOne,
    handleSelectAll,
  };
};