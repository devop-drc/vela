import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { NavLink, useSearchParams } from "react-router-dom";
import { showSuccess } from "@/utils/toast";

const products = [
  { name: "Minimalist Tee", status: "Active", price: "$49.99", inventory: "250 in stock" },
  { name: "Vintage Hoodie", status: "Active", price: "$79.99", inventory: "120 in stock" },
  { name: "Classic Denim Jacket", status: "Draft", price: "$129.99", inventory: "0 in stock" },
  { name: "Leather Boots", status: "Archived", price: "$199.99", inventory: "50 in stock" },
];

interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
}

const Products = () => {
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("instagram_connected") === "true") {
      showSuccess("Successfully connected your Instagram account!");
      // Clean up the URL
      searchParams.delete("instagram_connected");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const fetchInstagramPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('instagram-posts');
        
        if (invokeError) {
          // This will now only catch network/auth errors from the invoke call itself
          throw invokeError;
        }

        if (data.error) {
          // This catches the application-level error returned from our function
          throw new Error(data.error);
        }

        setInstagramPosts(data.posts || []);
      } catch (err: any) {
        console.error("Error fetching Instagram posts:", err);
        setError(err.message || "Failed to load Instagram posts. Please try reconnecting your account.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstagramPosts();
  }, []);

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
            Select an Instagram post to create a new product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-destructive">{error}</p>
                <div className="mt-6">
                    <Button asChild>
                    <NavLink to="/settings">
                        Go to Settings
                    </NavLink>
                    </Button>
                </div>
            </div>
          ) : instagramPosts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {instagramPosts.map((post) => (
                <div key={post.id} className="relative group aspect-square">
                  <img
                    src={post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url}
                    alt={post.caption?.substring(0, 50) || 'Instagram Post'}
                    className="object-cover w-full h-full rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-lg">
                    <Button variant="secondary" className="opacity-0 group-hover:opacity-100">
                      Create Product
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <Instagram className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Instagram posts found</h3>
              <p className="mt-1 text-sm text-gray-500">Connect your Instagram account to get started.</p>
              <div className="mt-6">
                <Button asChild>
                  <NavLink to="/settings">
                    Go to Settings
                  </NavLink>
                </Button>
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
              {products.map((product) => (
                <TableRow key={product.name}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'Active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>{product.inventory}</TableCell>
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