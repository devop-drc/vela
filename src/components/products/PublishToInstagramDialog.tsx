import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { useShop } from "@/contexts/ShopContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  renderTemplate, renderToJpegBlob, renderCarouselToBlobs, removeImageBackground,
  TEMPLATE_IDS, DEFAULT_TRANSFORM, type TemplateId, type ImageTransform,
} from "@/lib/igStudio";
import { IgPostChrome } from "@/components/products/IgPostChrome";
import {
  Instagram, RefreshCw, Send, ExternalLink, Unplug, Palette,
} from "lucide-react";

/**
 * The reverse pipeline's front door: the system generates the caption +
 * hashtags in the merchant's Instagram Studio style, composes the post
 * design over the product photo, and publishes straight to the connected
 * Instagram Business profile. The live preview mirrors a real Instagram
 * post — the merchant's IG profile picture, handle, media and caption.
 */
type PostKind = "single" | "carousel" | "story" | "post_video" | "story_video" | "reel_video";

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

  // ── all state first (order matters: derived consts below reference these) ──
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [alreadyPublished, setAlreadyPublished] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [permalink, setPermalink] = useState<string | null>(null);
  const [design, setDesign] = useState<TemplateId | "studio">("studio");
  const [adjust, setAdjust] = useState<ImageTransform>(DEFAULT_TRANSFORM);
  const [postKind, setPostKind] = useState<PostKind>("single");
  const [videoJob, setVideoJob] = useState<any | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [cutoutBusy, setCutoutBusy] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  // ── derived ──
  const isVideoKind = postKind.endsWith("_video");
  const activeTemplate = design === "studio" ? studio.template : design;
  const effectiveImage = adjust.removeBg && cutoutUrl ? cutoutUrl : selectedImage;

  // Instagram identity for the preview chrome.
  const igHandle = (shopDetails?.username
    || shopDetails?.slug
    || (shopDetails?.shop_name || "shop").toLowerCase().replace(/\s+/g, ""))!;
  const igAvatar = shopDetails?.logo_url || null;

  // Caption split for the preview: last line of hashtags shows blue.
  const captionParts = useMemo(() => {
    const lines = caption.split("\n");
    const last = lines[lines.length - 1] ?? "";
    if (/^#/.test(last.trim())) {
      return { body: lines.slice(0, -1).join("\n").trim(), tags: last.trim() };
    }
    return { body: caption.trim(), tags: "" };
  }, [caption]);

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
      setPostKind("single");
      setVideoJob(null);
      setCutoutUrl(null);
      setAdjust(studio.transform ?? DEFAULT_TRANSFORM);
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  // Poll the render job for video post types.
  useEffect(() => {
    if (!videoJob || ["done", "failed"].includes(videoJob.status)) return;
    const iv = setInterval(async () => {
      const { data } = await supabase.from("video_render_jobs").select("*").eq("id", videoJob.id).maybeSingle();
      if (data) setVideoJob(data);
    }, 5000);
    return () => clearInterval(iv);
  }, [videoJob]);

  // Live composed preview of exactly what will be posted.
  useEffect(() => {
    if (!previewRef.current || !effectiveImage) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled || !previewRef.current) return;
      renderTemplate(previewRef.current, {
        cutout: adjust.removeBg,
        imageUrl: effectiveImage,
        name: product.name,
        price: product.price ?? null,
        currency: product.currency || "ALL",
        shopName: shopDetails?.shop_name || "",
        settings: { ...studio, template: activeTemplate, transform: adjust },
        format: postKind === "story" || postKind === "story_video" ? "story" : "post",
      }).catch(() => {});
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [effectiveImage, activeTemplate, adjust, studio, product, shopDetails?.shop_name, postKind]);

  const toggleRemoveBg = async (on: boolean) => {
    setAdjust((a) => ({ ...a, removeBg: on }));
    if (!on || !selectedImage || cutoutUrl) return;
    setCutoutBusy(true);
    try {
      setCutoutUrl(await removeImageBackground(selectedImage));
    } catch (e) {
      setAdjust((a) => ({ ...a, removeBg: false }));
      showError(t("ig_publish.bg_failed", { message: (e as Error).message }));
    } finally {
      setCutoutBusy(false);
    }
  };

  const queueVideoForPublish = async (kind: string) => {
    const format = kind === "story_video" ? "story" : kind === "post_video" ? "post" : "reel";
    const { data, error } = await supabase.from("video_render_jobs").insert({
      user_id: userId, product_id: product.id, format, template: studio.videoTemplate ?? "gradient",
      props: {
        imageUrl: selectedImage, videoUrl: null, name: product.name, price: product.price ?? null,
        currency: product.currency || "ALL", shopName: shopDetails?.shop_name || "", accent: studio.accent,
      },
    }).select("*").single();
    if (error) showError(error.message);
    else setVideoJob(data);
  };

  /** Render the chosen overlay client-side and upload it. */
  const resolveImageForPublish = async (): Promise<string | null> => {
    if (!effectiveImage) return selectedImage;
    const untouched = activeTemplate === "plain" && !adjust.removeBg
      && adjust.scale === 1 && adjust.offsetX === 0 && adjust.offsetY === 0;
    if (untouched) return selectedImage;
    const blob = await renderToJpegBlob({
      cutout: adjust.removeBg,
      imageUrl: effectiveImage, name: product.name, price: product.price ?? null,
      currency: product.currency || "ALL", shopName: shopDetails?.shop_name || "",
      settings: { ...studio, template: activeTemplate, transform: adjust }, format: "post",
    });
    const path = `${userId}/ig-designs/${product.id}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("product-media").upload(path, blob, {
      contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
    });
    if (upErr) throw new Error(upErr.message);
    return supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl;
  };

  const handlePublish = async () => {
    if (!caption.trim() && postKind !== "story") { showError(t("ig_publish.caption_required")); return; }
    setPublishing(true);
    try {
      let body: Record<string, unknown>;
      if (isVideoKind) {
        if (videoJob?.status !== "done" || !videoJob.output_url) { showError(t("ig_publish.video_not_ready")); setPublishing(false); return; }
        body = { productId: product.id, mode: "publish", caption, videoUrl: videoJob.output_url, publishKind: postKind === "story_video" ? "story" : "reel" };
      } else if (postKind === "story") {
        const blob = await renderToJpegBlob({
          cutout: adjust.removeBg,
          imageUrl: effectiveImage ?? selectedImage!, name: product.name, price: product.price ?? null,
          currency: product.currency || "ALL", shopName: shopDetails?.shop_name || "",
          settings: { ...studio, template: studio.storyTemplate ?? studio.template, transform: adjust }, format: "story",
        });
        const path = `${userId}/ig-designs/${product.id}-story-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("product-media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (upErr) throw new Error(upErr.message);
        body = { productId: product.id, mode: "publish", caption, imageUrl: supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl, publishKind: "story" };
      } else if (postKind === "carousel" && images.length >= 2) {
        const blobs = await renderCarouselToBlobs({
          images, name: product.name, price: product.price ?? null,
          currency: product.currency || "ALL", shopName: shopDetails?.shop_name || "",
          settings: studio, slideCount: Math.min(images.length, 10),
        });
        const urls: string[] = [];
        for (const [i, blob] of blobs.entries()) {
          const path = `${userId}/ig-designs/${product.id}-car${i}-${Date.now()}.jpg`;
          const { error: upErr } = await supabase.storage.from("product-media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
          if (upErr) throw new Error(upErr.message);
          urls.push(supabase.storage.from("product-media").getPublicUrl(path).data.publicUrl);
        }
        body = { productId: product.id, mode: "publish", caption, imageUrls: urls };
      } else {
        body = { productId: product.id, mode: "publish", caption, imageUrl: await resolveImageForPublish() };
      }
      const { data, error } = await supabase.functions.invoke("publish-product-post", { body });
      if (error) throw new Error(error.message);
      if (data?.error === "reconnect_required") { setNeedsReconnect(true); return; }
      if (data?.error) throw new Error(data.error);
      setPermalink(data.permalink ?? null);
      showSuccess(t("ig_publish.published"));
      if (Array.isArray(data.gapsFilled) && data.gapsFilled.length) {
        showSuccess(t("ig_publish.gaps_filled", { fields: data.gapsFilled.join(", ") }));
      }
      onPublished?.(data.mediaId);
    } catch (e) {
      showError(t("ig_publish.publish_failed", { message: (e as Error).message }));
    } finally {
      setPublishing(false);
    }
  };

  const fullscreen = postKind === "story" || postKind === "story_video" || postKind === "reel_video";
  const previewKind = fullscreen ? "story" : postKind === "carousel" ? "carousel" : "post";
  const carouselCount = postKind === "carousel" && images.length >= 2 ? Math.min(images.length, 10) : undefined;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!publishing) onOpenChange(o); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
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
        ) : permalink ? (
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
        ) : loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="mx-auto h-[420px] w-full max-w-[320px]" />
            <div className="space-y-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-16 w-full" /></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* ── Instagram post preview ── */}
            <div className="order-first">
              <IgPostChrome
                handle={igHandle}
                avatarUrl={igAvatar}
                kind={previewKind}
                storyOverlay="minimal"
                caption={captionParts.body}
                tags={captionParts.tags}
                slideCount={carouselCount}
                className="max-w-[320px]"
              >
                <canvas ref={previewRef} className="block w-full" />
              </IgPostChrome>
              {alreadyPublished && (
                <Alert className="mt-3">
                  <AlertDescription className="text-xs">{t("ig_publish.already_published")}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* ── Controls ── */}
            <div className="space-y-4">
              {/* post type */}
              <div className="flex flex-wrap gap-1.5">
                {(["single", "carousel", "story"] as const)
                  .filter((k) => k !== "carousel" || images.length >= 2)
                  .map((k) => (
                    <button key={k} type="button" disabled={publishing}
                      onClick={() => { setPostKind(k); if (k.endsWith("_video") && !videoJob) queueVideoForPublish(k); }}
                      className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        postKind === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                      {k === "carousel" ? t("ig_publish.kind_carousel", { count: Math.min(images.length, 10) }) : t(`ig_publish.kind_${k}`)}
                    </button>
                  ))}
              </div>

              {isVideoKind && (
                <Alert>
                  <AlertDescription className="flex items-center gap-2 text-xs">
                    {videoJob && !["done", "failed"].includes(videoJob.status) && <Spinner className="h-3.5 w-3.5" />}
                    {!videoJob ? t("ig_publish.video_queueing")
                      : videoJob.status === "done" ? t("ig_publish.video_ready")
                      : videoJob.status === "failed" ? t("ig_publish.video_failed")
                      : t("ig_publish.video_rendering")}
                  </AlertDescription>
                </Alert>
              )}

              {/* caption + hashtags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("ig_publish.caption_label")}</span>
                  <Button variant="ghost" size="sm" onClick={loadPreview} disabled={publishing}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    {t("ig_publish.regenerate")}
                  </Button>
                </div>
                <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} disabled={publishing} />
              </div>

              {/* design template */}
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

              {/* image adjust */}
              {selectedImage && (
                <div className="space-y-3 rounded-lg border p-3">
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
              )}

              {/* image picker */}
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
                        className={cn("h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                          selectedImage === url ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}
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
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            {permalink ? t("common.close", "Close") : t("common.cancel")}
          </Button>
          {!needsReconnect && !permalink && (
            <Button onClick={handlePublish} disabled={loading || publishing || !images.length || (isVideoKind && videoJob?.status !== "done")}>
              {publishing ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              {publishing ? t("ig_publish.publishing") : t("ig_publish.publish")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
