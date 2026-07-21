import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Instagram, RefreshCw, Send, ExternalLink, Unplug } from "lucide-react";

/**
 * The reverse pipeline's front door: previews a system-generated caption for a
 * product (editable), lets the merchant pick the image, and publishes straight
 * to their connected Instagram Business profile via publish-product-post.
 */
export const PublishToInstagramDialog = ({ open, onOpenChange, product, onPublished }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onPublished?: (mediaId: string) => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [alreadyPublished, setAlreadyPublished] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [permalink, setPermalink] = useState<string | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setNeedsReconnect(false);
    try {
      const { data, error } = await supabase.functions.invoke("publish-product-post", {
        body: { productId: product.id, mode: "preview" },
      });
      if (error) throw new Error(error.message);
      if (data?.error === "reconnect_required") { setNeedsReconnect(true); return; }
      if (data?.error) throw new Error(data.error);
      setCaption(data.caption ?? "");
      setImages(data.imageCandidates ?? []);
      setSelectedImage((data.imageCandidates ?? [])[0] ?? null);
      setAlreadyPublished(Boolean(data.alreadyPublished));
    } catch (e) {
      showError(t("ig_publish.preview_failed", { message: (e as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && product?.id) {
      setPermalink(null);
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const handlePublish = async () => {
    if (!caption.trim()) { showError(t("ig_publish.caption_required")); return; }
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-product-post", {
        body: { productId: product.id, mode: "publish", caption, imageUrl: selectedImage },
      });
      if (error) throw new Error(error.message);
      if (data?.error === "reconnect_required") { setNeedsReconnect(true); return; }
      if (data?.error) throw new Error(data.error);
      setPermalink(data.permalink ?? null);
      showSuccess(t("ig_publish.published"));
      onPublished?.(data.mediaId);
    } catch (e) {
      showError(t("ig_publish.publish_failed", { message: (e as Error).message }));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!publishing) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            {t("ig_publish.title")}
          </DialogTitle>
          <DialogDescription>{t("ig_publish.description")}</DialogDescription>
        </DialogHeader>

        {needsReconnect ? (
          <Alert>
            <Unplug className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <p>{t("ig_publish.reconnect_needed")}</p>
              <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); navigate("/settings"); }}>
                {t("ig_publish.go_to_settings")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {permalink && (
          <Alert>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{t("ig_publish.live")}</span>
              <Button size="sm" variant="outline" asChild>
                <a href={permalink} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("ig_publish.view_post")}
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!needsReconnect && !permalink && (
          loading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-16 rounded-md" />)}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {alreadyPublished && (
                <Alert>
                  <AlertDescription>{t("ig_publish.already_published")}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("ig_publish.caption_label")}</span>
                  <Button variant="ghost" size="sm" onClick={loadPreview} disabled={publishing}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {t("ig_publish.regenerate")}
                  </Button>
                </div>
                <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={7} disabled={publishing} />
              </div>
              {images.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">{t("ig_publish.image_label")}</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setSelectedImage(url)}
                        disabled={publishing}
                        className={cn(
                          "h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                          selectedImage === url ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>{t("ig_publish.no_image")}</AlertDescription>
                </Alert>
              )}
            </div>
          )
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            {permalink ? t("common.close", "Close") : t("common.cancel")}
          </Button>
          {!needsReconnect && !permalink && (
            <Button onClick={handlePublish} disabled={loading || publishing || !images.length}>
              <Send className="mr-2 h-4 w-4" />
              {publishing ? t("ig_publish.publishing") : t("ig_publish.publish")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
