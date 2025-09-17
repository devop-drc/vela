import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw, Import } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { InstagramPostModal } from "@/components/InstagramPostModal";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { ProductCard } from "@/components/ProductCard";
import { ProductToolbar } from "@/components/ProductToolbar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft';
  price: number;
  inventory: number;
  media_url: string;
  caption: string;
  category: string;
  features: string[];
  pricing_type: 'one_time' | 'subscription';
  billing_interval: 'month' | 'year' | null;
  created_at: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order('created_at', { ascending: false });

    if (error) {
      showError("Could not fetch your product catalog.");
      console.error(error);
    } else {
      setProducts(data as Product[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (searchParams.get("instagram_connected") === "true") {
      showSuccess("Successfully connected! Opening importer...");
      setIsImporterOpen(true);
      searchParams.delete("instagram_connected");
      setSearchParams(searchParams, { replace: true });
    }
    fetchProducts();
  }, [fetchProducts, searchParams, setSearchParams]);

  const handleSync = async () => {
    setIsSyncing(true);
    const toastId = showLoading("Starting background sync with AI... This may take a moment.");
    try {
      const { data, error } = await supabase.functions.invoke('instagram-product-processor');
      
      dismissToast(toastId);

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      showSuccess(data.message || "Sync complete!");
      await fetchProducts();
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "An unknown error occurred during sync.");
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProductUpdate = useCallback(() => {
    fetchProducts();
    if (selectedProduct) {
      supabase.from('products').select('*').eq('id', selectedProduct.id).single().then(({ data }) => {
        if (data) setSelectedProduct(data as Product);
        else setSelectedProduct(null);
      });
    }
  }, [fetchProducts, selectedProduct]);

  const handleStatusChange = async (productId: string, newStatus: 'Active' | 'Draft') => {
    const originalProducts = [...products];
    const updatedProducts = products.map(p => p.id === productId ? { ...p, status: newStatus } : p);
    setProducts(updatedProducts);

    const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', productId);
    if (error) {
      showError(`Failed to update status: ${error.message}`);
      setProducts(originalProducts);
    } else {
      showSuccess(`Product is now ${newStatus.toLowerCase()}.`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    const { error } = await supabase.from('products').delete().eq('id', productToDelete);
    if (error) {
      showError(`Failed to delete product: ${error.message}`);
    } else {
      showSuccess("Product deleted.");
      fetchProducts();
    }
    setProductToDelete(null);
  };

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(product.status);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'price-asc': return (a.price || 0) - (b.price || 0);
          case 'price-desc': return (b.price || 0) - (a.price || 0);
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
          case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'newest':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
  }, [products, searchTerm, statusFilter, sortOption]);

  return (
    <>
      {isImporterOpen && <InstagramPostModal onClose={() => setIsImporterOpen(false)} onImport={fetchProducts} />}
      <ProductDetailModal 
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onUpdate={handleProductUpdate}
      />
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the product.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold self-start">Products</h1>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => setIsImporterOpen(true)} className="flex-1 md:flex-none">
              <Import className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleSync} disabled={isSyncing} className="flex-1 md:flex-none">
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button className="flex-1 md:flex-none">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        <ProductToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortOption={sortOption}
          onSortChange={setSortOption}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[350px] w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={setSelectedProduct}
                onDelete={setProductToDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
        {!isLoading && filteredAndSortedProducts.length === 0 && (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-semibold">No Products Found</h3>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Products;