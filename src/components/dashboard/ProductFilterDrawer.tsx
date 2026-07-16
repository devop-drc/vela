import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { X, Filter, Tag, DollarSign, Info, XCircle, ListFilter, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import debounce from 'lodash/debounce';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";

import { FilterState } from "@/hooks/useProductFilters";
import { DetailsAttribute } from "@/hooks/useProductData";

interface ProductFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allCategories: string[];
  allTags: string[];
  allDetailsAttributes: DetailsAttribute[];
  maxPrice: number;
  filters: FilterState;
  handleToggleFilter: (filterKey: keyof FilterState, value: string) => void;
  handleClearSection: (filterKey: keyof FilterState | 'status') => void;
  handleResetAllFilters: () => void;
  localPriceRange: [number, number];
  handlePriceRangeChange: (range: [number, number]) => void;
  statusFilter: string[];
  handleToggleStatusFilter: (status: string) => void;
  ratingFilter: number;
  handleSetRatingFilter: (min: number) => void;
  // Optional: render order and visibility for sections (from admin Filter Visibility)
  drawerKeys?: string[]; // e.g., ['availability','categories','priceRange','rating','tags','Brand','Color']
}

export const ProductFilterDrawer = ({
  isOpen,
  onClose,
  allCategories,
  allTags,
  allDetailsAttributes,
  maxPrice,
  filters,
  handleToggleFilter,
  handleClearSection,
  handleResetAllFilters,
  localPriceRange,
  handlePriceRangeChange,
  statusFilter,
  handleToggleStatusFilter,
  ratingFilter,
  handleSetRatingFilter,
  drawerKeys,
}: ProductFilterDrawerProps) => {
  const { shopDetails, convertCurrency } = useShop();

  const FilterSection = ({ title, icon: Icon, filterKey, children }: { title: string; icon: React.ElementType; filterKey: keyof FilterState | 'status'; children: React.ReactNode }) => {
    const isFilterApplied = useMemo(() => {
      if (filterKey === 'priceRange') {
        return filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice;
      }
      if (filterKey === 'status') {
        return statusFilter.length > 0;
      }
      if (filterKey === 'rating') {
        return ratingFilter > 0;
      }
      return Array.isArray(filters[filterKey as keyof FilterState]) && (filters[filterKey as keyof FilterState] as string[]).length > 0;
    }, [filters, filterKey, maxPrice, statusFilter, ratingFilter]);

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleClearSection(filterKey);
    };

    return (
      <AccordionItem value={title}>
        <div className="flex items-center justify-between py-3 text-base font-semibold">
          <AccordionTrigger className="flex-1 py-0 pr-3 text-base">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
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
                onClick={handleClear}
                className="p-1 rounded-full hover:bg-accent-foreground/10 text-muted-foreground hover:text-foreground"
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
      <DrawerContent side="bottom" className="h-[90vh] p-0 flex flex-col bg-card text-foreground rounded-t-xl">
        <DrawerHeader className="p-4 border-b flex-row items-center justify-between flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2 text-xl font-bold">
            <Filter className="h-6 w-6 text-primary" />
            Filters
          </DrawerTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close filters</span>
          </Button>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-6">
          <Accordion type="multiple" defaultValue={["Status", "Categories", "Price Range"]} className="w-full">
            {(() => {
              const normalize = (s: string) => s.toLowerCase().replace(/\s|_/g, '');
              const attrByName = new Map(allDetailsAttributes.map(a => [a.name, a] as const));
              const defaultKeys: string[] = [
                'availability',
                ...(allCategories.length > 0 ? ['categories'] : []),
                'priceRange',
                'rating',
                ...(allTags.length > 0 ? ['tags'] : []),
                ...allDetailsAttributes.filter(a => a.values.length > 0).map(a => a.name),
              ];
              const keys = (drawerKeys && drawerKeys.length > 0 ? drawerKeys : defaultKeys).filter((k) => {
                if (k === 'availability' || k === 'rating' || k === 'priceRange') return true;
                if (k === 'categories') return allCategories.length > 0;
                if (k === 'tags') return allTags.length > 0;
                const a = attrByName.get(k) || allDetailsAttributes.find(x => normalize(x.name) === normalize(k));
                return !!a && a.values.length > 0;
              });

              return keys.map((k) => {
                if (k === 'availability') {
                  return (
                    <FilterSection key="availability" title="Status" icon={ListFilter} filterKey="status">
                      <div className="flex flex-wrap gap-2">
                        {['Active', 'Draft', 'Out of Stock'].map(status => (
                          <Button
                            key={status}
                            variant={statusFilter.includes(status) ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleToggleStatusFilter(status)}
                            className={cn("text-sm", statusFilter.includes(status) && "ring-2 ring-primary ring-offset-2")}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </FilterSection>
                  );
                }
                if (k === 'rating') {
                  return (
                    <FilterSection key="rating" title="Reviews" icon={Star} filterKey="rating">
                      <div className="flex flex-wrap gap-2">
                        {[4, 3, 2, 1].map(min => (
                          <Button
                            key={min}
                            variant={ratingFilter === min ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSetRatingFilter(min)}
                            className={cn("text-sm gap-1", ratingFilter === min && "ring-2 ring-primary ring-offset-2")}
                          >
                            <Star className={cn("h-3.5 w-3.5", ratingFilter === min ? "fill-current" : "fill-amber-400 text-amber-400")} />
                            {min}+ stars
                          </Button>
                        ))}
                      </div>
                    </FilterSection>
                  );
                }
                if (k === 'categories') {
                  return (
                    allCategories.length > 0 ? (
                      <FilterSection key="categories" title="Categories" icon={Info} filterKey="categories">
                        <div className="flex flex-wrap gap-2">
                          {allCategories.map(category => (
                            <Button
                              key={category}
                              variant={filters.categories.includes(category) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleFilter('categories', category)}
                              className={cn("text-sm", filters.categories.includes(category) && "ring-2 ring-primary ring-offset-2")}
                            >
                              {category}
                            </Button>
                          ))}
                        </div>
                      </FilterSection>
                    ) : null
                  );
                }
                if (k === 'priceRange') {
                  return (
                    <FilterSection key="priceRange" title="Price Range" icon={DollarSign} filterKey="priceRange">
                      <div className="px-2 space-y-4">
                        <Slider
                          min={0}
                          max={maxPrice > 0 ? maxPrice : 100}
                          step={1}
                          value={localPriceRange}
                          onValueChange={handlePriceRangeChange}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm font-medium">
                          <span>{formatCurrency(localPriceRange[0], shopDetails?.currency)}</span>
                          <span>{formatCurrency(localPriceRange[1], shopDetails?.currency)}</span>
                        </div>
                      </div>
                    </FilterSection>
                  );
                }
                if (k === 'tags') {
                  return (
                    allTags.length > 0 ? (
                      <FilterSection key="tags" title="Tags" icon={Tag} filterKey="tags">
                        <div className="flex flex-wrap gap-2">
                          {allTags.map(tag => (
                            <Button
                              key={tag}
                              variant={(filters.tags as string[] || []).includes(tag) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleToggleFilter('tags', tag)}
                              className={cn("text-sm", (filters.tags as string[] || []).includes(tag) && "ring-2 ring-primary ring-offset-2")}
                            >
                              {tag}
                            </Button>
                          ))}
                        </div>
                      </FilterSection>
                    ) : null
                  );
                }
                const attr = attrByName.get(k) || allDetailsAttributes.find(x => normalize(x.name) === normalize(k));
                if (!attr || attr.values.length === 0) return null;
                const Icon = getAttributeIcon(attr.name);
                const filterKey = attr.name;
                return (
                  <FilterSection key={attr.name} title={attr.name.replace(/_/g, ' ')} icon={Icon} filterKey={filterKey}>
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map(value => (
                        <Button
                          key={value}
                          variant={(filters[filterKey as keyof FilterState] as string[] || []).includes(value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleFilter(filterKey as keyof FilterState, value)}
                          className={cn("text-sm", (filters[filterKey as keyof FilterState] as string[] || []).includes(value) && "ring-2 ring-primary ring-offset-2")}
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </FilterSection>
                );
              });
            })()}
          </Accordion>
        </ScrollArea>
        <DrawerFooter className="p-4 border-t flex gap-2 flex-shrink-0">
          <Button variant="outline" onClick={handleResetAllFilters} className="flex-1 text-sm">Clear All</Button>
          <Button onClick={onClose} className="flex-1 text-sm">Apply Filters</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};