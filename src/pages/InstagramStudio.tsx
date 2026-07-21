import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Player } from "@remotion/player";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import {
  renderTemplate, renderCarouselSlide, removeImageBackground,
  TEMPLATE_IDS, DEFAULT_TRANSFORM,
  type StudioSettings, type MediaKind, type CarouselTemplateId, type VideoTemplateId, type TemplateId,
} from "@/lib/igStudio";
import { ProductPromo } from "@/compositions/ProductPromo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import {
  Instagram, RotateCcw, ImageIcon, Heart, MessageCircle, Send, Bookmark,
  MoreHorizontal, Music2, Clapperboard, Download,
} from "lucide-react";

const ACCENT_PRESETS = ["#A31234", "#FF2E4D", "#C9A227", "#140A0E", "#1D4ED8", "#047857"];
const CAROUSEL_TEMPLATES: CarouselTemplateId[] = ["ribbon", "gallery", "story-arc"];
const VIDEO_TEMPLATES: VideoTemplateId[] = ["gradient", "banner", "badge"];
const MEDIA_KINDS: MediaKind[] = ["post", "story", "carousel", "video"];
const VIDEO_FORMATS = ["post", "story", "reel"] as const;
type VideoFormat = (typeof VIDEO_FORMATS)[number];

const PLACEHOLDER = {
  imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1080&q=80",
  name: "Atlete Retro Runner",
  price: 4900,
  currency: "ALL",
};
type Subject = typeof PLACEHOLDER & { id?: string };

/* ── canvas preview atoms ── */
const TemplateCanvas = ({ settings, format, subject, shopName, className }: {
  settings: StudioSettings; format: "post" | "story"; subject: Subject; shopName: string; className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!ref.current || cancelled) return;
      renderTemplate(ref.current, { ...subject, shopName, settings, format }).catch(() => {});
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [settings, format, subject, shopName]);
  return <canvas ref={ref} className={cn("h-auto w-full max-w-full", className)} />;
};

const CarouselCanvas = ({ settings, subject, shopName, index, count, className }: {
  settings: StudioSettings; subject: Subject; shopName: string; index: number; count: number; className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (!ref.current || cancelled) return;
      renderCarouselSlide(ref.current, {
        images: [subject.imageUrl], name: subject.name, price: subject.price,
        currency: subject.currency, shopName, settings, slideCount: count,
      }, index).catch(() => {});
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [settings, subject, shopName, index, count]);
  return <canvas ref={ref} className={cn("h-auto w-full max-w-full", className)} />;
};

/** Sample caption in the merchant's configured style (no API call). */
const sampleCaption = (s: StudioSettings, subject: Subject, shopName: string, slug: string) => {
  const cs = s.captionStyle;
  const sq = cs.language !== "en";
  const price = `${subject.price?.toLocaleString("sq-AL")} ${subject.currency}`;
  const e = cs.emojis === "none" ? ["", "", ""] : cs.emojis === "rich" ? ["🔥✨ ", " 👟💨", " 🛒👇"] : ["", " ✨", " 👇"];
  const link = `instantshop.al/shop/${slug}`;
  const hooks: Record<string, string> = {
    friendly: sq ? `${e[0]}Erdhën më në fund!` : `${e[0]}They're finally here!`,
    professional: sq ? `${e[0]}Risi në koleksion.` : `${e[0]}New in the collection.`,
    luxury: sq ? `${e[0]}Një klasik i heshtur.` : `${e[0]}A quiet classic.`,
    playful: sq ? `${e[0]}Po, po — janë aq të mira sa duken.` : `${e[0]}Yep — as good as they look.`,
  };
  const hook = hooks[cs.tone] ?? hooks.friendly;
  const cta = sq ? `Porosit online${e[2]} ${link}` : `Order online${e[2]} ${link}`;
  const body =
    cs.structure === "minimal" ? `${subject.name} — ${price}` :
    cs.structure === "structured" ? `▪ ${subject.name}${e[1]}\n▪ ${price}\n▪ ${sq ? "Dërgesa në gjithë Shqipërinë" : "Delivery nationwide"}` :
    cs.structure === "paragraph" ? (sq ? `${subject.name} sapo mbërriti te ${shopName} — komod, i lehtë dhe vetëm ${price}.` : `${subject.name} just landed at ${shopName} — comfy, light and only ${price}.`) :
    `${subject.name}${e[1]}\n${price} · ${sq ? "të gjitha masat" : "all sizes"}`;
  const tags = Array.from({ length: Math.min(cs.hashtags, 8) }, (_, i) =>
    ["#" + shopName.toLowerCase().replace(/\s+/g, ""), "#dyqanionline", "#blerjeonline", "#shqiperi", "#porosit", "#moda", "#tirana", "#vela"][i]
  ).filter(Boolean).join(" ");
  return { text: `${hook}\n${body}\n${cta}`, tags };
};

