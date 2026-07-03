import { Button } from "@/components/ui/button";
import { RefreshCw, Import, ChevronDown, LayoutGrid, List, CheckSquare, Group, Filter as FilterIcon, Settings2, Plus, Loader2 } from "lucide-react"; // Renamed Filter to FilterIcon
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { InstagramPostModal } from "@/components/InstagramPostModal";
import { ProductEditor } from "@/components/ProductEditor";
import { ProductCard } from "@/components/ProductCard";
import { ProductTableView } from "@/components/ProductTableView";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { BulkActionsToolbar } from "@/components/BulkActionsToolbar";
import { AnimatePresence, motion } from "framer-motion";
import { SaleModal, SaleFormData } from "@/components/SaleModal";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from "@/contexts/IntegrationContext";
import { toast } from "sonner";
import { useSync } from "@/hooks/useSync";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useShop } from "@/contexts/ShopContext";
import { useProductData } from "@/hooks/useProductData"; // Import useProductData
import { useProductFilters } from "@/hooks/useProductFilters"; // Import useProductFilters
import { ProductFilterDrawer } from "@/components/dashboard/ProductFilterDrawer"; // Import new drawer
import { ProductFilterPanel } from "@/components/products/ProductFilterPanel"; // Import inline filter panel
import { FilterVisibilitySheet } from "@/components/dashboard/FilterVisibilitySheet";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { Info, Tag as TagIcon, DollarSign, Layers, Monitor, Cpu, Gamepad, HardDrive, Baby, Package, Globe, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/formatters";
import { GripVertical } from "lucide-react";
import { Sortable, SortableItem, SortableItemHandle } from "@/components/ui/sortable";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';
type GridSizeType = 'sm' | 'md' | 'lg';
type GroupingType = 'none' | 'category' | 'type';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  price: number | null;
  currency: string | null;
  inventory: number;
  media_url: string;
  caption?: string;
  category: string;
  tags: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  created_at: string;
  details: any;
  instagram_post_id?: string; // Added instagram_post_id
}

const gridSizeClasses: { [key: string]: string } = {
  sm: "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5",
  md: "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  lg: "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
};

