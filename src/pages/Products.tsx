import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Instagram, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { NavLink, useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { parseProductCaption, ParsedProductDetails } from "@/utils/captionParser";

interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
}

interface ProcessedInstagramPost extends InstagramPost {
  productDetails: ParsedProductDetails | null;
  isCreated: boolean;
}

interface Product {
  id: string;
  name: string;
  status: string;
  price: number;
  inventory: number;
  instagram_post_id: string;
}

const Products = () => {
  const [instagramPosts, setInstagramPosts] = useState<ProcessedInstagramPost[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingProductId, setCreatingProductId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      showError("Could not fetch your product catalog.");
      console.error(error);
    } else {
      setCatalogProducts(data as Product[]);
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("instagram_connected") === "true") {
      showSuccess("Successfully connected your Instagram account!");
      searchParams.delete("instagram_connected");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchInstagramPosts = async () => {
      setIsLoading(true);
      setError(null);
      await fetchProducts(); // Fetch catalog first to check against
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('instagram-posts');
        if (invokeError) throw invokeError;
        if (data.error) throw new Error(data.error);

        const existingPostIds = catalogProducts.map(p => p.instagram_post_id);

        const processedPosts: ProcessedInstagramPost[] = (data.posts || []).map((post: InstagramPost) => ({
          ...post,
          productDetails: parseProductCaption(post.caption),
          isCreated: existingPostIds.includes(post.id),
        }));
        setInstagramPosts(processedPosts);
      } catch (err: any) {
        console.error("Error fetching Instagram posts:", err);
        setError(err.message || "Failed to load Instagram posts. Please try reconnecting your account.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstagramPosts();
  }, [fetchProducts, catalogProducts.length]); // Rerun if catalog length changes

  const handleCreateProduct = async (post: ProcessedInstagramPost) => {
    if (!post.productDetails) return;
    setCreatingProductId(post.id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("You must be logged in to create a product.");
      setCreatingProductId(null);
      return;
    }

    const { error } = await supabase.from('products').insert({
      user_id: user.id,
      name: post.productDetails.name || post.productDetails.referenceCode,
      status: 'Draft',
      price: post.productDetails.price,
      inventory: post.productDetails.sizes.length,
      instagram_post_id: post.id,
      media_url: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
      caption: post.caption,
      category: post.productDetails.category,
      material: post.productDetails.material,
      reference_code: post.productDetails.referenceCode,
      sizes: post.productDetails.sizes.join(', '),
    });

    if (error) {
      showError(`Failed to create product: ${error.message}`);
    } else {
      showSuccess("Product created successfully!");
      setInstagramPosts(prev => prev.map(p => p.id === post.id ? { ...p, isCreated: true } : p));
      await fetchProducts();
    }
    setCreatingProductId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instagram Posts</CardTitle>
          <CardDescription>
            Create products directly from your Instagram posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <p className="text-destructive">{error}</p>
              <div className="mt-6">
                <Button asChild><NavLink to="/settings">Go to Settings</NavLink></Button>
              </div>
            </div>
          ) : instagramPosts.length > 0 ? (
            <div className="space-y-4">
              {instagramPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden">
                  <CardContent className="p-4 flex flex-col md:flex-row items-start gap-4">
                    <img
                      src={post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url}
                      alt={post.caption?.substring(0, 50) || 'Instagram Post'}
                      className="object-cover w-full md:w-40 md:h-40 aspect-square rounded-lg"
                    />
                    <div className="flex-1 space-y-3">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{post.caption || "No caption for this post."}</p>
                      {post.productDetails ? (
                        <div className="flex items-center gap-4 pt-2">
                          <Button
                            onClick={() => handleCreateProduct(post)}
                            disabled={creatingProductId === post.id || post.isCreated}
                          >
                            {creatingProductId === post.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {creatingProductId === post.id ? 'Creating...' : post.isCreated ? 'Product Created' : 'Create Product'}
                          </Button>
                          <Badge variant="secondary">Product Post</Badge>
                        </div>
                      ) : (
                        <Badge variant="outline">Not a Product Post</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <Instagram className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Instagram posts found</h3>
              <p className="mt-1 text-sm text-gray-500">Connect your Instagram account to get started.</p>
              <div className="mt-6">
                <Button asChild><NavLink to="/settings">Go to Settings</NavLink></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Product Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Inventory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.inventory} in stock</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Products;