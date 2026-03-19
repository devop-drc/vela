import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useProductData } from "@/hooks/useProductData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Package, Layers, X, Plus, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { StockAdjustmentModal } from "@/components/StockAdjustmentModal";

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

const getStockStatus = (inventory: number): "in-stock" | "low-stock" | "out-of-stock" => {
  if (inventory <= 0) return "out-of-stock";
  if (inventory < 10) return "low-stock";
  return "in-stock";
};

const StatusBadge = ({ inventory }: { inventory: number }) => {
  const status = getStockStatus(inventory);
  if (status === "out-of-stock") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <XCircle className="h-3.5 w-3.5" /> Out of Stock
      </span>
    );
  }
  if (status === "low-stock") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
        <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
      <CheckCircle2 className="h-3.5 w-3.5" /> In Stock
    </span>
  );
};

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, mode: "add" | "set") => Promise<void>;
  productCount: number;
}

const RestockModal = ({ isOpen, onClose, onSave, productCount }: RestockModalProps) => {
  const [amount, setAmount] = useState<string>("10");
  const [mode, setMode] = useState<"add" | "set">("add");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const num = parseInt(amount, 10);
    if (isNaN(num) || num < 0) return;
    setIsSaving(true);
    await onSave(num, mode);
    setIsSaving(false);
    setAmount("10");
    setMode("add");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick Restock</DialogTitle>
          <DialogDescription>
            Update inventory for {productCount} selected product{productCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={mode === "add" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("add")}
            >
              Add to current
            </Button>
            <Button
              variant={mode === "set" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("set")}
            >
              Set exact amount
            </Button>
          </div>
          <div className="space-y-1">
            <Label htmlFor="restock-amount">Amount</Label>
            <Input
              id="restock-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[10, 25, 50, 100].map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setAmount(String(preset))}
              >
                +{preset}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || amount === "" || parseInt(amount, 10) < 0}>
            {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OutOfStock = () => {
  const { setTitle } = usePageTitle();
  const { allProducts, allCategories, isLoading, updateProduct, refetch } = useProductData() as any;

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingInventory, setEditingInventory] = useState<Record<string, string>>({});
  const [savingInventory, setSavingInventory] = useState<Record<string, boolean>>({});
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [bulkMarkConfirm, setBulkMarkConfirm] = useState<"active" | "out-of-stock" | null>(null);

  useEffect(() => {
    setTitle("Stock Management");
  }, [setTitle]);

  // Only physical, one-time products are relevant for stock management
  const physicalProducts = useMemo(
    () => allProducts.filter((p: any) => p.pricing_type === "one_time"),
    [allProducts]
  );

  const stats = useMemo(() => {
    const inStock = physicalProducts.filter((p: any) => (p.inventory ?? 0) >= 10).length;
    const lowStock = physicalProducts.filter((p: any) => (p.inventory ?? 0) > 0 && (p.inventory ?? 0) < 10).length;
    const outOfStock = physicalProducts.filter((p: any) => (p.inventory ?? 0) <= 0).length;
    const totalUnits = physicalProducts.reduce((sum: number, p: any) => sum + (p.inventory ?? 0), 0);
    return { total: physicalProducts.length, inStock, lowStock, outOfStock, totalUnits };
  }, [physicalProducts]);

  const filteredProducts = useMemo(() => {
    return physicalProducts.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      let matchesStock = true;
      if (stockFilter === "in-stock") matchesStock = (p.inventory ?? 0) >= 10;
      else if (stockFilter === "low-stock") matchesStock = (p.inventory ?? 0) > 0 && (p.inventory ?? 0) < 10;
      else if (stockFilter === "out-of-stock") matchesStock = (p.inventory ?? 0) <= 0;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [physicalProducts, searchTerm, stockFilter, categoryFilter]);

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every((p: any) => selectedProducts.includes(p.id));

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? filteredProducts.map((p: any) => p.id) : []);
  };

  const handleSelectOne = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleInventoryEdit = (id: string, value: string) => {
    setEditingInventory((prev) => ({ ...prev, [id]: value }));
  };

  const handleInventorySave = async (product: any) => {
    const raw = editingInventory[product.id];
    if (raw === undefined) return;
    const newVal = parseInt(raw, 10);
    if (isNaN(newVal) || newVal < 0) return;

    setSavingInventory((prev) => ({ ...prev, [product.id]: true }));
    // Optimistic update
    updateProduct(product.id, { inventory: newVal, status: newVal > 0 ? "Active" : "Out of Stock" });
    setEditingInventory((prev) => { const n = { ...prev }; delete n[product.id]; return n; });

    const { error } = await supabase
      .from("products")
      .update({ inventory: newVal, status: newVal > 0 ? "Active" : "Out of Stock" })
      .eq("id", product.id);

    if (error) {
      showError(`Failed to save inventory: ${error.message}`);
      updateProduct(product.id, { inventory: product.inventory, status: product.status });
    } else {
      showSuccess("Inventory updated");
    }
    setSavingInventory((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
  };

  const handleQuickRestock = async (productId: string, amount: number) => {
    const product = physicalProducts.find((p: any) => p.id === productId);
    if (!product) return;
    const newInv = (product.inventory ?? 0) + amount;
    updateProduct(productId, { inventory: newInv, status: newInv > 0 ? "Active" : "Out of Stock" });
    const { error } = await supabase
      .from("products")
      .update({ inventory: newInv, status: newInv > 0 ? "Active" : "Out of Stock" })
      .eq("id", productId);
    if (error) {
      showError(`Failed to restock: ${error.message}`);
      updateProduct(productId, { inventory: product.inventory, status: product.status });
    } else {
      showSuccess(`+${amount} added to ${product.name}`);
    }
  };

  const handleBulkRestock = async (amount: number, mode: "add" | "set") => {
    const selected = physicalProducts.filter((p: any) => selectedProducts.includes(p.id));
    // Optimistic
    selected.forEach((p: any) => {
      const newInv = mode === "add" ? (p.inventory ?? 0) + amount : amount;
      updateProduct(p.id, { inventory: newInv, status: newInv > 0 ? "Active" : "Out of Stock" });
    });

    try {
      await Promise.all(
        selected.map(async (p: any) => {
          const newInv = mode === "add" ? (p.inventory ?? 0) + amount : amount;
          const { error } = await supabase
            .from("products")
            .update({ inventory: newInv, status: newInv > 0 ? "Active" : "Out of Stock" })
            .eq("id", p.id);
          if (error) throw error;
        })
      );
      showSuccess(`Restocked ${selected.length} product${selected.length !== 1 ? "s" : ""}`);
    } catch (e: any) {
      showError(`Failed to restock: ${e.message}`);
      refetch?.();
    }
    setSelectedProducts([]);
    setIsRestockModalOpen(false);
  };

  const handleBulkMark = async (status: "Active" | "Out of Stock") => {
    const selected = physicalProducts.filter((p: any) => selectedProducts.includes(p.id));
    const newInv = status === "Out of Stock" ? 0 : undefined;
    // Optimistic
    selected.forEach((p: any) => {
      updateProduct(p.id, { status, ...(newInv !== undefined ? { inventory: newInv } : {}) });
    });

    try {
      await Promise.all(
        selected.map(async (p: any) => {
          const patch: any = { status };
          if (newInv !== undefined) patch.inventory = newInv;
          const { error } = await supabase.from("products").update(patch).eq("id", p.id);
          if (error) throw error;
        })
      );
      showSuccess(`${selected.length} product${selected.length !== 1 ? "s" : ""} marked as ${status}`);
    } catch (e: any) {
      showError(`Failed to update status: ${e.message}`);
      refetch?.();
    }
    setSelectedProducts([]);
    setBulkMarkConfirm(null);
  };

  const productsForModal = useMemo(
    () => physicalProducts.filter((p: any) => selectedProducts.includes(p.id)),
    [physicalProducts, selectedProducts]
  );

  return (
    <>
      {/* Bulk Restock Modal */}
      <RestockModal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        onSave={handleBulkRestock}
        productCount={selectedProducts.length}
      />

      {/* Stock Adjustment Modal (advanced) */}
      {isStockAdjustModalOpen && (
        <StockAdjustmentModal
          isOpen={isStockAdjustModalOpen}
          onClose={() => setIsStockAdjustModalOpen(false)}
          onSave={() => { setIsStockAdjustModalOpen(false); setSelectedProducts([]); refetch?.(); }}
          products={productsForModal}
        />
      )}

      {/* Bulk mark confirm */}
      <AlertDialog open={!!bulkMarkConfirm} onOpenChange={() => setBulkMarkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mark {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""} as{" "}
              {bulkMarkConfirm === "active" ? "Active" : "Out of Stock"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkMarkConfirm === "out-of-stock"
                ? "This will set inventory to 0 and mark the products as Out of Stock."
                : "This will mark the products as Active without changing their current inventory."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkMark(bulkMarkConfirm === "active" ? "Active" : "Out of Stock")}
              className={cn(bulkMarkConfirm === "out-of-stock" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            {(["all", "in-stock", "low-stock", "out-of-stock"] as StockFilter[]).map((f) => {
              const labels: Record<StockFilter, string> = {
                all: "All",
                "in-stock": "In Stock",
                "low-stock": "Low Stock",
                "out-of-stock": "Out of Stock",
              };
              return (
                <Button
                  key={f}
                  variant={stockFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStockFilter(f)}
                >
                  {labels[f]}
                </Button>
              );
            })}
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

        {/* Product Table */}
        <Card className="shadow-sm">
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
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="py-3 pl-4 pr-2 w-10">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="py-3 px-3 text-left font-medium text-muted-foreground">Product</th>
                      <th className="py-3 px-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                      <th className="py-3 px-3 text-left font-medium text-muted-foreground">Inventory</th>
                      <th className="py-3 px-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                      <th className="py-3 px-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Variants</th>
                      <th className="py-3 px-3 text-right font-medium text-muted-foreground">Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((product: any) => {
                      const isSelected = selectedProducts.includes(product.id);
                      const editVal = editingInventory[product.id];
                      const isSaving = !!savingInventory[product.id];

                      return (
                        <tr
                          key={product.id}
                          className={cn(
                            "transition-colors hover:bg-muted/30",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          <td className="py-3 pl-4 pr-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleSelectOne(product.id)}
                              aria-label={`Select ${product.name}`}
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              {product.media_url ? (
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
                              <span className="font-medium line-clamp-1">{product.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">
                            {product.category || <span className="italic opacity-50">—</span>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                className="h-8 w-20 text-right"
                                value={editVal !== undefined ? editVal : String(product.inventory ?? 0)}
                                onChange={(e) => handleInventoryEdit(product.id, e.target.value)}
                                onBlur={() => {
                                  if (editVal !== undefined) handleInventorySave(product);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleInventorySave(product);
                                  if (e.key === "Escape") {
                                    setEditingInventory((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
                                  }
                                }}
                                disabled={isSaving}
                              />
                              {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden sm:table-cell">
                            <StatusBadge inventory={product.inventory ?? 0} />
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            {product.details?.options_v2?.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Layers className="h-3.5 w-3.5" />
                                {product.details.options_v2.length} variant{product.details.options_v2.length !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-1">
                              {[10, 50].map((amt) => (
                                <Button
                                  key={amt}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleQuickRestock(product.id, amt)}
                                >
                                  +{amt}
                                </Button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-background/80 backdrop-blur-[20px] border rounded-lg shadow-2xl p-2 flex items-center gap-2 flex-wrap"
          >
            <span className="text-sm font-medium px-2 whitespace-nowrap">
              {selectedProducts.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setIsRestockModalOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Restock
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsStockAdjustModalOpen(true)}
            >
              <Package className="mr-1.5 h-4 w-4" /> Set Stock
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
              onClick={() => setBulkMarkConfirm("active")}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Active
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              onClick={() => setBulkMarkConfirm("out-of-stock")}
            >
              <XCircle className="mr-1.5 h-4 w-4" /> Mark OOS
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setSelectedProducts([])}
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
