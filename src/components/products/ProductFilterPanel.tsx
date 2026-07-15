import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { X, SlidersHorizontal, CircleDot, Layers, DollarSign, Tag, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { FilterState } from "@/hooks/useProductFilters";
import { useTranslation } from "react-i18next";
import { productStatusTone, toneDotBg, type StatusTone } from "@/lib/status";

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

const STATUS_VALUES = ["Active", "Draft", "Out of Stock"];

/** Selected-pill styling per tone (dark-safe, token-based — mirrors the Orders stat pills). */
const statusActivePill: Record<StatusTone, string> = {
  success: "border-success/50 bg-success/15 text-success",
  warning: "border-warning/50 bg-warning/15 text-warning",
  info: "border-info/50 bg-info/15 text-info",
  danger: "border-destructive/50 bg-destructive/15 text-destructive",
  neutral: "border-muted-foreground/40 bg-muted text-foreground",
};

export const ProductFilterPanel = ({
  allCategories, allTags, maxPrice, filters, statusFilter, localPriceRange,
  handleToggleFilter, handleToggleStatusFilter, handleClearSection,
  handleResetAllFilters, handlePriceRangeChange, hasActiveFilters, onClose,
}: ProductFilterPanelProps) => {
  const { t } = useTranslation();
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
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{t("common.filters")}</span>
          {activeFilterCount > 0 && (
            <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetAllFilters} className="h-6 text-xs px-2">{t("common.clear_all")}</Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">

          {/* Status — toggle pills */}
          <Section icon={CircleDot} title={t("products.status")} active={isSectionActive("status")} onClear={() => handleClearSection("status")}>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_VALUES.map((value) => {
                const isOn = statusFilter.includes(value);
                const tone = productStatusTone(value);
                return (
                  <button
                    key={value}
                    onClick={() => handleToggleStatusFilter(value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                      isOn ? statusActivePill[tone] : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", isOn ? toneDotBg[tone] : "bg-muted-foreground/30")} />
                    {value}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Categories — toggle pills */}
          {allCategories.length > 0 && (
            <Section icon={Layers} title={t("products.categories")} active={isSectionActive("categories")} onClear={() => handleClearSection("categories")}>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {allCategories.map((cat) => {
                  const isOn = filters.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => handleToggleFilter("categories", cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-all truncate max-w-full",
                        isOn
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Price Range — dual slider */}
          <Section icon={DollarSign} title={t("products.price_range")} active={isSectionActive("priceRange")} onClear={() => handleClearSection("priceRange")}>
            <div className="space-y-3 px-1">
              <Slider
                min={0}
                max={maxPrice > 0 ? maxPrice : 1000}
                step={1}
                value={[localPriceRange[0], localPriceRange[1]]}
                onValueChange={(val) => handlePriceRangeChange([val[0], val[1]])}
              />
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{formatCurrency(localPriceRange[0], currency)}</span>
                <span className="text-muted-foreground">—</span>
                <span className="font-medium">{formatCurrency(localPriceRange[1], currency)}</span>
              </div>
            </div>
          </Section>

          {/* Tags — toggle pills */}
          {allTags.length > 0 && (
            <Section icon={Tag} title={t("products.tags")} active={isSectionActive("tags")} onClear={() => handleClearSection("tags")}>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {allTags.map((tag) => {
                  const isOn = (filters.tags as string[]).includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleToggleFilter("tags", tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-all truncate max-w-full",
                        isOn
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
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
