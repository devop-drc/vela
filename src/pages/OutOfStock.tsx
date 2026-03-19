import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Package,
  X,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
  Hash,
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

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

const getStockStatus = (inventory: number): "in-stock" | "low-stock" | "out-of-stock" => {
  if (inventory <= 0) return "out-of-stock";
  if (inventory < 10) return "low-stock";
  return "in-stock";
};

const getLowestStockStatus = (variants: VariantRow[]): "in-stock" | "low-stock" | "out-of-stock" => {
  if (variants.length === 0) return "out-of-stock";
  const statuses = variants.map((v) => getStockStatus(v.inventory));
  if (statuses.includes("out-of-stock")) return "out-of-stock";
  if (statuses.includes("low-stock")) return "low-stock";
  return "in-stock";
};

const getTotalStock = (variants: VariantRow[]): number =>
  variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: "in-stock" | "low-stock" | "out-of-stock" }) => {
  if (status === "out-of-stock")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <XCircle className="h-3.5 w-3.5" /> Out of Stock
      </span>
    );
  if (status === "low-stock")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
        <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <CheckCircle2 className="h-3.5 w-3.5" /> In Stock
    </span>
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
  const [editVal, setEditVal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const status = getStockStatus(variant.inventory);

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
          aria-label="Select variant"
        />
      </div>

      {/* Option value badges */}
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
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
          <span className="text-xs text-muted-foreground italic">Default variant</span>
        )}
        {variant.sku && optionEntries.length > 0 && (
          <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5 ml-1">
            <Hash className="h-3 w-3" />{variant.sku}
          </span>
        )}
      </div>

      {/* Status */}
      <div className="hidden sm:block flex-shrink-0 w-28">
        <StatusBadge status={status} />
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
        />
        {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />}
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
  stockFilterForProduct: (variants: VariantRow[]) => boolean;
}

