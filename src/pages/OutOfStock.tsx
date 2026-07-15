import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useProductData } from "@/hooks/useProductData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Package,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
  Hash,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { showError, toFriendlyError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  StatCard,
  StatusBadge,
  StatusDot,
  SearchInput,
  EmptyState,
  CommandBar,
  ConfirmButton,
} from "@/components/ui-app";
import { stockLevel, STOCK_LEVEL_TONE, type StockLevel } from "@/lib/status";
import { useReveal } from "@/lib/anim";

// ─── Types ───────────────────────────────────────────────────────────────────

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

export type VariantRow = {
  id: string;
  product_id: string;
  combination_key: string;
  option_values: Record<string, string>;
  inventory: number;
  price_difference: number;
  is_active: boolean;
  is_default: boolean;
  sku?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VARIANT_SELECT =
  "id, product_id, combination_key, option_values, inventory, price_difference, is_active, is_default, sku";

/**
 * Normalize a raw product_variants row: if `option_values` is empty, derive it
 * from the `combination_key` ("Name:Value|Name:Value", see
 * CombinedVariantManager.normalizeKey). Single source used by the prefetch and
 * the per-product lazy fetch so the parsing never drifts.
 */
const parseVariantRow = (v: any): VariantRow => {
  let optVals: Record<string, string> = v.option_values || {};
  if (Object.keys(optVals).length === 0 && v.combination_key) {
    optVals = {};
    v.combination_key.split("|").forEach((part: string) => {
      const idx = part.indexOf(":");
      if (idx > 0) {
        const key = part.slice(0, idx);
        const val = part.slice(idx + 1);
        if (key && val) optVals[key] = val;
      }
    });
  }
  return { ...v, option_values: optVals } as VariantRow;
};

/** Worst (most severe) stock level across a product's variants. */
const worstStockLevel = (variants: VariantRow[]): StockLevel => {
  if (variants.length === 0) return "out-of-stock";
  const levels = variants.map((v) => stockLevel(v.inventory));
  if (levels.includes("out-of-stock")) return "out-of-stock";
  if (levels.includes("low-stock")) return "low-stock";
  return "in-stock";
};

const getTotalStock = (variants: VariantRow[]): number =>
  variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0);

// ─── Status Badge (token-based via lib/status + ui-app StatusBadge) ────────────

const STOCK_ICON: Record<StockLevel, LucideIcon> = {
  "in-stock": CheckCircle2,
  "low-stock": AlertTriangle,
  "out-of-stock": XCircle,
};
const STOCK_KEY: Record<StockLevel, string> = {
  "in-stock": "common.in_stock",
  "low-stock": "common.low_stock",
  "out-of-stock": "common.out_of_stock",
};

const StockBadge = ({ level, className }: { level: StockLevel; className?: string }) => {
  const { t } = useTranslation();
  const Icon = STOCK_ICON[level];
  return (
    <StatusBadge tone={STOCK_LEVEL_TONE[level]} size="sm" icon={<Icon />} className={className}>
      {t(STOCK_KEY[level])}
    </StatusBadge>
  );
};

// ─── Variant Sub-Row ──────────────────────────────────────────────────────────

interface VariantSubRowProps {
  variant: VariantRow;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStockChange: (variantId: string, newStock: number) => void;
}

