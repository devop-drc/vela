import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, ListFilter, ArrowUpNarrowWide, Tag, DollarSign, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { getAttributeIcon } from "@/lib/attributeIcons";
import { motion, AnimatePresence } from "framer-motion";
import { debounce } from 'lodash';
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  name: string;
  status: 'Active' | 'Draft' | 'Out of Stock';
  price: number | null;
  currency: string | null;
  media_url: string;
  created_at: string;
  category: string;
  tags: string[];
  details: { [key: string]: any };
}

interface FilterState {
  categories: string[];
  tags: string[];
  priceRange: [number, number];
  [key: string]: string[] | [number, number];
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

  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allDetailsAttributes, setAllDetailsAttributes] = useState<{ name: string; values: string[] }[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    tags: [],
    priceRange: [0, 1000],
  });
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([0, 1000]);

  useEffect(() => {
    const fetchProductsAndMetadata = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const [productsRes, categoriesRes, typesRes] = await Promise.all([
        supabase.from("products").select("id, name, status, price, currency, media_url, created_at, category, tags, details").eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from("categories").select("name").eq('user_id', user.id),
        supabase.from("types").select("name, attributes").eq('user_id', user.id),
      ]);

      if (productsRes.error) { console.error("Error fetching products:", productsRes.error); }
      else { setAllProducts(productsRes.data as Product[]); }

      if (categoriesRes.error) { console.error("Error fetching categories:", categoriesRes.error); }
      else { setAllCategories(categoriesRes.data?.map(c => c.name) || []); }

      if (typesRes.error) { console.error("Error fetching types:", typesRes.error); }
      else {
        const uniqueAttributes = new Map<string, Set<string>>();
        typesRes.data?.forEach(type => {
          (type.attributes as any[] || []).forEach(attr => {
            if (!uniqueAttributes.has(attr.name)) {
              uniqueAttributes.set(attr.name, new Set<string>());
            }
            if (attr.possibleValues && Array.isArray(attr.possibleValues)) {
              attr.possibleValues.forEach((val: string) => uniqueAttributes.get(attr.name)?.add(val));
            }
          });
        });
        setAllDetailsAttributes(Array.from(uniqueAttributes.entries()).map(([name, values]) => ({ name, values: Array.from(values).sort() })));
      }

      const uniqueTags = new Set<string>();
      productsRes.data?.forEach(p => p.tags?.forEach(tag => uniqueTags.add(tag)));
      setAllTags(Array.from(uniqueTags).sort());

      setIsLoading(false);
    };
    fetchProductsAndMetadata();
  }, []);

  const maxPrice = useMemo(() => {
    let currentMax = 0;
    allProducts.forEach(p => {
      if (p.price !== null) {
        const convertedPrice = convertCurrency(p.price, p.currency);
        if (convertedPrice > currentMax) {
          currentMax = convertedPrice;
        }
      }
    });
    return Math.ceil(currentMax / 10) * 10 || 100;
  }, [allProducts, convertCurrency]);

  useEffect(() => {
    if (filters.priceRange[1] === 1000 && maxPrice !== 1000) {
      setFilters(prev => ({ ...prev, priceRange: [0, maxPrice] }));
      setLocalPriceRange([0, maxPrice]);
    }
  }, [maxPrice, filters.priceRange]);

  const debouncedPriceRangeChange = useMemo(
    () =>
      debounce((range: [number, number]) => {
        setFilters(prev => ({ ...prev, priceRange: range }));
      }, 100),
    [setFilters]
  );

  const handlePriceRangeChange = (range: [number, number]) => {
    setLocalPriceRange(range);
    debouncedPriceRangeChange(range);
  };

  const handleToggleFilter = (filterKey: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = (prev[filterKey] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues };
    });
  };

  const handleClearSection = (filterKey: keyof FilterState) => {
    setFilters(prev => {
      const updatedFilters = { ...prev, [filterKey]: filterKey === 'priceRange' ? [0, maxPrice] : [] };
      if (filterKey === 'priceRange') {
        setLocalPriceRange([0, maxPrice]);
      }
      return updatedFilters;
    });
  };

  const hasActiveFilters = useMemo(() => {
    return searchTerm || statusFilter !== 'All' || sortOption !== 'newest' ||
           filters.categories.length > 0 || filters.tags.length > 0 ||
           filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice ||
           Object.entries(filters).some(([key, value]) => key !== 'categories' && key !== 'tags' && key !== 'priceRange' && Array.isArray(value) && value.length > 0);
  }, [searchTerm, statusFilter, sortOption, filters, maxPrice]);

  const handleResetAllFilters = () => {
    setSearchTerm("");
    setSortOption("newest");
    setStatusFilter("All");
    setFilters({
      categories: [],
      tags: [],
      priceRange: [0, maxPrice],
    });
    setLocalPriceRange([0, maxPrice]);
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchTerm) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => p.category && filters.categories.includes(p.category));
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(p => p.tags?.some(tag => filters.tags.includes(tag)));
    }

    filtered = filtered.filter(p => {
      const price = convertCurrency(p.price, p.currency);
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    for (const key in filters) {
      if (key !== 'categories' && key !== 'tags' && key !== 'priceRange' && Array.isArray(filters[key]) && (filters[key] as string[]).length > 0) {
        const selectedValues = filters[key] as string[];
        filtered = filtered.filter(p => {
          const productDetailValue = p.details?.[key];
          if (!productDetailValue) return false;
          if (Array.isArray(productDetailValue)) {
            return productDetailValue.some(val => selectedValues.includes(String(val)));
          }
          return selectedValues.includes(String(productDetailValue));
        });
      }
    }

    return filtered.sort((a, b) => {
      const priceA = convertCurrency(a.price, a.currency);
      const priceB = convertCurrency(b.price, b.currency);

      switch (sortOption) {
        case 'price-asc': return priceA - priceB;
        case 'price-desc': return priceB - priceA;
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [allProducts, searchTerm, sortOption, statusFilter, filters, convertCurrency, maxPrice]);

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
      {/* Top Search/Sort Bar - Fixed */}
      <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10 h-10 px-3 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-10 px-3 py-2">
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
          <SelectTrigger className="w-[180px] h-10 px-3 py-2">
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

      {/* Filter Buttons Section - Fixed, but content wraps */}
      <div className="p-4 border-b flex flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3">
                <ListFilter className="mr-2 h-4 w-4" />
                Categories ({filters.categories.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allCategories.map(category => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={() => handleToggleFilter('categories', category)}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {filters.categories.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection('categories'); }}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3">
                <Tag className="mr-2 h-4 w-4" />
                Tags ({filters.tags.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allTags.map(tag => (
                <DropdownMenuCheckboxItem
                  key={tag}
                  checked={filters.tags.includes(tag)}
                  onCheckedChange={() => handleToggleFilter('tags', tag)}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {filters.tags.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection('tags'); }}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3">
                <DollarSign className="mr-2 h-4 w-4" />
                Price Range
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-4">
              <DropdownMenuLabel>Filter by Price</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Slider
                min={0}
                max={maxPrice}
                step={1}
                value={localPriceRange}
                onValueChange={handlePriceRangeChange}
                className="w-full my-4"
              />
              <div className="flex justify-between text-sm font-medium">
                <span>{formatCurrency(localPriceRange[0], shopDetails?.currency)}</span>
                <span>{formatCurrency(localPriceRange[1], shopDetails?.currency)}</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {(filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice) && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection('priceRange'); }}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {allDetailsAttributes.map(attr => {
          const Icon = getAttributeIcon(attr.name);
          const filterKey = attr.name;
          const isFilterApplied = (filters[filterKey] as string[] || []).length > 0;
          return attr.values.length > 0 ? (
            <div key={filterKey} className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3">
                    <Icon className="mr-2 h-4 w-4" />
                    {attr.name.replace(/_/g, ' ')} ({isFilterApplied ? (filters[filterKey] as string[]).length : 0})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by {attr.name.replace(/_/g, ' ')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {attr.values.map(value => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={(filters[filterKey] as string[] || []).includes(value)}
                      onCheckedChange={() => handleToggleFilter(filterKey, value)}
                    >
                      {value}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {isFilterApplied && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); handleClearSection(filterKey); }}>
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : null;
        })}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetAllFilters} className="text-destructive hover:text-destructive h-9 px-3">
            <XCircle className="mr-2 h-4 w-4" />
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Product Table Section - Scrollable */}
      <ScrollArea className="flex-1">
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
      </ScrollArea>

      {/* Bottom Action Bar - Fixed */}
      <div className="p-4 border-t flex justify-between items-center flex-shrink-0">
        <p className="text-sm text-muted-foreground">{currentSelection.length} products selected</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={currentSelection.length === 0}>Apply</Button>
        </div>
      </div>
    </div>
  );
};