/* ── realistic Instagram preview ── */
const IgChrome = ({ shopName, logoUrl, children, caption, tags, kind }: {
  shopName: string; logoUrl?: string | null; children: React.ReactNode;
  caption: string; tags: string; kind: MediaKind;
}) => {
  const { t } = useTranslation();
  const avatar = logoUrl
    ? <img src={logoUrl} alt="" className="h-full w-full object-cover" />
    : <div className="grid h-full w-full place-items-center bg-primary/15 text-[10px] font-bold text-primary">{shopName.slice(0, 2).toUpperCase()}</div>;
  const fullscreen = kind === "story" || kind === "video";
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border bg-background shadow-lg">
      {!fullscreen && (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-pink-500/60 ring-offset-1">{avatar}</span>
          <span className="text-sm font-semibold">{shopName.toLowerCase().replace(/\s+/g, ".")}</span>
          <MoreHorizontal className="ml-auto h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="relative">
        {children}
        {fullscreen && (
          <>
            {kind === "story" && (
              <div className="absolute inset-x-2 top-2 flex gap-1">
                <div className="h-0.5 flex-1 rounded bg-white" />
                <div className="h-0.5 flex-1 rounded bg-white/40" />
              </div>
            )}
            <div className="absolute left-2 top-4 flex items-center gap-2">
              <span className="h-7 w-7 overflow-hidden rounded-full">{avatar}</span>
              <span className="text-xs font-semibold text-white drop-shadow">{shopName.toLowerCase().replace(/\s+/g, ".")}</span>
              <span className="text-[10px] text-white/70">2h</span>
            </div>
            {kind === "video" && (
              <div className="absolute bottom-16 right-2 flex flex-col items-center gap-3 text-white drop-shadow">
                <Heart className="h-6 w-6" /><MessageCircle className="h-6 w-6" /><Send className="h-6 w-6" />
                <Music2 className="h-4 w-4" />
              </div>
            )}
            {kind === "story" && (
              <div className="absolute inset-x-4 bottom-3 flex items-center gap-2">
                <div className="flex-1 rounded-full border border-white/60 px-3 py-1.5 text-xs text-white/80">{t("ig_studio.pv_reply")}</div>
                <Heart className="h-5 w-5 text-white" /><Send className="h-5 w-5 text-white" />
              </div>
            )}
          </>
        )}
      </div>
      {!fullscreen && (
        <div className="space-y-1.5 px-3 py-2.5">
          <div className="flex items-center gap-3.5">
            <Heart className="h-5 w-5" /><MessageCircle className="h-5 w-5" /><Send className="h-5 w-5" />
            {kind === "carousel" && (
              <span className="mx-auto flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              </span>
            )}
            <Bookmark className="ml-auto h-5 w-5" />
          </div>
          <p className="text-xs font-semibold">{t("ig_studio.pv_likes")}</p>
          <p className="whitespace-pre-line text-xs leading-snug">
            <span className="font-semibold">{shopName.toLowerCase().replace(/\s+/g, ".")}</span> {caption}
            {tags && <span className="text-blue-600 dark:text-blue-400"> {tags}</span>}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">{t("ig_studio.pv_translation")}</p>
        </div>
      )}
    </div>
  );
};

const InstagramStudio = () => {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { shopDetails } = useShop();
  const { settings, update, isLoading } = useStudioSettings();
  const [rawSubject, setRawSubject] = useState<Subject>(PLACEHOLDER);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [cutoutBusy, setCutoutBusy] = useState(false);
  const [mediaKind, setMediaKind] = useState<MediaKind>("post");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("reel");
  const [carouselSlides, setCarouselSlides] = useState(3);
  const [renderJob, setRenderJob] = useState<any | null>(null);
  const shopName = shopDetails?.shop_name || "Vela Shop";
  const slug = shopDetails?.slug || "dyqani-yt";

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("products")
        .select("id, name, price, currency, media_url, media_type")
        .eq("user_id", userId).eq("status", "Active")
        .not("media_url", "is", null).neq("media_type", "video").limit(1);
      const p = data?.[0];
      if (p?.media_url) setRawSubject({ id: p.id, imageUrl: p.media_url, name: p.name, price: p.price, currency: p.currency || "ALL" });
    })();
  }, [userId]);

  // Poll the latest render job while it's in flight.
  useEffect(() => {
    if (!renderJob || ["done", "failed"].includes(renderJob.status)) return;
    const iv = setInterval(async () => {
      const { data } = await supabase.from("video_render_jobs").select("*").eq("id", renderJob.id).maybeSingle();
      if (data) setRenderJob(data);
    }, 5000);
    return () => clearInterval(iv);
  }, [renderJob]);

  const subject = settings.transform.removeBg && cutoutUrl ? { ...rawSubject, imageUrl: cutoutUrl } : rawSubject;
  const set = (patch: Partial<StudioSettings>) => update(patch);
  const setCaption = (patch: Partial<StudioSettings["captionStyle"]>) => update({ captionStyle: { ...settings.captionStyle, ...patch } as StudioSettings["captionStyle"] });
  const setTransform = (patch: Partial<StudioSettings["transform"]>) => update({ transform: { ...settings.transform, ...patch } as StudioSettings["transform"] });

  const toggleRemoveBg = async (on: boolean) => {
    setTransform({ removeBg: on });
    if (!on || cutoutUrl) return;
    setCutoutBusy(true);
    try { setCutoutUrl(await removeImageBackground(rawSubject.imageUrl)); }
    catch { setTransform({ removeBg: false }); }
    finally { setCutoutBusy(false); }
  };

  const queueVideo = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("video_render_jobs").insert({
      user_id: userId, product_id: rawSubject.id ?? null,
      format: videoFormat, template: settings.videoTemplate,
      props: {
        imageUrl: rawSubject.imageUrl, videoUrl: null, name: subject.name,
        price: subject.price, currency: subject.currency, shopName, accent: settings.accent,
      },
    }).select("*").single();
    if (error) { showError(t("ig_studio.vid_queue_failed", { message: error.message })); return; }
    setRenderJob(data);
    showSuccess(t("ig_studio.vid_queued_toast"));
  };

  const caption = sampleCaption(settings, subject, shopName, slug);
  const playerSize = videoFormat === "post" ? { w: 1080, h: 1350 } : { w: 1080, h: 1920 };
  const promoProps = {
    videoUrl: null, imageUrl: subject.imageUrl, name: subject.name,
    price: subject.price, currency: subject.currency, shopName,
    accent: settings.accent, template: settings.videoTemplate,
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl space-y-4 p-1">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 xl:grid-cols-3"><Skeleton className="h-96 xl:col-span-2" /><Skeleton className="h-96" /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
            <Instagram className="h-6 w-6" />{t("ig_studio.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("ig_studio.subtitle")}</p>
        </div>
        {/* Content-type switcher — drives the type card AND the preview */}
        <div className="flex flex-wrap gap-1.5">
          {MEDIA_KINDS.map((k) => (
            <button key={k} type="button" onClick={() => setMediaKind(k)}
              className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                mediaKind === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {t(`ig_studio.tab_${k}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        {/* ── Preview: exactly how it looks on Instagram ── */}
        <Card className="order-first h-fit min-w-0 xl:order-last xl:sticky xl:top-4">
          <CardHeader className="pb-3">
            <CardTitle>{t("ig_studio.preview")}</CardTitle>
            <CardDescription>{t("ig_studio.preview_ig_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {mediaKind === "post" && (
              <IgChrome shopName={shopName} logoUrl={shopDetails?.logo_url} caption={caption.text} tags={caption.tags} kind="post">
                <TemplateCanvas settings={settings} format="post" subject={subject} shopName={shopName} />
              </IgChrome>
            )}
            {mediaKind === "story" && (
              <IgChrome shopName={shopName} logoUrl={shopDetails?.logo_url} caption="" tags="" kind="story">
                <TemplateCanvas settings={{ ...settings, template: settings.storyTemplate }} format="story" subject={subject} shopName={shopName} />
              </IgChrome>
            )}
            {mediaKind === "carousel" && (
              <IgChrome shopName={shopName} logoUrl={shopDetails?.logo_url} caption={caption.text} tags={caption.tags} kind="carousel">
                <div className="flex snap-x snap-mandatory overflow-x-auto">
                  {Array.from({ length: carouselSlides }, (_, i) => (
                    <div key={i} className="w-full shrink-0 snap-center">
                      <CarouselCanvas settings={settings} subject={subject} shopName={shopName} index={i} count={carouselSlides} />
                    </div>
                  ))}
                </div>
              </IgChrome>
            )}
            {mediaKind === "video" && (
              <IgChrome shopName={shopName} logoUrl={shopDetails?.logo_url} caption="" tags="" kind="video">
                <Player
                  component={ProductPromo as never}
                  inputProps={promoProps}
                  durationInFrames={450}
                  fps={30}
                  compositionWidth={playerSize.w}
                  compositionHeight={playerSize.h}
                  style={{ width: "100%" }}
                  autoPlay loop
                  controls={false}
                  acknowledgeRemotionLicense
                />
              </IgChrome>
            )}
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4 md:space-y-6 xl:col-span-2">
          {/* ── Card 1: general settings for ALL content ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t("ig_studio.general")}</CardTitle>
              <CardDescription>{t("ig_studio.general_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label>{t("ig_studio.accent")}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((c) => (
                    <button key={c} type="button" onClick={() => set({ accent: c })}
                      className={cn("h-8 w-8 rounded-full border-2", settings.accent === c ? "border-foreground" : "border-transparent")}
                      style={{ backgroundColor: c }} aria-label={c} />
                  ))}
                  <input type="color" value={settings.accent} onChange={(e) => set({ accent: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded-full border bg-transparent" aria-label={t("ig_studio.accent_custom")} />
                </div>
              </div>
              <div className="space-y-3">
                {([["showName", "ig_studio.show_name"], ["showPrice", "ig_studio.show_price"], ["showLogo", "ig_studio.show_logo"]] as const).map(([key, labelKey]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`sw-${key}`}>{t(labelKey)}</Label>
                    <Switch id={`sw-${key}`} checked={settings[key]} onCheckedChange={(v) => set({ [key]: v } as Partial<StudioSettings>)} />
                  </div>
                ))}
              </div>
              <div className="space-y-4 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
                <div className="space-y-2">
                  <Label>{t("ig_studio.structure")}</Label>
                  <Select value={settings.captionStyle.structure} onValueChange={(v) => setCaption({ structure: v as never })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["descriptive", "paragraph", "structured", "minimal"].map((v) => <SelectItem key={v} value={v}>{t(`ig_studio.structure_${v}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("ig_studio.tone")}</Label>
                  <Select value={settings.captionStyle.tone} onValueChange={(v) => setCaption({ tone: v as never })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["friendly", "professional", "luxury", "playful"].map((v) => <SelectItem key={v} value={v}>{t(`ig_studio.tone_${v}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("ig_studio.emojis")}</Label>
                  <Select value={settings.captionStyle.emojis} onValueChange={(v) => setCaption({ emojis: v as never })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["none", "light", "rich"].map((v) => <SelectItem key={v} value={v}>{t(`ig_studio.emojis_${v}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("ig_studio.language")}</Label>
                  <Select value={settings.captionStyle.language} onValueChange={(v) => setCaption({ language: v as never })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="sq">Shqip</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("ig_studio.hashtags")}</Label>
                    <span className="text-sm text-muted-foreground">{settings.captionStyle.hashtags}</span>
                  </div>
                  <Slider value={[settings.captionStyle.hashtags]} min={0} max={15} step={1} onValueChange={([v]) => setCaption({ hashtags: v })} />
                </div>
              </div>
              {/* media transform */}
              <div className="space-y-4 border-t pt-4 sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" />{t("ig_studio.fit")}</Label>
                  <Select value={settings.transform.fit} onValueChange={(v) => setTransform({ fit: v as "cover" | "contain" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cover">{t("ig_studio.fit_cover")}</SelectItem><SelectItem value="contain">{t("ig_studio.fit_contain")}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <Label htmlFor="sw-removebg" className="block">{t("ig_studio.remove_bg")}</Label>
                    <p className="text-xs text-muted-foreground">{t("ig_studio.remove_bg_hint")}</p>
                  </div>
                  {cutoutBusy ? <Spinner className="h-5 w-5 shrink-0" /> : <Switch id="sw-removebg" checked={settings.transform.removeBg} onCheckedChange={toggleRemoveBg} />}
                </div>
                {([["scale", t("ig_studio.zoom"), 0.5, 2.5], ["offsetX", t("ig_studio.pos_x"), -1, 1], ["offsetY", t("ig_studio.pos_y"), -1, 1]] as const).map(([key, label, min, max]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{label}</Label>
                      <span className="text-xs text-muted-foreground">{(settings.transform[key] as number).toFixed(2)}</span>
                    </div>
                    <Slider value={[settings.transform[key] as number]} min={min} max={max} step={0.05} onValueChange={([v]) => setTransform({ [key]: v } as never)} />
                  </div>
                ))}
                <div className="flex items-end">
                  <Button variant="outline" size="sm" onClick={() => setTransform({ ...DEFAULT_TRANSFORM })}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />{t("ig_studio.reset_media")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Card 2: settings specific to the selected content type ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t(`ig_studio.type_${mediaKind}`)}</CardTitle>
              <CardDescription>{t(`ig_studio.type_${mediaKind}_desc`)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(mediaKind === "post" || mediaKind === "story") && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 2xl:grid-cols-4">
                  {TEMPLATE_IDS.map((id) => (
                    <button key={id} type="button"
                      onClick={() => set(mediaKind === "post" ? { template: id } : { storyTemplate: id })}
                      className={cn("group min-w-0 rounded-xl border-2 p-1.5 text-left transition-colors sm:p-2",
                        (mediaKind === "post" ? settings.template : settings.storyTemplate) === id ? "border-primary bg-primary/5" : "border-transparent hover:border-border")}>
                      <TemplateCanvas settings={{ ...settings, template: id }} format={mediaKind === "story" ? "story" : "post"} subject={subject} shopName={shopName} className="rounded-lg" />
                      <p className="mt-1.5 truncate text-center text-xs font-medium sm:text-sm">{t(`ig_studio.template_${id}`)}</p>
                    </button>
                  ))}
                </div>
              )}
              {mediaKind === "carousel" && (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {CAROUSEL_TEMPLATES.map((id) => (
                      <button key={id} type="button" onClick={() => set({ carouselTemplate: id })}
                        className={cn("group min-w-0 rounded-xl border-2 p-1.5 text-left transition-colors sm:p-2",
                          settings.carouselTemplate === id ? "border-primary bg-primary/5" : "border-transparent hover:border-border")}>
                        <CarouselCanvas settings={{ ...settings, carouselTemplate: id }} subject={subject} shopName={shopName} index={0} count={3} className="rounded-lg" />
                        <p className="mt-1.5 truncate text-center text-xs font-medium sm:text-sm">{t(`ig_studio.car_${id.replace("-", "_")}`)}</p>
                      </button>
                    ))}
                  </div>
                  <div className="max-w-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>{t("ig_studio.car_slides")}</Label>
                      <span className="text-sm text-muted-foreground">{carouselSlides}</span>
                    </div>
                    <Slider value={[carouselSlides]} min={2} max={6} step={1} onValueChange={([v]) => setCarouselSlides(v)} />
                  </div>
                </>
              )}
              {mediaKind === "video" && (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {VIDEO_TEMPLATES.map((id) => (
                      <button key={id} type="button" onClick={() => set({ videoTemplate: id })}
                        className={cn("group min-w-0 overflow-hidden rounded-xl border-2 p-1.5 text-left transition-colors sm:p-2",
                          settings.videoTemplate === id ? "border-primary bg-primary/5" : "border-transparent hover:border-border")}>
                        {/* animated template preview */}
                        <div className="overflow-hidden rounded-lg">
                          <Player component={ProductPromo as never} inputProps={{ ...promoProps, template: id }}
                            durationInFrames={450} fps={30} compositionWidth={1080} compositionHeight={1350}
                            style={{ width: "100%" }} autoPlay loop controls={false} acknowledgeRemotionLicense />
                        </div>
                        <p className="mt-1.5 truncate text-center text-xs font-medium sm:text-sm">{t(`ig_studio.template_${id}`)}</p>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-2">
                      <Label>{t("ig_studio.vid_format")}</Label>
                      <Select value={videoFormat} onValueChange={(v) => setVideoFormat(v as VideoFormat)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{VIDEO_FORMATS.map((f) => <SelectItem key={f} value={f}>{t(`ig_studio.vidfmt_${f}`)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={queueVideo} disabled={renderJob && !["done", "failed"].includes(renderJob.status)}>
                      <Clapperboard className="mr-2 h-4 w-4" />{t("ig_studio.vid_generate")}
                    </Button>
                    {renderJob && (
                      <Badge variant={renderJob.status === "failed" ? "destructive" : "secondary"} className="gap-1.5">
                        {["queued", "rendering"].includes(renderJob.status) && <Spinner className="h-3 w-3" />}
                        {t(`ig_studio.vid_${renderJob.status}`)}
                      </Badge>
                    )}
                    {renderJob?.status === "done" && renderJob.output_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={renderJob.output_url} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />{t("ig_studio.vid_download")}</a>
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("ig_studio.vid_async_hint")}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InstagramStudio;
