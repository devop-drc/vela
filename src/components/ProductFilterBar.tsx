import React from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { ListFilter, Tag, DollarSign, XCircle } from "lucide-react";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { FilterState } from "@/hooks/useProductFilters";
import { DetailsAttribute } from "@/hooks/useProductData";

interface ProductFilterBarProps {
  allCategories: string[];
  allTags: string[];
  allDetailsAttributes: DetailsAttribute[];
  filters: FilterState;
  handleToggleFilter: (filterKey: keyof FilterState, value: string) => void;
  handleClearSection: (filterKey: keyof FilterState) => void;
  maxPrice: number;
  localPriceRange: [number, number];
  handlePriceRangeChange: (range: [number, number]) => void;
  hasActiveFilters: boolean;
  handleResetAllFilters: () => void;
}

export const ProductFilterBar: React.FC<ProductFilterBarProps> = ({
  allCategories,
  allTags,
  allDetailsAttributes,
  filters,
  handleToggleFilter,
  handleClearSection,
  maxPrice,
  localPriceRange,
  handlePriceRangeChange,
  hasActiveFilters,
  handleResetAllFilters,
}) => {
  const { shopDetails } = useShop();

  return (
    <div className="p-4 border-b flex flex-wrap gap-2 flex-shrink-0">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <ListFilter className="mr-2 h-4 w-4" />
              Categories ({filters.categories.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allCategories.map(category => (
              <DropdownMenuCheckboxItem
                key={category}
                checked={filters.categories.includes(category)}
                onCheckedChange={() => handleToggleFilter('categories', category)}
              >
                {category}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {filters.categories.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection('categories'); }}>
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <Tag className="mr-2 h-4 w-4" />
              Tags ({filters.tags.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allTags.map(tag => (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={filters.tags.includes(tag)}
                onCheckedChange={() => handleToggleFilter('tags', tag)}
              >
                {tag}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {filters.tags.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection('tags'); }}>
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <DollarSign className="mr-2 h-4 w-4" />
              Price Range
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 p-4">
            <DropdownMenuLabel>Filter by Price</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Slider
              min={0}
              max={maxPrice}
              step={1}
              value={localPriceRange}
              onValueChange={handlePriceRangeChange}
              className="w-full my-4"
            />
            <div className="flex justify-between text-sm font-medium">
              <span>{formatCurrency(localPriceRange[0], shopDetails?.currency)}</span>
              <span>{formatCurrency(localPriceRange[1], shopDetails?.currency)}</span>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {(filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice) && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection('priceRange'); }}>
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {allDetailsAttributes.map(attr => {
        const Icon = getAttributeIcon(attr.name);
        const filterKey = attr.name;
        const isFilterApplied = (filters[filterKey] as string[] || []).length > 0;
        return attr.values.length > 0 ? (
          <div key={filterKey} className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3">
                  <Icon className="mr-2 h-4 w-4" />
                  {attr.name.replace(/_/g, ' ')} ({isFilterApplied ? (filters[filterKey] as string[]).length : 0})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter by {attr.name.replace(/_/g, ' ')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {attr.values.map(value => (
                  <DropdownMenuCheckboxItem
                    key={value}
                    checked={(filters[filterKey] as string[] || []).includes(value)}
                    onCheckedChange={() => handleToggleFilter(filterKey, value)}
                  >
                    {value}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {isFilterApplied && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection(filterKey); }}>
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : null;
      })}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleResetAllFilters} className="text-destructive hover:text-destructive h-9 px-3">
          <XCircle className="mr-2 h-4 w-4" />
          Clear All Filters
        </Button>
      )}
    </div>
  );
};