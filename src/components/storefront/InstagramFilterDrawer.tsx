"use client";

import { useState, useEffect, useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { X, Filter, Tag, DollarSign, Palette, Ruler, Layers, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useStorefront } from "@/contexts/StorefrontContext";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from 'lodash';

interface Product {
  id: string;
  name: string;
  category: string;
  tags: string[];
  price: number | null;
  currency: string | null;
  details: { [key: string]: any };
}

interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: [number, number];
  [key: string]: string[] | [number, number];
}

interface InstagramFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentFilters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
}

export const InstagramFilterDrawer = ({
  isOpen,
  onClose,
  products,
  currentFilters,
  onFilterChange,
  onResetFilters,
}: InstagramFilterDrawerProps) => {
  const { shopDetails, convertCurrency } = useStorefront();

  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(currentFilters.priceRange);

  useEffect(() => {
    setLocalFilters(currentFilters);
    setLocalPriceRange(currentFilters.priceRange);
  }, [currentFilters]);

  const handleToggleFilter = (filterKey: keyof FilterState, value: string) => {
    setLocalFilters(prev => {
      const currentValues = (prev[filterKey] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      const updatedFilters = { ...prev, [filterKey]: newValues };
      onFilterChange(updatedFilters);
      return updatedFilters;
    });
  };

  const debouncedPriceRangeChange = useMemo(
    () =>
      debounce((range: [number, number]) => {
        onFilterChange(prev => ({ ...prev, priceRange: range }));
      }, 100),
    [onFilterChange]
  );

  const handlePriceRangeChange = (range: [number, number]) => {
    setLocalPriceRange(range);
    debouncedPriceRangeChange(range);
  };

  const handleClearSection = (filterKey: keyof FilterState) => {
    setLocalFilters(prev => {
      const updatedFilters = { ...prev, [filterKey]: filterKey === 'priceRange' ? [0, maxPrice] : [] };
      if (filterKey === 'priceRange') {
        setLocalPriceRange([0, maxPrice]);
      }
      return updatedFilters;
    });
  };

  const handleClearAll = () => {
    onResetFilters();
    onClose();
  };

  const { uniqueCategories, uniqueTags, uniqueDetailsAttributes, maxPrice } = useMemo(() => {
    const categories = new Set<string>();
    const tags = new Set<string>();
    const detailsAttributes: { [key: string]: Set<string> } = {};
    let currentMaxPrice = 0;

    products.forEach(product => {
      if (product.category) categories.add(product.category);
      product.tags?.forEach(tag => tags.add(tag));
      if (product.price !== null) {
        const convertedPrice = convertCurrency(product.price, product.currency);
        if (convertedPrice > currentMaxPrice) {
          currentMaxPrice = convertedPrice;
        }
      }

      for (const key in product.details) {
        if (Object.prototype.hasOwnProperty.call(product.details, key)) {
          const value = product.details[key];
          if (value !== undefined && value !== null && key !== 'type') {
            if (!detailsAttributes[key]) {
              detailsAttributes[key] = new Set<string>();
            }
            if (Array.isArray(value)) {
              value.forEach(item => detailsAttributes[key].add(String(item)));
            } else {
              detailsAttributes[key].add(String(value));
            }
          }
        }
      }
    });

    return {
      uniqueCategories: Array.from(categories).sort(),
      uniqueTags: Array.from(tags).sort(),
      uniqueDetailsAttributes: Object.entries(detailsAttributes).map(([key, values]) => ({
        name: key,
        values: Array.from(values).sort(),
      })).sort((a, b) => a.name.localeCompare(b.name)),
      maxPrice: Math.ceil(currentMaxPrice / 10) * 10,
    };
  }, [products, convertCurrency]);

  useEffect(() => {
    setLocalFilters(prev => {
      const currentMin = prev.priceRange[0];
      const currentMax = prev.priceRange[1];
      const newMax = maxPrice > 0 ? maxPrice : 100;

      const adjustedMax = Math.min(currentMax, newMax);
      const adjustedMin = Math.min(currentMin, adjustedMax);

      if (adjustedMin !== prev.priceRange[0] || adjustedMax !== prev.priceRange[1] || newMax !== (maxPrice > 0 ? maxPrice : 100)) {
        setLocalPriceRange([adjustedMin, adjustedMax]);
        return { ...prev, priceRange: [adjustedMin, adjustedMax] };
      }
      return prev;
    });
  }, [maxPrice]);

  const FilterSection = ({ title, icon: Icon, filterKey, children }: { title: string; icon: React.ElementType; filterKey: keyof FilterState; children: React.ReactNode }) => {
    const isFilterApplied = useMemo(() => {
      const filterValue = localFilters[filterKey];
      if (filterKey === 'priceRange') {
        return filterValue[0] !== 0 || filterValue[1] !== maxPrice;
      }
      return Array.isArray(filterValue) && filterValue.length > 0;
    }, [localFilters, filterKey, maxPrice]);

    return (
      <AccordionItem value={title} className="border-b border-gray-200">
        <div className="flex items-center justify-between py-3 text-base font-semibold">
          <AccordionTrigger className="flex-1 py-0 pr-3 text-base text-gray-800">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-red-500" />
              {title}
            </div>
          </AccordionTrigger>
          <AnimatePresence>
            {isFilterApplied && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => { e.stopPropagation(); handleClearSection(filterKey); }}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                aria-label={`Clear ${title} filters`}
              >
                <XCircle className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <AccordionContent className="pb-4 pt-2">
          {children}
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
      <DrawerContent side="bottom" className="h-[90vh] p-0 flex flex-col bg-white text-black rounded-t-xl">
        <DrawerHeader className="p-4 border-b border-gray-200 flex-row items-center justify-between flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Filter className="h-6 w-6 text-red-500" />
            Filters
          </DrawerTitle>
          {/* Removed X button */}
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-6">
          <Accordion type="multiple" defaultValue={["Categories", "Price Range"]} className="w-full">
            {uniqueCategories.length > 0 && (
              <FilterSection title="Categories" icon={Info} filterKey="categories">
                <div className="flex flex-wrap gap-2">
                  {uniqueCategories.map(category => (
                    <Button
                      key={category}
                      variant={localFilters.categories.includes(category) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFilter('categories', category)}
                      className={cn(
                        "text-sm bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200",
                        localFilters.categories.includes(category) && "bg-red-500 text-white border-red-500 hover:bg-red-600"
                      )}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </FilterSection>
            )}

            <FilterSection title="Price Range" icon={DollarSign} filterKey="priceRange">
              <div className="px-2 space-y-4">
                <Slider
                  min={0}
                  max={maxPrice > 0 ? maxPrice : 100}
                  step={1}
                  value={localPriceRange}
                  onValueChange={handlePriceRangeChange}
                  className="w-full"
                  indicatorClassName="bg-red-500"
                  rangeClassName="bg-red-500"
                  thumbClassName="bg-red-500 border-red-500"
                />
                <div className="flex justify-between text-sm font-medium text-gray-800">
                  <span>{formatCurrency(localPriceRange[0], shopDetails?.currency)}</span>
                  <span>{formatCurrency(localPriceRange[1], shopDetails?.currency)}</span>
                </div>
              </div>
            </FilterSection>

            {uniqueTags.length > 0 && (
              <FilterSection title="Tags" icon={Tag} filterKey="tags">
                <div className="flex flex-wrap gap-2">
                  {uniqueTags.map(tag => (
                    <Button
                      key={tag}
                      variant={(localFilters.tags as string[] || []).includes(tag) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFilter('tags', tag)}
                      className={cn(
                        "text-sm bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200",
                        (localFilters.tags as string[] || []).includes(tag) && "bg-red-500 text-white border-red-500 hover:bg-red-600"
                      )}
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </FilterSection>
            )}

            {uniqueDetailsAttributes.map(attr => {
              const Icon = getAttributeIcon(attr.name);
              const filterKey = attr.name;
              return attr.values.length > 0 ? (
                <FilterSection key={attr.name} title={attr.name.replace(/_/g, ' ')} icon={Icon} filterKey={filterKey}>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map(value => (
                      <Button
                        key={value}
                        variant={(localFilters[filterKey] as string[] || []).includes(value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleFilter(filterKey, value)}
                        className={cn(
                          "text-sm bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200",
                          (localFilters[filterKey] as string[] || []).includes(value) && "bg-red-500 text-white border-red-500 hover:bg-red-600"
                        )}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </FilterSection>
              ) : null;
            })}
          </Accordion>
        </ScrollArea>
        <DrawerFooter className="p-4 border-t border-gray-200 flex-shrink-0">
          <Button variant="outline" onClick={handleClearAll} className="flex-1 text-base bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200">Clear All</Button>
          <Button onClick={onClose} className="flex-1 text-base bg-red-500 hover:bg-red-600 text-white">Apply Filters</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};