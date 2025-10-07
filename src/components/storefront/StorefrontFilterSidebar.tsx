import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { X, Filter, Tag, DollarSign, Palette, Ruler, Layers, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useStorefront } from "@/contexts/StorefrontContext";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { Slider } from "@/components/ui/slider"; // Import Slider

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
  priceRange: [number, number]; // Change to tuple for min/max
  [key: string]: string[] | [number, number]; // For dynamic attributes
}

interface StorefrontFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentFilters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  isMobile: boolean;
}

export const StorefrontFilterSidebar = ({
  isOpen,
  onClose,
  products,
  currentFilters,
  onFilterChange,
  onResetFilters,
  isMobile,
}: StorefrontFilterSidebarProps) => {
  const { shopDetails, appearanceSettings, convertCurrency } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;
  const borderRadius = appearanceSettings?.['--radius'] || '0.5rem';
  const isFloatingLayout = appearanceSettings?.layoutStyle === 'floating';

  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleToggleFilter = (filterKey: keyof FilterState, value: string) => {
    setLocalFilters(prev => {
      const currentValues = (prev[filterKey] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues };
    });
  };

  const handlePriceRangeChange = (range: [number, number]) => {
    setLocalFilters(prev => ({ ...prev, priceRange: range }));
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    if (isMobile) {
      onClose();
    }
  };

  const handleClearAll = () => {
    onResetFilters();
    if (isMobile) {
      onClose();
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
      maxPrice: Math.ceil(currentMaxPrice / 10) * 10, // Round up to nearest 10 for slider max
    };
  }, [products, convertCurrency]);

  const FilterSection = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <AccordionItem value={title}>
      <AccordionTrigger className="py-3 text-base font-semibold">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {title}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 pt-2">
        {children}
      </AccordionContent>
    </AccordionItem>
  );

  const filterContent = (
    <div className="flex flex-col h-full">
      {isMobile ? (
        <SheetHeader className="p-4 border-b flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-6 w-6" />
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
            <Filter className="h-6 w-6" />
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
            <FilterSection title="Categories" icon={Info}>
              <div className="flex flex-wrap gap-2">
                {uniqueCategories.map(category => (
                  <Button
                    key={category}
                    variant={localFilters.categories.includes(category) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleFilter('categories', category)}
                    className={cn(localFilters.categories.includes(category) && "ring-2 ring-primary ring-offset-2")}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </FilterSection>
          )}

          <FilterSection title="Price Range" icon={DollarSign}>
            <div className="px-2 space-y-4">
              <Slider
                min={0}
                max={maxPrice > 0 ? maxPrice : 100} // Ensure max is at least 100 if no products
                step={1}
                value={localFilters.priceRange}
                onValueChange={handlePriceRangeChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm font-medium">
                <span>{formatCurrency(localFilters.priceRange[0], shopDetails?.currency)}</span>
                <span>{formatCurrency(localFilters.priceRange[1], shopDetails?.currency)}</span>
              </div>
            </div>
          </FilterSection>

          {uniqueTags.length > 0 && (
            <FilterSection title="Tags" icon={Tag}>
              <div className="flex flex-wrap gap-2">
                {uniqueTags.map(tag => (
                  <Button
                    key={tag}
                    variant={(localFilters.tags as string[] || []).includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleFilter('tags', tag)}
                    className={cn((localFilters.tags as string[] || []).includes(tag) && "ring-2 ring-primary ring-offset-2")}
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
              <FilterSection key={attr.name} title={attr.name.replace(/_/g, ' ')} icon={Icon}>
                <div className="flex flex-wrap gap-2">
                  {attr.values.map(value => (
                    <Button
                      key={value}
                      variant={(localFilters[attr.name] as string[] || []).includes(value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFilter(attr.name, value)}
                      className={cn((localFilters[attr.name] as string[] || []).includes(value) && "ring-2 ring-primary ring-offset-2")}
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
        <Button onClick={handleApplyFilters} className="flex-1">Apply Filters</Button>
        <Button variant="outline" onClick={handleClearAll} className="flex-1">Clear All</Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="left" 
          className={cn(
            "w-full sm:max-w-xs p-0 flex flex-col", 
            blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card",
            isFloatingLayout && "rounded-none" // No border-radius for floating layout
          )}
          style={{ borderRadius: isFloatingLayout ? '0' : borderRadius }}
        >
          {filterContent}
        </SheetContent>
      </Sheet>
    );
  }

  return <>{filterContent}</>;
};