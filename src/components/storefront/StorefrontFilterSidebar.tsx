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
  priceRange: string;
  [key: string]: string[] | string; // For dynamic attributes
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
  const { shopDetails, appearanceSettings } = useStorefront();
  const blurEnabled = appearanceSettings?.blurEnabled;

  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleCheckboxChange = (filterKey: keyof FilterState, value: string, checked: boolean) => {
    setLocalFilters(prev => {
      const currentValues = (prev[filterKey] as string[]) || [];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter(item => item !== value);
      return { ...prev, [filterKey]: newValues };
    });
  };

  const handleRadioChange = (filterKey: keyof FilterState, value: string) => {
    setLocalFilters(prev => ({ ...prev, [filterKey]: value }));
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleClearAll = () => {
    onResetFilters();
    onClose();
  };

  const { uniqueCategories, uniqueTags, uniqueDetailsAttributes } = useMemo(() => {
    const categories = new Set<string>();
    const tags = new Set<string>();
    const detailsAttributes: { [key: string]: Set<string> } = {};

    products.forEach(product => {
      if (product.category) categories.add(product.category);
      product.tags?.forEach(tag => tags.add(tag));

      for (const key in product.details) {
        if (Object.prototype.hasOwnProperty.call(product.details, key)) {
          const value = product.details[key];
          if (value !== undefined && value !== null && key !== 'type') { // Exclude 'type' as it's usually part of category
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
    };
  }, [products]);

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
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-6 w-6" />
            Advanced Filters
          </SheetTitle>
          <SheetDescription>Refine your product search.</SheetDescription>
        </SheetHeader>
      ) : (
        <div className="p-4 border-b">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Filter className="h-6 w-6" />
            Advanced Filters
          </h2>
          <p className="text-sm text-muted-foreground">Refine your product search.</p>
        </div>
      )}
      <ScrollArea className="flex-1 px-4 py-6">
        <Accordion type="multiple" defaultValue={["Categories", "Price Range"]} className="w-full">
          {uniqueCategories.length > 0 && (
            <FilterSection title="Categories" icon={Info}>
              <div className="grid grid-cols-1 gap-2">
                {uniqueCategories.map(category => (
                  <Label key={category} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={(localFilters.categories as string[] || []).includes(category)}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange('categories', category, checked)}
                    />
                    <span>{category}</span>
                  </Label>
                ))}
              </div>
            </FilterSection>
          )}

          <FilterSection title="Price Range" icon={DollarSign}>
            <RadioGroup
              value={localFilters.priceRange as string}
              onValueChange={(value) => handleRadioChange('priceRange', value)}
              className="grid grid-cols-1 gap-2"
            >
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="all" />
                <span>All Prices</span>
              </Label>
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="under-50" />
                <span>Under {formatCurrency(50, shopDetails?.currency)}</span>
              </Label>
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="50-100" />
                <span>{formatCurrency(50, shopDetails?.currency)} - {formatCurrency(100, shopDetails?.currency)}</span>
              </Label>
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="100-200" />
                <span>{formatCurrency(100, shopDetails?.currency)} - {formatCurrency(200, shopDetails?.currency)}</span>
              </Label>
              <Label className="flex items-center space-x-2 cursor-pointer">
                <RadioGroupItem value="over-200" />
                <span>Over {formatCurrency(200, shopDetails?.currency)}</span>
              </Label>
            </RadioGroup>
          </FilterSection>

          {uniqueTags.length > 0 && (
            <FilterSection title="Tags" icon={Tag}>
              <div className="grid grid-cols-1 gap-2">
                {uniqueTags.map(tag => (
                  <Label key={tag} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={(localFilters.tags as string[] || []).includes(tag)}
                      onCheckedChange={(checked: boolean) => handleCheckboxChange('tags', tag, checked)}
                    />
                    <span>{tag}</span>
                  </Label>
                ))}
              </div>
            </FilterSection>
          )}

          {uniqueDetailsAttributes.map(attr => {
            const Icon = getAttributeIcon(attr.name);
            return attr.values.length > 0 ? (
              <FilterSection key={attr.name} title={attr.name.replace(/_/g, ' ')} icon={Icon}>
                <div className="grid grid-cols-1 gap-2">
                  {attr.values.map(value => (
                    <Label key={value} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={(localFilters[attr.name] as string[] || []).includes(value)}
                        onCheckedChange={(checked: boolean) => handleCheckboxChange(attr.name, value, checked)}
                      />
                      <span>{value}</span>
                    </Label>
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
        <SheetContent side="left" className={cn("w-full sm:max-w-xs p-0 flex flex-col", blurEnabled && "bg-card/80 backdrop-blur-lg")}>
          {filterContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop view: render as a fixed aside, no Sheet wrapper
  return (
    <aside className={cn(
      "hidden lg:flex flex-col border-r h-full",
      blurEnabled ? "bg-card/80 backdrop-blur-lg" : "bg-card",
      "w-64 flex-shrink-0"
    )}>
      {filterContent}
    </aside>
  );
};