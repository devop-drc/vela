import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { X, SlidersHorizontal, CircleDot, Layers, DollarSign, Tag, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { FilterState } from "@/hooks/useProductFilters";

interface ProductFilterPanelProps {
  allCategories: string[];
  allTags: string[];
  maxPrice: number;
  filters: FilterState;
  statusFilter: string[];
  localPriceRange: [number, number];
  handleToggleFilter: (section: string, value: string) => void;
  handleToggleStatusFilter: (status: string) => void;
  handleClearSection: (section: string) => void;
  handleResetAllFilters: () => void;
  handlePriceRangeChange: (range: [number, number]) => void;
  hasActiveFilters: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500",
  Draft: "bg-amber-500",
  "Out of Stock": "bg-red-500",
};

export const ProductFilterPanel = ({
  allCategories, allTags, maxPrice, filters, statusFilter, localPriceRange,
  handleToggleFilter, handleToggleStatusFilter, handleClearSection,
  handleResetAllFilters, handlePriceRangeChange, hasActiveFilters, onClose,
}: ProductFilterPanelProps) => {
  const { shopDetails } = useShop();
  const currency = shopDetails?.currency || 'USD';

  const activeFilterCount = useMemo(() => {
    let count = statusFilter.length + filters.categories.length + (filters.tags as string[]).length;
    if (filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice) count++;
    return count;
  }, [statusFilter, filters, maxPrice]);

  const isSectionActive = (section: string) => {
    if (section === "status") return statusFilter.length > 0;
    if (section === "categories") return filters.categories.length > 0;
    if (section === "tags") return (filters.tags as string[]).length > 0;
    if (section === "priceRange") return filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetAllFilters} className="h-6 text-xs px-2">
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Filter sections */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">

          {/* Status */}
          <Section icon={CircleDot} title="Status" active={isSectionActive("status")} onClear={() => handleClearSection("status")}>
            <div className="space-y-1.5">
              {["Active", "Draft", "Out of Stock"].map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50 transition-colors">
                  <Checkbox checked={statusFilter.includes(status)} onCheckedChange={() => handleToggleStatusFilter(status)} className="h-4 w-4" />
                  <span className={cn("h-2 w-2 rounded-full shrink-0", statusColors[status])} />
                  <span className="text-sm">{status}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* Categories */}
          {allCategories.length > 0 && (
            <Section icon={Layers} title="Categories" active={isSectionActive("categories")} onClear={() => handleClearSection("categories")}>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {allCategories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox checked={filters.categories.includes(cat)} onCheckedChange={() => handleToggleFilter("categories", cat)} className="h-4 w-4" />
                    <span className="text-sm truncate">{cat}</span>
                  </label>
                ))}
              </div>
            </Section>
          )}

          {/* Price Range */}
          <Section icon={DollarSign} title="Price Range" active={isSectionActive("priceRange")} onClear={() => handleClearSection("priceRange")}>
            <div className="space-y-3">
              <Slider
                min={0}
                max={maxPrice > 0 ? maxPrice : 1000}
                step={1}
                value={[localPriceRange[0], localPriceRange[1]]}
                onValueChange={(val) => handlePriceRangeChange([val[0], val[1]])}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(localPriceRange[0], currency)}</span>
                <span>{formatCurrency(localPriceRange[1], currency)}</span>
              </div>
            </div>
          </Section>

          {/* Tags */}
          {allTags.length > 0 && (
            <Section icon={Tag} title="Tags" active={isSectionActive("tags")} onClear={() => handleClearSection("tags")}>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {allTags.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox checked={(filters.tags as string[]).includes(tag)} onCheckedChange={() => handleToggleFilter("tags", tag)} className="h-4 w-4" />
                    <span className="text-sm truncate">{tag}</span>
                  </label>
                ))}
              </div>
            </Section>
          )}

        </div>
      </ScrollArea>
    </div>
  );
};

function Section({ icon: Icon, title, active, onClear, children }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  active: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        </div>
        {active && (
          <button onClick={onClear} className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
