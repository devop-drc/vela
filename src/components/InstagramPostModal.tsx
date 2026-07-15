import { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CheckCircle, Image as ImageIcon, RefreshCw, Sparkles, Plus, Package, EyeOff, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { MediaItem } from "./MediaItem";
import { ProductEditor } from "./ProductEditor";
import { EmptyState, StatusBadge, StatusDot } from "@/components/ui-app";
import { useAuth } from "@/contexts/AuthContext";
import { useReveal } from "@/lib/anim";
import { toast } from "sonner";

interface InstagramPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  media_gallery?: string[];
  isImported: boolean;
}

interface AnalysisData {
  isProductPost: boolean;
  productName?: string;
  categoryName?: string;
  typeName?: string;
  description?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  specifications?: any;
  options?: any;
  inventory?: number;
  pricingType?: string;
  billingInterval?: string;
  product?: any; // Legacy format from analyze-instagram-posts
  reasoning?: string;
}

interface InstagramPostModalProps {
  onClose: () => void;
  onImport: () => void;
}

const POSTS_CACHE_KEY = 'instagram_posts_raw';

const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const InstagramPostModal = ({ onClose, onImport }: InstagramPostModalProps) => {
  const { userId, session, ensureBusinessId } = useAuth();
  // Refs so the memoized fetchPosts callback always reads the freshest auth.
  const sessionRef = useRef(session);
  const userIdRef = useRef(userId);
  useEffect(() => { sessionRef.current = session; userIdRef.current = userId; }, [session, userId]);

  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Per-post analysis state
  const [analysisMap, setAnalysisMap] = useState<Map<string, AnalysisData>>(new Map());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const [newlyCreatedProduct, setNewlyCreatedProduct] = useState<any>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  // Fetch posts ONLY (no AI analysis) — fast!
  const fetchPosts = useCallback(async (forceRefresh = false) => {
    setIsLoadingPosts(true);
    setError(null);

    if (!forceRefresh) {
      const cached = sessionStorage.getItem(POSTS_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setPosts(parsed);
          if (parsed.length > 0) setSelectedPost(parsed[0]);
          setIsLoadingPosts(false);
          return;
        } catch { /* ignore */ }
      }
    }

    try {
      const headers: any = {};
      const token = sessionRef.current?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;

      const { data, error: err } = await supabase.functions.invoke('instagram-posts', { headers });
      if (err) throw err;
      if (data?.error) throw new Error(data.error);

      const rawPosts: InstagramPost[] = (data?.posts || []).map((p: any) => ({
        id: p.id,
        media_type: p.media_type,
        media_url: p.media_url,
        thumbnail_url: p.thumbnail_url,
        caption: p.caption,
        media_gallery: p.media_gallery,
        isImported: p.isImported || false,
      }));

      // Check which posts are already imported
      const { data: existing } = await supabase.from('products').select('instagram_post_id').not('instagram_post_id', 'is', null);
      const importedIds = new Set((existing || []).map((p: any) => p.instagram_post_id));
      rawPosts.forEach(p => { if (importedIds.has(p.id)) p.isImported = true; });

      setPosts(rawPosts);
      if (rawPosts.length > 0 && !selectedPost) setSelectedPost(rawPosts[0]);
      sessionStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(rawPosts));
    } catch (err: any) {
      setError(err.message || "Failed to fetch posts.");
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Analyze a single post on demand
  const analyzePost = async (post: InstagramPost) => {
    if (analyzingIds.has(post.id)) return;
    setAnalyzingIds(prev => new Set(prev).add(post.id));

    try {
      const { data, error: err } = await supabase.functions.invoke('ai-product-classifier', {
        body: {
          caption: post.caption || '',
          user_id: userIdRef.current,
          include_images: !post.caption || post.caption.trim().length < 15,
          post_media: {
            media_url: post.media_url,
            thumbnail_url: post.thumbnail_url,
            media_type: post.media_type,
            post_id: post.id,
          },
        }
      });

      if (err) throw err;
      setAnalysisMap(prev => new Map(prev).set(post.id, data as AnalysisData));
    } catch (err: any) {
      showError(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzingIds(prev => { const s = new Set(prev); s.delete(post.id); return s; });
    }
  };

  // Create product from post (with or without analysis)
  const handleCreateProduct = async (post: InstagramPost, useAnalysis: boolean) => {
    const toastId = toast.loading("Creating product...");
    try {
      if (!userId) throw new Error("Not authenticated.");
      const businessId = await ensureBusinessId();
      if (!businessId) throw new Error("No business profile found.");

      const analysis = useAnalysis ? analysisMap.get(post.id) : null;

      // Build details from analysis specs
      const details: Record<string, any> = {};
      if (analysis?.typeName) details.type = toTitleCase(analysis.typeName);
      if (analysis?.specifications) {
        const specs = Array.isArray(analysis.specifications) ? analysis.specifications : Object.entries(analysis.specifications).map(([k, v]) => ({ key: k, value: v }));
        for (const s of specs) {
          if (s && s.key) details[s.key] = s.value || '';
        }
      }

      const payload = {
        business_id: businessId,
        user_id: userId,
        name: analysis?.productName || post.caption?.split('\n')[0]?.slice(0, 60) || "New Product",
        caption: analysis?.description || post.caption || "",
        category: analysis?.categoryName ? toTitleCase(analysis.categoryName) : "Uncategorized",
        price: analysis?.price ?? 0,
        currency: analysis?.currency || 'ALL',
        inventory: analysis?.inventory ?? 10,
        tags: analysis?.tags || [],
        details,
        pricing_type: analysis?.pricingType || 'one_time',
        billing_interval: analysis?.pricingType === 'subscription' ? (analysis?.billingInterval || 'month') : null,
        status: (analysis?.inventory === 0) ? 'Out of Stock' : 'Draft',
        instagram_post_id: post.id,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url || post.media_url,
        media_type: post.media_type,
        media_gallery: post.media_gallery || (post.media_url ? [post.media_url] : []),
        product_type: 'physical',
      };

      const { data: newProduct, error: insertError } = await supabase.from('products').insert(payload).select('*').single();
      if (insertError) throw insertError;

      toast.success("Product created!", { id: toastId });

      // Mark as imported
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, isImported: true } : p));
      setSelectedPost(prev => prev?.id === post.id ? { ...prev, isImported: true } : prev);
      sessionStorage.removeItem(POSTS_CACHE_KEY);
      onImport();

      setNewlyCreatedProduct(newProduct);
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`, { id: toastId });
    }
  };

  const visiblePosts = posts.filter(p => !dismissedIds.has(p.id));
  const analysis = selectedPost ? analysisMap.get(selectedPost.id) : null;
  const isAnalyzing = selectedPost ? analyzingIds.has(selectedPost.id) : false;

  // Subtle GSAP entrance (reduced-motion aware).
  const gridRevealRef = useReveal<HTMLDivElement>({}, [visiblePosts.length, isLoadingPosts]);
  const heroRevealRef = useReveal<HTMLDivElement>({}, [selectedPost?.id]);
  const analysisRevealRef = useReveal<HTMLDivElement>({}, [selectedPost?.id, isAnalyzing, !!analysis]);

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Import from Instagram</DialogTitle>
                <DialogDescription className="mt-0.5">
                  {posts.length > 0 ? `${posts.length} posts found` : 'Loading posts...'}
                  {posts.filter(p => p.isImported).length > 0 && ` · ${posts.filter(p => p.isImported).length} already imported`}
                </DialogDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => fetchPosts(true)} disabled={isLoadingPosts}>
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoadingPosts ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1 min-h-0">
            {/* Left: Post grid */}
            <div className="md:col-span-1 border-r flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div ref={gridRevealRef} className="grid grid-cols-3 gap-1 p-2">
                  {isLoadingPosts ? (
                    Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded" />)
                  ) : error ? (
                    <div className="col-span-3">
                      <EmptyState
                        compact
                        icon={AlertTriangle}
                        title="Couldn't load posts"
                        description={error}
                        action={
                          <Button size="sm" variant="outline" onClick={() => fetchPosts(true)}>
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Retry
                          </Button>
                        }
                      />
                    </div>
                  ) : visiblePosts.length === 0 ? (
                    <div className="col-span-3">
                      <EmptyState
                        compact
                        icon={ImageIcon}
                        title="No posts found"
                        description="Refresh to pull the latest posts from your connected Instagram account."
                      />
                    </div>
                  ) : (
                    visiblePosts.map(post => (
                      <div key={post.id} data-reveal className="relative group">
                        <button
                          onClick={() => setSelectedPost(post)}
                          className={`w-full relative aspect-square rounded overflow-hidden transition-all ${
                            selectedPost?.id === post.id ? 'ring-2 ring-primary' : 'hover:opacity-80'
                          }`}
                        >
                          <MediaItem src={post.thumbnail_url || post.media_url} alt="" type={post.media_type} />
                          {post.isImported && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <CheckCircle className="text-white h-6 w-6" />
                            </div>
                          )}
                          {analysisMap.has(post.id) && !post.isImported && (
                            <div className="absolute top-1 left-1">
                              <StatusDot tone="success" pulse />
                            </div>
                          )}
                        </button>
                        <Button
                          variant="secondary"
                          size="icon"
                          aria-label="Hide from this list"
                          title="Hide from this list"
                          className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          onClick={() => setDismissedIds(prev => new Set(prev).add(post.id))}
                        >
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Post details */}
            <div className="md:col-span-2 flex flex-col min-h-0">
              {selectedPost ? (
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    <div ref={heroRevealRef} className="space-y-4">
                    {/* Top: Media + Caption side by side */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => setIsImageViewerOpen(true)}
                        className="w-48 h-48 bg-muted rounded-lg overflow-hidden shrink-0 hover:opacity-90 transition-opacity"
                      >
                        <MediaItem
                          src={selectedPost.media_url}
                          alt=""
                          type={selectedPost.media_type}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {selectedPost.isImported && <StatusBadge tone="success" size="sm" icon={<CheckCircle />}>Imported</StatusBadge>}
                          {selectedPost.media_type !== 'IMAGE' && <Badge variant="outline" className="text-[10px]">{selectedPost.media_type}</Badge>}
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed max-h-36 overflow-y-auto">
                          {selectedPost.caption || <span className="text-muted-foreground italic">No caption</span>}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => analyzePost(selectedPost)}
                        disabled={isAnalyzing}
                        className="flex-1 min-w-[140px]"
                      >
                        <Sparkles className="mr-2 h-3.5 w-3.5 text-warning" />
                        {isAnalyzing ? 'Analyzing…' : analysis ? 'Re-analyze' : 'Analyze with AI'}
                      </Button>
                      {!selectedPost.isImported && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleCreateProduct(selectedPost, true)}
                            className="flex-1 min-w-[140px]"
                          >
                            <Package className="mr-2 h-3.5 w-3.5" />
                            Create product
                          </Button>
                          {analysis && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCreateProduct(selectedPost, false)}
                              title="Create the product without applying AI analysis"
                            >
                              <Plus className="mr-2 h-3.5 w-3.5" />
                              Without AI
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    </div>

                    <div ref={analysisRevealRef} className="space-y-4">
                    {/* AI Analysis results */}
                    {isAnalyzing && (
                      <Card>
                        <CardContent className="py-8 flex flex-col items-center gap-3 text-muted-foreground">
                          <Spinner className="h-8 w-8 text-primary" />
                          <p className="text-sm">Analyzing post with AI...</p>
                        </CardContent>
                      </Card>
                    )}

                    {analysis && !isAnalyzing && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-warning" />
                            AI Analysis
                            {analysis.isProductPost ? (
                              <StatusBadge tone="success" size="sm" className="ml-auto">Product</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral" size="sm" className="ml-auto">Not a Product</StatusBadge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {!analysis.isProductPost ? (
                            <p className="text-sm text-muted-foreground">AI determined this is not a product post.</p>
                          ) : (
                            <>
                              {/* Main product info */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                                {analysis.productName && (
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground text-xs">Name</span>
                                    <p className="font-medium">{analysis.productName}</p>
                                  </div>
                                )}
                                {analysis.categoryName && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Category</span>
                                    <p><Badge variant="outline" className="text-xs">{analysis.categoryName}</Badge></p>
                                  </div>
                                )}
                                {analysis.typeName && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Type</span>
                                    <p><Badge variant="outline" className="text-xs">{analysis.typeName}</Badge></p>
                                  </div>
                                )}
                                {analysis.price != null && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Price</span>
                                    <p className="font-semibold">{analysis.price} {analysis.currency || 'ALL'}</p>
                                  </div>
                                )}
                                {analysis.inventory != null && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Stock</span>
                                    <p>{analysis.inventory} units</p>
                                  </div>
                                )}
                              </div>

                              {/* Description */}
                              {analysis.description && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Description</span>
                                  <p className="text-sm mt-0.5">{analysis.description}</p>
                                </div>
                              )}

                              {/* Tags */}
                              {analysis.tags && analysis.tags.length > 0 && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Tags</span>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {analysis.tags.map((tag: string) => (
                                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Specifications */}
                              {analysis.specifications && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Specifications</span>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-sm">
                                    {(Array.isArray(analysis.specifications)
                                      ? analysis.specifications
                                      : Object.entries(analysis.specifications).map(([k, v]) => ({ key: k, value: v }))
                                    ).map((spec: any) => (
                                      <div key={spec.key} className="flex justify-between">
                                        <span className="text-muted-foreground capitalize text-xs">{String(spec.key).replace(/_/g, ' ')}</span>
                                        <span className="text-xs font-medium">{String(spec.value || '')}{spec.unit ? ` ${spec.unit}` : ''}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Options */}
                              {analysis.options && Object.keys(analysis.options).length > 0 && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Options</span>
                                  <div className="space-y-1.5 mt-1">
                                    {Object.entries(analysis.options).map(([name, values]: [string, any]) => (
                                      <div key={name} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground capitalize min-w-[60px]">{name}</span>
                                        <div className="flex flex-wrap gap-1">
                                          {(Array.isArray(values) ? values : []).map((v: any) => (
                                            <Badge key={typeof v === 'object' ? v.value : v} variant="outline" className="text-[10px]">
                                              {typeof v === 'object' ? v.value : String(v)}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    compact
                    icon={ImageIcon}
                    title="Select a post"
                    description="Choose a post to preview and import it as a product."
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isImageViewerOpen && selectedPost && (
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-4xl h-[90vh] p-2 flex items-center justify-center">
            <DialogHeader className="sr-only">
              <DialogTitle>Post preview</DialogTitle>
              <DialogDescription>Full-size preview of the selected Instagram post.</DialogDescription>
            </DialogHeader>
            <MediaItem src={selectedPost.media_url} alt="Full size" type={selectedPost.media_type} className="max-w-full max-h-full object-contain" />
          </DialogContent>
        </Dialog>
      )}

      {newlyCreatedProduct && (
        <ProductEditor
          isOpen={!!newlyCreatedProduct}
          onClose={() => setNewlyCreatedProduct(null)}
          product={newlyCreatedProduct}
          onUpdate={() => setNewlyCreatedProduct(null)}
        />
      )}
    </>
  );
};
