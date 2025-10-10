import { useState, useEffect, useMemo, useCallback } from "react";
import { debounce } from 'lodash';
import { Product, DetailsAttribute } from './useProductData';
import { useShop } from "@/contexts/ShopContext";

export interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: [number, number];
  [key: string]: string[] | [number, number]; // For dynamic attributes
}

interface UseProductFiltersProps {
  allProducts: Product[];
  allCategories: string[];
  allTags: string[];
  allDetailsAttributes: DetailsAttribute[];
  maxPrice: number;
}

interface UseProductFiltersResult {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  filters: FilterState;
  handleToggleFilter: (filterKey: keyof FilterState, value: string) => void;
  handleClearSection: (filterKey: keyof FilterState) => void;
  handleResetAllFilters: () => void;
  localPriceRange: [number, number];
  handlePriceRangeChange: (range: [number, number]) => void;
  hasActiveFilters: boolean;
  filteredAndSortedProducts: Product[];
}

export const useProductFilters = ({
  allProducts,
  allCategories,
  allTags,
  allDetailsAttributes,
  maxPrice,
}: UseProductFiltersProps): UseProductFiltersResult => {
  const { convertCurrency, shopDetails } = useShop();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: [0, 1000], // Initial dummy value, will be updated by maxPrice
  });
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([0, 1000]);

  // Initialize price range based on maxPrice
  useEffect(() => {
    if (filters.priceRange[1] === 1000 && maxPrice !== 1000) {
      setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
      setLocalPriceRange([0, maxPrice]);
    }
  }, [maxPrice, filters.priceRange]);

  const debouncedPriceRangeChange = useMemo(
    () =>
      debounce((range: [number, number]) => {
        setFilters(prev => ({ ...prev, priceRange: range }));
      }, 100),
    [setFilters]
  );

  const handlePriceRangeChange = (range: [number, number]) => {
    setLocalPriceRange(range);
    debouncedPriceRangeChange(range);
  };

  const handleToggleFilter = useCallback((filterKey: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = (prev[filterKey] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues };
    });
  }, []);

  const handleClearSection = useCallback((filterKey: keyof FilterState) => {
    setFilters(prev => {
      const updatedFilters = { ...prev, [filterKey]: filterKey === 'priceRange' ? [0, maxPrice] : [] };
      if (filterKey === 'priceRange') {
        setLocalPriceRange([0, maxPrice]);
      }
      return updatedFilters;
    });
  }, [maxPrice]);

  const hasActiveFilters = useMemo(() => {
    return searchTerm || statusFilter !== 'All' || sortOption !== 'newest' ||
           filters.categories.length > 0 || filters.tags.length > 0 ||
           filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice ||
           Object.entries(filters).some(([key, value]) => key !== 'categories' && key !== 'tags' && key !== 'priceRange' && Array.isArray(value) && value.length > 0);
  }, [searchTerm, statusFilter, sortOption, filters, maxPrice]);

  const handleResetAllFilters = useCallback(() => {
    setSearchTerm("");
    setSortOption("newest");
    setStatusFilter("All");
    setFilters({
      categories: [],
      tags: [],
      priceRange: [0, maxPrice],
    });
    setLocalPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchTerm) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => p.category && filters.categories.includes(p.category));
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(p => p.tags?.some(tag => filters.tags.includes(tag)));
    }

    filtered = filtered.filter(p => {
      const price = convertCurrency(p.price, p.currency);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    for (const key in filters) {
      if (key !== 'categories' && key !== 'tags' && key !== 'priceRange' && Array.isArray(filters[key]) && (filters[key] as string[]).length > 0) {
        const selectedValues = filters[key] as string[];
        filtered = filtered.filter(p => {
          const productDetailValue = p.details?.[key];
          if (!productDetailValue) return false;
          if (Array.isArray(productDetailValue)) {
            return productDetailValue.some(val => selectedValues.includes(String(val)));
          }
          return selectedValues.includes(String(productDetailValue));
        });
      }
    }

    return filtered.sort((a, b) => {
      const priceA = convertCurrency(a.price, a.currency);
      const priceB = convertCurrency(b.price, b.currency);

      switch (sortOption) {
        case 'price-asc': return priceA - priceB;
        case 'price-desc': return priceB - priceA;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [allProducts, searchTerm, sortOption, statusFilter, filters, convertCurrency, maxPrice]);

  return {
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
  };
};