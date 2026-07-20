import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { X, SlidersHorizontal, CircleDot, Layers, DollarSign, Tag, XCircle, Star, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { FilterState } from "@/hooks/useProductFilters";
import { useTranslation } from "react-i18next";
import { productStatusTone, toneDotBg, type StatusTone } from "@/lib/status";
import { getAttributeIcon } from "@/lib/attributeIcons";
import {
  AttributeDef, ProductLite, deriveAttributeKeys, attributeValues, filterKeyTitle, isFilterVisible,
} from "@/components/filters/filterVisibility";

interface ProductFilterPanelProps {
  allCategories: string[];
  allTags: string[];
  allDetailsAttributes: AttributeDef[];
  allProducts: ProductLite[];
  maxPrice: number;
  filters: FilterState;
  statusFilter: string[];
  ratingFilter: number;
  localPriceRange: [number, number];
  /** Which filter groups to render (from the Filter Visibility modal). */
  visibilityMap: Record<string, boolean>;
  handleToggleFilter: (section: string, value: string) => void;
  handleToggleStatusFilter: (status: string) => void;
  handleSetRatingFilter: (min: number) => void;
  handleClearSection: (section: string) => void;
  handleResetAllFilters: () => void;
  handlePriceRangeChange: (range: [number, number]) => void;
  hasActiveFilters: boolean;
  onClose: () => void;
}

const STATUS_VALUES = ["Active", "Draft", "Out of Stock"];
const STATUS_LABEL_KEYS: Record<string, string> = {
  "Active": "common.active",
  "Draft": "common.draft",
  "Out of Stock": "common.out_of_stock",
};
const RATING_STEPS = [4, 3, 2, 1];

/** Selected-pill styling per tone (dark-safe, token-based — mirrors the Orders stat pills). */
const statusActivePill: Record<StatusTone, string> = {
  success: "border-success/50 bg-success/15 text-success",
  warning: "border-warning/50 bg-warning/15 text-warning",
  info: "border-info/50 bg-info/15 text-info",
  danger: "border-destructive/50 bg-destructive/15 text-destructive",
  neutral: "border-muted-foreground/40 bg-muted text-foreground",
};

const pillCls = (isOn: boolean) =>
  cn(
    "px-2.5 py-1 rounded-md text-xs font-medium border transition-all truncate max-w-full",
    isOn
      ? "border-primary bg-primary/10 text-primary"
      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
  );

export const ProductFilterPanel = ({
  allCategories, allTags, allDetailsAttributes, allProducts, maxPrice,
  filters, statusFilter, ratingFilter, localPriceRange, visibilityMap,
  handleToggleFilter, handleToggleStatusFilter, handleSetRatingFilter, handleClearSection,
  handleResetAllFilters, handlePriceRangeChange, hasActiveFilters, onClose,
}: ProductFilterPanelProps) => {
  const { t } = useTranslation();
  const { shopDetails } = useShop();
  const currency = shopDetails?.currency || 'USD';

  const show = (key: string) => isFilterVisible(visibilityMap, key);

  // Purchase options (color/size/material) vs. remaining specification
  // attributes — each visible key renders as its own pill section.
  const { options: optionKeys, specs: specKeys } = useMemo(
    () => deriveAttributeKeys(allDetailsAttributes, allProducts),
    [allDetailsAttributes, allProducts]
  );
  const valuesFor = (key: string) => attributeValues(key, allDetailsAttributes, allProducts);

  const activeFilterCount = useMemo(() => {
    let count = statusFilter.length + filters.categories.length + (filters.tags as string[]).length;
    if (filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice) count++;
    if (ratingFilter > 0) count++;
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'categories' && key !== 'tags' && key !== 'priceRange' && key !== 'status' && Array.isArray(value)) {
        count += value.length;
      }
    });
    return count;
  }, [statusFilter, ratingFilter, filters, maxPrice]);

  const isSectionActive = (section: string) => {
    if (section === "status") return statusFilter.length > 0;
    if (section === "rating") return ratingFilter > 0;
    if (section === "categories") return filters.categories.length > 0;
    if (section === "tags") return (filters.tags as string[]).length > 0;
    if (section === "priceRange") return filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice;
    return Array.isArray(filters[section]) && (filters[section] as string[]).length > 0;
  };

  const AttributeSection = ({ attrKey }: { attrKey: string }) => {
    const values = valuesFor(attrKey);
    if (values.length === 0) return null;
    const Icon = getAttributeIcon(attrKey);
    const selected = (filters[attrKey] as string[]) || [];
    return (
      <Section
        icon={Icon}
        title={filterKeyTitle(attrKey)}
        active={isSectionActive(attrKey)}
        onClear={() => handleClearSection(attrKey)}
      >
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {values.map((value) => (
            <button key={value} onClick={() => handleToggleFilter(attrKey, value)} className={pillCls(selected.includes(value))}>
              {value}
            </button>
          ))}
        </div>
      </Section>
    );
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

          {/* Availability / status — toggle pills */}
          {show("availability") && (
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
                      {t(STATUS_LABEL_KEYS[value], value)}
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Categories — toggle pills */}
          {show("categories") && allCategories.length > 0 && (
            <Section icon={Layers} title={t("products.categories")} active={isSectionActive("categories")} onClear={() => handleClearSection("categories")}>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {allCategories.map((cat) => (
                  <button key={cat} onClick={() => handleToggleFilter("categories", cat)} className={pillCls(filters.categories.includes(cat))}>
                    {cat}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Price Range — dual slider */}
          {show("priceRange") && (
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
          )}

          {/* Reviews — minimum rating */}
          {show("rating") && (
            <Section icon={Star} title={t("products.reviews", "Reviews")} active={isSectionActive("rating")} onClear={() => handleClearSection("rating")}>
              <div className="flex flex-wrap gap-1.5">
                {RATING_STEPS.map((min) => {
                  const isOn = ratingFilter === min;
                  return (
                    <button
                      key={min}
                      onClick={() => handleSetRatingFilter(min)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                        isOn ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Star className={cn("h-3 w-3", isOn ? "fill-amber-400 text-amber-400" : "text-muted-foreground/60")} />
                      {min}+
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Tags — toggle pills */}
          {show("tags") && allTags.length > 0 && (
            <Section icon={Tag} title={t("products.tags")} active={isSectionActive("tags")} onClear={() => handleClearSection("tags")}>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {allTags.map((tag) => (
                  <button key={tag} onClick={() => handleToggleFilter("tags", tag)} className={pillCls((filters.tags as string[]).includes(tag))}>
                    {tag}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Options — color / size / material */}
          {optionKeys.filter(show).map((k) => <AttributeSection key={k} attrKey={k} />)}

          {/* Specifications — every other product attribute */}
          {specKeys.some((k) => show(k) && valuesFor(k).length > 0) && (
            <div className="flex items-center gap-1.5 pt-1">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {t("products.specifications", "Specifications")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {specKeys.filter(show).map((k) => <AttributeSection key={k} attrKey={k} />)}

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
