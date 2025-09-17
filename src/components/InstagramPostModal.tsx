import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CheckCircle, HelpCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface PostAnalysis {
  isProductPost: boolean;
  reasoning: string;
  product: {
    name: string;
    category: string;
    material: string;
    referenceCode: string;
    sizes: string[];
    price: number;
    currency: string;
  } | null;
}

interface AnalyzedPost {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  isImported: boolean;
  analysis: PostAnalysis | null;
}

interface InstagramPostModalProps {
  onClose: () => void;
  onImport: () => void;
}

export const InstagramPostModal = ({ onClose, onImport }: InstagramPostModalProps) => {
  const [posts, setPosts] = useState<AnalyzedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<AnalyzedPost | null>(null);
  const [isImporting, setIsImporting] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndAnalyzePosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('analyze-instagram-posts');
        if (invokeError) throw invokeError;
        if (data.error) throw new Error(data.error);
        setPosts(data.posts || []);
        if (data.posts && data.posts.length > 0) {
          setSelectedPost(data.posts[0]);
        }
      } catch (err: any) {
        setError(err.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndAnalyzePosts();
  }, []);

  const handleImport = async (post: AnalyzedPost) => {
    if (!post.analysis?.product) return;
    setIsImporting(post.id);
    const p = post.analysis.product;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('products').insert({
      user_id: user?.id,
      name: p.name || p.referenceCode,
      status: 'Draft',
      price: p.price,
      inventory: p.sizes?.length || 0,
      instagram_post_id: post.id,
      media_url: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
      caption: post.caption,
      category: p.category,
      material: p.material,
      reference_code: p.referenceCode,
      sizes: p.sizes?.join(', '),
    });

    if (error) {
      showError(`Failed to import product: ${error.message}`);
    } else {
      showSuccess("Product imported successfully!");
      setPosts(posts.map(p => p.id === post.id ? { ...p, isImported: true } : p));
      setSelectedPost(prev => prev ? { ...prev, isImported: true } : null);
      onImport();
    }
    setIsImporting(null);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from Instagram</DialogTitle>
          <DialogDescription>Select a post to view its details and import it as a product.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="md:col-span-1 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Your Posts</h3>
            <ScrollArea className="flex-1 pr-4">
              <div className="grid grid-cols-3 gap-2">
                {isLoading ? (
                  Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
                ) : error ? (
                  <div className="col-span-3 text-destructive p-4 border border-destructive/50 rounded-md">{error}</div>
                ) : (
                  posts.map(post => (
                    <button key={post.id} onClick={() => setSelectedPost(post)} className={`relative aspect-square rounded-md overflow-hidden border-2 ${selectedPost?.id === post.id ? 'border-primary' : 'border-transparent'}`}>
                      <img src={post.thumbnail_url || post.media_url} alt="Instagram post" className="w-full h-full object-cover" />
                      {post.isImported && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><CheckCircle className="text-white h-6 w-6" /></div>}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="md:col-span-2 flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Post Details</h3>
            <ScrollArea className="flex-1 pr-4">
              {selectedPost ? (
                <div className="space-y-4">
                  <img src={selectedPost.media_url} alt="Selected post" className="w-full rounded-lg object-contain max-h-96 bg-muted" />
                  <Card>
                    <CardHeader><CardTitle>Caption</CardTitle></CardHeader>
                    <CardContent><p className="text-sm whitespace-pre-wrap">{selectedPost.caption || "No caption."}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
                    <CardContent>
                      {selectedPost.analysis ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            {selectedPost.analysis.isProductPost ? <Badge>Product Post</Badge> : <Badge variant="secondary">Not a Product Post</Badge>}
                            <p className="text-sm text-muted-foreground">{selectedPost.analysis.reasoning}</p>
                          </div>
                          {selectedPost.analysis.product && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                              <strong>Name:</strong><span>{selectedPost.analysis.product.name}</span>
                              <strong>Category:</strong><span>{selectedPost.analysis.product.category}</span>
                              <strong>Material:</strong><span>{selectedPost.analysis.product.material}</span>
                              <strong>Code:</strong><span>{selectedPost.analysis.product.referenceCode}</span>
                              <strong>Price:</strong><span>{selectedPost.analysis.product.price} {selectedPost.analysis.product.currency}</span>
                              <strong>Sizes:</strong><span>{selectedPost.analysis.product.sizes.join(', ')}</span>
                            </div>
                          )}
                          <Button onClick={() => handleImport(selectedPost)} disabled={!selectedPost.analysis?.isProductPost || selectedPost.isImported || !!isImporting}>
                            {isImporting === selectedPost.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {selectedPost.isImported ? "Imported" : "Import as Product"}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No analysis available for this post (e.g., no caption).</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mb-4" />
                  <p>Select a post to see its details.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};