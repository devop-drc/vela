import { useEffect, useRef, useState } from "react";
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
import { Instagram, RefreshCw, Send, ExternalLink, Unplug, Palette } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";
import { renderTemplate, renderToJpegBlob, removeImageBackground, TEMPLATE_IDS, DEFAULT_TRANSFORM, type TemplateId, type ImageTransform } from "@/lib/igStudio";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";

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
  const { settings: studio } = useStudioSettings();
  const { shopDetails } = useShop();
  const { userId } = useAuth();
  const [design, setDesign] = useState<TemplateId | "studio">("studio");
  const [adjust, setAdjust] = useState<ImageTransform>(DEFAULT_TRANSFORM);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [cutoutBusy, setCutoutBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const activeTemplate = design === "studio" ? studio.template : design;
  const effectiveImage = adjust.removeBg && cutoutUrl ? cutoutUrl : selectedImage;

  // Per-post adjustments start from the merchant's Studio defaults.
  useEffect(() => { setAdjust(studio.transform ?? DEFAULT_TRANSFORM); }, [studio.transform]);

  // Live composed preview of exactly what will be posted.
  useEffect(() => {
    if (!previewRef.current || !effectiveImage) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled || !previewRef.current) return;
      renderTemplate(previewRef.current, {
        imageUrl: effectiveImage,
        name: product.name,
        price: product.price ?? null,
        currency: product.currency || "ALL",
        shopName: shopDetails?.shop_name || "",
        settings: { ...studio, template: activeTemplate, transform: adjust },
        format: "post",
      }).catch(() => {});
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [effectiveImage, activeTemplate, adjust, studio, product, shopDetails?.shop_name]);

  const toggleRemoveBg = async (on: boolean) => {
    setAdjust((a) => ({ ...a, removeBg: on }));
    if (!on || !selectedImage || cutoutUrl) return;
    setCutoutBusy(true);
    try { setCutoutUrl(await removeImageBackground(selectedImage)); }
    catch { setAdjust((a) => ({ ...a, removeBg: false })); }
    finally { setCutoutBusy(false); }
  };
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
        body: { productId: product.id, mode: "preview", captionStyle: studio.captionStyle },
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

  /** When a template is chosen, render the overlay client-side and upload it —
   * the published post then uses the designed image instead of the raw photo. */
  const resolveImageForPublish = async (): Promise<string | null> => {
    if (!effectiveImage) return selectedImage;
    const untouched = activeTemplate === "plain" && !adjust.removeBg
      && adjust.scale === 1 && adjust.offsetX === 0 && adjust.offsetY === 0;
    if (untouched) return selectedImage;
    const blob = await renderToJpegBlob({
      imageUrl: effectiveImage,
      name: product.name,
      price: product.price ?? null,
      currency: product.currency || "ALL",
      shopName: shopDetails?.shop_name || "",
      settings: { ...studio, template: activeTemplate, transform: adjust },
      format: "post",
    });
    const path = `${userId}/ig-designs/${product.id}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("product-media").upload(path, blob, {
      contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
    });
    if (upErr) throw new Error(upErr.message);
    return supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
  };

  const handlePublish = async () => {
    if (!caption.trim()) { showError(t("ig_publish.caption_required")); return; }
    setPublishing(true);
    try {
      const finalImage = await resolveImageForPublish();
      const { data, error } = await supabase.functions.invoke("publish-product-post", {
        body: { productId: product.id, mode: "publish", caption, imageUrl: finalImage },
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
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Palette className="h-3.5 w-3.5" />
                  {t("ig_publish.design_label")}
                </span>
                <Select value={design} onValueChange={(v) => setDesign(v as TemplateId | "studio")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio">{t("ig_publish.design_studio", { template: t(`ig_studio.template_${studio.template}`) })}</SelectItem>
                    {TEMPLATE_IDS.map((id) => (
                      <SelectItem key={id} value={id}>{t(`ig_studio.template_${id}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedImage && (
                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                  <div className="space-y-3">
                    {([["scale", 0.5, 2.5], ["offsetX", -1, 1], ["offsetY", -1, 1]] as const).map(([key, min, max]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t(`ig_publish.adj_${key}`)}</span>
                          <span>{adjust[key].toFixed(2)}</span>
                        </div>
                        <Slider value={[adjust[key]]} min={min} max={max} step={0.05} disabled={publishing}
                          onValueChange={([v]) => setAdjust((a) => ({ ...a, [key]: v }))} />
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t("ig_studio.remove_bg")}</span>
                      {cutoutBusy ? <Spinner className="h-4 w-4" /> : <Switch checked={adjust.removeBg} onCheckedChange={toggleRemoveBg} disabled={publishing} />}
                    </div>
                  </div>
                  <canvas ref={previewRef} className="w-36 rounded-md border sm:w-44" />
                </div>
              )}
              {images.length > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">{t("ig_publish.image_label")}</span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => { setSelectedImage(url); setCutoutUrl(null); setAdjust((a) => ({ ...a, removeBg: false })); }}
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
