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
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { SaleModal, SaleFormData } from "@/components/SaleModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BulkActionsToolbar } from "@/components/BulkActionsToolbar";
import { AnimatePresence } from "framer-motion";
import { showError, showSuccess } from "@/utils/toast";

type ProductStatus = 'Active' | 'Draft' | 'Out of Stock';

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  price: number | null;
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

const OutOfStock = () => {
  const { setTitle } = usePageTitle();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    setTitle("Out of Stock");
  }, [setTitle]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq('status', 'Out of Stock');

    if (error) {
      showError("Could not fetch out of stock products.");
    } else {
      setProducts(data as Product[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
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
  }, [products, searchTerm, sortOption]);

  const handleProductUpdate = useCallback(() => { fetchProducts(); }, [fetchProducts]);

  const handleBulkStatusChange = async (status: 'Active' | 'Draft') => {
    const { error } = await supabase.from('products').update({ status }).in('id', selectedProducts);
    if (error) { showError(`Failed to update products: ${error.message}`); } 
    else { showSuccess(`Successfully updated ${selectedProducts.length} products.`); setSelectedProducts([]); fetchProducts(); }
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

  return (
    <>
      <ProductDetailModal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct as any} onUpdate={handleProductUpdate} />
      {isSaleModalOpen && <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} onApply={handleApplySale} productCount={selectedProducts.length} />}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {selectedProducts.length} products?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
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
              <ProductTableView
                products={filteredAndSortedProducts as any}
                selectedProducts={selectedProducts}
                onSelectAll={(checked) => setSelectedProducts(checked ? filteredAndSortedProducts.map(p => p.id) : [])}
                onSelectOne={(id) => setSelectedProducts(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id])}
                onEdit={(p) => setSelectedProduct(p as any)}
                onDelete={(id) => { setSelectedProducts([id]); setBulkDeleteConfirm(true); }}
                onStatusChange={() => {}}
              />
            )}
          </CardContent>
        </Card>
      </div>
      <AnimatePresence>
        {selectedProducts.length > 0 && (
          <BulkActionsToolbar
            pageContext="out-of-stock"
            selectedCount={selectedProducts.length}
            onClear={() => setSelectedProducts([])}
            onSetStatus={handleBulkStatusChange as any}
            onDelete={() => setBulkDeleteConfirm(true)}
            onAddSale={() => setIsSaleModalOpen(true)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default OutOfStock;