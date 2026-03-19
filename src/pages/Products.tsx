import { Button } from "@/components/ui/button";
import { RefreshCw, Import, ChevronDown, LayoutGrid, List, CheckSquare, Group, Filter as FilterIcon } from "lucide-react"; // Renamed Filter to FilterIcon
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
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
import { FilterVisibilitySheet } from "@/components/dashboard/FilterVisibilitySheet";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const { runWithIntegrationCheck } = useIntegration();
  const { isSyncing, startNewSync } = useSync();
  const { settings } = useAppearance();
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [hasDoneFullSync, setHasDoneFullSync] = useState<boolean | null>(null); // State to track if a full sync has ever been done

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [gridSize, setGridSize] = useState<GridSizeType>('md');
  const [grouping, setGrouping] = useState<GroupingType>('none');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false); // New state for filter drawer
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

  


  useEffect(() => { setTitle("Products"); }, [setTitle]);

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
  const handleBulkDelete = async () => {
    const { data: productsToDelete, error: fetchError } = await supabase
      .from('products')
      .select('id, instagram_post_id')
      .in('id', selectedProducts);

    if (fetchError) {
      showError(`Failed to fetch products for deletion: ${fetchError.message}`);
      setBulkDeleteConfirm(false);
      return;
    }

    const instagramPostIds = productsToDelete.map(p => p.instagram_post_id).filter(Boolean);

    // Delete from AI analysis cache
    if (instagramPostIds.length > 0) {
      const { error: cacheError } = await supabase
        .from('ai_analysis_cache')
        .delete()
        .in('instagram_post_id', instagramPostIds);
      if (cacheError) {
        console.error("Failed to delete AI analysis cache entries:", cacheError);
        showError(`Failed to clear AI cache for some products: ${cacheError.message}`);
      }
    }

    // Delete from products table
    const { error: deleteError } = await supabase.from('products').delete().in('id', selectedProducts);
    if (deleteError) {
      showError(`Failed to delete products: ${deleteError.message}`);
    } else {
      showSuccess(`Successfully deleted ${selectedProducts.length} products.`);
      setSelectedProducts([]);
      refetch();
    }
    setBulkDeleteConfirm(false);
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

  return (
    <>
      {isImporterOpen && <InstagramPostModal onClose={() => setIsImporterOpen(false)} onImport={() => {}} />}
      <ProductEditor
        isOpen={!!selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          setSearchParams(prev => {
            const sp = new URLSearchParams(prev);
            sp.delete('openProduct');
            return sp;
          });
        }}
        product={selectedProduct}
        onUpdate={() => {}}
      />
      {isSaleModalOpen && <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onApply={handleApplySale} productCount={selectedProducts.length} />}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedProducts.length} products?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
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
      
      <div className="sticky top-[0px] z-50 flex mb-3 items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Filter Management Button */}
            <Button className="bg-primary text-primary-foreground border-none justify-start flex-1 md:flex-none hover:bg-primary/90 shadow-lg" onClick={() => setIsVisibilitySheetOpen(true)}>
              <List className="mr-2 h-4 w-4" />
              Filter Management
            </Button>

            {/* Filter Button (Opens Drawer) */}
            <Button variant="outline" className="justify-start flex-1 md:flex-none shadow-lg" onClick={() => setIsFilterDrawerOpen(true)}>
              <FilterIcon className="mr-2 h-4 w-4" />
              Filter
              {hasActiveFilters && <span className="ml-1 text-xs text-primary">(Active)</span>}
            </Button>
            
            {/* Sort Select */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-full sm:w-[180px] shadow-lg">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
                <SelectItem value="name-desc">Name: Z-A</SelectItem>
              </SelectContent>
            </Select>
            
            {/* View/Grouping/Selection Controls (Desktop Only) */}
            <AnimatePresence>
              {!isMobile && (
                <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex items-center gap-2 overflow-visible">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="shadow-lg"><Group className="mr-2 h-4 w-4" />Group</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuRadioGroup value={grouping} onValueChange={(v) => setGrouping(v as GroupingType)}>
                        <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="category">By Category</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="type">By Type</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')} className="shadow-lg">
                    {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                  </Button>
                  {viewMode === 'grid' && (
                    <Button variant="outline" onClick={cycleGridSize} className="w-28 justify-start shadow-lg">
                      <LayoutGrid className="mr-2 h-4 w-4" />{sizeLabels[gridSize]}
                    </Button>
                  )}
                  {viewMode === 'grid' && (
                    <Button variant={isSelectionModeActive ? "secondary" : "outline"} onClick={toggleSelectionMode} className="shadow-lg">
                      <CheckSquare className="mr-2 h-4 w-4" />{isSelectionModeActive ? 'Cancel' : 'Select'}
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Sync Actions */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => runWithIntegrationCheck(() => setIsImporterOpen(true))} className="flex-1 md:flex-none shadow-lg">
              <Import className="mr-2 h-4 w-4" />Import
            </Button>
            {hasDoneFullSync === null ? <Skeleton className="h-10 w-32" /> : !hasDoneFullSync ? <Button onClick={() => handleSync('full')} disabled={isSyncing} className="flex-1 shadow-lg"><RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />Full Sync</Button> : <div className="flex items-center"><Button onClick={() => handleSync('quick')} disabled={isSyncing} className="rounded-r-none flex-1 shadow-lg"><RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />Quick Sync</Button><DropdownMenu><DropdownMenuTrigger asChild><Button disabled={isSyncing} className="rounded-l-none px-2 border-l border-primary-foreground/20 shadow-lg"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleSync('full')} disabled={isSyncing}>Run Full Sync</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>}
          </div>
        </div>

        {/* Product List/Grid */}
        {isProductDataLoading ? (currentView === 'grid' ? <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", gridSizeClasses[gridSize])}>{Array.from({ length: 12 }).map((_, i) => <div key={i} className="space-y-2"><Skeleton className="aspect-square w-full rounded-lg" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>)}</div> : <div className="p-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>) : Object.keys(groupedProducts).length > 0 ? (currentView === 'grid' ? <div className="space-y-8">{Object.entries(groupedProducts).map(([groupName, products]) => (<div key={groupName}><div className="flex items-center gap-4 mb-4"><h2 className={cn("text-xl font-bold capitalize inline-block", settings.backgroundImageUrl && "bg-card/60 backdrop-blur-[20px] px-3 py-1 rounded-md")}>{groupName} ({products.length})</h2>{grouping === 'category' && products.length > 0 && (<Button variant="outline" size="sm" onClick={() => handleSelectAllInGroup(products)}><CheckSquare className="mr-2 h-4 w-4" />{products.every(p => selectedProducts.includes(p.id)) ? 'Deselect All' : 'Select All'}</Button>)}</div><motion.div variants={containerVariants} initial="hidden" animate="visible" className={cn("grid grid-cols-2 md:grid-cols-3 gap-4 items-stretch", gridSizeClasses[gridSize])}>{products.map((product) => <motion.div key={product.id} variants={itemVariants} className="h-full"><ProductCard product={product} gridSize={gridSize} isSelected={selectedProducts.includes(product.id)} isSelectionModeActive={isSelectionModeActive || selectedProducts.length > 0} onSelect={handleSelectProduct} onEdit={setSelectedProduct} onStatusChange={handleStatusChange} /></motion.div>)}</motion.div></div>))}</div> : <Card><CardContent className="p-0"><ProductTableView products={filteredAndSortedProducts} selectedProducts={selectedProducts} onSelectAll={(checked) => setSelectedProducts(checked ? filteredAndSortedProducts.map(p => p.id) : [])} onSelectOne={handleSelectProduct} onEdit={setSelectedProduct} onDelete={handleBulkDelete} /></CardContent></Card>) : <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg"><h3 className="lg:text-lg font-semibold">No Products Found</h3><p className="text-sm mt-1">Try adjusting your search or filters, or import from Instagram.</p></div>}
      <AnimatePresence>
        {selectedProducts.length > 0 && <BulkActionsToolbar selectedCount={selectedProducts.length} onClear={() => { setSelectedProducts([]); setIsSelectionModeActive(false); }} onSetStatus={handleBulkStatusChange} onDelete={() => setBulkDeleteConfirm(true)} onAddSale={() => setIsSaleModalOpen(true)} />}</AnimatePresence>
    </>
  );
};

export default Products;