const VariantSubRow = ({ variant, isSelected, onSelect, onStockChange }: VariantSubRowProps) => {
  const { t } = useTranslation();
  const [editVal, setEditVal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const level = stockLevel(variant.inventory);

  const currentDisplay = editVal !== null ? editVal : String(variant.inventory);

  const commit = async () => {
    if (editVal === null) return;
    const num = parseInt(editVal, 10);
    if (isNaN(num) || num < 0) {
      setEditVal(null);
      return;
    }
    setSaving(true);
    // Optimistic
    onStockChange(variant.id, num);
    setEditVal(null);

    const { error } = await supabase
      .from("product_variants")
      .update({ inventory: num })
      .eq("id", variant.id);

    if (error) {
      showError(`Failed to save: ${error.message}`);
      onStockChange(variant.id, variant.inventory); // revert
    }
    setSaving(false);
  };

  const optionEntries = Object.entries(variant.option_values ?? {});
  const optionLabel =
    optionEntries.map(([k, v]) => `${k}: ${v}`).join(", ") ||
    variant.sku ||
    t("stock.default_variant");

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors",
        isSelected ? "bg-primary/5" : "bg-muted/20 hover:bg-muted/40"
      )}
    >
      {/* Checkbox */}
      <div className="pl-8 flex-shrink-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(variant.id)}
          aria-label={`Select ${optionLabel}`}
        />
      </div>

      {/* Option value badges */}
      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {optionEntries.length > 0 ? (
          optionEntries.map(([optName, optVal]) => (
            <Badge key={optName} variant="secondary" className="text-xs gap-1 font-normal">
              <span className="text-muted-foreground">{optName}:</span>
              <span className="font-medium">{optVal}</span>
            </Badge>
          ))
        ) : variant.sku ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {variant.sku}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">{t("stock.default_variant")}</span>
        )}
        {variant.sku && optionEntries.length > 0 && (
          <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5 ml-1">
            <Hash className="h-3 w-3" />{variant.sku}
          </span>
        )}
        {/* Compact status indicator on mobile (full badge hidden < sm) */}
        <StatusDot tone={STOCK_LEVEL_TONE[level]} className="sm:hidden ml-0.5" />
      </div>

      {/* Status */}
      <div className="hidden sm:block flex-shrink-0 w-28">
        <StockBadge level={level} />
      </div>

      {/* Stock input */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Input
          type="number"
          min={0}
          className="h-8 w-20 text-right"
          value={currentDisplay}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditVal(null);
          }}
          disabled={saving}
          aria-label={t("stock.stock_for", { name: optionLabel })}
        />
        {saving && <Spinner className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
      </div>
    </div>
  );
};

// ─── Product Accordion Row ────────────────────────────────────────────────────

interface ProductAccordionRowProps {
  product: any;
  selectedVariantIds: Set<string>;
  onVariantSelect: (variantId: string) => void;
  onVariantsLoaded: (productId: string, variants: VariantRow[]) => void;
  variantCache: Record<string, VariantRow[]>;
}

