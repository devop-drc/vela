import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/BrandButton";
import { RefreshCw, Import, ChevronDown, LayoutGrid, List, CheckSquare, Group, Filter as FilterIcon, Settings2, Plus, AlertTriangle, X } from "lucide-react"; // Renamed Filter to FilterIcon
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearCache as clearPageCache } from "@/lib/pageCache";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess, toFriendlyError } from "@/utils/toast";
import { deleteProductMedia } from "@/lib/productCleanup";
import { InstagramPostModal } from "@/components/InstagramPostModal";
import { ProductEditor } from "@/components/ProductEditor";
import { ProductCard } from "@/components/ProductCard";
import { ProductTableView } from "@/components/ProductTableView";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { BulkActionsToolbar } from "@/components/BulkActionsToolbar";
import { AnimatePresence } from "framer-motion";
import { SaleModal, SaleFormData } from "@/components/SaleModal";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { CommandBar, SearchInput, EmptyState } from "@/components/ui-app";
import { useReveal, STAGGER } from "@/lib/anim";
import { productStatusTone, toneDotBg } from "@/lib/status";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from "@/contexts/IntegrationContext";
import { toast } from "sonner";
import { useSync } from "@/hooks/useSync";
import { useAuth } from "@/contexts/AuthContext";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useShop } from "@/contexts/ShopContext";
import { useProductData } from "@/hooks/useProductData"; // Import useProductData
import { useProductFilters } from "@/hooks/useProductFilters"; // Import useProductFilters
import { ProductFilterDrawer } from "@/components/dashboard/ProductFilterDrawer"; // Import new drawer
import { ProductFilterPanel } from "@/components/products/ProductFilterPanel"; // Import inline filter panel
import { FilterVisibilityModal } from "@/components/filters/FilterVisibilityModal";
import { CORE_FILTER_KEYS, deriveAttributeKeys, isFilterVisible } from "@/components/filters/filterVisibility";
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

// Target-width auto-fill columns: cards hold a consistent size per detail
// level and the column count grows automatically with the viewport (so they
// never balloon on ultrawide) while adapting to the filter-rail width. The 3
// sizes set the card's target min-width (Less Detail → More Detail → Large).
// Mobile stays a fixed 2-up.
const gridSizeClasses: { [key: string]: string } = {
  sm: "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]",
  md: "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]",
  lg: "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(330px,1fr))]",
};

const sizeLabels: { [key in GridSizeType]: string } = { sm: 'Less Detail', md: 'More Detail', lg: 'Large' };
const sizeCycle: GridSizeType[] = ['sm', 'md', 'lg'];

/** A stat that doubles as a status filter — count + label, active when its
    status is in the current filter (or, for "All", when no status is set). */
const StatusPill = ({ active, dot, count, label, onClick }: { active: boolean; dot?: string; count: number; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors",
      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-accent",
    )}
  >
    {dot ? <span className={cn("h-2 w-2 rounded-full", dot)} /> : <Package className="h-3.5 w-3.5 text-muted-foreground" />}
    <span className="font-semibold tabular-nums">{count}</span>
    <span className="opacity-70">{label}</span>
  </button>
);

