/**
 * Demo Storefront Studio — the REAL storefront components rendered over mock
 * data (same approach as /demo-shop), with an interactive template picker so
 * visitors can restyle the whole shop live, plus an Instagram-storefront
 * showcase. Zero network.
 */
import { useMemo, useState } from "react";
import {
  Store, Instagram, Palette, Monitor, Smartphone, Dices, Check, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { StorefrontContext } from "@/contexts/StorefrontContext";
import { CartProvider } from "@/contexts/CartContext";
import { StorefrontThemeProvider } from "@/storefront/theme/StorefrontThemeProvider";
import { SectionRenderer } from "@/storefront/blocks/SectionRenderer";
import { Header } from "@/storefront/components/Header";
import { Footer } from "@/storefront/components/Footer";
import { TEMPLATES } from "@/storefront/templates";
import { MOCK_CONTEXT } from "@/pages/DemoShop";

import { IGShowcase } from "./IGShowcase";

const swatches = (t: (typeof TEMPLATES)[number]) => {
  const k = t.config.theme.tokens;
  return [k.primary, k.background, k.accent].map((h) => `hsl(${h})`);
};

/* Live custom-storefront preview (real components, mock data). */
const StorefrontPreview = ({ templateId }: { templateId: string }) => {
  const config = useMemo(
    () => (TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]).config,
    [templateId],
  );
  return (
    <StorefrontContext.Provider value={MOCK_CONTEXT as any}>
      <CartProvider>
        <StorefrontThemeProvider config={config} className="min-h-full">
          <Header />
          <main className="sf-container py-8">
            <SectionRenderer sections={config.pages.home} />
          </main>
          <Footer />
        </StorefrontThemeProvider>
      </CartProvider>
    </StorefrontContext.Provider>
  );
};

const DeviceFrame = ({ device, children }: { device: "desktop" | "mobile"; children: React.ReactNode }) => (
  <div
    className={cn(
      "mx-auto overflow-hidden rounded-xl border bg-card shadow-2xl transition-all duration-300",
      device === "desktop" ? "w-full max-w-[1100px]" : "w-[390px] max-w-full",
    )}
  >
    {/* browser chrome */}
    <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
      <div className="ml-2 flex-1 truncate rounded-md bg-background/70 px-3 py-1 text-center text-[11px] text-muted-foreground">
        vela.al/shop/butiku-i-elires
      </div>
    </div>
    <div className="h-[calc(100vh-230px)] overflow-y-auto">{children}</div>
  </div>
);

const DemoStorefront = () => {
  const [mode, setMode] = useState<"custom" | "instagram">("custom");
  const [templateId, setTemplateId] = useState("studio");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const surprise = () => {
    const others = TEMPLATES.filter((t) => t.id !== templateId);
    setTemplateId(others[(others.length * 0.618 * (Date.now() % 97)) % others.length | 0]?.id ?? "studio");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Storefront-style toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-none">Storefront style</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Pick how customers see your shop</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            <button
              onClick={() => setMode("instagram")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "instagram" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
            >
              <Instagram className="h-4 w-4" /> Instagram
            </button>
            <button
              onClick={() => setMode("custom")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}
            >
              <Palette className="h-4 w-4" /> Custom design
            </button>
          </div>
        </div>
      </div>

      {mode === "instagram" ? (
        <div className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">
          <IGShowcase />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Left rail — template + device controls */}
          <div className="hidden w-[300px] shrink-0 flex-col border-r bg-card lg:flex">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <span className="text-sm font-semibold">Templates</span>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={surprise}>
                <Dices className="h-3.5 w-3.5" /> Surprise me
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 gap-2 p-3">
                {TEMPLATES.map((t) => {
                  const active = t.id === templateId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all",
                        active ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40 hover:bg-accent",
                      )}
                    >
                      <div className="flex shrink-0 gap-0.5">
                        {swatches(t).map((c, i) => (
                          <span key={i} className="h-8 w-3 first:rounded-l-md last:rounded-r-md" style={{ background: c }} />
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{t.name}</span>
                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">{t.businessType}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="border-t p-3 text-[11px] text-muted-foreground">
              Every template restyles colors, fonts, layout & sections — the live preview updates instantly.
            </div>
          </div>

          {/* Preview */}
          <div className="flex min-w-0 flex-1 flex-col bg-muted/30">
            <div className="flex items-center justify-between gap-2 border-b bg-card/60 px-4 py-2">
              <span className="text-sm font-medium capitalize">
                {TEMPLATES.find((t) => t.id === templateId)?.name} template
              </span>
              <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
                <button
                  onClick={() => setDevice("desktop")}
                  className={cn("rounded-md p-1.5", device === "desktop" ? "bg-accent text-foreground" : "text-muted-foreground")}
                  aria-label="Desktop"
                >
                  <Monitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className={cn("rounded-md p-1.5", device === "mobile" ? "bg-accent text-foreground" : "text-muted-foreground")}
                  aria-label="Mobile"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <DeviceFrame device={device}>
                <StorefrontPreview templateId={templateId} />
              </DeviceFrame>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoStorefront;
