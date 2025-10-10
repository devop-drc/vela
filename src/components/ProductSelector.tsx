import React from "react";
import { useProductData } from "@/hooks/useProductData";
import { useProductFilters } from "@/hooks/useProductFilters";
import { useProductSelection } from "@/hooks/useProductSelection";
import { ProductSearchBar } from "./ProductSearchBar";
import { ProductFilterBar } from "./ProductFilterBar";
import { ProductTable } from "./ProductTable";
import { ProductActionBar } from "./ProductActionBar";

interface ProductSelectorProps {
  selectedProductIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClose: () => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ selectedProductIds, onSelectionChange, onClose }) => {
  // 1. Data Fetching and Metadata
  const {
    allProducts,
    allCategories,
    allTags,
    allDetailsAttributes,
    maxPrice,
    isLoading,
  } = useProductData();

  // 2. Filtering and Sorting Logic
  const {
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    statusFilter,
    setStatusFilter,
    filters,
    handleToggleFilter,
    handleClearSection,
    handleResetAllFilters,
    localPriceRange,
    handlePriceRangeChange,
    hasActiveFilters,
    filteredAndSortedProducts,
  } = useProductFilters({
    allProducts,
    allCategories,
    allTags,
    allDetailsAttributes,
    maxPrice,
  });

  // 3. Product Selection Logic
  const {
    currentSelection,
    handleSelectOne,
    handleSelectAll,
  } = useProductSelection({
    initialSelectedProductIds: selectedProductIds,
    filteredAndSortedProducts,
  });

  const handleApply = () => {
    onSelectionChange(currentSelection);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Search/Sort Bar */}
      <ProductSearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />

      {/* Filter Buttons Section */}
      <ProductFilterBar
        allCategories={allCategories}
        allTags={allTags}
        allDetailsAttributes={allDetailsAttributes}
        filters={filters}
        handleToggleFilter={handleToggleFilter}
        handleClearSection={handleClearSection}
        maxPrice={maxPrice}
        localPriceRange={localPriceRange}
        handlePriceRangeChange={handlePriceRangeChange}
        hasActiveFilters={hasActiveFilters}
        handleResetAllFilters={handleResetAllFilters}
      />

      {/* Product Table Section */}
      <ProductTable
        isLoading={isLoading}
        filteredAndSortedProducts={filteredAndSortedProducts}
        currentSelection={currentSelection}
        handleSelectOne={handleSelectOne}
        handleSelectAll={handleSelectAll}
      />

      {/* Bottom Action Bar */}
      <ProductActionBar
        selectedCount={currentSelection.length}
        onClose={onClose}
        onApply={handleApply}
        isApplyDisabled={currentSelection.length === 0}
      />
    </div>
  );
};