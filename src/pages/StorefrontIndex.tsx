import { useStorefront } from "@/contexts/StorefrontContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { MediaItem } from "@/components/MediaItem";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Search, ListFilter, ArrowUpNarrowWide, Tag } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { getCategoryColor } from "@/lib/colorUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const StorefrontIndex = () => {
  const { shopDetails, products, isLoading, error, appearanceSettings } = useStorefront();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceFilter, setPriceFilter] = useState<string>("all"); // 'all', 'under-50', '50-100', '100-200', 'over-200'

  const blurEnabled = appearanceSettings?.blurEnabled;

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    products.forEach(p => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories).sort();
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => p.category && selectedCategories.includes(p.category));
    }

    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(p => {
        const price = p.price || 0;
        switch (priceFilter) {
          case 'under-50': return price < 50;
          case '50-100': return price >= 50 && price <= 100;
          case '100-200': return price > 100 && price <= 200;
          case 'over-200': return price > 200;
          default: return true;
        }
      });
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'price-asc': return (a.price || 0) - (b.price || 0);
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [products, searchTerm, sortOption, selectedCategories, priceFilter]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="mb-12 p-8 md:p-12 rounded-xl text-center shadow-lg bg-card/70 backdrop-blur-lg">
          <div className="h-10 w-3/4 mx-auto mb-4 bg-muted rounded" />
          <div className="h-6 w-1/2 mx-auto bg-muted rounded" />
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-10" disabled />
          </div>
          <div className="flex gap-2 w-full md:w-2/3 justify-end">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container py-8 text-destructive">{error}</div>;
  }

  if (!shopDetails) {
    return <div className="container py-8 text-center text-muted-foreground">Shop details not found.</div>;
  }

  return (
    <div className="container py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "mb-12 p-8 md:p-12 rounded-xl text-center",
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card",
          "shadow-lg"
        )}
      >
        {shopDetails.logo_url && (
          <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary shadow-md">
            <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
            <AvatarFallback className="text-3xl font-bold">{shopDetails.shop_name?.[0]}</AvatarFallback>
          </Avatar>
        )}
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 leading-tight">
          {shopDetails.headline || `Welcome to ${shopDetails.shop_name}!`}
        </h1>
        {shopDetails.about && (
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {shopDetails.about}
          </p>
        )}
      </motion.div>

      {/* Search, Filter, Sort Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-2/3 justify-end">
          {/* Sort Dropdown */}
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-full md:w-[180px]">
              <ArrowUpNarrowWide className="mr-2 h-4 w-4 text-muted-foreground" />
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

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-[180px] justify-start">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Category ({selectedCategories.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableCategories.map(category => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => {
                      setSelectedCategories(prev =>
                        checked ? [...prev, category] : prev.filter(c => c !== category)
                      );
                    }}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Price Filter */}
          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="under-50">Under {formatCurrency(50, shopDetails.currency)}</SelectItem>
              <SelectItem value="50-100">{formatCurrency(50, shopDetails.currency)} - {formatCurrency(100, shopDetails.currency)}</SelectItem>
              <SelectItem value="100-200">{formatCurrency(100, shopDetails.currency)} - {formatCurrency(200, shopDetails.currency)}</SelectItem>
              <SelectItem value="over-200">Over {formatCurrency(200, shopDetails.currency)}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h2 className="text-3xl font-bold font-heading mb-8 text-center">Our Products</h2>
      
      {filteredAndSortedProducts.length === 0 ? (
        <div className={cn(
          "text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg",
          blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
        )}>
          <h3 className="text-xl font-semibold">No Products Found</h3>
          <p className="text-base mt-2">
            It looks like you don't have any active products yet.
            <br />
            Please go to your <Link to="/" className="text-primary hover:underline">dashboard</Link>, then the "Products" section, and set some products to "Active" status to display them here.
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {filteredAndSortedProducts.map((product) => {
            const categoryColor = getCategoryColor(product.category);
            return (
              <motion.div key={product.id} variants={itemVariants} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                <Link to={`/shop/${shopDetails.slug}/product/${product.id}`}>
                  <Card className={cn(
                    "h-full flex flex-col overflow-hidden transition-shadow hover:shadow-xl",
                    blurEnabled ? "bg-card/70 backdrop-blur-lg" : "bg-card"
                  )}>
                    <CardContent className="p-0">
                      <div className="aspect-square w-full overflow-hidden bg-muted">
                        <MediaItem src={product.media_url} alt={product.name} type={product.media_type} className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    </CardContent>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-lg leading-tight mb-1">{product.name}</h3>
                        {product.category && (
                          <Badge 
                            variant="outline" 
                            className={cn("mb-2", categoryColor.bg, categoryColor.text, categoryColor.border)}
                          >
                            {product.category}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.caption}</p>
                      </div>
                      <div className="mt-4">
                        <p className="text-xl font-bold text-primary">
                          {formatCurrency(product.price, product.currency || shopDetails.currency)}
                          {product.pricing_type === 'subscription' && (
                            <span className="text-sm font-light text-muted-foreground">/{product.billing_interval === 'month' ? 'mo' : 'yr'}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default StorefrontIndex;