const ProductAccordionRow = ({
  product,
  selectedVariantIds,
  onVariantSelect,
  onVariantsLoaded,
  variantCache,
  stockFilterForProduct,
}: ProductAccordionRowProps) => {
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
    setLoading(true);
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, product_id, combination_key, option_values, inventory, price_difference, is_active, is_default, sku")
      .eq("product_id", product.id)
      .order("is_default", { ascending: false });

    if (error) {
      showError(`Failed to load variants: ${error.message}`);
    } else {
      // Parse option_values from combination_key if empty
      const rows = (data ?? []).map((v: any) => {
        let optVals = v.option_values || {};
        if (Object.keys(optVals).length === 0 && v.combination_key) {
          v.combination_key.split("|").forEach((part: string) => {
            const [key, val] = part.split("=");
            if (key && val) optVals[key] = val;
          });
        }
        return { ...v, option_values: optVals } as VariantRow;
      });
      setLocalVariants(rows);
      onVariantsLoaded(product.id, rows);
      setFetched(true);
    }
    setLoading(false);
  }, [product.id, onVariantsLoaded, fetched]);

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

  const applyToAll = async (mode: "set" | "add", rawVal: string) => {
    const num = parseInt(rawVal, 10);
    if (isNaN(num) || num < 0) return;

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
      showSuccess(`Updated all variants for ${product.name}`);
    } catch (e: any) {
      showError(`Failed to update: ${e.message}`);
      // revert
      setLocalVariants(localVariants);
      onVariantsLoaded(product.id, localVariants);
    }
  };

  // Use variant stock if variants exist, otherwise fall back to product base inventory
  const hasLoadedVariants = variantCache[product.id] !== undefined;
  const hasVariants = hasLoadedVariants ? variantCache[product.id].length > 0 : (product.details?.options_v2?.length ?? 0) > 0;
  const totalStock = localVariants.length > 0 ? getTotalStock(localVariants) : (product.inventory ?? 0);
  const worstStatus = localVariants.length > 0 ? getLowestStockStatus(localVariants) : getStockStatus(product.inventory ?? 0);

  return (
    <div className="border-b last:border-b-0">
      {/* Accordion Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 select-none",
          expanded && "bg-muted/20"
        )}
        onClick={handleToggle}
        role="button"
        aria-expanded={expanded}
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
            {variantCache[product.id]?.length ?? "…"} variants
          </span>
        )}

        {/* Total stock */}
        <div className="text-sm font-semibold flex-shrink-0 w-16 text-right tabular-nums">
          {totalStock.toLocaleString()}
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0 w-28 hidden sm:block">
          <StatusBadge status={worstStatus} />
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
                  Set all
                </Button>
                <Button
                  size="sm"
                  variant={quickMode === "add" ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={(e) => { e.stopPropagation(); setQuickMode("add"); }}
                >
                  Add to all
                </Button>
              </div>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Input
                  type="number"
                  min={0}
                  placeholder={quickMode === "set" ? "Qty" : "+Qty"}
                  className="h-7 w-20 text-sm"
                  value={quickMode === "set" ? setAllValue : addAllValue}
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
                  Apply
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
                  <span className="text-sm text-muted-foreground">Base product stock (no variants)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium tabular-nums w-12 text-right">{product.inventory ?? 0}</span>
                </div>
                <StatusBadge status={getStockStatus(product.inventory ?? 0)} />
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
  const { allProducts, allCategories, isLoading } = useProductData() as any;

  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // variantCache: productId -> VariantRow[]
  const [variantCache, setVariantCache] = useState<Record<string, VariantRow[]>>({});

  // Selected variant IDs (across all products)
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());

  // Bulk action state
  const [bulkValue, setBulkValue] = useState("");
  const [bulkMode, setBulkMode] = useState<"set" | "add" | "zero">("set");
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    setTitle("Stock Management");
  }, [setTitle]);

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
        const status = getLowestStockStatus(variants);
        if (status === "in-stock") inStock++;
        else if (status === "low-stock") lowStock++;
        else outOfStock++;
        totalUnits += getTotalStock(variants);
      } else {
        const inv = p.inventory ?? 0;
        const status = getStockStatus(inv);
        if (status === "in-stock") inStock++;
        else if (status === "low-stock") lowStock++;
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
      let status: "in-stock" | "low-stock" | "out-of-stock";
      if (variants && variants.length > 0) {
        status = getLowestStockStatus(variants);
      } else {
        status = getStockStatus(fallbackInventory);
      }
      if (stockFilter === "in-stock") return status === "in-stock";
      if (stockFilter === "low-stock") return status === "low-stock";
      if (stockFilter === "out-of-stock") return status === "out-of-stock";
      return true;
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

    // Optimistic update cache
    const updates = new Map<string, number>();
    selectedVariants.forEach((v) => updates.set(v.id, getNewStock(v)));

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
      showSuccess(`Updated ${selectedVariants.length} variant${selectedVariants.length !== 1 ? "s" : ""}`);
      setSelectedVariantIds(new Set());
      setBulkValue("");
    } catch (e: any) {
      showError(`Bulk update failed: ${e.message}`);
    }
    setBulkSaving(false);
  };

  const stockFilterLabels: Record<StockFilter, string> = {
    all: "All",
    "in-stock": "In Stock",
    "low-stock": "Low Stock",
    "out-of-stock": "Out of Stock",
  };

  return (
    <>
      <div className="space-y-4">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Products", value: stats.total, color: "text-foreground" },
            { label: "In Stock", value: stats.inStock, color: "text-green-600" },
            { label: "Low Stock", value: stats.lowStock, color: "text-amber-600" },
            { label: "Out of Stock", value: stats.outOfStock, color: "text-red-600" },
            { label: "Total Units", value: stats.totalUnits.toLocaleString(), color: "text-foreground" },
          ].map((stat) => (
            <Card key={stat.label} className="py-3 px-4 shadow-sm">
              <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-10 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
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

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] shadow-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((cat: string) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Accordion List */}
        <Card className="shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
            <div className="w-4 flex-shrink-0" /> {/* chevron space */}
            <div className="flex-1">Product</div>
            <div className="hidden sm:block flex-shrink-0 w-20 text-right">Total Stock</div>
            <div className="hidden sm:block flex-shrink-0 w-28">Status</div>
          </div>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Package className="h-10 w-10 opacity-30" />
                <p className="text-sm">No products match your filters.</p>
              </div>
            ) : (
              filteredProducts.map((product: any) => (
                <ProductAccordionRow
                  key={product.id}
                  product={product}
                  selectedVariantIds={selectedVariantIds}
                  onVariantSelect={handleVariantSelect}
                  onVariantsLoaded={handleVariantsLoaded}
                  variantCache={variantCache}
                  stockFilterForProduct={() => true}
                />
              ))
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
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-[20px] border rounded-lg shadow-2xl p-2 flex items-center gap-2 flex-wrap"
          >
            <span className="text-sm font-medium px-2 whitespace-nowrap">
              {selectedVariantIds.size} variant{selectedVariantIds.size !== 1 ? "s" : ""} selected
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
                  {m === "set" ? "Set to" : m === "add" ? "Add" : "Zero out"}
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
                onChange={(e) => setBulkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleBulkApply();
                }}
              />
            )}

            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleBulkApply}
              disabled={bulkSaving || (bulkMode !== "zero" && bulkValue === "")}
            >
              {bulkSaving ? (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Apply
            </Button>

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
