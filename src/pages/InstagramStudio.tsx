import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useShop } from "@/contexts/ShopContext";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { renderTemplate, TEMPLATE_IDS, type StudioSettings, type TemplateId } from "@/lib/igStudio";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Instagram, Clapperboard } from "lucide-react";

const ACCENT_PRESETS = ["#A31234", "#FF2E4D", "#C9A227", "#140A0E", "#1D4ED8", "#047857"];

/** Fallback subject when the merchant has no products yet. */
const PLACEHOLDER = {
  imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1080&q=80",
  name: "Atlete Retro Runner",
  price: 4900,
  currency: "ALL",
};

/** One canvas that re-renders whenever the design inputs change. */
const TemplateCanvas = ({ settings, format, subject, shopName, className }: {
  settings: StudioSettings;
  format: "post" | "story";
  subject: typeof PLACEHOLDER;
  shopName: string;
  className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const t = setTimeout(() => {
      if (!ref.current || cancelled) return;
      renderTemplate(ref.current, { ...subject, shopName, settings, format })
        .catch(() => { if (!cancelled) setFailed(true); });
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [settings, format, subject, shopName]);
  if (failed) return <div className={cn("grid place-items-center rounded-lg bg-muted text-xs text-muted-foreground", className)}>—</div>;
  return <canvas ref={ref} className={cn("h-auto w-full rounded-lg", className)} />;
};

const InstagramStudio = () => {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { shopDetails } = useShop();
  const { settings, update, isLoading } = useStudioSettings();
  const [subject, setSubject] = useState(PLACEHOLDER);
  const shopName = shopDetails?.shop_name || "Vela Shop";

  // Prefer a real product of the merchant as the preview subject.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("name, price, currency, media_url, media_type")
        .eq("user_id", userId)
        .eq("status", "Active")
        .not("media_url", "is", null)
        .neq("media_type", "video")
        .limit(1);
      const p = data?.[0];
      if (p?.media_url) setSubject({ imageUrl: p.media_url, name: p.name, price: p.price, currency: p.currency || "ALL" });
    })();
  }, [userId]);

  const set = (patch: Partial<StudioSettings>) => update(patch);
  const setCaption = (patch: Partial<StudioSettings["captionStyle"]>) => update({ captionStyle: { ...settings.captionStyle, ...patch } as StudioSettings["captionStyle"] });

  const carouselSettings = useMemo(() => settings, [settings]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Instagram className="h-6 w-6" />
          {t("ig_studio.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("ig_studio.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: templates + settings ── */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("ig_studio.templates")}</CardTitle>
              <CardDescription>{t("ig_studio.templates_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TEMPLATE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set({ template: id })}
                    className={cn(
                      "group rounded-xl border-2 p-2 text-left transition-colors",
                      settings.template === id ? "border-primary bg-primary/5" : "border-transparent hover:border-border"
                    )}
                  >
                    <TemplateCanvas
                      settings={{ ...settings, template: id }}
                      format="post"
                      subject={subject}
                      shopName={shopName}
                    />
                    <p className="mt-2 text-center text-sm font-medium">{t(`ig_studio.template_${id}`)}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("ig_studio.personalise")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label>{t("ig_studio.accent")}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENT_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set({ accent: c })}
                      className={cn("h-8 w-8 rounded-full border-2", settings.accent === c ? "border-foreground" : "border-transparent")}
                      style={{ backgroundColor: c }}
                      aria-label={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.accent}
                    onChange={(e) => set({ accent: e.target.value })}
                    className="h-8 w-8 cursor-pointer rounded-full border bg-transparent"
                    aria-label={t("ig_studio.accent_custom")}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {([
                  ["showName", "ig_studio.show_name"],
                  ["showPrice", "ig_studio.show_price"],
                  ["showLogo", "ig_studio.show_logo"],
                ] as const).map(([key, labelKey]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`sw-${key}`}>{t(labelKey)}</Label>
                    <Switch id={`sw-${key}`} checked={settings[key]} onCheckedChange={(v) => set({ [key]: v } as Partial<StudioSettings>)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("ig_studio.caption_style")}</CardTitle>
              <CardDescription>{t("ig_studio.caption_style_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("ig_studio.structure")}</Label>
                <Select value={settings.captionStyle.structure} onValueChange={(v) => setCaption({ structure: v as never })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["descriptive", "paragraph", "structured", "minimal"].map((v) => (
                      <SelectItem key={v} value={v}>{t(`ig_studio.structure_${v}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("ig_studio.tone")}</Label>
                <Select value={settings.captionStyle.tone} onValueChange={(v) => setCaption({ tone: v as never })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["friendly", "professional", "luxury", "playful"].map((v) => (
                      <SelectItem key={v} value={v}>{t(`ig_studio.tone_${v}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("ig_studio.emojis")}</Label>
                <Select value={settings.captionStyle.emojis} onValueChange={(v) => setCaption({ emojis: v as never })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["none", "light", "rich"].map((v) => (
                      <SelectItem key={v} value={v}>{t(`ig_studio.emojis_${v}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("ig_studio.language")}</Label>
                <Select value={settings.captionStyle.language} onValueChange={(v) => setCaption({ language: v as never })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq">Shqip</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>{t("ig_studio.hashtags")}</Label>
                  <span className="text-sm text-muted-foreground">{settings.captionStyle.hashtags}</span>
                </div>
                <Slider
                  value={[settings.captionStyle.hashtags]}
                  min={0} max={15} step={1}
                  onValueChange={([v]) => setCaption({ hashtags: v })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: previews per media type ── */}
        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>{t("ig_studio.preview")}</CardTitle>
            <CardDescription>{t("ig_studio.preview_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="post">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="post">{t("ig_studio.tab_post")}</TabsTrigger>
                <TabsTrigger value="story">{t("ig_studio.tab_story")}</TabsTrigger>
                <TabsTrigger value="carousel">{t("ig_studio.tab_carousel")}</TabsTrigger>
                <TabsTrigger value="video">{t("ig_studio.tab_video")}</TabsTrigger>
              </TabsList>
              <TabsContent value="post" className="mt-4">
                <TemplateCanvas settings={settings} format="post" subject={subject} shopName={shopName} />
              </TabsContent>
              <TabsContent value="story" className="mt-4">
                <TemplateCanvas settings={settings} format="story" subject={subject} shopName={shopName} className="mx-auto max-w-[260px]" />
              </TabsContent>
              <TabsContent value="carousel" className="mt-4">
                <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                  {[settings, { ...carouselSettings, showName: false }, { ...carouselSettings, showPrice: false, showName: false }].map((s, i) => (
                    <div key={i} className="w-44 shrink-0 snap-start">
                      <TemplateCanvas settings={s} format="post" subject={subject} shopName={shopName} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("ig_studio.carousel_hint")}</p>
              </TabsContent>
              <TabsContent value="video" className="mt-4">
                <div className="relative overflow-hidden rounded-lg">
                  <TemplateCanvas settings={{ ...settings, template: "plain" }} format="post" subject={subject} shopName={shopName} />
                  {/* Motion mock: the overlay elements slide in over the media. */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-16">
                      <p className="font-bold text-white">{subject.name}</p>
                      <p className="text-sm font-semibold" style={{ color: settings.accent }}>
                        {subject.price?.toLocaleString("sq-AL")} {subject.currency}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="absolute right-2 top-2 gap-1">
                    <Clapperboard className="h-3 w-3" />
                    {t("ig_studio.video_soon")}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("ig_studio.video_hint")}</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstagramStudio;
