import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, ListFilter, ArrowUpNarrowWide } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  media_url: string;
  created_at: string;
}

interface ProductSelectorProps {
  selectedProductIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClose: () => void;
}

export const ProductSelector = ({ selectedProductIds, onSelectionChange, onClose }: ProductSelectorProps) => {
  const { shopDetails, convertCurrency } = useShop();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedProductIds);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("products")
        .select("id, name, status, price, currency, media_url, created_at")
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setAllProducts(data as Product[]);
      }
      setIsLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    return allProducts
      .filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (statusFilter === "All" || p.status === statusFilter)
      )
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
  }, [allProducts, searchTerm, sortOption, statusFilter]);

  const handleSelectOne = useCallback((productId: string) => {
    setCurrentSelection(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setCurrentSelection(filteredAndSortedProducts.map(p => p.id));
    } else {
      setCurrentSelection([]);
    }
  }, [filteredAndSortedProducts]);

  const handleApply = () => {
    onSelectionChange(currentSelection);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <ListFilter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpNarrowWide className="mr-2 h-4 w-4" />
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-center text-muted-foreground">Loading products...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={currentSelection.length === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Select all products"
                  />
                </TableHead>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={currentSelection.includes(product.id)}
                        onCheckedChange={() => handleSelectOne(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <img src={product.media_url} alt={product.name} className="h-12 w-12 object-cover rounded-md" />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        product.status === 'Active' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                        product.status === 'Draft' && 'bg-amber-100 text-amber-800 border-amber-300',
                        product.status === 'Out of Stock' && 'bg-slate-100 text-slate-800 border-slate-300'
                      )}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.price != null ? (
                        formatCurrency(convertCurrency(product.price, product.currency), shopDetails?.currency)
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="p-4 border-t flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{currentSelection.length} products selected</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={currentSelection.length === 0}>Apply</Button>
        </div>
      </div>
    </div>
  );
};