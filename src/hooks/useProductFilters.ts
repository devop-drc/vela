import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import debounce from 'lodash/debounce';
import { Product, DetailsAttribute } from './useProductData';
import { useShop } from "@/contexts/ShopContext";

export interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: [number, number];
  status: string[]; // Changed to array
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
  statusFilter: string[]; // Changed to array
  handleToggleStatusFilter: (status: string) => void; // New handler
  filters: FilterState;
  handleToggleFilter: (filterKey: keyof FilterState, value: string) => void;
  handleClearSection: (filterKey: keyof FilterState | 'status') => void; // Updated to include 'status'
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
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Initialize status as empty array
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: [0, 1000],
    status: [],
  });
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([0, 1000]);
  // Track whether the user has manually adjusted the price slider. Until they do,
  // the upper bound follows maxPrice; once touched, we stop clobbering their choice.
  const userTouchedPrice = useRef(false);

  // Keep the price range's upper bound in sync with maxPrice — but only while the
  // user hasn't set it themselves.
  useEffect(() => {
    if (userTouchedPrice.current) return;
    setFilters(prev => (prev.priceRange[1] === maxPrice ? prev : { ...prev, priceRange: [prev.priceRange[0], maxPrice] }));
    setLocalPriceRange(prev => (prev[1] === maxPrice ? prev : [prev[0], maxPrice]));
  }, [maxPrice]);

  const debouncedPriceRangeChange = useMemo(
    () =>
      debounce((range: [number, number]) => {
        setFilters(prev => ({ ...prev, priceRange: range }));
      }, 100),
    [setFilters]
  );

  const handlePriceRangeChange = (range: [number, number]) => {
    userTouchedPrice.current = true;
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

  const handleToggleStatusFilter = useCallback((status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }, []);

  const handleClearSection = useCallback((filterKey: keyof FilterState | 'status') => {
    if (filterKey === 'status') {
      setStatusFilter([]);
    } else if (filterKey === 'priceRange') {
      userTouchedPrice.current = false;
      setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
      setLocalPriceRange([0, maxPrice]);
    } else {
      setFilters(prev => ({ ...prev, [filterKey]: [] }));
    }
  }, [maxPrice]);

  const hasActiveFilters = useMemo(() => {
    // Check if any filter is active
    const isPriceFiltered = filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice;
    const isAttributeFiltered = Object.entries(filters).some(([key, value]) => 
      key !== 'categories' && key !== 'tags' && key !== 'priceRange' && key !== 'status' && Array.isArray(value) && value.length > 0
    );

    return searchTerm || statusFilter.length > 0 || sortOption !== 'newest' ||
           filters.categories.length > 0 || filters.tags.length > 0 ||
           isPriceFiltered || isAttributeFiltered;
  }, [searchTerm, statusFilter, sortOption, filters, maxPrice]);

  const handleResetAllFilters = useCallback(() => {
    setSearchTerm("");
    setSortOption("newest");
    setStatusFilter([]); // Reset status filter
    userTouchedPrice.current = false;
    setFilters({
      categories: [],
      tags: [],
      priceRange: [0, maxPrice],
      status: [],
    });
    setLocalPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchTerm) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (statusFilter.length > 0) { // Use array for status filter
      filtered = filtered.filter(p => statusFilter.includes(p.status));
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

    const normalize = (s: string) => s.toLowerCase().replace(/\s|_/g, '');
    const normVal = (v: unknown) => String(v).trim().toLowerCase();
    for (const key in filters) {
      if (key !== 'categories' && key !== 'tags' && key !== 'priceRange' && key !== 'status' && Array.isArray(filters[key]) && (filters[key] as string[]).length > 0) {
        const selectedValues = (filters[key] as string[]).map(v => v.trim().toLowerCase());
        filtered = filtered.filter(p => {
          const details = p.details || {} as Record<string, unknown>;
          // resolve the actual details key by normalization (handles Brand vs brand vs BRAND, spaces, underscores)
          const matchKey = Object.keys(details).find(k => normalize(k) === normalize(key));
          if (!matchKey) {
            // Fallback for Brand: infer from product name and tags when details.brand is missing
            if (normalize(key) === 'brand') {
              const nameLower = (p.name || '').toLowerCase();
              const tagsLower = (p.tags || []).map(t => String(t).toLowerCase());
              // If any selected brand appears in the name or in any tag, consider it a match
              const matchesName = selectedValues.some(val => nameLower.includes(val));
              if (matchesName) return true;
              const matchesTags = selectedValues.some(val => tagsLower.some(tag => tag.includes(val)));
              if (matchesTags) return true;
            }
            return false;
          }
          const value = details[matchKey];
          if (Array.isArray(value)) {
            return value.some(val => selectedValues.includes(normVal(val)));
          }
          return selectedValues.includes(normVal(value));
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
    handleToggleStatusFilter,
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