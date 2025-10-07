import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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

interface StorefrontFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentFilters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  isMobile: boolean;
  setWasDesktopFilterSidebarExplicitlyOpened?: (open: boolean) => void;
}

const DESKTOP_SIDEBAR_WIDTH = '20rem';

export const StorefrontFilterSidebar = ({
  isOpen,
  onClose,
  products,
  currentFilters,
  onFilterChange,
  onResetFilters,
  isMobile,
  setWasDesktopFilterSidebarExplicitlyOpened,
}: StorefrontFilterSidebarProps) => {
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;
  const borderRadius = appearanceSettings?.['--radius'] || '0.5rem';
  const isFloatingLayout = appearanceSettings?.layoutStyle === 'floating';

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
      onFilterChange(updatedFilters);
      if (filterKey === 'priceRange') {
        setLocalPriceRange([0, maxPrice]);
      }
      return updatedFilters;
    });
  };

  const handleClearAll = () => {
    onResetFilters();
    if (isMobile) {
      onClose();
    }
    if (setWasDesktopFilterSidebarExplicitlyOpened) {
      setWasDesktopFilterSidebarExplicitlyOpened(false);
    }
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
                onClick={(e) => { e.stopPropagation(); handleClearSection(filterKey); }}
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

  const filterContent = (
    <div className="flex flex-col h-full">
      {isMobile ? (
        <SheetHeader className="p-4 border-b flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            <Filter className="h-6 w-6 text-primary" />
            Advanced Filters
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close filters</span>
          </Button>
        </SheetHeader>
      ) : (
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Filter className="h-6 w-6 text-primary" />
            Filters
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
            <span className="sr-only">Close filters</span>
          </Button>
        </div>
      )}

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
                    className={cn("text-sm", localFilters.categories.includes(category) && "ring-2 ring-primary ring-offset-2")}
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
              />
              <div className="flex justify-between text-sm font-medium">
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
                    className={cn("text-sm", (localFilters.tags as string[] || []).includes(tag) && "ring-2 ring-primary ring-offset-2")}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </FilterSection>
          )}

          {uniqueDetailsAttributes.map(attr => {
            const Icon = getAttributeIcon(attr.name);
            return attr.values.length > 0 ? (
              <FilterSection key={attr.name} title={attr.name.replace(/_/g, ' ')} icon={Icon} filterKey={attr.name}>
                <div className="flex flex-wrap gap-2">
                  {attr.values.map(value => (
                    <Button
                      key={value}
                      variant={(localFilters[attr.name] as string[] || []).includes(value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFilter(attr.name, value)}
                      className={cn("text-sm", (localFilters[attr.name] as string[] || []).includes(value) && "ring-2 ring-primary ring-offset-2")}
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
      <div className="p-4 border-t flex gap-2">
        <Button variant="outline" onClick={handleClearAll} className="flex-1 text-sm md:text-base">Clear All</Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="left" 
          className={cn(
            "w-full sm:max-w-xs p-0 flex flex-col h-full",
            blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card",
            isFloatingLayout && "rounded-none"
          )}
          style={{ borderRadius: isFloatingLayout ? '0' : borderRadius }}
        >
          {filterContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <motion.aside
      initial={{ x: '-100%', opacity: 0, pointerEvents: 'none' }}
      animate={{ x: isOpen ? '0%' : '-100%', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
      exit={{ x: '-100%', opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex-col flex-shrink-0 fixed z-30",
        blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card",
        isFloatingLayout ? "border rounded-lg" : "border-r"
      )}
      style={{
        width: DESKTOP_SIDEBAR_WIDTH,
        left: isFloatingLayout ? '1rem' : '0',
        top: isFloatingLayout ? '1rem' : '0',
        bottom: isFloatingLayout ? '1rem' : '0',
        borderRadius: isFloatingLayout ? borderRadius : '0',
      }}
    >
      {filterContent}
    </motion.aside>
  );
};