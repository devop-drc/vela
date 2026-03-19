import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Filter, XCircle } from "lucide-react";
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

export const ProductFilterPanel = ({
  allCategories,
  allTags,
  maxPrice,
  filters,
  statusFilter,
  localPriceRange,
  handleToggleFilter,
  handleToggleStatusFilter,
  handleClearSection,
  handleResetAllFilters,
  handlePriceRangeChange,
  hasActiveFilters,
  onClose,
}: ProductFilterPanelProps) => {
  const { shopDetails } = useShop();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += statusFilter.length;
    count += filters.categories.length;
    count += (filters.tags as string[]).length;
    if (filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice) count += 1;
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
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAllFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable filter sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">

          {/* Status Section */}
          <FilterSection
            title="Status"
            isActive={isSectionActive("status")}
            onClear={() => handleClearSection("status")}
          >
            <div className="space-y-2">
              {["Active", "Draft", "Out of Stock"].map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  <Checkbox
                    checked={statusFilter.includes(status)}
                    onCheckedChange={() => handleToggleStatusFilter(status)}
                  />
                  <span className="text-sm text-foreground group-hover:text-foreground/80">
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Categories Section */}
          {allCategories.length > 0 && (
            <FilterSection
              title="Categories"
              isActive={isSectionActive("categories")}
              onClear={() => handleClearSection("categories")}
            >
              <div className="space-y-2">
                {allCategories.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <Checkbox
                      checked={filters.categories.includes(category)}
                      onCheckedChange={() => handleToggleFilter("categories", category)}
                    />
                    <span className="text-sm text-foreground group-hover:text-foreground/80 truncate">
                      {category}
                    </span>
                  </label>
                ))}
              </div>
            </FilterSection>
          )}

          {/* Price Range Section */}
          <FilterSection
            title="Price Range"
            isActive={isSectionActive("priceRange")}
            onClear={() => handleClearSection("priceRange")}
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Min</Label>
                <Input
                  type="number"
                  min={0}
                  max={localPriceRange[1]}
                  value={localPriceRange[0]}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    handlePriceRangeChange([val, localPriceRange[1]]);
                  }}
                  className="h-8 text-sm"
                  placeholder="0"
                />
              </div>
              <span className="text-muted-foreground mt-4">–</span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Max</Label>
                <Input
                  type="number"
                  min={localPriceRange[0]}
                  max={maxPrice > 0 ? maxPrice : 99999}
                  value={localPriceRange[1]}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    handlePriceRangeChange([localPriceRange[0], val]);
                  }}
                  className="h-8 text-sm"
                  placeholder={String(maxPrice)}
                />
              </div>
            </div>
          </FilterSection>

          {/* Tags Section */}
          {allTags.length > 0 && (
            <FilterSection
              title="Tags"
              isActive={isSectionActive("tags")}
              onClear={() => handleClearSection("tags")}
            >
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allTags.map((tag) => (
                  <label
                    key={tag}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <Checkbox
                      checked={(filters.tags as string[]).includes(tag)}
                      onCheckedChange={() => handleToggleFilter("tags", tag)}
                    />
                    <span className="text-sm text-foreground group-hover:text-foreground/80 truncate">
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            </FilterSection>
          )}

        </div>
      </ScrollArea>
    </div>
  );
};

/* ── Reusable section wrapper ── */
function FilterSection({
  title,
  isActive,
  onClear,
  children,
}: {
  title: string;
  isActive: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {isActive && (
          <button
            onClick={onClear}
            className="p-0.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Clear ${title} filters`}
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="border-t border-border pt-2.5">
        {children}
      </div>
    </div>
  );
}
