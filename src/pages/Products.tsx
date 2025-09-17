import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, RefreshCw, Import, MoreHorizontal } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { InstagramPostModal } from "@/components/InstagramPostModal";
import { ProductDetailModal } from "@/components/ProductDetailModal";

interface Product {
  id: string;
  name: string;
  status: string;
  price: number;
  inventory: number;
  media_url: string;
  caption: string;
  category: string;
  features: string[];
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  const handleProductUpdate = () => {
    fetchProducts();
    // The modal will close itself on delete, but stay open on other updates.
    // We refetch to ensure both the table and the modal have the latest data.
    if (selectedProduct) {
      supabase.from('products').select('*').eq('id', selectedProduct.id).single().then(({data}) => {
        setSelectedProduct(data as Product);
      });
    }
  };

  return (
    <>
      {isImporterOpen && <InstagramPostModal onClose={() => setIsImporterOpen(false)} onImport={fetchProducts} />}
      <ProductDetailModal 
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onUpdate={handleProductUpdate}
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Products</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImporterOpen(true)}>
              <Import className="mr-2 h-4 w-4" />
              Import from Instagram
            </Button>
            <Button onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Background Sync'}
            </Button>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Product Catalog</CardTitle>
            <CardDescription>
              Click a product to view and edit its details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length > 0 ? products.map((product) => (
                    <TableRow key={product.id} onClick={() => setSelectedProduct(product)} className="cursor-pointer">
                      <TableCell>
                        <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${product.price ? product.price.toFixed(2) : 'N/A'}</TableCell>
                      <TableCell>{product.inventory} in stock</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setSelectedProduct(product)}>View & Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No products found. Import from Instagram to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Products;