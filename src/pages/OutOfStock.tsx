import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductTableView } from "@/components/ProductTableView";
import { ProductEditor } from "@/components/ProductEditor";
import { SaleModal, SaleFormData } from "@/components/SaleModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { OutOfStockActionsToolbar } from "@/components/OutOfStockActionsToolbar";
import { AnimatePresence } from "framer-motion";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { StockAdjustmentModal } from "@/components/StockAdjustmentModal"; // Import new modal
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  caption: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  created_at: string;
  details: any; // Added details
  media_type: string | null; // Added media_type
}

interface ProductWithSales extends Product {
  total_earned?: number;
  total_sold?: number;
}

const OutOfStock = () => {
  const { setTitle } = usePageTitle();
  const [products, setProducts] = useState<ProductWithSales[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false); // Keep for now, might be removed later
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false); // New state for stock modal
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, Array<{ id: string; product_id: string; option_values: Record<string,string>; inventory: number; is_active: boolean; sku: string | null }>>>({});
  const [variantEdits, setVariantEdits] = useState<Record<string, Record<string, { inventory: number; is_active: boolean }>>>({});
  const [variantSelected, setVariantSelected] = useState<Record<string, Record<string, boolean>>>({});
  const [optionNamesByProduct, setOptionNamesByProduct] = useState<Record<string, string[]>>({});
  const [defaultOptionValueByProduct, setDefaultOptionValueByProduct] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    setTitle("Out of Stock");
  }, [setTitle]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*, details") // Select details field
      .eq('user_id', user.id); // Ensure RLS is respected

    if (error) {
      showError("Could not fetch out of stock products.");
      setProducts([]);
    } else {
      const fetchedProducts = data as Product[];
      const productIds = fetchedProducts.map(p => p.id);

      // Fetch sales summary for these products
      const { data: salesSummary, error: salesError } = await supabase.rpc('get_products_sales_summary', { p_product_ids: productIds });

      if (salesError) {
        console.error("Error fetching sales summary:", salesError);
        // Proceed without sales data if there's an error
        setProducts(fetchedProducts);
      } else {
        const productsWithSales = fetchedProducts.map(p => {
          const summary = salesSummary?.find((s: any) => s.product_id === p.id);
          return {
            ...p,
            total_earned: summary?.total_earned || 0,
            total_sold: summary?.total_sold || 0,
          };
        });
        setProducts(productsWithSales);
      }

      // Fetch variants for these products and group by product
      if (productIds.length > 0) {
        const { data: variants, error: varErr } = await supabase
          .from('product_variants')
          .select('id, product_id, option_values, inventory, is_active, sku')
          .in('product_id', productIds);
        if (!varErr && variants) {
          const grouped: Record<string, any[]> = {};
          for (const v of variants as any[]) {
            if (!grouped[v.product_id]) grouped[v.product_id] = [];
            grouped[v.product_id].push(v);
          }
          setVariantsByProduct(grouped);
          // seed edit state
          const editsSeed: Record<string, Record<string, { inventory: number; is_active: boolean }>> = {};
          const selectedSeed: Record<string, Record<string, boolean>> = {};
          Object.entries(grouped).forEach(([pid, list]) => {
            editsSeed[pid] = {};
            selectedSeed[pid] = {};
            list.forEach((vr: any) => { editsSeed[pid][vr.id] = { inventory: vr.inventory ?? 0, is_active: !!vr.is_active }; selectedSeed[pid][vr.id] = false; });
          });
          setVariantEdits(editsSeed);
          setVariantSelected(selectedSeed);
          // fetch option names for headers
          const { data: opts, error: optsErr } = await supabase
            .from('product_options')
            .select('id, product_id, name, display_order')
            .in('product_id', productIds)
            .order('display_order');
          if (!optsErr && opts) {
            const namesMap: Record<string, string[]> = {};
            const optionIdToName: Record<string, { product_id: string, name: string }> = {};
            (opts as any[]).forEach((o:any)=>{
              if (!namesMap[o.product_id]) namesMap[o.product_id] = [];
              namesMap[o.product_id].push(o.name);
              optionIdToName[o.id] = { product_id: o.product_id, name: o.name };
            });
            setOptionNamesByProduct(namesMap);
            // Fetch default values per option
            const { data: defaultVals } = await supabase
              .from('option_values')
              .select('option_id, value, is_default')
              .in('option_id', Object.keys(optionIdToName))
              .eq('is_default', true);
            const defaultsMap: Record<string, Record<string, string>> = {};
            (defaultVals as any[] | null || []).forEach((dv:any)=>{
              const meta = optionIdToName[dv.option_id];
              if (!meta) return;
              if (!defaultsMap[meta.product_id]) defaultsMap[meta.product_id] = {};
              defaultsMap[meta.product_id][meta.name] = dv.value;
            });
            setDefaultOptionValueByProduct(defaultsMap);
          } else {
            setOptionNamesByProduct({});
            setDefaultOptionValueByProduct({});
          }
        } else {
          setVariantsByProduct({});
          setVariantEdits({});
          setVariantSelected({});
          setOptionNamesByProduct({});
          setDefaultOptionValueByProduct({});
        }
      } else {
        setVariantsByProduct({});
        setVariantEdits({});
        setVariantSelected({});
        setOptionNamesByProduct({});
        setDefaultOptionValueByProduct({});
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (p.pricing_type !== 'one_time') return false; // exclude digital/subscription products
        const variants = variantsByProduct[p.id] || [];
        const hasOOSVariant = variants.some(v => (v.inventory || 0) <= 0);
        const isProductOOS = (p.inventory || 0) <= 0;
        return isProductOOS || hasOOSVariant;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'price-asc': return (a.price || 0) - (b.price || 0);
          case 'price-desc': return (b.price || 0) - (a.price || 0);
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
          case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [products, searchTerm, sortOption, variantsByProduct]);

  // Split into: products with no variants vs products with variants
  const productsWithVariants = useMemo(() => filteredAndSortedProducts.filter(p => (variantsByProduct[p.id]?.length || 0) > 0), [filteredAndSortedProducts, variantsByProduct]);
  const productsWithoutVariants = useMemo(() => filteredAndSortedProducts.filter(p => !variantsByProduct[p.id] || variantsByProduct[p.id].length === 0), [filteredAndSortedProducts, variantsByProduct]);

  const updateVariantEdit = (productId: string, variantId: string, patch: Partial<{ inventory: number; is_active: boolean }>) => {
    setVariantEdits(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [variantId]: { ...(prev[productId]?.[variantId] || { inventory: 0, is_active: true }), ...patch }
      }
    }));
  };

  const saveVariantsForProduct = async (productId: string) => {
    const edits = variantEdits[productId] || {};
    const payload = Object.entries(edits).map(([id, v]) => ({ id, product_id: productId, inventory: v.inventory, is_active: v.is_active }));
    if (payload.length === 0) return;
    const { error } = await supabase.from('product_variants').upsert(payload, { onConflict: 'id' });
    if (error) {
      showError(`Failed to save variants: ${error.message}`);
    } else {
      showSuccess('Variants updated');
      fetchProducts();
    }
  };

  const handleProductUpdate = useCallback(() => { fetchProducts(); }, [fetchProducts]);

  const handleBulkDelete = async () => {
    const { error } = await supabase.from('products').delete().in('id', selectedProducts);
    if (error) { showError(`Failed to delete products: ${error.message}`); } 
    else { showSuccess(`Successfully deleted ${selectedProducts.length} products.`); setSelectedProducts([]); fetchProducts(); }
    setBulkDeleteConfirm(false);
  };

  const handleApplySale = async (saleData: SaleFormData) => {
    const updates = products.filter(p => selectedProducts.includes(p.id) && p.price != null).map(p => ({ id: p.id, price: Math.max(0, saleData.type === 'percentage' ? p.price! * (1 - saleData.value / 100) : p.price! - saleData.value) }));
    if (updates.length > 0) {
      const { error } = await supabase.from('products').upsert(updates);
      if (error) { showError(`Failed to apply sale: ${error.message}`); } 
      else { showSuccess(`Sale applied to ${updates.length} products.`); fetchProducts(); }
    }
    setSelectedProducts([]);
    setIsSaleModalOpen(false);
  };

  const handleOpenStockModal = () => {
    setIsStockModalOpen(true);
  };

  const handleStockAdjustmentSave = () => {
    fetchProducts(); // Re-fetch products to update status and inventory
    setSelectedProducts([]); // Clear selection
    setIsStockModalOpen(false);
  };

  // Count selected variants across all products
  const countSelectedVariants = useMemo(() => {
    return Object.values(variantSelected).reduce((acc, map) => acc + Object.values(map || {}).filter(Boolean).length, 0);
  }, [variantSelected]);

  // Add stock to all selected products and variants
  const handleAddStockSelected = useCallback(async (amount: number) => {
    if (amount <= 0) return;
    // Update selected products (without variants)
    const productIdsToUpdate = selectedProducts;
    if (productIdsToUpdate.length > 0) {
      const selected = products.filter(p => productIdsToUpdate.includes(p.id));
      await Promise.all(selected.map(async (p) => {
        const newInv = Math.max(0, (p.inventory || 0) + amount);
        const { error } = await supabase.from('products').update({ inventory: newInv }).eq('id', p.id);
        if (error) throw error;
      })).catch((e) => { showError(`Failed to add stock to products: ${e.message || e}`); });
    }
    // Update selected variants
    const variantIdsToUpdate: Array<{ product_id: string, id: string }> = [];
    Object.entries(variantSelected).forEach(([pid, map]) => {
      Object.entries(map || {}).forEach(([vid, sel]) => { if (sel) variantIdsToUpdate.push({ product_id: pid, id: vid }); });
    });
    if (variantIdsToUpdate.length > 0) {
      try {
        for (const { product_id, id } of variantIdsToUpdate) {
          const v = (variantsByProduct[product_id] || []).find(x => x.id === id);
          const current = v?.inventory ?? 0;
          const newInv = Math.max(0, current + amount);
          const { error } = await supabase.from('product_variants').update({ inventory: newInv }).eq('id', id);
          if (error) throw error;
        }
      } catch (e: any) {
        showError(`Failed to add stock to variants: ${e.message || e}`);
        return;
      }
    }
    showSuccess('Stock added');
    setSelectedProducts([]);
    setVariantSelected({});
    fetchProducts();
  }, [products, selectedProducts, variantSelected, variantsByProduct, fetchProducts]);

  const productsForStockModal = useMemo(() => {
    if (selectedProducts.length > 0) {
      return products.filter(p => selectedProducts.includes(p.id));
    }
    // If no products selected, we don't want to adjust all filtered products on this page, 
    // only the ones explicitly selected or the single product being edited.
    // Since this modal is only triggered by the BulkActionsToolbar, it should only run when selectedProducts > 0.
    return products.filter(p => selectedProducts.includes(p.id));
  }, [products, selectedProducts]);

  return (
    <>
      <ProductEditor isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct as any} onUpdate={handleProductUpdate} />
      {isSaleModalOpen && <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onApply={handleApplySale} productCount={selectedProducts.length} />}
      {isStockModalOpen && (
        <StockAdjustmentModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          onSave={handleStockAdjustmentSave}
          products={productsForStockModal}
        />
      )}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedProducts.length} products?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <div className="space-y-4">
        <div className="sticky top-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10 shadow-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px] shadow-md"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
                <SelectItem value="name-desc">Name: Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="p-4">
                <Tabs defaultValue={productsWithVariants.length > 0 ? "with-variants" : "no-variants"} className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="no-variants">Products</TabsTrigger>
                    <TabsTrigger value="with-variants">Variants</TabsTrigger>
                  </TabsList>

                  <TabsContent value="no-variants">
                    {productsWithoutVariants.length > 0 ? (
                      <ProductTableView
                        products={productsWithoutVariants as any}
                        selectedProducts={selectedProducts}
                        onSelectAll={(checked) => setSelectedProducts(checked ? productsWithoutVariants.map(p => p.id) : [])}
                        onSelectOne={(id) => setSelectedProducts(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id])}
                        onEdit={(p) => setSelectedProduct(p as any)}
                        onDelete={(id) => { setSelectedProducts([id]); setBulkDeleteConfirm(true); }}
                        showStatusColumn={false}
                        selectableRowsMode="row"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground p-4">No out-of-stock standalone products.</div>
                    )}
                  </TabsContent>

                  <TabsContent value="with-variants">
                    <Accordion type="multiple" className="w-full">
                      {productsWithVariants.map(prod => {
                        const variants = variantsByProduct[prod.id] || [];
                        if (variants.length === 0) return null;
                        const outOfStockVariants = variants.filter(v => (v.inventory || 0) <= 0);
                        if (outOfStockVariants.length === 0) return null;
                        return (
                          <AccordionItem key={prod.id} value={prod.id} className="border rounded-md bg-muted/10 my-2">
                            <AccordionTrigger className="px-4 py-3 text-left">
                              <div className="flex-shrink-0 mr-4">
                                  <img src={prod.media_url} alt={prod.name} className="w-20 h-20 rounded-sm object-cover bg-muted" />
                                </div>
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-2">
                                <div>
                                  <div className="text-sm text-muted-foreground">Product</div>
                                  <div className="text-lg font-semibold">{prod.name}</div>
                                </div>
                                <div className="text-sm text-muted-foreground">{outOfStockVariants.length} out-of-stock variant(s)</div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="overflow-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-muted-foreground">
                                      {(optionNamesByProduct[prod.id]||[]).map((name)=> (
                                        <th key={name} className="py-2 pr-4 capitalize">{name}</th>
                                      ))}
                                      <th className="py-2 pr-4">SKU</th>
                                      <th className="py-2 pr-4">Inventory</th>
                                      <th className="py-2 pr-4">Active</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {variants.map(v => {
                                      const selected = !!variantSelected[prod.id]?.[v.id];
                                      const optionNames = optionNamesByProduct[prod.id] || [];
                                      return (
                                        <tr
                                          key={v.id}
                                          className={cn(
                                            "border-t cursor-pointer",
                                          )}
                                          onClick={() => setVariantSelected(prev=>({ ...prev, [prod.id]: { ...(prev[prod.id]||{}), [v.id]: !prev[prod.id]?.[v.id] } }))}
                                        >
                                          {optionNames.map((name, idx)=> (
                                            <td
                                              key={`${v.id}-${name}`}
                                              className={cn(
                                                "pr-4 align-middle capitalize",
                                                "px-3 py-2.5",
                                                selected && "bg-primary/10",
                                                idx === 0 && "rounded-l-md"
                                              )}
                                            >
                                              {(v.option_values||{})[name] || defaultOptionValueByProduct[prod.id]?.[name] || '—'}
                                            </td>
                                          ))}
                                          <td className={cn("pr-4 align-middle px-3 py-2.5", selected && "bg-primary/10")}>{v.sku || '—'}</td>
                                          <td className={cn("pr-4 w-[140px] px-3 py-2.5", selected && "bg-primary/10") }>
                                            <Input
                                              type="number"
                                              min={0}
                                              value={variantEdits[prod.id]?.[v.id]?.inventory ?? v.inventory ?? 0}
                                              onChange={(e) => updateVariantEdit(prod.id, v.id, { inventory: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                                            />
                                          </td>
                                          <td className={cn("pr-4 w-[140px] px-3 py-2.5", selected && "bg-primary/10", "rounded-r-md") }>
                                            <Select
                                              value={(variantEdits[prod.id]?.[v.id]?.is_active ?? v.is_active) ? 'yes' : 'no'}
                                              onValueChange={(val) => updateVariantEdit(prod.id, v.id, { is_active: val === 'yes' })}
                                            >
                                              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between mt-3">
                                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">Select rows to edit in bulk.</div>
                                <div className="flex justify-end">
                                  <Button onClick={() => saveVariantsForProduct(prod.id)}>Save variants</Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AnimatePresence>
        {(selectedProducts.length > 0 || countSelectedVariants > 0) && (
          <OutOfStockActionsToolbar
            selectedCount={selectedProducts.length + countSelectedVariants}
            onClear={() => { setSelectedProducts([]); setVariantSelected({}); }}
            onAddStock={handleAddStockSelected}
            onDelete={() => setBulkDeleteConfirm(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default OutOfStock;