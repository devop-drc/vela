import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CheckCircle, Image as ImageIcon, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { MediaItem } from "./MediaItem";
import { ProductEditor } from "./ProductEditor";
import { toast } from "sonner";

interface AnalyzedPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  isImported: boolean;
  analysis: {
    isProductPost: boolean;
    product?: any;
    reasoning?: string;
  } | null;
}

interface InstagramPostModalProps {
  onClose: () => void;
  onImport: () => void;
}

const CACHE_KEY = 'instagram_posts_cache';

// Helper to convert snake_case to Title Case for display and database consistency
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const InstagramPostModal = ({ onClose, onImport }: InstagramPostModalProps) => {
  const [posts, setPosts] = useState<AnalyzedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<AnalyzedPost | null>(null);
  const [dismissedPostIds, setDismissedPostIds] = useState<string[]>([]);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [newlyCreatedProduct, setNewlyCreatedProduct] = useState<any>(null);

  const fetchAndAnalyzePosts = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cachedPosts = sessionStorage.getItem(CACHE_KEY);
      if (cachedPosts) {
        const parsedPosts = JSON.parse(cachedPosts);
        setPosts(parsedPosts);
        if (parsedPosts.length > 0 && !selectedPost) {
          setSelectedPost(parsedPosts[0]);
        }
        setIsLoading(false);
        return;
      }
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('analyze-instagram-posts');
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      
      const fetchedPosts = data.posts || [];
      setPosts(fetchedPosts);
      if (fetchedPosts.length > 0) {
        setSelectedPost(fetchedPosts[0]);
      }
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(fetchedPosts));
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPost]);

  useEffect(() => {
    fetchAndAnalyzePosts();
  }, [fetchAndAnalyzePosts]);

  const handleCreateProduct = async (post: AnalyzedPost) => {
    const toastId = toast.loading("Creating product draft...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
      if (!business) throw new Error("Could not find your business profile.");

      const analysis = post.analysis?.product || {};
      
      // Prepare details payload
      const cleanedDetails: { [key: string]: any } = { type: analysis.details?.type?.value || 'generic', options_v2: [] };
      
      // Process specifications and options
      if (analysis.details) {
          for (const [key, valueObj] of Object.entries(analysis.details as any)) {
              if (key !== 'type') {
                  const values = valueObj.value;
                  if (Array.isArray(values) && ['color', 'size', 'material'].includes(key.toLowerCase())) {
                      // Convert old options structure to new options_v2 structure
                      cleanedDetails.options_v2.push({
                          name: toTitleCase(key),
                          values: values.map((v: string, index: number) => ({
                              value: v,
                              price_difference: 0,
                              inventory: 10,
                              is_active: true,
                              is_default: index === 0,
                          }))
                      });
                  } else {
                      // Treat as specification
                      cleanedDetails[key] = values;
                  }
              }
          }
      }

      // Default to ALL currency for storage, price is stored as is from AI analysis (which defaults to ALL if not found)
      const price = analysis.price?.value ?? 0;
      const currency = analysis.currency?.value ?? 'ALL';
      const pricing_type = analysis.pricing_type?.value || 'one_time';
      const inventory = pricing_type === 'one_time' ? (analysis.inventory?.value ?? 10) : 0;
      const status = inventory === 0 ? 'Out of Stock' : 'Draft';

      const payload = {
        business_id: business.id,
        user_id: user.id,
        name: analysis.name?.value || "New Product Draft",
        caption: analysis.description?.value || post.caption || "",
        category: analysis.category?.value || "Generic Product",
        price: price,
        currency: currency,
        inventory: inventory,
        tags: analysis.tags?.value || [],
        details: cleanedDetails,
        pricing_type: pricing_type,
        billing_interval: pricing_type === 'subscription' ? (analysis.billing_interval?.value || 'month') : null,
        status: status,
        instagram_post_id: post.id,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url,
        media_type: post.media_type,
        media_gallery: post.media_gallery || (post.media_url ? [post.media_url] : []),
        product_type: 'physical', // Default
      };

      const { data: newProduct, error: insertError } = await supabase.from('products').insert(payload).select('*, media_gallery').single();
      if (insertError) throw insertError;

      toast.success("Product draft created! Please review details.", { id: toastId });
      
      // Update local state to reflect imported status
      const updatedPosts = posts.map(p => p.id === post.id ? { ...p, isImported: true } : p);
      setPosts(updatedPosts);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(updatedPosts));
      setSelectedPost(prev => prev ? { ...prev, isImported: true } : null);
      onImport(); // Notify parent that an import happened

      setNewlyCreatedProduct(newProduct); // Open ProductEditor
    } catch (err: any) {
      toast.error(`Failed to create product: ${err.message}`, { id: toastId });
    }
  };

  const handleDismissPost = (postId: string) => {
    setDismissedPostIds(prev => [...prev, postId]);
    if (selectedPost?.id === postId) {
      setSelectedPost(null);
    }
  };

  const visiblePosts = posts.filter(p => !dismissedPostIds.includes(p.id));

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-2 text-sm items-start">
        <dt className="font-medium text-muted-foreground capitalize">{label}</dt>
        <dd className="col-span-2">{value}</dd>
    </div>
  );

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import from Instagram</DialogTitle>
            <DialogDescription>Select a post to view its details and create a product.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
            <div className="md:col-span-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Your Posts</h3>
                <Button variant="ghost" size="sm" onClick={() => fetchAndAnalyzePosts(true)} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <ScrollArea className="flex-1 pr-4 border rounded-lg">
                <div className="grid grid-cols-3 gap-2 p-2">
                  {isLoading ? (
                    Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
                  ) : error ? (
                    <div className="col-span-3 text-destructive p-4 border border-destructive/50 rounded-md">{error}</div>
                  ) : (
                    visiblePosts.map(post => (
                      <div key={post.id} className="relative group">
                        <button onClick={() => setSelectedPost(post)} className={`w-full relative aspect-square rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${selectedPost?.id === post.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                          <MediaItem src={post.thumbnail_url || post.media_url} alt="Instagram post" type={post.media_type} />
                          {post.isImported && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><CheckCircle className="text-white h-8 w-8" /></div>}
                        </button>
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDismissPost(post.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="md:col-span-2 flex flex-col min-h-0">
              <h3 className="text-lg font-semibold mb-2">Post Details</h3>
              <ScrollArea className="flex-1 pr-4">
                {selectedPost ? (
                  <div className="space-y-4">
                    <button onClick={() => setIsImageViewerOpen(true)} className="w-full h-64 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      <MediaItem src={selectedPost.media_url} alt="Selected post" type={selectedPost.media_type} className="max-w-full max-h-full object-contain" />
                    </button>
                    <Card>
                      <CardHeader><CardTitle>AI Analysis</CardTitle><CardDescription>Initial analysis of the post caption.</CardDescription></CardHeader>
                      <CardContent>
                        {selectedPost.analysis ? (
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              {selectedPost.analysis.isProductPost ? <Badge className="mt-1">Product</Badge> : <Badge variant="secondary" className="mt-1">General</Badge>}
                              <p className="text-sm text-muted-foreground flex-1">{selectedPost.analysis.reasoning || "AI analysis determined this is a product post."}</p>
                            </div>
                            
                            {selectedPost.analysis.isProductPost && selectedPost.analysis.product && (
                              <div className="border-t pt-4 mt-4">
                                <h4 className="font-semibold text-sm mb-3">Extracted Details:</h4>
                                <dl className="space-y-2">
                                  {selectedPost.analysis.product.name?.value && <DetailRow label="Name" value={selectedPost.analysis.product.name.value} />}
                                  {selectedPost.analysis.product.category?.value && <DetailRow label="Category" value={<Badge variant="outline">{selectedPost.analysis.product.category.value}</Badge>} />}
                                  {selectedPost.analysis.product.price?.value !== undefined && <DetailRow label="Price" value={`${selectedPost.analysis.product.price.value} ${selectedPost.analysis.product.currency?.value || ''}`} />}
                                  {selectedPost.analysis.product.tags?.value?.length > 0 && <DetailRow label="Tags" value={<div className="flex flex-wrap gap-1">{selectedPost.analysis.product.tags.value.map((tag: string) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>} />}
                                  
                                  {Object.entries(selectedPost.analysis.product.details || {}).map(([key, valueObj]: [string, any]) => {
                                    const value = valueObj.value;
                                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                                    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                    return <DetailRow key={key} label={key.replace(/_/g, ' ')} value={displayValue} />;
                                  })}
                                </dl>
                              </div>
                            )}
                          </div>
                        ) : (<p className="text-sm text-muted-foreground">No caption to analyze.</p>)}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Original Caption</CardTitle></CardHeader>
                      <CardContent><p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedPost.caption || "No caption."}</p></CardContent>
                    </Card>
                    <Button onClick={() => handleCreateProduct(selectedPost)} disabled={selectedPost.isImported} className="w-full">
                      <Sparkles className="mr-2 h-4 w-4" />
                      {selectedPost.isImported ? "Already Imported" : "Create Product from this Post"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground border rounded-lg">
                    <ImageIcon className="h-16 w-16 mb-4" />
                    <p>Select a post from the left to see its details.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isImageViewerOpen && selectedPost && (
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl h-[90vh] p-2 flex items-center justify-center">
            <MediaItem src={selectedPost.media_url} alt="Full size post" type={selectedPost.media_type} className="max-w-full max-h-full object-contain" />
          </DialogContent>
        </Dialog>
      )}

      {/* Use ProductEditor for newly created product */}
      {newlyCreatedProduct && (
        <ProductEditor 
          isOpen={!!newlyCreatedProduct} 
          onClose={() => setNewlyCreatedProduct(null)} 
          product={newlyCreatedProduct} 
          onUpdate={() => { 
            // When ProductEditor updates, we assume the user is done editing the draft
            setNewlyCreatedProduct(null); 
          }} 
        />
      )}
    </>
  );
};