const ProductAccordionRow = ({
  product,
  selectedVariantIds,
  onVariantSelect,
  onVariantsLoaded,
  variantCache,
}: ProductAccordionRowProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localVariants, setLocalVariants] = useState<VariantRow[]>([]);
  const [setAllValue, setSetAllValue] = useState("");
  const [addAllValue, setAddAllValue] = useState("");
  const [quickMode, setQuickMode] = useState<"set" | "add">("set");
  const [fetched, setFetched] = useState(false);

  // Sync from cache only if we haven't fetched ourselves
  useEffect(() => {
    if (!fetched && variantCache[product.id]?.length > 0) {
      setLocalVariants(variantCache[product.id]);
    }
  }, [variantCache, product.id, fetched]);

  const fetchVariants = useCallback(async () => {
    if (fetched) return;
    // Serve from the prefetched cache when available — avoids a redundant
    // per-expand round-trip (the page prefetches every product's variants).
    const cached = variantCache[product.id];
    if (cached !== undefined) {
      setLocalVariants(cached);
      setFetched(true);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("product_variants")
      .select(VARIANT_SELECT)
      .eq("product_id", product.id)
      .order("is_default", { ascending: false });

    if (error) {
      showError(`Failed to load variants: ${error.message}`);
    } else {
      const rows = (data ?? []).map(parseVariantRow);
      setLocalVariants(rows);
      onVariantsLoaded(product.id, rows);
      setFetched(true);
    }
    setLoading(false);
  }, [product.id, onVariantsLoaded, fetched, variantCache]);

  const handleToggle = () => {
    if (!expanded) fetchVariants();
    setExpanded((v) => !v);
  };

  const handleStockChange = useCallback((variantId: string, newStock: number) => {
    setLocalVariants((prev) => {
      const updated = prev.map((v) => (v.id === variantId ? { ...v, inventory: newStock } : v));
      onVariantsLoaded(product.id, updated);
      return updated;
    });
  }, [product.id, onVariantsLoaded]);

  const undoApplyToAll = useCallback(async (previous: Map<string, number>) => {
    setLocalVariants((prev) => {
      const restored = prev.map((v) =>
        previous.has(v.id) ? { ...v, inventory: previous.get(v.id)! } : v
      );
      onVariantsLoaded(product.id, restored);
      return restored;
    });
    try {
      await Promise.all(
        [...previous].map(([id, inv]) =>
          supabase.from("product_variants").update({ inventory: inv }).eq("id", id)
        )
      );
    } catch (e) {
      showError(toFriendlyError(e, "Couldn't undo the change."));
    }
  }, [product.id, onVariantsLoaded]);

  const applyToAll = async (mode: "set" | "add", rawVal: string) => {
    const num = parseInt(rawVal, 10);
    if (isNaN(num) || num < 0) return;

    const previous = new Map(localVariants.map((v) => [v.id, v.inventory]));
    const snapshot = localVariants;
    const updated = localVariants.map((v) => ({
      ...v,
      inventory: mode === "set" ? num : v.inventory + num,
    }));
    setLocalVariants(updated);
    onVariantsLoaded(product.id, updated);
    setSetAllValue("");
    setAddAllValue("");

    try {
      await Promise.all(
        updated.map((v) =>
          supabase.from("product_variants").update({ inventory: v.inventory }).eq("id", v.id)
        )
      );
      toast.success(t("stock.updated_all", { name: product.name }), {
        action: { label: t("common.undo"), onClick: () => undoApplyToAll(previous) },
      });
    } catch (e) {
      showError(toFriendlyError(e, "Couldn't update the variants."));
      // revert
      setLocalVariants(snapshot);
      onVariantsLoaded(product.id, snapshot);
    }
  };

  // Use variant stock if variants exist, otherwise fall back to product base inventory
  const hasLoadedVariants = variantCache[product.id] !== undefined;
  const hasVariants = hasLoadedVariants ? variantCache[product.id].length > 0 : (product.details?.options_v2?.length ?? 0) > 0;
  const totalStock = localVariants.length > 0 ? getTotalStock(localVariants) : (product.inventory ?? 0);
  const worstLevel = localVariants.length > 0 ? worstStockLevel(localVariants) : stockLevel(product.inventory ?? 0);

  return (
    <div data-reveal className="border-b last:border-b-0">
      {/* Accordion Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          expanded && "bg-muted/20"
        )}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${product.name}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {/* Expand chevron */}
        <ChevronRight
          className={cn(
            "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-90"
          )}
        />

        {/* Thumbnail + name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {product.media_url || product.thumbnail_url ? (
            <img
              src={product.thumbnail_url || product.media_url}
              alt={product.name}
              className="h-10 w-10 rounded-md object-cover bg-muted flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-muted flex-shrink-0 flex items-center justify-center">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-sm line-clamp-1">{product.name}</div>
            {product.category && (
              <div className="text-xs text-muted-foreground">{product.category}</div>
            )}
          </div>
        </div>

        {/* Variant count pill */}
        {hasVariants && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Layers className="h-3.5 w-3.5" />
            {variantCache[product.id]?.length ?? "…"} {t("stock.variants")}
          </span>
        )}

        {/* Total stock (+ compact mobile status dot) */}
        <div className="flex items-center gap-2 flex-shrink-0 w-auto sm:w-16 justify-end">
          <StatusDot tone={STOCK_LEVEL_TONE[worstLevel]} className="sm:hidden" />
          <span className="text-sm font-semibold text-right tabular-nums">
            {totalStock.toLocaleString()}
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0 w-28 hidden sm:block">
          <StockBadge level={worstLevel} />
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Quick apply bar */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-muted/30 border-b">
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant={quickMode === "set" ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={(e) => { e.stopPropagation(); setQuickMode("set"); }}
                >
                  {t("stock.set_all")}
                </Button>
                <Button
                  size="sm"
                  variant={quickMode === "add" ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={(e) => { e.stopPropagation(); setQuickMode("add"); }}
                >
                  {t("stock.add_to_all")}
                </Button>
              </div>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Input
                  type="number"
                  min={0}
                  placeholder={quickMode === "set" ? "Qty" : "+Qty"}
                  className="h-7 w-20 text-sm"
                  value={quickMode === "set" ? setAllValue : addAllValue}
                  aria-label={quickMode === "set" ? t("stock.set_all") : t("stock.add_to_all")}
                  onChange={(e) =>
                    quickMode === "set"
                      ? setSetAllValue(e.target.value)
                      : setAddAllValue(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      applyToAll(quickMode, quickMode === "set" ? setAllValue : addAllValue);
                  }}
                />
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyToAll(quickMode, quickMode === "set" ? setAllValue : addAllValue);
                  }}
                >
                  {t("common.apply")}
                </Button>
              </div>
            </div>

            {/* Variant rows */}
            {loading ? (
              <div className="px-4 py-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : localVariants.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
                <div className="pl-8 flex-1 min-w-0">
                  <span className="text-sm text-muted-foreground">{t("stock.base_stock")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium tabular-nums w-12 text-right">{product.inventory ?? 0}</span>
                </div>
                <StockBadge level={stockLevel(product.inventory ?? 0)} />
              </div>
            ) : (
              localVariants.map((variant) => (
                <VariantSubRow
                  key={variant.id}
                  variant={variant}
                  isSelected={selectedVariantIds.has(variant.id)}
                  onSelect={onVariantSelect}
                  onStockChange={handleStockChange}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const OutOfStock = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const { allProducts, allCategories, isLoading } = useProductData() as any;

  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // variantCache: productId -> VariantRow[]
  const [variantCache, setVariantCache] = useState<Record<string, VariantRow[]>>({});
  const [prefetchFailed, setPrefetchFailed] = useState(false);

  // Selected variant IDs (across all products)
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());

  // Bulk action state
  const [bulkValue, setBulkValue] = useState("");
  const [bulkMode, setBulkMode] = useState<"set" | "add" | "zero">("set");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Subtle entrance motion (reduced-motion aware) — runs once when data loads.
  const statsReveal = useReveal<HTMLDivElement>({}, [isLoading]);
  const listReveal = useReveal<HTMLDivElement>({}, [isLoading]);

  useEffect(() => {
    setTitle(t("stock.title"));
  }, [setTitle, t]);

  // Pre-fetch variant stock summaries for ALL physical products on load.
  const prefetchVariants = useCallback(async () => {
    if (!allProducts || allProducts.length === 0) return;
    const productIds = allProducts.filter((p: any) => p.pricing_type === "one_time").map((p: any) => p.id);
    if (productIds.length === 0) return;

    const { data, error } = await supabase
      .from("product_variants")
      .select(VARIANT_SELECT)
      .in("product_id", productIds);

    if (error || !data) {
      setPrefetchFailed(true);
      showError(toFriendlyError(error, t("stock.prefetch_failed")));
      return;
    }
    setPrefetchFailed(false);

    // Group by product_id
    const grouped: Record<string, VariantRow[]> = {};
    data.forEach((v: any) => {
      const row = parseVariantRow(v);
      if (!grouped[v.product_id]) grouped[v.product_id] = [];
      grouped[v.product_id].push(row);
    });

    setVariantCache((prev) => ({ ...prev, ...grouped }));
  }, [allProducts, t]);

  useEffect(() => {
    prefetchVariants();
  }, [prefetchVariants]);

  const physicalProducts = useMemo(
    () => allProducts.filter((p: any) => p.pricing_type === "one_time"),
    [allProducts]
  );

  // Compute stats from loaded variant caches (fall back to product.inventory)
  const stats = useMemo(() => {
    let inStock = 0, lowStock = 0, outOfStock = 0, totalUnits = 0;
    physicalProducts.forEach((p: any) => {
      const variants = variantCache[p.id];
      if (variants && variants.length > 0) {
        const level = worstStockLevel(variants);
        if (level === "in-stock") inStock++;
        else if (level === "low-stock") lowStock++;
        else outOfStock++;
        totalUnits += getTotalStock(variants);
      } else {
        const inv = p.inventory ?? 0;
        const level = stockLevel(inv);
        if (level === "in-stock") inStock++;
        else if (level === "low-stock") lowStock++;
        else outOfStock++;
        totalUnits += inv;
      }
    });
    return { total: physicalProducts.length, inStock, lowStock, outOfStock, totalUnits };
  }, [physicalProducts, variantCache]);

  // Determine if a product passes the stock filter based on its cached variants
  const stockFilterForProduct = useCallback(
    (productId: string, fallbackInventory: number): boolean => {
      if (stockFilter === "all") return true;
      const variants = variantCache[productId];
      const level = variants && variants.length > 0
        ? worstStockLevel(variants)
        : stockLevel(fallbackInventory);
      return level === stockFilter;
    },
    [stockFilter, variantCache]
  );

  const filteredProducts = useMemo(() => {
    return physicalProducts.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      const matchesStock = stockFilterForProduct(p.id, p.inventory ?? 0);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [physicalProducts, searchTerm, categoryFilter, stockFilterForProduct]);

  const handleVariantsLoaded = useCallback((productId: string, variants: VariantRow[]) => {
    setVariantCache((prev) => ({ ...prev, [productId]: variants }));
  }, []);

  const handleVariantSelect = useCallback((variantId: string) => {
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  }, []);

  // Collect all selected variants from cache
  const selectedVariants = useMemo(() => {
    const result: VariantRow[] = [];
    Object.values(variantCache).forEach((variants) => {
      variants.forEach((v) => {
        if (selectedVariantIds.has(v.id)) result.push(v);
      });
    });
    return result;
  }, [variantCache, selectedVariantIds]);

  /** Optimistically restore a previous inventory map (used by the undo action). */
  const restoreInventory = useCallback(async (prev: Map<string, number>) => {
    setVariantCache((cache) => {
      const next = { ...cache };
      Object.keys(next).forEach((pid) => {
        next[pid] = next[pid].map((v) =>
          prev.has(v.id) ? { ...v, inventory: prev.get(v.id)! } : v
        );
      });
      return next;
    });
    try {
      await Promise.all(
        [...prev].map(([id, inv]) =>
          supabase.from("product_variants").update({ inventory: inv }).eq("id", id)
        )
      );
    } catch (e) {
      showError(toFriendlyError(e, "Couldn't undo the change."));
    }
  }, []);

  const handleBulkApply = async () => {
    if (selectedVariants.length === 0) return;
    setBulkSaving(true);

    const getNewStock = (v: VariantRow): number => {
      if (bulkMode === "zero") return 0;
      const num = parseInt(bulkValue, 10);
      if (isNaN(num) || num < 0) return v.inventory;
      if (bulkMode === "set") return num;
      return v.inventory + num;
    };

    // Capture previous inventory for undo, compute new values.
    const previous = new Map<string, number>();
    const updates = new Map<string, number>();
    selectedVariants.forEach((v) => {
      previous.set(v.id, v.inventory);
      updates.set(v.id, getNewStock(v));
    });

    // Optimistic update cache
    setVariantCache((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((pid) => {
        next[pid] = next[pid].map((v) =>
          updates.has(v.id) ? { ...v, inventory: updates.get(v.id)! } : v
        );
      });
      return next;
    });

    try {
      await Promise.all(
        selectedVariants.map((v) =>
          supabase
            .from("product_variants")
            .update({ inventory: updates.get(v.id)! })
            .eq("id", v.id)
        )
      );
      const count = selectedVariants.length;
      toast.success(t("stock.updated_variants", { count }), {
        action: { label: t("common.undo"), onClick: () => restoreInventory(previous) },
      });
      setSelectedVariantIds(new Set());
      setBulkValue("");
    } catch (e) {
      showError(toFriendlyError(e, "Bulk update failed."));
      // revert optimistic update
      restoreInventory(previous);
    }
    setBulkSaving(false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStockFilter("all");
    setCategoryFilter("all");
  };

  const stockFilterLabels: Record<StockFilter, string> = {
    all: t("common.all"),
    "in-stock": t("common.in_stock"),
    "low-stock": t("common.low_stock"),
    "out-of-stock": t("common.out_of_stock"),
  };

  const statCards = [
    { key: "total", title: t("stock.total_products"), value: stats.total, icon: Package, tone: "brand" as const },
    { key: "in", title: t("common.in_stock"), value: stats.inStock, icon: CheckCircle2, tone: "success" as const },
    { key: "low", title: t("common.low_stock"), value: stats.lowStock, icon: AlertTriangle, tone: "warning" as const },
    { key: "out", title: t("common.out_of_stock"), value: stats.outOfStock, icon: XCircle, tone: "danger" as const },
    { key: "units", title: t("stock.total_units"), value: stats.totalUnits, icon: Hash, tone: "info" as const },
  ];

  return (
    <>
      <div className="space-y-4">
        {/* Stats Bar */}
        <div ref={statsReveal} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((s) => (
            <div key={s.key} data-reveal>
              <StatCard title={s.title} value={s.value} icon={s.icon} tone={s.tone} />
            </div>
          ))}
        </div>

        {/* Prefetch failure notice + retry */}
        {prefetchFailed && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {t("stock.prefetch_failed")}
            </span>
            <Button size="sm" variant="outline" onClick={prefetchVariants}>
              {t("common.retry")}
            </Button>
          </div>
        )}

        {/* Filters & Search — two-tier command bar */}
        <CommandBar
          secondary={
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "in-stock", "low-stock", "out-of-stock"] as StockFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={stockFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStockFilter(f)}
                >
                  {stockFilterLabels[f]}
                </Button>
              ))}
            </div>
          }
        >
          <SearchInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder={t("stock.search_products")}
            containerClassName="w-full sm:w-72 md:w-80"
          />
          <div className="ml-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] shadow-sm">
                <SelectValue placeholder={t("stock.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("stock.all_categories")}</SelectItem>
                {allCategories.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CommandBar>

        {/* Product Accordion List */}
        <Card className="shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <div className="w-4 flex-shrink-0" /> {/* chevron space */}
            <div className="flex-1">{t("stock.product")}</div>
            <div className="hidden sm:block flex-shrink-0 w-16 text-right">{t("stock.total_stock")}</div>
            <div className="hidden sm:block flex-shrink-0 w-28">{t("products.status")}</div>
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              physicalProducts.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title={t("stock.no_products")}
                  description={t("stock.no_products_desc")}
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title={t("products.no_match")}
                  description={t("stock.no_match_desc")}
                  action={
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      {t("common.clear_filters")}
                    </Button>
                  }
                />
              )
            ) : (
              <div ref={listReveal}>
                {filteredProducts.map((product: any) => (
                  <ProductAccordionRow
                    key={product.id}
                    product={product}
                    selectedVariantIds={selectedVariantIds}
                    onVariantSelect={handleVariantSelect}
                    onVariantsLoaded={handleVariantsLoaded}
                    variantCache={variantCache}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedVariantIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-xl border rounded-xl shadow-lg p-2 flex items-center gap-2 flex-wrap"
          >
            <span className="text-sm font-medium px-2 whitespace-nowrap">
              {selectedVariantIds.size} {t("stock.variants")} {t("stock.selected_lc")}
            </span>

            {/* Mode buttons */}
            <div className="flex gap-1">
              {(["set", "add", "zero"] as const).map((m) => (
                <Button
                  key={m}
                  size="sm"
                  variant={bulkMode === m ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setBulkMode(m)}
                >
                  {m === "set" ? t("stock.set_to") : m === "add" ? t("common.add") : t("stock.zero_out")}
                </Button>
              ))}
            </div>

            {bulkMode !== "zero" && (
              <Input
                type="number"
                min={0}
                placeholder="Qty"
                className="h-8 w-20 text-sm"
                value={bulkValue}
                aria-label={bulkMode === "set" ? t("stock.set_to") : t("common.add")}
                onChange={(e) => setBulkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleBulkApply();
                }}
              />
            )}

            {bulkMode === "zero" ? (
              <ConfirmButton
                size="sm"
                variant="destructive"
                className="h-8 text-xs"
                disabled={bulkSaving}
                confirmTitle={t("stock.zero_out_confirm_title")}
                confirmDescription={t("stock.zero_out_confirm_desc")}
                confirmLabel={t("stock.zero_out")}
                cancelLabel={t("common.cancel")}
                onConfirm={handleBulkApply}
              >
                {bulkSaving ? (
                  <Spinner className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t("common.apply")}
              </ConfirmButton>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleBulkApply}
                disabled={bulkSaving || bulkValue === ""}
              >
                {bulkSaving ? (
                  <Spinner className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t("common.apply")}
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setSelectedVariantIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OutOfStock;
