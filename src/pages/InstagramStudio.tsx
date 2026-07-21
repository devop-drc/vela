import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import {
  renderTemplate, renderCarouselSlide, removeImageBackground,
  TEMPLATE_IDS, DEFAULT_TRANSFORM,
  type StudioSettings, type MediaKind, type CarouselTemplateId, type TemplateId,
} from "@/lib/igStudio";
import { IgChoices } from "@/components/products/IgStudioGlyphs";
import { IgPostChrome } from "@/components/products/IgPostChrome";
import {
  Instagram, RotateCcw, ImageIcon, Palette, Sun, Moon, Type,
} from "lucide-react";

const ACCENT_PRESETS = ["#A31234", "#FF2E4D", "#C9A227", "#140A0E", "#1D4ED8", "#047857"];
const CAROUSEL_TEMPLATES: CarouselTemplateId[] = ["ribbon", "gallery", "story-arc"];
// Video is disabled for now — see the commented section below.
const MEDIA_KINDS: MediaKind[] = ["post", "story", "carousel"];

/** Fixed mock product for the Studio, with a pre-made cutout so the
 *  remove-background toggle is instant (no per-toggle processing). */
const MOCK = { imageUrl: "/studio/shoe.jpg", name: "Atlete Retro Runner", price: 4900, currency: "ALL" };
const MOCK_CUTOUT = "/studio/shoe-cutout.png";
type Subject = { imageUrl: string; name: string; price: number | null; currency: string; cutout?: boolean };

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
    }, 100);
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
    }, 100);
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