const sizeLabels: { [key in GridSizeType]: string } = { sm: 'Less Detail', md: 'More Detail', lg: 'Large' };
const sizeCycle: GridSizeType[] = ['sm', 'md', 'lg'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const Products = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const { runWithIntegrationCheck } = useIntegration();
  const { isSyncing, startNewSync } = useSync();
  const { settings } = useAppearance();
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Tracks whether a freshly-created "Untitled product" draft was ever saved.
  // If the user opens the editor and closes it without saving, we delete the
  // empty draft so it doesn't pollute the product list / stats.
  const newProductSaved = useRef(false);

  const handleAddProduct = async () => {
    if (!shopDetails?.id) { showError("Your shop isn't ready yet. Please try again in a moment."); return; }
    newProductSaved.current = false;
    setIsCreatingProduct(true);
    const { data, error } = await supabase.from('products').insert({
      name: 'Untitled product',
      status: 'Draft',
      business_id: shopDetails.id, // trigger sets user_id from the business owner
      price: 0,
      currency: 'ALL',
      inventory: 0,
      pricing_type: 'one_time',
      product_type: 'physical',
      details: { type: 'generic' },
      tags: [],
    }).select('*').single();
    setIsCreatingProduct(false);
    if (error || !data) {
      showError(toFriendlyError(error, "Couldn't create the product. Please try again."));
      return;
    }
    refetch();
    setIsNewProduct(true);
    setSelectedProduct(data as any);
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [hasDoneFullSync, setHasDoneFullSync] = useState<boolean | null>(null); // State to track if a full sync has ever been done

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [gridSize, setGridSize] = useState<GridSizeType>('md');
  const [grouping, setGrouping] = useState<GroupingType>('none');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false); // New state for filter drawer (mobile)
  const [showFilters, setShowFilters] = useState(!isMobile); // Inline filter panel (desktop default true)
  const [isVisibilitySheetOpen, setIsVisibilitySheetOpen] = useState(false);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [orderMode, setOrderMode] = useState<'alpha' | 'useful' | 'manual'>(() => {
    const s = localStorage.getItem('instagram_filter_order_mode');
    return (s === 'alpha' || s === 'useful' || s === 'manual') ? s : 'manual';
  });

  const [visQuery, setVisQuery] = useState("");

  const { shopDetails } = useShop();

  const toTitle = (s: string) =>
    s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

  // Use Product Data Hook
  const {
    allProducts,
    allCategories,
    allTags,
    allDetailsAttributes,
    maxPrice,
    isLoading: isProductDataLoading,
    refetch,
    updateProduct,
  } = useProductData();

  // Use Product Filters Hook
  const {
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    statusFilter,
    handleToggleStatusFilter,
    filters,
    handleToggleFilter,
    handleClearSection,
    handleResetAllFilters,
    localPriceRange,
    handlePriceRangeChange,
    hasActiveFilters,
    filteredAndSortedProducts,
  }
  = useProductFilters({
    allProducts,
    allCategories,
    allTags,
    allDetailsAttributes,
    maxPrice,
  });

  // Open ProductEditor when openProduct param is present (use filteredAndSortedProducts for matching type)
  useEffect(() => {
    const openId = searchParams.get('openProduct');
    if (openId && filteredAndSortedProducts && filteredAndSortedProducts.length > 0) {
      const p = filteredAndSortedProducts.find(p => p.id === openId);
      if (p) setSelectedProduct(p);
    }
  }, [searchParams, filteredAndSortedProducts]);

  // Compute the exact filter group keys shown in Instagram drawer
  const visibilityKeys = useMemo(() => {
    const keys: string[] = [];
    // Order should mirror InstagramFilterDrawer: Categories, Price Range, Tags, then attributes
    if (allCategories.length > 0) keys.push('categories');
    keys.push('priceRange');
    if (allTags.length > 0) keys.push('tags');

    const attrSet = new Set<string>();
    // include attributes present in definitions with any values
    allDetailsAttributes.forEach(a => { if ((a.values?.length || 0) > 0) attrSet.add(a.name); });
    // Also include attributes derived from products' details
    allProducts.forEach(p => {
      Object.keys(p.details || {}).forEach(k => { if (k !== 'type') attrSet.add(k); });
    });
    // Remove reference code/ref code style attributes
    const isRefCode = (name: string) => {
      const n = name.toLowerCase();
      return n.includes('reference code') || n.includes('ref code') || n === 'ref' || n.includes('refcode') || n.includes('reference');
    };
    const attrs = Array.from(attrSet).filter(a => !isRefCode(a)).sort((a,b)=>a.localeCompare(b));
    return [...keys, ...attrs];
  }, [allCategories, allTags, allDetailsAttributes, allProducts]);

  // Read admin-persisted order/visibility to drive Instagram Shop drawer ordering
  const drawerKeysFromAdmin = useMemo(() => {
    let orderLs: string[] = [];
    let visMap: Record<string, boolean> = {};
    try {
      const s = localStorage.getItem('instagram_filter_order');
      if (s) orderLs = JSON.parse(s);
    } catch {}
    try {
      const v = localStorage.getItem('instagram_filter_visibility');
      if (v) visMap = JSON.parse(v);
    } catch {}
    const base = orderLs.length > 0 ? orderLs : visibilityKeys;
    return base.filter(k => visibilityKeys.includes(k) && visMap[k] !== false);
  }, [visibilityKeys, isVisibilitySheetOpen]);

  // Load persisted visibility
  useEffect(() => {
    try {
      const raw = localStorage.getItem('instagram_filter_visibility');
      if (raw) {
        setVisibilityMap(JSON.parse(raw));
      } else {
        setVisibilityMap({});
      }
    } catch {
      setVisibilityMap({});
    }
  }, []);

  // Initialize and persist order
  useEffect(() => {
    // initialize from storage when keys first known
    const stored = localStorage.getItem('instagram_filter_order');
    const keysSet = new Set(visibilityKeys);
    if (stored) {
      try {
        const parsed: string[] = JSON.parse(stored);
        const filtered = parsed.filter(k => keysSet.has(k));
        const missing = visibilityKeys.filter(k => !filtered.includes(k));
        setOrder([...filtered, ...missing]);
        return;
      } catch { void 0; }
    }
    setOrder(visibilityKeys);
  }, [visibilityKeys]);

  useEffect(() => {
    if (order.length > 0) {
      localStorage.setItem('instagram_filter_order', JSON.stringify(order));
    }
  }, [order]);

  useEffect(() => {
    localStorage.setItem('instagram_filter_order_mode', orderMode);
  }, [orderMode]);

  const setVisibility = (key: string, val: boolean) => {
    setVisibilityMap(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem('instagram_filter_visibility', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleKey = (key: string) => {
    const isOn = visibilityMap[key] !== false;
    setVisibility(key, !isOn);
  };

  const onDragStart = (key: string, e: React.DragEvent) => {
    setDragKey(key);
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const moveAfter = (movingKey: string, targetKey: string) => {
    setOrder(prev => {
      const next = prev.filter(k => k !== movingKey);
      const idx = next.indexOf(targetKey);
      if (idx === -1) return prev; // shouldn't happen
      next.splice(idx + 1, 0, movingKey);
      return [...next];
    });
  };

  const dropOnKey = (e: React.DragEvent, targetKey: string, targetEnabled: boolean) => {
    if (!dragKey) return;
    e.preventDefault();
    e.stopPropagation();
    // toggle if section differs
    const dragEnabled = visibilityMap[dragKey] !== false;
    if (dragEnabled !== targetEnabled) setVisibility(dragKey, targetEnabled);
    // decide before/after based on cursor position within target
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const placeBefore = e.clientY < rect.top + rect.height / 2;
    setOrder(prev => {
      const list = prev.filter(k => k !== dragKey);
      const idx = list.indexOf(targetKey);
      if (idx === -1) return prev;
      const insertIdx = placeBefore ? idx : idx + 1;
      list.splice(insertIdx, 0, dragKey);
      return [...list];
    });
    setDragKey(null);
    setIsDragging(false);
  };

  const dropOnSectionEnd = (targetEnabled: boolean) => {
    if (!dragKey) return;
    const dragEnabled = visibilityMap[dragKey] !== false;
    if (dragEnabled !== targetEnabled) setVisibility(dragKey, targetEnabled);
    setOrder(prev => {
      const list = prev.filter(k => k !== dragKey);
      // compute effective enabled with dragKey moved
      const isEnabledEff = (k: string) => (k === dragKey ? targetEnabled : visibilityMap[k] !== false);
      let insertIdx = list.length;
      if (targetEnabled) {
        // insert after last enabled
        insertIdx = -1;
        list.forEach((k, i) => { if (isEnabledEff(k)) insertIdx = i; });
        insertIdx = insertIdx + 1; // after last enabled
      } else {
        // insert at end (after all items)
        insertIdx = list.length;
      }
      list.splice(Math.max(0, insertIdx), 0, dragKey);
      return [...list];
    });
    setDragKey(null);
    setIsDragging(false);
  };

  const resetVisibility = () => {
    localStorage.removeItem('instagram_filter_visibility');
    setVisibilityMap({});
  };

  


  useEffect(() => { setTitle(t("nav.products")); }, [setTitle, t]);

  useEffect(() => {
    if (searchParams.get("instagram_connected") === "true") {
      showSuccess("Successfully connected! Opening importer...");
      setIsImporterOpen(true);
      searchParams.delete("instagram_connected");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Simplified fetchBusinessDataForSyncStatus to only get business data for sync status
  const fetchBusinessDataForSyncStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setHasDoneFullSync(null);
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, last_full_sync_at')
      .eq('user_id', user.id)
      .single();

    if (businessError) {
      console.error("Error fetching business data:", businessError);
      setHasDoneFullSync(false);
    } else {
      setHasDoneFullSync(!!businessData?.last_full_sync_at);
    }
  };

  useEffect(() => {
    fetchBusinessDataForSyncStatus();
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`products:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${user.id}` },
          (payload) => {
            // The useProductData hook already handles real-time updates to allProducts
            // We just need to trigger a re-fetch of business data if a product is added/deleted
            // to potentially update the product count in ProfileStats or sync status.
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              fetchBusinessDataForSyncStatus();
            }
          }
        ).subscribe();
    };

    setupRealtimeListener();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      const updatedProductInList = allProducts.find(p => p.id === selectedProduct.id);
      if (updatedProductInList && JSON.stringify(updatedProductInList) !== JSON.stringify(selectedProduct)) {
        setSelectedProduct(updatedProductInList);
      }
    }
  }, [allProducts, selectedProduct]);

  // Fix for crash after deletion: Clear selectedProduct if it no longer exists in allProducts
  useEffect(() => {
    if (selectedProduct && !allProducts.some(p => p.id === selectedProduct.id)) {
      setSelectedProduct(null);
    }
  }, [allProducts, selectedProduct]);


  const handleSync = async (syncType: 'quick' | 'full') => {
    runWithIntegrationCheck(async () => {
      // Show widget immediately with optimistic state
      startNewSync('pending');
      try {
        // Let Supabase client handle auth automatically (don't override headers)
        const { data, error } = await supabase.functions.invoke('background-sync', {
          body: { syncType }
        });

        if (error) {
          console.error('Sync invoke error:', error);
          throw error;
        }
        if (data?.error) {
          console.error('Sync data error:', data.error);
          throw new Error(data.error);
        }

        if (data?.jobId) {
          startNewSync(data.jobId);
        }

        if (syncType === 'full') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            supabase.from('businesses').update({ last_full_sync_at: new Date().toISOString() }).eq('user_id', user.id)
              .then(() => setHasDoneFullSync(true));
          }
        }
      } catch (err: any) {
        console.error('handleSync error:', err);
        showError(err.message || `Failed to start ${syncType} sync.`);
      }
    });
  };

  const handleStatusChange = async (productId: string, newStatus: ProductStatus) => {
    // Optimistic update — instant UI change
    updateProduct(productId, { status: newStatus });
    const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', productId);
    if (error) {
      showError(`Failed to update status: ${error.message}`);
      refetch(); // revert on failure
    }
  };

  const handleBulkStatusChange = async (status: ProductStatus) => {
    // Optimistic update
    selectedProducts.forEach(id => updateProduct(id, { status }));
    const count = selectedProducts.length;
    setSelectedProducts([]);
    const { error } = await supabase.from('products').update({ status }).in('id', selectedProducts);
    if (error) { showError(`Failed to update products: ${error.message}`); refetch(); }
    else showSuccess(`Updated ${count} products.`);
  };
  // Shared deletion used by both the bulk action and the single-row trash button.
  const deleteProductsByIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data: productsToDelete, error: fetchError } = await supabase
      .from('products')
      .select('id, instagram_post_id')
      .in('id', ids);
    if (fetchError) {
      showError(toFriendlyError(fetchError, "Couldn't delete the product. Please try again."));
      return;
    }
    const instagramPostIds = (productsToDelete || []).map(p => p.instagram_post_id).filter(Boolean);
    if (instagramPostIds.length > 0) {
      const { error: cacheError } = await supabase.from('ai_analysis_cache').delete().in('instagram_post_id', instagramPostIds);
      if (cacheError) console.error("Failed to delete AI analysis cache entries:", cacheError);
    }
    const { error: deleteError } = await supabase.from('products').delete().in('id', ids);
    if (deleteError) {
      showError(toFriendlyError(deleteError, "Couldn't delete the product. Please try again."));
    } else {
      showSuccess(`Deleted ${ids.length} product${ids.length > 1 ? 's' : ''}.`);
      refetch();
    }
  };

  const handleBulkDelete = async () => {
    await deleteProductsByIds(selectedProducts);
    setSelectedProducts([]);
    setBulkDeleteConfirm(false);
  };

  const handleDeleteOne = async () => {
    if (!deleteTargetId) return;
    await deleteProductsByIds([deleteTargetId]);
    setSelectedProducts(prev => prev.filter(id => id !== deleteTargetId));
    setDeleteTargetId(null);
  };
  const handleApplySale = async (saleData: SaleFormData) => {
    const updates = allProducts.filter(p => selectedProducts.includes(p.id) && p.price != null).map(p => ({ id: p.id, price: Math.max(0, saleData.type === 'percentage' ? p.price! * (1 - saleData.value / 100) : p.price! - saleData.value) }));
    if (updates.length > 0) {
      const { error } = await supabase.from('products').upsert(updates);
      if (error) showError(`Failed to apply sale: ${error.message}`);
      else showSuccess(`Sale applied to ${updates.length} products.`);
    }
    setSelectedProducts([]);
    setIsSaleModalOpen(false);
  };
  const toggleSelectionMode = () => { setSelectedProducts([]); setIsSelectionModeActive(prev => !prev); };
  const cycleGridSize = () => setGridSize(prev => sizeCycle[(sizeCycle.indexOf(prev) + 1) % sizeCycle.length]);

  const currentView = isMobile ? 'grid' : viewMode;

  const handleSelectProduct = (productId: string) => {
    if (isSelectionModeActive) {
      setSelectedProducts(prev =>
        prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
      );
    } else {
      const productToEdit = filteredAndSortedProducts.find(p => p.id === productId);
      if (productToEdit) {
        setSelectedProduct(productToEdit);
      }
    }
  };

  const handleSelectAllInGroup = (productsInGroup: Product[]) => {
    const productIdsInGroup = productsInGroup.map(p => p.id);
    const allSelected = productIdsInGroup.every(id => selectedProducts.includes(id));

    setSelectedProducts(prev => {
      if (allSelected) {
        // Deselect all in group
        return prev.filter(id => !productIdsInGroup.includes(id));
      } else {
        // Select all in group
        const newSelection = new Set([...prev, ...productIdsInGroup]);
        return Array.from(newSelection);
      }
    });
    setIsSelectionModeActive(true);
  };

  const groupedProducts = useMemo(() => {
    if (grouping === 'category') {
      return filteredAndSortedProducts.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {} as { [key: string]: Product[] });
    }
    if (grouping === 'type') {
      const singles: Product[] = [];
      const multis: Product[] = [];
      filteredAndSortedProducts.forEach(p => {
        const isMulti = Boolean(p.details?.multi_product);
        if (isMulti) multis.push(p); else singles.push(p);
      });
      const result: { [key: string]: Product[] } = {};
      if (multis.length > 0) result['Multi-Products'] = multis;
      if (singles.length > 0) result['Products'] = singles;
      return Object.keys(result).length > 0 ? result : { 'All Products': filteredAndSortedProducts };
    }
    // If no grouping, return a single group or handle as flat list
    return { 'All Products': filteredAndSortedProducts };
  }, [filteredAndSortedProducts, grouping]);

  // ── Stats derived from allProducts (not filtered, so numbers are always real totals) ──
  const statsTotal = allProducts.length;
  const statsActive = allProducts.filter(p => p.status === 'Active').length;
  const statsDraft = allProducts.filter(p => p.status === 'Draft').length;
  const statsOos = allProducts.filter(p => p.status === 'Out of Stock').length;

  return (
    <>
      {isImporterOpen && <InstagramPostModal onClose={() => setIsImporterOpen(false)} onImport={() => {}} />}
      <ProductEditor
        isOpen={!!selectedProduct}
        startInEdit={isNewProduct}
        onClose={() => {
          // Clean up an abandoned brand-new draft that was never saved.
          if (isNewProduct && !newProductSaved.current && selectedProduct?.id) {
            const draftId = selectedProduct.id;
            supabase.from('products').delete().eq('id', draftId).then(() => refetch());
          }
          setSelectedProduct(null);
          setIsNewProduct(false);
          setSearchParams(prev => {
            const sp = new URLSearchParams(prev);
            sp.delete('openProduct');
            return sp;
          });
        }}
        product={selectedProduct}
        onUpdate={() => { newProductSaved.current = true; }}
      />
      {isSaleModalOpen && <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onApply={handleApplySale} productCount={selectedProducts.length} />}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("products.delete_confirm", { count: selectedProducts.length })}</AlertDialogTitle><AlertDialogDescription>{t("products.delete_warning")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("products.yes_delete")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => { const p = filteredAndSortedProducts.find(p => p.id === deleteTargetId); return p ? `"${p.name}" will be permanently deleted. This can't be undone.` : "This product will be permanently deleted. This can't be undone."; })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOne} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("products.yes_delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Filter Drawer (used on desktop and mobile) */}
      <ProductFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        allCategories={allCategories}
        allTags={allTags}
        allDetailsAttributes={allDetailsAttributes}
        maxPrice={maxPrice}
        filters={filters}
        handleToggleFilter={handleToggleFilter}
        handleClearSection={handleClearSection}
        handleResetAllFilters={handleResetAllFilters}
        localPriceRange={localPriceRange}
        handlePriceRangeChange={handlePriceRangeChange}
        statusFilter={statusFilter}
        handleToggleStatusFilter={handleToggleStatusFilter}
        drawerKeys={drawerKeysFromAdmin}
      />

      {/* Filter Visibility Sheet */}
      <FilterVisibilitySheet
        open={isVisibilitySheetOpen}
        onOpenChange={setIsVisibilitySheetOpen}
        allCategories={allCategories}
        allTags={allTags}
        allDetailsAttributes={allDetailsAttributes}
        allProducts={allProducts}
      />

      {/* ── Main layout: filter panel + content ── */}
      <div className="flex gap-4 w-full">
        {/* Inline filter panel (desktop only) */}
        {!isMobile && showFilters && (
          <div className="w-[260px] shrink-0 h-[calc(100vh-80px)] sticky top-0">
            <ProductFilterPanel
              allCategories={allCategories}
              allTags={allTags}
              maxPrice={maxPrice}
              filters={filters}
              statusFilter={statusFilter}
              localPriceRange={localPriceRange}
              handleToggleFilter={handleToggleFilter}
              handleToggleStatusFilter={handleToggleStatusFilter}
              handleClearSection={handleClearSection}
              handleResetAllFilters={handleResetAllFilters}
              handlePriceRangeChange={handlePriceRangeChange}
              hasActiveFilters={hasActiveFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}

        {/* Main content column — grows to fill all space the sidebar isn't using */}
        <div className="flex-1 min-w-0">
      {/* ── Stats summary bar ── */}
      {!isProductDataLoading && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/70 border border-border text-sm font-medium text-foreground shadow-sm">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{statsTotal}</span>
            <span className="text-muted-foreground">{t("products.total")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-sm font-medium text-emerald-700 dark:text-emerald-400 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold">{statsActive}</span>
            <span className="opacity-80">{t("common.active")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-sm font-medium text-amber-700 dark:text-amber-400 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
            <span className="font-semibold">{statsDraft}</span>
            <span className="opacity-80">{t("common.draft")}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/25 text-sm font-medium text-red-700 dark:text-red-400 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            <span className="font-semibold">{statsOos}</span>
            <span className="opacity-80">{t("common.out_of_stock")}</span>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="sticky top-[0px] z-50 flex mb-3 items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Primary action: create a product manually */}
            <Button className="justify-start flex-1 md:flex-none shadow-sm bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleAddProduct} disabled={isCreatingProduct}>
              {isCreatingProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {t("products.add_product", "Add Product")}
            </Button>

            {/* Storefront filter configuration (controls the customer shop's filter UI) */}
            <Button variant="outline" className="justify-start flex-1 md:flex-none shadow-sm" onClick={() => setIsVisibilitySheetOpen(true)} title="Configure which filters customers see in your shop">
              <Settings2 className="mr-2 h-4 w-4" />
              {t("products.filter_management")}
            </Button>

            {/* Filter Button — toggles inline panel on desktop, opens drawer on mobile */}
            <Button
              variant={showFilters && !isMobile ? "secondary" : "outline"}
              className="justify-start flex-1 md:flex-none shadow-lg"
              onClick={() => {
                if (isMobile) {
                  setIsFilterDrawerOpen(true);
                } else {
                  setShowFilters(prev => !prev);
                }
              }}
            >
              <FilterIcon className="mr-2 h-4 w-4" />
              {t("common.filters")}
              {hasActiveFilters && <span className="ml-1 text-xs text-primary">({t("common.active")})</span>}
            </Button>

            {/* Sort Select */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-full sm:w-[180px] shadow-lg">
                <SelectValue placeholder={t("common.sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("products.newest")}</SelectItem>
                <SelectItem value="oldest">{t("products.oldest")}</SelectItem>
                <SelectItem value="price-asc">{t("products.price_low_high")}</SelectItem>
                <SelectItem value="price-desc">{t("products.price_high_low")}</SelectItem>
                <SelectItem value="name-asc">{t("products.name_az")}</SelectItem>
                <SelectItem value="name-desc">{t("products.name_za")}</SelectItem>
              </SelectContent>
            </Select>

            {/* View/Grouping/Selection Controls (Desktop Only) */}
            <AnimatePresence>
              {!isMobile && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex items-center gap-2 overflow-visible">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="shadow-lg"><Group className="mr-2 h-4 w-4" />{t("products.group")}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuRadioGroup value={grouping} onValueChange={(v) => setGrouping(v as GroupingType)}>
                        <DropdownMenuRadioItem value="none">{t("common.none")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="category">{t("products.by_category")}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="type">{t("products.by_type")}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Segmented view toggle */}
                  <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 shadow-lg">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                        viewMode === 'grid'
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-label="Grid view"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden lg:inline">{t("products.grid")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                        viewMode === 'table'
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      aria-label="Table view"
                    >
                      <List className="h-4 w-4" />
                      <span className="hidden lg:inline">{t("products.table")}</span>
                    </button>
                  </div>

                  {viewMode === 'grid' && (
                    <Button variant="outline" onClick={cycleGridSize} className="w-28 justify-start shadow-lg">
                      <LayoutGrid className="mr-2 h-4 w-4" />{sizeLabels[gridSize]}
                    </Button>
                  )}
                  {viewMode === 'grid' && (
                    <Button variant={isSelectionModeActive ? "secondary" : "outline"} onClick={toggleSelectionMode} className="shadow-lg">
                      <CheckSquare className="mr-2 h-4 w-4" />{isSelectionModeActive ? t('common.cancel') : t('products.select')}
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sync Actions — more prominent */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            {/* Import from Instagram — visually distinct */}
            <Button
              onClick={() => runWithIntegrationCheck(() => setIsImporterOpen(true))}
              variant="outline"
              className="flex-1 md:flex-none border-foreground/20 text-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              <span className="hidden sm:inline">{t("products.import")}</span>
              <span className="sm:hidden">{t("products.import")}</span>
            </Button>

            {/* Sync buttons */}
            {hasDoneFullSync === null ? (
              <Skeleton className="h-10 w-32" />
            ) : !hasDoneFullSync ? (
              <Button
                onClick={() => handleSync('full')}
                disabled={isSyncing}
                variant="outline"
                className="flex-1 shadow-sm bg-red-600 text-white hover:bg-red-700 border-0"
                title={t("products.full_sync_hint")}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                {t("products.full_sync")}
              </Button>
            ) : (
              <div className="flex items-center">
                <Button
                  onClick={() => handleSync('quick')}
                  disabled={isSyncing}
                  variant="outline"
                  className="rounded-r-none flex-1 shadow-lg border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
                  title={t("products.quick_sync_hint")}
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                  {t("dashboard.quick_sync")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={isSyncing}
                      variant="outline"
                      className="rounded-l-none px-2 border-l border-red-700 bg-red-600 text-white hover:bg-red-700 shadow-sm"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-w-[260px]">
                    <DropdownMenuItem onClick={() => handleSync('full')} disabled={isSyncing} className="flex-col items-start gap-0.5">
                      <span className="font-medium">{t("products.run_full_sync")}</span>
                      <span className="text-xs text-muted-foreground whitespace-normal">{t("products.full_sync_hint")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>

        {/* ── View indicator ── */}
        {!isProductDataLoading && filteredAndSortedProducts.length > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            {t("common.showing")} <span className="font-semibold text-foreground">{filteredAndSortedProducts.length}</span> {t("common.of")}{' '}
            <span className="font-semibold text-foreground">{statsTotal}</span> {statsTotal !== 1 ? t("nav.products").toLowerCase() : t("nav.products").toLowerCase()}
            {hasActiveFilters && <span className="ml-1 text-primary">({t("products.filtered")})</span>}
          </p>
        )}

        {/* ── Product List/Grid ── */}
        {isProductDataLoading ? (
          currentView === 'grid' ? (
            <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", gridSizeClasses[gridSize])}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )
        ) : filteredAndSortedProducts.length > 0 ? (
          currentView === 'grid' ? (
            <div className="space-y-8">
              {Object.entries(groupedProducts).map(([groupName, products]) => (
                <div key={groupName}>
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className={cn("text-xl font-bold capitalize inline-block", settings.backgroundImageUrl && "bg-card/60 backdrop-blur-[20px] px-3 py-1 rounded-md")}>
                      {groupName} ({products.length})
                    </h2>
                    {grouping === 'category' && products.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => handleSelectAllInGroup(products)}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        {products.every(p => selectedProducts.includes(p.id)) ? t('products.deselect_all') : t('products.select_all')}
                      </Button>
                    )}
                  </div>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className={cn("grid grid-cols-2 md:grid-cols-3 gap-4 items-stretch", gridSizeClasses[gridSize])}
                  >
                    {products.map((product) => (
                      <motion.div key={product.id} variants={itemVariants} className="h-full">
                        <ProductCard
                          product={product}
                          gridSize={gridSize}
                          isSelected={selectedProducts.includes(product.id)}
                          isSelectionModeActive={isSelectionModeActive || selectedProducts.length > 0}
                          onSelect={handleSelectProduct}
                          onEdit={setSelectedProduct}
                          onStatusChange={handleStatusChange}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ProductTableView
                  products={filteredAndSortedProducts}
                  selectedProducts={selectedProducts}
                  onSelectAll={(checked) => setSelectedProducts(checked ? filteredAndSortedProducts.map(p => p.id) : [])}
                  onSelectOne={handleSelectProduct}
                  onEdit={setSelectedProduct}
                  onDelete={(id) => setDeleteTargetId(id)}
                />
              </CardContent>
            </Card>
          )
        ) : (
          /* ── Improved empty state ── */
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center border-2 border-dashed rounded-xl border-border/60 bg-muted/20">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold mb-1">{t("products.no_match")}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  {t("products.no_match_desc")}
                </p>
                <Button variant="outline" onClick={handleResetAllFilters}>
                  {t("common.clear_all")} {t("common.filters").toLowerCase()}
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-1">{t("products.no_products")}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  {t("products.no_products_desc")}
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Button onClick={handleAddProduct} disabled={isCreatingProduct} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {isCreatingProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {t("products.add_product", "Add Product")}
                  </Button>
                  <Button
                    onClick={() => runWithIntegrationCheck(() => setIsImporterOpen(true))}
                    variant="outline" className="border-foreground/20 text-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  >
                    <Import className="mr-2 h-4 w-4" />
                    {t("products.import_instagram")}
                  </Button>
                  {hasDoneFullSync === false && (
                    <Button
                      variant="outline"
                      onClick={() => handleSync('full')}
                      disabled={isSyncing}
                      className="border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                      {t("products.run_full_sync")}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        </div>{/* end main content column */}
      </div>{/* end flex layout */}

      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedProducts.length}
            onClear={() => { setSelectedProducts([]); setIsSelectionModeActive(false); }}
            onSetStatus={handleBulkStatusChange}
            onDelete={() => setBulkDeleteConfirm(true)}
            onAddSale={() => setIsSaleModalOpen(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Products;