const Products = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const { runWithIntegrationCheck } = useIntegration();
  const { isSyncing, startNewSync } = useSync();
  const { settings } = useAppearance();
  // Resolved once by the shared AuthProvider — no per-call getUser() waterfall.
  const { userId } = useAuth();
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;
  // Latest business-sync refresher, called by useProductData's products channel
  // on INSERT/DELETE bursts (so we don't open a second products subscription).
  const refreshBizSyncRef = useRef<(() => void) | null>(null);
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
    invalidateStorefrontCache();
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
  const [isBulkActivating, setIsBulkActivating] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [gridSize, setGridSize] = useState<GridSizeType>('md');
  const [grouping, setGrouping] = useState<GroupingType>('none');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false); // New state for filter drawer (mobile)
  const [showFilters, setShowFilters] = useState(!isMobile); // Inline filter panel (desktop default true)
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  // Which filter groups the Products page shows (panel + drawer). Sparse map:
  // missing key = visible; persisted so it survives reloads.
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('products_filter_visibility') || '{}'); } catch { return {}; }
  });

  const { shopDetails } = useShop();

  // Product edits change what the public storefront shows — drop its per-slug
  // snapshot (24h TTL) so the merchant's next storefront visit repaints fresh
  // data instead of the stale cache. Same invalidation ShopContext performs on
  // shop-details saves. Call from every mutation success path.
  const invalidateStorefrontCache = () => {
    if (shopDetails?.slug) clearPageCache(`storefront:${shopDetails.slug}`);
  };

  // Use Product Data Hook
  const {
    allProducts,
    allCategories,
    allTags,
    allDetailsAttributes,
    maxPrice,
    isLoading: isProductDataLoading,
    error: productError,
    refetch,
    updateProduct,
  } = useProductData({ onProductsMutated: () => refreshBizSyncRef.current?.() });

  // Use Product Filters Hook
  const {
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    statusFilter,
    handleToggleStatusFilter,
    ratingFilter,
    handleSetRatingFilter,
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

  // Canonical filter-group key order: core groups, then options, then specs.
  // Drives both the visibility modal and the mobile drawer's section order.
  const allFilterKeys = useMemo(() => {
    const { options, specs } = deriveAttributeKeys(allDetailsAttributes, allProducts);
    const core = CORE_FILTER_KEYS.filter((k) => {
      if (k === 'categories') return allCategories.length > 0;
      if (k === 'tags') return allTags.length > 0;
      return true;
    });
    return [...core, ...options, ...specs];
  }, [allCategories, allTags, allDetailsAttributes, allProducts]);

  // Visible keys in canonical order — the mobile filter drawer renders these.
  const visibleFilterKeys = useMemo(
    () => allFilterKeys.filter((k) => isFilterVisible(visibilityMap, k)),
    [allFilterKeys, visibilityMap]
  );

  const setVisibility = (key: string, val: boolean) => {
    setVisibilityMap(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem('products_filter_visibility', JSON.stringify(next));
      return next;
    });
  };

  const setManyVisibility = (keys: string[], val: boolean) => {
    setVisibilityMap(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = val; });
      localStorage.setItem('products_filter_visibility', JSON.stringify(next));
      return next;
    });
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
    const uid = userIdRef.current;
    if (!uid) {
      setHasDoneFullSync(null);
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('id, last_full_sync_at')
      .eq('user_id', uid)
      .single();

    if (businessError) {
      console.error("Error fetching business data:", businessError);
      setHasDoneFullSync(false);
    } else {
      setHasDoneFullSync(!!businessData?.last_full_sync_at);
    }
  };
  // Keep the ref pointed at the latest fetcher so useProductData's products
  // channel (folded here — no second subscription) refreshes sync status.
  refreshBizSyncRef.current = fetchBusinessDataForSyncStatus;

  useEffect(() => {
    if (userId) fetchBusinessDataForSyncStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (selectedProduct) {
      const updatedProductInList = allProducts.find(p => p.id === selectedProduct.id);
      if (updatedProductInList && JSON.stringify(updatedProductInList) !== JSON.stringify(selectedProduct)) {
        setSelectedProduct(updatedProductInList);
      }
    }
  }, [allProducts, selectedProduct]);

  // Fix for crash after deletion: Clear selectedProduct if it no longer exists
  // in allProducts. A freshly-created product is exempt — its row isn't in
  // allProducts until the refetch lands, and this used to slam the editor shut
  // the instant "Add Product" opened it.
  useEffect(() => {
    if (selectedProduct && !isNewProduct && !allProducts.some(p => p.id === selectedProduct.id)) {
      setSelectedProduct(null);
    }
  }, [allProducts, selectedProduct, isNewProduct]);


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
          const uid = userIdRef.current;
          if (uid) {
            supabase.from('businesses').update({ last_full_sync_at: new Date().toISOString() }).eq('user_id', uid)
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
    } else {
      invalidateStorefrontCache();
    }
  };

  const handleBulkStatusChange = async (status: ProductStatus) => {
    // Optimistic update
    selectedProducts.forEach(id => updateProduct(id, { status }));
    const count = selectedProducts.length;
    setSelectedProducts([]);
    const { error } = await supabase.from('products').update({ status }).in('id', selectedProducts);
    if (error) { showError(`Failed to update products: ${error.message}`); refetch(); }
    else { invalidateStorefrontCache(); showSuccess(`Updated ${count} products.`); }
  };
  // Shared deletion used by both the bulk action and the single-row trash button.
  // Removes the product, its related rows (options/variants/specs/reviews via
  // FK cascade — orders and history are preserved), its AI cache entries, and
  // its media files in storage.
  const deleteProductsByIds = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data: productsToDelete, error: fetchError } = await supabase
      .from('products')
      .select('id, instagram_post_id, media_url, thumbnail_url, media_gallery')
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
      // Storage cleanup after the rows are gone (best-effort, never blocks).
      deleteProductMedia(productsToDelete || []);
      invalidateStorefrontCache();
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
      else { invalidateStorefrontCache(); showSuccess(`Sale applied to ${updates.length} products.`); }
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

  // Subtle staggered entrance for the card grid (GSAP, reduced-motion aware).
  // Replaces the old uncapped framer stagger + per-card layout animation. The
  // per-item delay is capped so a large catalog still finishes in ~0.6s, and it
  // only replays on mount / grouping / card-size change — not on every filter
  // keystroke — so filtering no longer reflow-animates the whole grid.
  const gridRevealRef = useReveal<HTMLDivElement>(
    { stagger: Math.min(STAGGER.base, 0.6 / Math.max(filteredAndSortedProducts.length, 1)) },
    [grouping, gridSize, isProductDataLoading],
  );

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
        onUpdate={() => { newProductSaved.current = true; invalidateStorefrontCache(); }}
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
        ratingFilter={ratingFilter}
        handleSetRatingFilter={handleSetRatingFilter}
        drawerKeys={visibleFilterKeys}
      />

      {/* Filter visibility modal — controls which groups this page's filter panel shows */}
      <FilterVisibilityModal
        open={isVisibilityModalOpen}
        onOpenChange={setIsVisibilityModalOpen}
        description={t("products.filter_visibility_hint", "Choose which filters are available on this page.")}
        allCategories={allCategories}
        allTags={allTags}
        allDetailsAttributes={allDetailsAttributes}
        allProducts={allProducts}
        visibilityMap={visibilityMap}
        onToggle={setVisibility}
        onSetMany={setManyVisibility}
      />

      {/* ── Command bar ── */}
      <div data-tour="products-toolbar" className="mb-3">
        <CommandBar>
          {/* Search */}
          <SearchInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder={t("products.search_placeholder", "Search products…")}
            containerClassName="h-10 min-w-[200px] flex-1"
          />

          {/* Primary: Add Product */}
          <Button data-tour="add-product" className="h-10 shadow-sm" onClick={handleAddProduct} disabled={isCreatingProduct}>
            {isCreatingProduct ? <Spinner className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            <span className="hidden sm:inline">{t("products.add_product", "Add Product")}</span>
          </Button>

          {/* Sync */}
          {hasDoneFullSync === null ? (
            <Skeleton className="h-10 w-28" />
          ) : !hasDoneFullSync ? (
            <Button onClick={() => handleSync('full')} disabled={isSyncing} className="h-10 border-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90" title={t("products.full_sync_hint")}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
              {t("products.full_sync")}
            </Button>
          ) : (
            <div className="flex items-center">
              <Button onClick={() => handleSync('quick')} disabled={isSyncing} variant="outline" className="h-10 rounded-r-none border-primary/40 text-primary shadow-sm hover:border-primary hover:bg-primary/10" title={t("products.quick_sync_hint")}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                <span className="hidden sm:inline">{t("dashboard.quick_sync")}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={isSyncing} variant="outline" className="h-10 rounded-l-none border-l-0 border-primary/40 px-2 text-primary shadow-sm hover:bg-primary/10">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-w-[260px]">
                  <DropdownMenuItem onClick={() => handleSync('full')} disabled={isSyncing} className="flex-col items-start gap-0.5">
                    <span className="font-medium">{t("products.run_full_sync")}</span>
                    <span className="whitespace-normal text-xs text-muted-foreground">{t("products.full_sync_hint")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Import */}
          <Button onClick={() => runWithIntegrationCheck(() => setIsImporterOpen(true))} variant="outline" className="h-10 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            <span className="hidden md:inline">{t("products.import")}</span>
          </Button>
        </CommandBar>
      </div>

      {/* ── Status pills (also quick status filters) + view toggle ── */}
      {!isProductDataLoading && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusPill active={statusFilter.length === 0} count={statsTotal} label={t("products.total")} onClick={() => handleClearSection('status')} />
          <StatusPill active={statusFilter.includes('Active')} dot={toneDotBg[productStatusTone('Active')]} count={statsActive} label={t("common.active")} onClick={() => handleToggleStatusFilter('Active')} />
          <StatusPill active={statusFilter.includes('Draft')} dot={toneDotBg[productStatusTone('Draft')]} count={statsDraft} label={t("common.draft")} onClick={() => handleToggleStatusFilter('Draft')} />
          <StatusPill active={statusFilter.includes('Out of Stock')} dot={toneDotBg[productStatusTone('Out of Stock')]} count={statsOos} label={t("common.out_of_stock")} onClick={() => handleToggleStatusFilter('Out of Stock')} />
          {!isMobile && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Sort */}
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-9 w-[150px] shadow-sm"><SelectValue placeholder={t("common.sort")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("products.newest")}</SelectItem>
                  <SelectItem value="oldest">{t("products.oldest")}</SelectItem>
                  <SelectItem value="price-asc">{t("products.price_low_high")}</SelectItem>
                  <SelectItem value="price-desc">{t("products.price_high_low")}</SelectItem>
                  <SelectItem value="name-asc">{t("products.name_az")}</SelectItem>
                  <SelectItem value="name-desc">{t("products.name_za")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Group */}
              <Select value={grouping} onValueChange={(v) => setGrouping(v as GroupingType)}>
                <SelectTrigger className="h-9 w-[150px] shadow-sm">
                  <Group className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("products.no_grouping", "No grouping")}</SelectItem>
                  <SelectItem value="category">{t("products.by_category")}</SelectItem>
                  <SelectItem value="type">{t("products.by_type")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Card size (grid only) */}
              {viewMode === 'grid' && (
                <Button variant="outline" size="sm" className="h-9 w-28 justify-start shadow-sm" onClick={cycleGridSize} title={t("products.card_size", "Card size")}>
                  <LayoutGrid className="mr-2 h-4 w-4" />{sizeLabels[gridSize]}
                </Button>
              )}

              {/* Filters toggle */}
              <Button variant={showFilters ? "secondary" : "outline"} size="sm" className="h-9 shadow-sm" onClick={() => { if (isMobile) setIsFilterDrawerOpen(true); else setShowFilters((v) => !v); }}>
                <FilterIcon className="mr-2 h-4 w-4" />{t("common.filters")}
                {hasActiveFilters && <span className="ml-1 text-xs text-primary">({t("common.active")})</span>}
              </Button>

              {/* Multi-select mode (grid only) */}
              {viewMode === 'grid' && (
                <Button variant={isSelectionModeActive ? "secondary" : "outline"} size="sm" className="h-9 shadow-sm" onClick={toggleSelectionMode}>
                  <CheckSquare className="mr-2 h-4 w-4" />{isSelectionModeActive ? t('common.cancel') : t('products.select')}
                </Button>
              )}

              {/* Filter visibility config for this page */}
              <Button variant="outline" size="icon" className="h-9 w-9 shadow-sm" onClick={() => setIsVisibilityModalOpen(true)} title={t("products.filter_management")}>
                <Settings2 className="h-4 w-4" />
              </Button>

              {/* Grid / Table toggle */}
              <div className="flex items-center rounded-lg border border-border bg-muted/60 p-0.5 shadow-sm">
                <button type="button" onClick={() => setViewMode('grid')} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-150", viewMode === 'grid' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} aria-label="Grid view">
                  <LayoutGrid className="h-4 w-4" /><span className="hidden xl:inline">{t("products.grid")}</span>
                </button>
                <button type="button" onClick={() => setViewMode('table')} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-150", viewMode === 'table' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")} aria-label="Table view">
                  <List className="h-4 w-4" /><span className="hidden xl:inline">{t("products.table")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile control strip — the desktop cluster above doesn't fit, but the
          controls themselves must stay available: horizontal scroll row. */}
      {!isProductDataLoading && isMobile && (
        <div className="-mx-4 mb-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="h-9 w-auto shrink-0 gap-1.5 shadow-sm"><SelectValue placeholder={t("common.sort")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("products.newest")}</SelectItem>
              <SelectItem value="oldest">{t("products.oldest")}</SelectItem>
              <SelectItem value="price-asc">{t("products.price_low_high")}</SelectItem>
              <SelectItem value="price-desc">{t("products.price_high_low")}</SelectItem>
              <SelectItem value="name-asc">{t("products.name_az")}</SelectItem>
              <SelectItem value="name-desc">{t("products.name_za")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={grouping} onValueChange={(v) => setGrouping(v as GroupingType)}>
            <SelectTrigger className="h-9 w-auto shrink-0 gap-1.5 shadow-sm">
              <Group className="h-4 w-4 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("products.no_grouping", "No grouping")}</SelectItem>
              <SelectItem value="category">{t("products.by_category")}</SelectItem>
              <SelectItem value="type">{t("products.by_type")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 shrink-0 shadow-sm" onClick={cycleGridSize}>
            <LayoutGrid className="mr-1.5 h-4 w-4" />{sizeLabels[gridSize]}
          </Button>
          <Button variant={hasActiveFilters ? "secondary" : "outline"} size="sm" className="h-9 shrink-0 shadow-sm" onClick={() => setIsFilterDrawerOpen(true)}>
            <FilterIcon className="mr-1.5 h-4 w-4" />{t("common.filters")}
          </Button>
          <Button variant={isSelectionModeActive ? "secondary" : "outline"} size="sm" className="h-9 shrink-0 shadow-sm" onClick={toggleSelectionMode}>
            <CheckSquare className="mr-1.5 h-4 w-4" />{isSelectionModeActive ? t('common.cancel') : t('products.select')}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 shadow-sm" onClick={() => setIsVisibilityModalOpen(true)} title={t("products.filter_management")}>
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Draft warning banner */}
      {!isProductDataLoading && statsDraft > 0 && statsActive === 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-sm text-warning">
            <b>{statsDraft === 1 ? '1 product is a draft' : `All ${statsDraft} products are drafts`}</b> — drafts don't appear on your storefront. Review them, or publish everything now.
          </p>
          <Button size="sm" className="shrink-0 bg-warning text-warning-foreground hover:bg-warning/90" disabled={isBulkActivating}
            onClick={async () => {
              setIsBulkActivating(true);
              const ids = allProducts.filter((p) => p.status === 'Draft').map((p) => p.id);
              const { error } = await supabase.from('products').update({ status: 'Active' }).in('id', ids);
              setIsBulkActivating(false);
              if (error) { showError("Couldn't publish the drafts — try again."); return; }
              invalidateStorefrontCache();
              showSuccess(`${ids.length} product${ids.length === 1 ? '' : 's'} published to your storefront.`);
              refetch();
            }}>
            {isBulkActivating ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
            Publish all drafts
          </Button>
        </div>
      )}

      {/* ── Filter rail + product content ── */}
      <div className="flex w-full gap-4">
        {!isMobile && showFilters && (
          <div className="sticky top-0 h-[calc(100vh-80px)] w-[260px] shrink-0">
            <ProductFilterPanel
              allCategories={allCategories}
              allTags={allTags}
              allDetailsAttributes={allDetailsAttributes}
              allProducts={allProducts}
              maxPrice={maxPrice}
              filters={filters}
              statusFilter={statusFilter}
              ratingFilter={ratingFilter}
              localPriceRange={localPriceRange}
              visibilityMap={visibilityMap}
              handleToggleFilter={handleToggleFilter}
              handleToggleStatusFilter={handleToggleStatusFilter}
              handleSetRatingFilter={handleSetRatingFilter}
              handleClearSection={handleClearSection}
              handleResetAllFilters={handleResetAllFilters}
              handlePriceRangeChange={handlePriceRangeChange}
              hasActiveFilters={hasActiveFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* View indicator */}
          {!isProductDataLoading && filteredAndSortedProducts.length > 0 && (
            <p className="mb-3 text-xs text-muted-foreground">
              {t("common.showing")} <span className="font-semibold text-foreground">{filteredAndSortedProducts.length}</span> {t("common.of")}{' '}
              <span className="font-semibold text-foreground">{statsTotal}</span> {t("nav.products").toLowerCase()}
              {hasActiveFilters && <span className="ml-1 text-primary">({t("products.filtered")})</span>}
            </p>
          )}

          {/* Product list/grid */}
          {isProductDataLoading ? (
            currentView === 'grid' ? (
              <div className={cn("grid gap-4", gridSizeClasses[gridSize])}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-square w-full rounded-lg" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 p-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )
          ) : filteredAndSortedProducts.length > 0 ? (
            currentView === 'grid' ? (
              <div ref={gridRevealRef} className="space-y-8">
                {Object.entries(groupedProducts).map(([groupName, products]) => (
                  <div key={groupName}>
                    <div className="mb-4 flex items-center gap-4">
                      <h2 className={cn("inline-block text-lg font-semibold capitalize", settings.backgroundImageUrl && "rounded-md bg-card/60 px-3 py-1 backdrop-blur-[20px]")}>
                        {groupName} <span className="text-muted-foreground">({products.length})</span>
                      </h2>
                      {grouping === 'category' && products.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => handleSelectAllInGroup(products)}>
                          <CheckSquare className="mr-2 h-4 w-4" />
                          {products.every((p) => selectedProducts.includes(p.id)) ? t('products.deselect_all') : t('products.select_all')}
                        </Button>
                      )}
                    </div>
                    <div className={cn("grid items-stretch gap-4", gridSizeClasses[gridSize])}>
                      {products.map((product) => (
                        <div key={product.id} data-reveal className="h-full">
                          <ProductCard
                            product={product}
                            gridSize={gridSize}
                            isSelected={selectedProducts.includes(product.id)}
                            isSelectionModeActive={isSelectionModeActive || selectedProducts.length > 0}
                            onSelect={handleSelectProduct}
                            onEdit={setSelectedProduct}
                            onStatusChange={handleStatusChange}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card data-tour="products-table">
                <CardContent className="p-0">
                  <ProductTableView
                    products={filteredAndSortedProducts}
                    selectedProducts={selectedProducts}
                    onSelectAll={(checked) => setSelectedProducts(checked ? filteredAndSortedProducts.map((p) => p.id) : [])}
                    onSelectOne={handleSelectProduct}
                    onEdit={setSelectedProduct}
                    onDelete={(id) => setDeleteTargetId(id)}
                  />
                </CardContent>
              </Card>
            )
          ) : (
            <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/[0.03] px-6">
              {productError ? (
                <EmptyState
                  icon={AlertTriangle}
                  title={t("products.load_error_title", "Couldn't load products")}
                  description={t("products.load_error_desc", "Something went wrong loading your products. Check your connection and try again.")}
                  action={
                    <Button variant="outline" onClick={() => refetch(true)}>
                      <RefreshCw className={cn("mr-2 h-4 w-4", isProductDataLoading && "animate-spin")} />
                      {t("common.try_again", "Try again")}
                    </Button>
                  }
                />
              ) : hasActiveFilters ? (
                <EmptyState
                  icon={Package}
                  title={t("products.no_match")}
                  description={t("products.no_match_desc")}
                  action={
                    <Button variant="outline" onClick={handleResetAllFilters}>
                      {t("common.clear_all")} {t("common.filters").toLowerCase()}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title={t("products.no_products")}
                  description={t("products.no_products_desc")}
                  action={
                    <>
                      <BrandButton onClick={handleAddProduct} disabled={isCreatingProduct} className="rounded-full">
                        {isCreatingProduct ? <Spinner className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                        {t("products.add_product", "Add Product")}
                      </BrandButton>
                      <Button onClick={() => runWithIntegrationCheck(() => setIsImporterOpen(true))} variant="outline" className="hover:border-primary/40 hover:bg-accent hover:text-foreground">
                        <Import className="mr-2 h-4 w-4" />
                        {t("products.import_instagram")}
                      </Button>
                      {hasDoneFullSync === false && (
                        <Button variant="outline" onClick={() => handleSync('full')} disabled={isSyncing} className="border-primary/40 text-primary hover:bg-primary/10">
                          <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                          {t("products.run_full_sync")}
                        </Button>
                      )}
                    </>
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>

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