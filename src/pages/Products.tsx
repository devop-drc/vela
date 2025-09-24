import { Button } from "@/components/ui/button";
import { RefreshCw, Import, ChevronDown, LayoutGrid, List, CheckSquare, Group } from "lucide-react";
import { useEffect, useState, useMemo, useCallback } from "react";
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
import { Search, ListFilter } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIntegration } from "@/contexts/IntegrationContext";
import { toast } from "sonner";
import { useSync } from "@/contexts/SyncContext";
import { Session } from "@supabase/supabase-js";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';
type GridSizeType = 'sm' | 'md' | 'lg';
type GroupingType = 'none' | 'category';

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
  details: any;
}

const gridSizeClasses: { [key: string]: string } = {
  sm: "lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
  md: "lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
  lg: "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
};

const sizeCycle: GridSizeType[] = ['sm', 'md', 'lg'];
const sizeLabels: { [key in GridSizeType]: string } = { sm: 'Small', md: 'Medium', lg: 'Large' };

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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [hasDoneFullSync, setHasDoneFullSync] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [gridSize, setGridSize] = useState<GridSizeType>('md');
  const [grouping, setGrouping] = useState<GroupingType>('none');

  useEffect(() => { setTitle("Products"); }, [setTitle]);

  const fetchProducts = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      showError("Could not fetch your product catalog.");
    } else if (data) {
      setProducts(data as Product[]);
    }
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (searchParams.get("instagram_connected") === "true") {
      showSuccess("Successfully connected! Opening importer...");
      setIsImporterOpen(true);
      searchParams.delete("instagram_connected");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const userId = session?.user?.id;

    if (!userId) {
      setIsLoading(false);
      setProducts([]);
      setHasDoneFullSync(null);
      return;
    }

    setIsLoading(true);
    fetchProducts();

    supabase.from('businesses').select('last_full_sync_at').eq('user_id', userId).single()
      .then(({ data }) => {
        setHasDoneFullSync(!!data?.last_full_sync_at);
      });

    const channel = supabase
      .channel(`products:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, fetchProducts]);

  const handleSync = async (syncType: 'quick' | 'full') => {
    runWithIntegrationCheck(async () => {
      toast.loading("Initiating sync job...", { id: 'sync-initiating' });
      try {
        const { data, error } = await supabase.functions.invoke('background-sync', {
          body: { syncType },
        });
        toast.dismiss('sync-initiating');
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        if (data.jobId) {
          await startNewSync(data.jobId);
        }
      } catch (err: any) {
        toast.dismiss('sync-initiating');
        showError(err.message || `Failed to start ${syncType} sync.`);
      }
    });
  };

  const handleStatusChange = async (productId: string, newStatus: ProductStatus) => {
    const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', productId);
    if (error) { showError(`Failed to update status: ${error.message}`); } 
    else { showSuccess(`Product is now ${newStatus.toLowerCase()}.`); }
  };

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (statusFilter.length === 0 || statusFilter.includes(p.status)))
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
  }, [products, searchTerm, statusFilter, sortOption]);

  const groupedProducts = useMemo(() => {
    if (grouping === 'none') {
      return { 'All Products': filteredAndSortedProducts };
    }
    return filteredAndSortedProducts.reduce((acc, product) => {
      const key = product.category || 'Uncategorized';
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    }, {} as { [key: string]: Product[] });
  }, [grouping, filteredAndSortedProducts]);

  const handleSelectProduct = (productId: string) => setSelectedProducts(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  const handleBulkStatusChange = async (status: ProductStatus) => {
    const { error } = await supabase.from('products').update({ status }).in('id', selectedProducts);
    if (error) { showError(`Failed to update products: ${error.message}`); } 
    else { showSuccess(`Successfully updated ${selectedProducts.length} products.`); setSelectedProducts([]); }
  };
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
  const toggleSelectionMode = () => {
    setIsSelectionModeActive(prev => !prev);
    if (isSelectionModeActive) setSelectedProducts([]);
  };
  const cycleGridSize = () => setGridSize(prev => sizeCycle[(sizeCycle.indexOf(prev) + 1) % sizeCycle.length]);
  const handleStatusFilterChange = (status: string) => setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);

  const currentView = isMobile ? 'grid' : viewMode;

  return (
    <>
      {isImporterOpen && <InstagramPostModal onClose={() => setIsImporterOpen(false)} onImport={fetchProducts} />}
      <ProductEditor isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct} onUpdate={fetchProducts} />
      {isSaleModalOpen && <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onApply={handleApplySale} productCount={selectedProducts.length} />}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedProducts.length} products?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="relative w-full sm:w-auto sm:flex-1 md:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="justify-start"><ListFilter className="mr-2 h-4 w-4" />Filter</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Filter by Status</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuCheckboxItem checked={statusFilter.includes('Active')} onCheckedChange={() => handleStatusFilterChange('Active')}>Active</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={statusFilter.includes('Draft')} onCheckedChange={() => handleStatusFilterChange('Draft')}>Draft</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={statusFilter.includes('Out of Stock')} onCheckedChange={() => handleStatusFilterChange('Out of Stock')}>Out of Stock</DropdownMenuCheckboxItem></DropdownMenuContent></DropdownMenu>
            <Select value={sortOption} onValueChange={setSortOption}><SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="price-asc">Price: Low to High</SelectItem><SelectItem value="price-desc">Price: High to Low</SelectItem><SelectItem value="name-asc">Name: A-Z</SelectItem><SelectItem value="name-desc">Name: Z-A</SelectItem></SelectContent></Select>
            <AnimatePresence>
            {!isMobile && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="flex items-center gap-2 overflow-hidden">
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Group className="mr-2 h-4 w-4" />Group</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuRadioGroup value={grouping} onValueChange={(v) => setGrouping(v as GroupingType)}><DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem><DropdownMenuRadioItem value="category">By Category</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
                <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}>{viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</Button>
                {viewMode === 'grid' && <Button variant="outline" onClick={cycleGridSize} className="w-28 justify-start"><LayoutGrid className="mr-2 h-4 w-4" />{sizeLabels[gridSize]}</Button>}
                {viewMode === 'grid' && <Button variant={isSelectionModeActive ? "secondary" : "outline"} onClick={toggleSelectionMode}><CheckSquare className="mr-2 h-4 w-4" />{isSelectionModeActive ? 'Cancel' : 'Select'}</Button>}
              </motion.div>
            )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => runWithIntegrationCheck(() => setIsImporterOpen(true))} className="flex-1 md:flex-none"><Import className="mr-2 h-4 w-4" />Import</Button>
            {hasDoneFullSync === null ? <Skeleton className="h-10 w-32" /> : !hasDoneFullSync ? <Button onClick={() => handleSync('full')} disabled={isSyncing} className="flex-1"><RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />Full Sync</Button> : <div className="flex items-center"><Button onClick={() => handleSync('quick')} disabled={isSyncing} className="rounded-r-none flex-1"><RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />Quick Sync</Button><DropdownMenu><DropdownMenuTrigger asChild><Button disabled={isSyncing} className="rounded-l-none px-2 border-l border-primary-foreground/20"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleSync('full')} disabled={isSyncing}>Run Full Sync</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>}
          </div>
        </div>

        {isLoading ? <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", gridSizeClasses[gridSize])}>{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-[340px] w-full rounded-lg" />)}</div> : Object.keys(groupedProducts).length > 0 ? (currentView === 'grid' ? <div className="space-y-8">{Object.entries(groupedProducts).map(([groupName, products]) => (<div key={groupName}><h2 className="text-xl font-bold mb-4 capitalize">{groupName} ({products.length})</h2><motion.div variants={containerVariants} initial="hidden" animate="visible" className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", gridSizeClasses[gridSize])}>{products.map((product) => <motion.div key={product.id} variants={itemVariants}><ProductCard product={product} gridSize={gridSize} isSelected={selectedProducts.includes(product.id)} isSelectionModeActive={isSelectionModeActive || selectedProducts.length > 0} onSelect={handleSelectProduct} onEdit={setSelectedProduct} onStatusChange={handleStatusChange} /></motion.div>)}</motion.div></div>))}</div> : <Card><CardContent className="p-0"><ProductTableView products={filteredAndSortedProducts} selectedProducts={selectedProducts} onSelectAll={(checked) => setSelectedProducts(checked ? filteredAndSortedProducts.map(p => p.id) : [])} onSelectOne={handleSelectProduct} onEdit={setSelectedProduct} onDelete={(id) => {}} onStatusChange={handleStatusChange} /></CardContent></Card>) : <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg"><h3 className="text-lg font-semibold">No Products Found</h3><p className="text-sm mt-1">Try adjusting your search or filters, or import from Instagram.</p></div>}
      </div>
      <AnimatePresence>{selectedProducts.length > 0 && <BulkActionsToolbar selectedCount={selectedProducts.length} onClear={() => { setSelectedProducts([]); setIsSelectionModeActive(false); }} onSetStatus={handleBulkStatusChange} onDelete={() => setBulkDeleteConfirm(true)} onAddSale={() => setIsSaleModalOpen(true)} />}</AnimatePresence>
    </>
  );
};

export default Products;