/** Grouped-section header (Storefront-Studio style). */
const Group = ({ icon: Icon, title, desc, children }: { icon: any; title: string; desc?: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
        {title}
      </CardTitle>
      {desc && <CardDescription>{desc}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-5">{children}</CardContent>
  </Card>
);

const InstagramStudio = () => {
  const { t } = useTranslation();
  const { shopDetails } = useShop();
  const { settings, update, isLoading } = useStudioSettings();
  const [mediaKind, setMediaKind] = useState<MediaKind>("post");
  const [carouselSlides, setCarouselSlides] = useState(3);
  const [cutoutReady, setCutoutReady] = useState(false);

  const shopName = shopDetails?.shop_name || "Vela Shop";
  const slug = shopDetails?.slug || "dyqani-yt";
  const handle = (shopDetails?.username || slug || shopName.toLowerCase().replace(/\s+/g, ""))!;

  // Warm the mock cutout image once so the toggle is instant.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setCutoutReady(true);
    img.src = MOCK_CUTOUT;
  }, []);

  const removeBg = settings.transform.removeBg;
  const subject: Subject = removeBg
    ? { ...MOCK, imageUrl: MOCK_CUTOUT, cutout: true }
    : { ...MOCK, cutout: false };

  const set = (patch: Partial<StudioSettings>) => update(patch);
  const setCaption = (patch: Partial<StudioSettings["captionStyle"]>) => update({ captionStyle: { ...settings.captionStyle, ...patch } as StudioSettings["captionStyle"] });
  const setTransform = (patch: Partial<StudioSettings["transform"]>) => update({ transform: { ...settings.transform, ...patch } as StudioSettings["transform"] });

  const caption = sampleCaption(settings, subject, shopName, slug);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl space-y-4 p-1">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 xl:grid-cols-3"><Skeleton className="h-96 xl:col-span-2" /><Skeleton className="h-96" /></div>
      </div>
    );
  }

  // The template gallery for the currently selected content type.
  const templateGallery = mediaKind === "carousel" ? (
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
  ) : (
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
  );

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4 md:space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
          <Instagram className="h-6 w-6" />{t("ig_studio.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("ig_studio.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        {/* ── Right: sticky preview with post-type buttons above it ── */}
        <div className="order-first xl:order-last">
          <div className="xl:sticky xl:top-4 space-y-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {MEDIA_KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setMediaKind(k)}
                  className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                    mediaKind === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  {t(`ig_studio.tab_${k}`)}
                </button>
              ))}
            </div>
            <Card>
              <CardContent className="p-4">
                {mediaKind === "post" && (
                  <IgPostChrome handle={handle} avatarUrl={shopDetails?.logo_url} caption={caption.text} tags={caption.tags} kind="post"
                    likesLabel={t("ig_studio.pv_likes")} translationLabel={t("ig_studio.pv_translation")}>
                    <TemplateCanvas settings={settings} format="post" subject={subject} shopName={shopName} />
                  </IgPostChrome>
                )}
                {mediaKind === "story" && (
                  <IgPostChrome handle={handle} avatarUrl={shopDetails?.logo_url} kind="story" replyLabel={t("ig_studio.pv_reply")}>
                    <TemplateCanvas settings={{ ...settings, template: settings.storyTemplate }} format="story" subject={subject} shopName={shopName} />
                  </IgPostChrome>
                )}
                {mediaKind === "carousel" && (
                  <>
                    <IgPostChrome handle={handle} avatarUrl={shopDetails?.logo_url} caption={caption.text} tags={caption.tags} kind="carousel" slideCount={carouselSlides}
                      likesLabel={t("ig_studio.pv_likes")} translationLabel={t("ig_studio.pv_translation")}>
                      {/* scrollable — swipe through every connected slide */}
                      <div className="flex snap-x snap-mandatory overflow-x-auto">
                        {Array.from({ length: carouselSlides }, (_, i) => (
                          <div key={i} className="w-full shrink-0 snap-center">
                            <CarouselCanvas settings={settings} subject={subject} shopName={shopName} index={i} count={carouselSlides} />
                          </div>
                        ))}
                      </div>
                    </IgPostChrome>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {t("ig_studio.car_splits", { count: carouselSlides })}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Left: grouped settings ── */}
        <div className="min-w-0 space-y-4 md:space-y-6 xl:col-span-2">
          {/* Design */}
          <Group icon={Palette} title={t("ig_studio.group_design")} desc={t("ig_studio.group_design_desc")}>
            <div className="space-y-2">
              <Label>{t(`ig_studio.type_${mediaKind}`)}</Label>
              {templateGallery}
            </div>
            {mediaKind === "carousel" && (
              <div className="max-w-xs space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("ig_studio.car_slides")}</Label>
                  <span className="text-sm text-muted-foreground">{carouselSlides}</span>
                </div>
                <Slider value={[carouselSlides]} min={2} max={6} step={1} onValueChange={([v]) => setCarouselSlides(v)} />
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("ig_studio.post_mode")}</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["light", "dark"] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => set({ postMode: mode })}
                      className={cn("flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 text-sm font-medium transition-colors",
                        settings.postMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>
                      {mode === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {t(`ig_studio.mode_${mode}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
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
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {([["showName", "ig_studio.show_name"], ["showPrice", "ig_studio.show_price"], ["showLogo", "ig_studio.show_logo"]] as const).map(([key, labelKey]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <Label htmlFor={`sw-${key}`} className="text-sm">{t(labelKey)}</Label>
                  <Switch id={`sw-${key}`} checked={settings[key]} onCheckedChange={(v) => set({ [key]: v } as Partial<StudioSettings>)} />
                </div>
              ))}
            </div>
          </Group>

          {/* Product photo */}
          <Group icon={ImageIcon} title={t("ig_studio.group_photo")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <IgChoices kind="fit" cols={2}
                options={[{ value: "cover", label: t("ig_studio.fit_cover") }, { value: "contain", label: t("ig_studio.fit_contain") }]}
                value={settings.transform.fit} onChange={(v) => setTransform({ fit: v as "cover" | "contain" })} />
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <Label htmlFor="sw-removebg" className="block">{t("ig_studio.remove_bg")}</Label>
                  <p className="text-xs text-muted-foreground">{t("ig_studio.remove_bg_hint")}</p>
                </div>
                {!cutoutReady && removeBg
                  ? <Spinner className="h-5 w-5 shrink-0" />
                  : <Switch id="sw-removebg" checked={removeBg} onCheckedChange={(v) => setTransform({ removeBg: v })} />}
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {([["scale", t("ig_studio.zoom"), 0.5, 2.5], ["offsetX", t("ig_studio.pos_x"), -1, 1], ["offsetY", t("ig_studio.pos_y"), -1, 1]] as const).map(([key, label, min, max]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <span className="text-xs text-muted-foreground">{(settings.transform[key] as number).toFixed(2)}</span>
                  </div>
                  <Slider value={[settings.transform[key] as number]} min={min} max={max} step={0.05} onValueChange={([v]) => setTransform({ [key]: v } as never)} />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setTransform({ ...DEFAULT_TRANSFORM })}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />{t("ig_studio.reset_media")}
            </Button>
          </Group>

          {/* Caption */}
          <Group icon={Type} title={t("ig_studio.group_caption")} desc={t("ig_studio.caption_style_desc")}>
            <IgChoices label={t("ig_studio.structure")} kind="structure"
              options={["descriptive", "paragraph", "structured", "minimal"].map((v) => ({ value: v, label: t(`ig_studio.structure_${v}`) }))}
              value={settings.captionStyle.structure} onChange={(v) => setCaption({ structure: v as never })} />
            <IgChoices label={t("ig_studio.tone")} kind="tone"
              options={["friendly", "professional", "luxury", "playful"].map((v) => ({ value: v, label: t(`ig_studio.tone_${v}`) }))}
              value={settings.captionStyle.tone} onChange={(v) => setCaption({ tone: v as never })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <IgChoices label={t("ig_studio.emojis")} kind="emojis" cols={3}
                options={["none", "light", "rich"].map((v) => ({ value: v, label: t(`ig_studio.emojis_${v}`) }))}
                value={settings.captionStyle.emojis} onChange={(v) => setCaption({ emojis: v as never })} />
              <IgChoices label={t("ig_studio.language")} kind="language" cols={2}
                options={[{ value: "sq", label: "Shqip" }, { value: "en", label: "English" }]}
                value={settings.captionStyle.language} onChange={(v) => setCaption({ language: v as never })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("ig_studio.hashtags")}</Label>
                <span className="text-sm text-muted-foreground">{settings.captionStyle.hashtags}</span>
              </div>
              <Slider value={[settings.captionStyle.hashtags]} min={0} max={15} step={1} onValueChange={([v]) => setCaption({ hashtags: v })} />
            </div>
          </Group>

          {/* ── Video generation — disabled for now (kept for later) ──
          <Group icon={Clapperboard} title={t("ig_studio.type_video")} desc={t("ig_studio.type_video_desc")}>
            ...animated Remotion template previews + format + Generate button...
          </Group>
          */}
        </div>
      </div>
    </div>
  );
};

export default InstagramStudio;
