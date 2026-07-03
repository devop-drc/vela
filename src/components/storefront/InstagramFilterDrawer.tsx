"use client";

import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
import debounce from 'lodash/debounce';

interface Product {
  id: string;
  name: string;
  category: string;
  tags: string[];
  price: number | null;
  currency: string | null;
  details: { [key: string]: unknown };
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
  const isMobile = useIsMobile();

  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(currentFilters.priceRange);
  const [filterSearch, setFilterSearch] = useState("");
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocalFilters(currentFilters);
    setLocalPriceRange(currentFilters.priceRange);
  }, [currentFilters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('instagram_filter_visibility');
      if (raw) setVisibilityMap(JSON.parse(raw));
    } catch {
      setVisibilityMap({});
    }
  }, []);

  const handleToggleFilter = (filterKey: keyof FilterState, value: string) => {
    setLocalFilters(prev => {
      const currentValues = (prev[filterKey] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      const updatedFilters = { ...prev, [filterKey]: newValues } as FilterState;
      onFilterChange(updatedFilters);
      return updatedFilters;
    });
  };

  const debouncedPriceRangeChange = useMemo(
    () =>
      debounce((range: [number, number]) => {
        onFilterChange({ ...localFilters, priceRange: range });
      }, 100),
    [onFilterChange, localFilters]
  );

  const handlePriceRangeChange = (range: [number, number]) => {
    setLocalPriceRange(range);
    debouncedPriceRangeChange(range);
  };

  const handleClearSection = (filterKey: keyof FilterState) => {
    setLocalFilters(prev => {
      const updatedFilters = { ...prev, [filterKey]: filterKey === 'priceRange' ? ([0, maxPrice] as [number, number]) : [] } as FilterState;
      if (filterKey === 'priceRange') {
        setLocalPriceRange([0, maxPrice] as [number, number]);
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
    const currentMin = localFilters.priceRange[0];
    const currentMax = localFilters.priceRange[1];
    const newMax = maxPrice > 0 ? maxPrice : 100;

    const adjustedMax = Math.min(currentMax, newMax);
    const adjustedMin = Math.min(currentMin, adjustedMax);

    if (adjustedMin !== currentMin || adjustedMax !== currentMax) {
      const updated = { ...localFilters, priceRange: [adjustedMin, adjustedMax] as [number, number] };
      setLocalPriceRange([adjustedMin, adjustedMax]);
      setLocalFilters(updated);
      // Propagate so the parent's active filter matches the clamped range (filters apply live).
      onFilterChange(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPrice]);

  const toTitle = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const isVisible = (key: string) => {
    if (key === 'priceRange') return visibilityMap['priceRange'] !== false;
    // default visible if not set
    return visibilityMap[key] !== false;
  };

  const FilterSection = ({ title, icon: Icon, filterKey, children }: { title: string; icon: React.ElementType; filterKey: keyof FilterState; children: React.ReactNode }) => {
    const fv = localFilters[filterKey];
    let isFilterApplied = false;
    if (filterKey === 'priceRange') {
      const pr = fv as [number, number];
      isFilterApplied = pr[0] !== 0 || pr[1] !== maxPrice;
    } else if (Array.isArray(fv)) {
      isFilterApplied = fv.length > 0;
    }

    return (
      <AccordionItem value={title} className="border-b" style={{borderColor:'hsl(var(--border))'}}>
        <div className="flex items-center justify-between py-3 text-base font-semibold">
          <AccordionTrigger className="flex-1 py-0 pr-3 text-base text-[hsl(var(--foreground))]">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
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
                className="p-1 rounded-full hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
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

  // Build ordered keys list from admin order with fallbacks
  const orderedKeys = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/\s|_/g, '');
    const attrByName = new Map(uniqueDetailsAttributes.map(a => [a.name, a] as const));
    const defaults: string[] = [
      ...(uniqueCategories.length > 0 ? ['categories'] : []),
      'priceRange',
      ...(uniqueTags.length > 0 ? ['tags'] : []),
      ...uniqueDetailsAttributes.map(a => a.name),
    ];
    let orderLs: string[] = [];
    try { const s = localStorage.getItem('instagram_filter_order'); if (s) orderLs = JSON.parse(s); } catch {}
    const base = orderLs.length > 0 ? orderLs : defaults;
    // filter by availability and visibility
    const available = (k: string) => {
      if (k === 'categories') return uniqueCategories.length > 0;
      if (k === 'tags') return uniqueTags.length > 0;
      if (k === 'priceRange') return true;
      const a = attrByName.get(k) || uniqueDetailsAttributes.find(x => normalize(x.name) === normalize(k));
      return !!a && a.values.length > 0;
    };
    return base.filter(k => available(k) && isVisible(k));
  }, [uniqueCategories, uniqueTags, uniqueDetailsAttributes, visibilityMap]);

  const inner = (
    <>
      <div className="p-4 border-b flex-row items-center justify-between flex-shrink-0" style={{borderColor:'hsl(var(--border))'}}>
        <div className="flex items-center gap-2 text-xl font-bold">
          <Filter className="h-6 w-6 text-[hsl(var(--primary))]" />
          Filters
        </div>
        <div className="mt-3">
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search filters..."
            className="w-full h-9 px-3 rounded-md bg-[hsl(var(--input))] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] border" 
            style={{borderColor:'hsl(var(--border))'}}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-6" style={{ overscrollBehavior: 'contain' }}>
        <Accordion type="multiple" defaultValue={["Categories", "Price Range"]} className="w-full">
          {orderedKeys.map((k) => {
            if (k === 'categories') {
              if (uniqueCategories.length === 0) return null;
              return (
                <FilterSection key="categories" title="Categories" icon={Info} filterKey="categories">
                  <div className="flex flex-wrap gap-2">
                    {uniqueCategories.filter(c => !filterSearch || c.toLowerCase().includes(filterSearch.toLowerCase())).map(category => (
                      <Button
                        key={category}
                        variant={localFilters.categories.includes(category) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleFilter('categories', category)}
                        className={cn(
                          "text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
                          localFilters.categories.includes(category) && "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]"
                        )}
                      >
                        {toTitle(category)}
                      </Button>
                    ))}
                  </div>
                </FilterSection>
              );
            }
            if (k === 'priceRange') {
              return (
                <FilterSection key="priceRange" title="Price Range" icon={DollarSign} filterKey="priceRange">
                  <div className="px-2 space-y-4">
                    <div
                      data-vaul-no-drag
                      onPointerDownCapture={(e)=>{ e.stopPropagation(); }}
                      onPointerDown={(e)=>{ e.stopPropagation(); }}
                      onPointerMove={(e)=>{ e.stopPropagation(); }}
                      onPointerUp={(e)=>{ e.stopPropagation(); }}
                      onTouchStart={(e)=>{ e.stopPropagation(); }}
                      onTouchMove={(e)=>{ e.stopPropagation(); }}
                      onTouchEnd={(e)=>{ e.stopPropagation(); }}
                      onMouseDown={(e)=>{ e.stopPropagation(); }}
                      onMouseMove={(e)=>{ e.stopPropagation(); }}
                      onMouseUp={(e)=>{ e.stopPropagation(); }}
                      style={{ touchAction: 'none' }}
                    >
                      <Slider
                        min={0}
                        max={maxPrice > 0 ? maxPrice : 100}
                        step={1}
                        value={localPriceRange}
                        onValueChange={handlePriceRangeChange}
                        className="w-full"
                      />
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>{formatCurrency(localPriceRange[0], shopDetails?.currency)}</span>
                      <span>{formatCurrency(localPriceRange[1], shopDetails?.currency)}</span>
                    </div>
                  </div>
                </FilterSection>
              );
            }
            if (k === 'tags') {
              if (uniqueTags.length === 0) return null;
              return (
                <FilterSection key="tags" title="Tags" icon={Tag} filterKey="tags">
                  <div className="flex flex-wrap gap-2">
                    {uniqueTags.filter(t => !filterSearch || t.toLowerCase().includes(filterSearch.toLowerCase())).map(tag => (
                      <Button
                        key={tag}
                        variant={(localFilters.tags as string[] || []).includes(tag) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleFilter('tags', tag)}
                        className={cn(
                          "text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
                          (localFilters.tags as string[] || []).includes(tag) && "bg-red-500 text-white border-red-500 hover:bg-red-600"
                        )}
                      >
                        {toTitle(tag)}
                      </Button>
                    ))}
                  </div>
                </FilterSection>
              );
            }
            // attribute
            const attr = uniqueDetailsAttributes.find(a => a.name === k) || uniqueDetailsAttributes.find(a => a.name.toLowerCase().replace(/\s|_/g,'') === k.toLowerCase().replace(/\s|_/g,''));
            if (!attr || attr.values.length === 0) return null;
            const Icon = getAttributeIcon(attr.name);
            const filterKey = attr.name as keyof FilterState;
            const values = attr.values.filter(v => !filterSearch || v.toLowerCase().includes(filterSearch.toLowerCase()));
            if (values.length === 0) return null;
            return (
              <FilterSection key={attr.name} title={toTitle(attr.name)} icon={Icon} filterKey={filterKey}>
                <div className="flex flex-wrap gap-2">
                  {values.map(value => (
                    <Button
                      key={value}
                      variant={(localFilters[filterKey] as string[] || []).includes(value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFilter(filterKey, value)}
                      className={cn(
                        "text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]",
                        (localFilters[filterKey] as string[] || []).includes(value) && "bg-red-500 text-white border-red-500 hover:bg-red-600"
                      )}
                    >
                      {toTitle(value)}
                    </Button>
                  ))}
                </div>
              </FilterSection>
            );
          })}
        </Accordion>
      </ScrollArea>
        <div className="p-4 border-t flex-shrink-0" style={{ paddingBottom: 'calc(1rem + var(--sab))', borderColor:'hsl(var(--border))' }}>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearAll} className="flex-1 text-base bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]">Clear All</Button>
            {/* <Button onClick={onClose} className="flex-1 text-base bg-red-500 hover:bg-red-600 text-white">Apply Filters</Button> */}
          </div>
        </div>
    </>
  );

  return (
    isMobile ? (
      <Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground>
        <DrawerContent className="p-0 flex flex-col bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-t-xl" style={{ maxHeight: 'calc(100dvh - var(--sat))' }}>
          {inner}
        </DrawerContent>
      </Drawer>
    ) : (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="p-0 flex flex-col w-[420px] max-w-[90vw] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border-l-[hsl(var(--border))]">
          {inner}
        </SheetContent>
      </Sheet>
    )
  );
}