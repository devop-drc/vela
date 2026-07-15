/**
 * The "how it works" motion graphic (Remotion, played via @remotion/player).
 * Ten chapters, four phases — replicating the REAL surfaces: Instagram's
 * profile UI, the admin panel chrome, and the actual storefront components
 * (Header-equivalent + ProductCard + token engine) over demo data.
 * Scenes cross-dissolve with a soft blur; an info bar narrates every step.
 */
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, Easing } from "remotion";
import {
  ShoppingBag, Sparkles, Check, Bell, CreditCard, Banknote, Search, Lock,
  Grid3X3, Film, Tag, Home, Package, Archive, Settings, Plus, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { StorefrontContext } from "@/contexts/StorefrontContext";
import { CartProvider } from "@/contexts/CartContext";
import { StorefrontThemeProvider } from "@/storefront/theme/StorefrontThemeProvider";
import { ProductCard } from "@/storefront/components/ProductCard";
import { TEMPLATES } from "@/storefront/templates";
import { MOCK_CONTEXT, PRODUCTS, SHOP } from "@/pages/DemoShop";
import type { LandingCopy } from "../copy";

export const FPS = 30;
export const SCENE_FRAMES = 95;
export const SCENES = 10;
export const TOTAL_FRAMES = SCENE_FRAMES * SCENES;

const BRAND = "brand-gradient";

/* ── helpers ─────────────────────────────────────────────────────────── */
const inAt = (frame: number, delay = 0, damping = 14) =>
  spring({ frame: frame - delay, fps: FPS, config: { damping } });

const typed = (frame: number, text: string, start: number, cps = 2) =>
  text.slice(0, Math.max(0, Math.floor((frame - start) / cps)));

const Cursor = ({ path, clickAt }: { path: [number, number][]; clickAt?: number }) => {
  const frame = useCurrentFrame();
  const seg = Math.max(path.length - 1, 1);
  const stops = path.map((_, i) => 12 + (i * 46) / seg);
  const x = interpolate(frame, stops, path.map((p) => p[0]), { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const y = interpolate(frame, stops, path.map((p) => p[1]), { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const click = clickAt != null ? inAt(frame, clickAt, 12) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 50 }}>
      {clickAt != null && frame >= clickAt && (
        <span className="absolute -left-3 -top-3 h-8 w-8 rounded-full border-2 border-fuchsia-500"
          style={{ opacity: 1 - click, transform: `scale(${0.4 + click * 1.4})` }} />
      )}
      <svg width="22" height="22" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.35))" }}>
        <path d="M5 3l14 8-6 1.5L9.5 19 5 3z" fill="white" stroke="black" strokeWidth="1.5" />
      </svg>
    </div>
  );
};

const Confetti = ({ at }: { at: number }) => {
  const frame = useCurrentFrame();
  const p = inAt(frame, at, 30);
  if (frame < at) return null;
  const colors = ["#d946ef", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"];
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 40 }}>
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = p * (90 + (i % 4) * 36);
        return (
          <span key={i} className="absolute h-2 w-2 rounded-sm"
            style={{
              left: "50%", top: "44%", backgroundColor: colors[i % 5],
              transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r + p * p * 60}px) rotate(${p * 260 + i * 40}deg)`,
              opacity: Math.max(0, 1 - p * 1.15),
            }} />
        );
      })}
    </div>
  );
};

/* Scene shell — MORPH transitions: the browser chrome and info bar are
   rendered identically by every scene, so across cuts they read as one
   persistent device. Only the page content (and URL / bar text) dissolves
   with a micro-scale morph — no slides, no big blurs. */
const Stage = ({ idx, copy, url, children }: { idx: number; copy: LandingCopy; url: string; children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 11], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const exit = interpolate(frame, [SCENE_FRAMES - 11, SCENE_FRAMES - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  const o = enter * (1 - exit);
  const step = copy.journey.steps[idx];
  return (
    <AbsoluteFill className="bg-background" style={{ padding: "40px 44px 86px" }}>
      {/* Persistent browser chrome */}
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <div className="mx-auto flex items-center gap-1.5 rounded-full bg-muted px-4 py-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> <span style={{ opacity: o }}>{url}</span>
          </div>
          <span className="w-14" />
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div style={{
            position: "absolute", inset: 0,
            opacity: o,
            transform: `scale(${1.012 - enter * 0.012 + exit * 0.008})`,
            filter: exit > 0.05 ? `blur(${exit * 2.5}px)` : undefined,
          }}>
            {children}
          </div>
        </div>
      </div>
      {/* Persistent info bar — only its text morphs */}
      <div className="absolute inset-x-11 bottom-6">
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white", BRAND)}>{idx + 1}</span>
          <div className="min-w-0" style={{ opacity: o, transform: `translateY(${(1 - enter) * 5}px)` }}>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold">{step.t}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {copy.journey.phases[step.phase]}
              </span>
            </div>
            <div className="truncate text-xs text-muted-foreground">{step.d}</div>
          </div>
          <span className="ml-auto shrink-0 text-[10px] font-semibold text-muted-foreground">{idx + 1} / 10</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Admin chrome — mirrors the real app's sidebar + header. */
const AdminShell = ({ children, active, headerTitle, badge }: { children: React.ReactNode; active: string; headerTitle: string; badge?: number }) => (
  <div className="flex h-full">
    <aside className="hidden w-44 flex-col border-r border-border bg-card p-3 md:flex">
      <div className="mb-3 flex items-center gap-2 px-1">
        <img src="/vela-icon.svg" alt="" className="h-6 w-6 rounded-lg" />
        <span className="font-display-brand text-sm font-bold">Vela</span>
      </div>
      {[
        { l: "Paneli", I: Home }, { l: "Produktet", I: Package }, { l: "Stoku", I: Archive },
        { l: "Porositë", I: ShoppingBag }, { l: "Cilësimet", I: Settings },
      ].map(({ l, I }) => (
        <span key={l} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs", l === active ? "bg-accent font-semibold" : "text-muted-foreground")}>
          <I className="h-3.5 w-3.5" /> {l}
          {l === "Porositë" && badge ? (
            <span className={cn("ml-auto grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white", BRAND)}>{badge}</span>
          ) : null}
        </span>
      ))}
    </aside>
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-5 py-3">
        <span className="text-sm font-bold">{headerTitle}</span>
        <span className={cn("h-7 w-7 rounded-full", BRAND)} />
      </div>
      <div className="relative flex-1 overflow-hidden p-4">{children}</div>
    </div>
  </div>
);

const StatChip = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <span className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px]", tone)}>
    <b>{value}</b> {label}
  </span>
);

/* Storefront providers + faithful header (real Header needs a Router). */
const Storefront = ({ children }: { children: React.ReactNode }) => (
  <StorefrontContext.Provider value={MOCK_CONTEXT as any}>
    <CartProvider>
      <StorefrontThemeProvider config={TEMPLATES[0].config} className="h-full overflow-hidden">
        {children}
      </StorefrontThemeProvider>
    </CartProvider>
  </StorefrontContext.Provider>
);

const SfHeaderBar = ({ cart = 0 }: { cart?: number }) => (
  <div className="flex items-center justify-between border-b border-border px-5 py-3">
    <span className="sf-heading text-base font-bold">{SHOP.shop_name}</span>
    <nav className="hidden items-center gap-5 text-xs font-medium text-muted-foreground md:flex">
      <span className="text-foreground">Home</span><span>Shop</span><span>Orders</span>
    </nav>
    <div className="flex items-center gap-4 text-muted-foreground">
      <Search className="h-4 w-4" />
      <span className="relative">
        <ShoppingBag className="h-4 w-4" />
        {cart > 0 && (
          <span className={cn("absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white", BRAND)}>{cart}</span>
        )}
      </span>
    </div>
  </div>
);

/* ── scenes ──────────────────────────────────────────────────────────── */

/* 1 · Faithful Instagram profile */
const S1_Posts = () => {
  const frame = useCurrentFrame();
  return (
    <div className="mx-auto h-full w-[430px] border-x border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="flex items-center gap-1 text-sm font-bold">butiku.i.eliras <ChevronDown className="h-3.5 w-3.5" /></span>
        <div className="flex items-center gap-3 text-foreground"><Plus className="h-4 w-4" /><Grid3X3 className="h-4 w-4" /></div>
      </div>
      <div className="flex items-center gap-6 px-4 pt-4">
        <span className={cn("h-[74px] w-[74px] shrink-0 rounded-full p-[3px]", BRAND)}>
          <img src={PRODUCTS[0].media_url} className="h-full w-full rounded-full border-2 border-background object-cover" />
        </span>
        {[["248", "postime"], ["12.4k", "ndjekës"], ["573", "ndjekje"]].map(([v, l]) => (
          <div key={l} className="text-center"><div className="text-sm font-bold">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
        ))}
      </div>
      <div className="px-4 pt-2.5">
        <div className="text-xs font-bold">Butiku i Elirës</div>
        <div className="text-xs text-muted-foreground">Veshje & aksesorë · Tiranë 🇦🇱 · Porosit në DM 📩</div>
      </div>
      <div className="flex gap-2 px-4 pt-3">
        <span className={cn("flex-1 rounded-lg py-1.5 text-center text-xs font-semibold text-white", BRAND)}>Ndiq</span>
        <span className="flex-1 rounded-lg bg-muted py-1.5 text-center text-xs font-semibold">Mesazh</span>
      </div>
      <div className="flex gap-4 px-4 pt-3.5">
        {PRODUCTS.slice(0, 4).map((p, i) => {
          const s = inAt(frame, 8 + i * 4);
          return (
            <div key={p.id} className="flex flex-col items-center gap-1" style={{ opacity: s, transform: `scale(${0.7 + s * 0.3})` }}>
              <span className="h-12 w-12 rounded-full border border-border p-0.5"><img src={p.media_url} className="h-full w-full rounded-full object-cover" /></span>
              <span className="max-w-[52px] truncate text-[9px]">{p.category}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex border-t border-border">
        {[Grid3X3, Film, Tag].map((I, i) => (
          <span key={i} className={cn("flex flex-1 justify-center border-b-2 py-2", i === 0 ? "border-foreground" : "border-transparent text-muted-foreground")}><I className="h-4 w-4" /></span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-px pt-px">
        {PRODUCTS.slice(0, 6).map((p, i) => {
          const s = inAt(frame, 20 + i * 4);
          return <img key={p.id} src={p.media_url} className="aspect-square w-full object-cover" style={{ opacity: s, transform: `scale(${0.85 + s * 0.15})` }} />;
        })}
      </div>
    </div>
  );
};

/* 2 · Login */
const S2_Login = ({ copy }: { copy: LandingCopy }) => {
  const frame = useCurrentFrame();
  return (
    <div className="grid h-full place-items-center bg-muted/40">
      <Card className="w-[340px] shadow-xl">
        <CardHeader className="items-center text-center">
          <img src="/vela-icon.svg" alt="" className="mb-1 h-10 w-10 rounded-xl" />
          <CardTitle className="font-display-brand text-lg">Vela</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input value={typed(frame, "elira@butiku.al", 14)} readOnly placeholder="Email" className="h-10" />
          <Input value={typed(frame, "••••••••", 44, 2.5)} readOnly placeholder="Fjalëkalimi" className="h-10" />
          <Button className={cn("h-10 text-white", BRAND)}>{copy.nav.login}</Button>
        </CardContent>
      </Card>
      <Cursor path={[[620, 430], [436, 340]]} clickAt={68} />
    </div>
  );
};

/* 3 · AI sync */
const S3_Sync = () => {
  const frame = useCurrentFrame();
  const pct = Math.min(100, Math.max(0, interpolate(frame, [10, 76], [0, 100])));
  const scanning = PRODUCTS[Math.min(2, Math.floor((frame - 10) / 24))];
  return (
    <AdminShell active="Produktet" headerTitle="Produktet">
      <Card className="mx-auto mt-4 max-w-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-white", BRAND)} style={{ transform: `rotate(${frame * 3}deg)` }}><Sparkles className="h-4 w-4" /></span>
            Sinkronizimi me Instagram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={pct} className="h-2" />
          <div className="mt-2 text-xs text-muted-foreground">{Math.round(pct)}% · AI po analizon: “{scanning?.name}…”</div>
          <div className="mt-4 flex flex-col gap-2">
            {PRODUCTS.slice(0, 3).map((p, i) => {
              const s = inAt(frame, 22 + i * 16);
              return (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border p-2" style={{ opacity: s, transform: `translateX(${(1 - s) * 24}px)` }}>
                  <img src={p.media_url} className="h-8 w-8 rounded object-cover" />
                  <div>
                    <div className="text-xs font-medium leading-tight">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.category}</div>
                  </div>
                  <Badge variant="secondary" className="ml-auto gap-1 text-[10px]"><Check className="h-3 w-3 text-emerald-500" /> {p.price.toLocaleString()} ALL</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </AdminShell>
  );
};

/* 4 · Products in the panel */
const S4_Products = () => {
  const frame = useCurrentFrame();
  return (
    <AdminShell active="Produktet" headerTitle="Produktet">
      <div className="mb-3 flex items-center gap-2">
        <StatChip value="8" label="Aktive" tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-600" />
        <StatChip value="0" label="Draft" tone="border-border bg-muted text-muted-foreground" />
        <StatChip value="8" label="Nga Instagram" tone="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {PRODUCTS.map((p, i) => {
          const s = inAt(frame, 10 + i * 5);
          return (
            <Card key={p.id} style={{ opacity: s, transform: `translateY(${(1 - s) * 20}px)` }}>
              <CardContent className="p-2">
                <img src={p.media_url} className="aspect-square w-full rounded-md object-cover" />
                <div className="mt-1.5 truncate text-xs font-medium">{p.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{p.price.toLocaleString()} ALL</span>
                  <Badge className="bg-emerald-500/15 text-[9px] text-emerald-600 hover:bg-emerald-500/15">Aktiv</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminShell>
  );
};

const SfGrid = ({ highlight, dim }: { highlight?: string; dim?: boolean }) => (
  <div className="grid grid-cols-4 gap-3 p-5">
    {PRODUCTS.slice(0, 4).map((p) => (
      <div key={p.id} style={{ opacity: dim && p.id !== highlight ? 0.15 : 1, transition: "opacity .4s", transform: p.id === highlight && dim ? "scale(1.04)" : undefined }}>
        <ProductCard product={p as any} />
      </div>
    ))}
  </div>
);

/* 5 · Storefront live */
const S5_Live = () => {
  const frame = useCurrentFrame();
  const pop = inAt(frame, 30, 10);
  return (
    <Storefront>
      <SfHeaderBar />
      <SfGrid />
      <Confetti at={34} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: pop, transform: `translate(-50%,-50%) scale(${0.6 + pop * 0.4})` }}>
        <span className={cn("flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-2xl", BRAND)}>
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE — instantshop.al/butiku-i-eliras
        </span>
      </div>
    </Storefront>
  );
};

/* 6 · Customer searches */
const S6_Search = () => {
  const frame = useCurrentFrame();
  const q = typed(frame, "fustan", 18, 4);
  const filtered = frame > 50;
  return (
    <Storefront>
      <SfHeaderBar />
      <div className="px-5 pt-4">
        <div className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{q}<span className="animate-pulse">|</span></span>
          {filtered && <span className="ml-auto text-xs text-muted-foreground">1 rezultat</span>}
        </div>
      </div>
      <SfGrid highlight="d1" dim={filtered} />
    </Storefront>
  );
};

/* 7 · Add to cart — with a fly-to-cart dot */
const S7_Cart = () => {
  const frame = useCurrentFrame();
  const added = frame > 54;
  const fly = interpolate(frame, [54, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return (
    <Storefront>
      <SfHeaderBar cart={frame > 66 ? 1 : 0} />
      <div className="flex gap-6 p-6">
        <img src={PRODUCTS[0].media_url} className="h-64 w-52 rounded-xl object-cover" />
        <div className="flex-1 pt-2">
          <div className="sf-heading text-xl font-bold">{PRODUCTS[0].name}</div>
          <div className="mt-1 text-lg font-bold">3,500 ALL</div>
          <div className="mt-3 flex gap-2">
            {["S", "M", "L"].map((s, i) => (
              <span key={s} className={cn("grid h-8 w-8 place-items-center rounded-lg border text-xs", i === 1 ? "border-fuchsia-500 bg-fuchsia-500/10 font-bold" : "border-border")}>{s}</span>
            ))}
          </div>
          <Button className={cn("mt-5 h-11 w-56 text-white", BRAND)}>
            {added ? <><Check className="mr-1.5 h-4 w-4" /> U shtua në shportë</> : <><ShoppingBag className="mr-1.5 h-4 w-4" /> Shto në shportë</>}
          </Button>
        </div>
      </div>
      {fly > 0 && fly < 1 && (
        <span className={cn("absolute h-4 w-4 rounded-full", BRAND)}
          style={{ left: interpolate(fly, [0, 1], [368, 826]), top: interpolate(fly, [0, 1], [207, 26]) - Math.sin(fly * Math.PI) * 80, opacity: 1 - fly * 0.3 }} />
      )}
      <Cursor path={[[700, 430], [368, 207]]} clickAt={50} />
    </Storefront>
  );
};

/* 8 · Payment */
const S8_Pay = () => {
  const frame = useCurrentFrame();
  const chosen = frame > 42;
  const paid = inAt(frame, 66, 10);
  return (
    <div className="grid h-full place-items-center bg-muted/40">
      <Card className="w-[400px] shadow-xl">
        <CardHeader className="pb-3"><CardTitle className="text-base">Zgjidh mënyrën e pagesës</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          <div className={cn("flex items-center gap-3 rounded-xl border-2 p-3 transition-colors", chosen ? "border-fuchsia-500 bg-fuchsia-500/5" : "border-border")}>
            <span className={cn("grid h-9 w-9 place-items-center rounded-lg text-white", BRAND)}><CreditCard className="h-4 w-4" /></span>
            <div>
              <div className="text-sm font-semibold">Kartë online</div>
              <div className="text-[11px] text-muted-foreground">Raiffeisen · RaiAccept · i sigurt</div>
            </div>
            {chosen && <Check className="ml-auto h-4 w-4 text-fuchsia-500" />}
          </div>
          <div className="flex items-center gap-3 rounded-xl border-2 border-border p-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><Banknote className="h-4 w-4" /></span>
            <div>
              <div className="text-sm font-semibold">Para në dorë</div>
              <div className="text-[11px] text-muted-foreground">Paguaj në dorëzim</div>
            </div>
          </div>
          <Button className={cn("mt-1 h-10 text-white", BRAND)}>Paguaj 3,500 ALL</Button>
        </CardContent>
      </Card>
      {paid > 0.02 && (
        <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm" style={{ opacity: Math.min(1, paid * 2) }}>
          <div className="flex flex-col items-center" style={{ transform: `scale(${0.5 + paid * 0.5})` }}>
            <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-xl"><Check className="h-8 w-8" /></span>
            <span className="mt-3 text-base font-bold">Pagesa u krye ✓</span>
          </div>
        </div>
      )}
      <Cursor path={[[660, 420], [436, 158]]} clickAt={40} />
    </div>
  );
};

const OrderRow = ({ status, s }: { status: "Pending" | "Fulfilled"; s: number }) => (
  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3" style={{ opacity: s, transform: `translateY(${(1 - s) * 16}px)` }}>
    <img src={PRODUCTS[0].media_url} className="h-10 w-10 rounded-lg object-cover" />
    <div>
      <div className="text-xs font-semibold">Porosia #1024 · Fustan liri (M)</div>
      <div className="text-[11px] text-muted-foreground">Ana K. · Tiranë · 3,500 ALL · Paguar me kartë</div>
    </div>
    <Badge className={cn("ml-auto text-[10px]", status === "Pending" ? "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15" : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15")}>
      {status === "Pending" ? "Në pritje" : "Përmbushur"}
    </Badge>
  </div>
);

/* 9 · Order arrives */
const S9_Order = () => {
  const frame = useCurrentFrame();
  const row = inAt(frame, 24);
  const toast = inAt(frame, 8, 11);
  return (
    <AdminShell active="Porositë" headerTitle="Porositë" badge={frame > 6 ? 1 : 0}>
      <div className="mb-3 flex items-center gap-2">
        <StatChip value="1" label="Në pritje" tone="border-amber-500/30 bg-amber-500/10 text-amber-600" />
        <StatChip value="42" label="Përmbushur" tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-600" />
        <StatChip value="146,500 ALL" label="këtë muaj" tone="border-border bg-muted text-muted-foreground" />
      </div>
      <OrderRow status="Pending" s={row} />
      <div className="absolute right-5 top-14" style={{ opacity: toast, transform: `translateY(${(1 - toast) * -18}px)` }}>
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-xl">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><Bell className="h-4 w-4" /></span>
          <div>
            <div className="text-xs font-bold">Porosi e re! 🎉</div>
            <div className="text-[11px] text-muted-foreground">+3,500 ALL · paguar me kartë</div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

/* 10 · Fulfill */
const S10_Fulfill = () => {
  const frame = useCurrentFrame();
  const done = frame > 48;
  const note = inAt(frame, 52, 9);
  return (
    <AdminShell active="Porositë" headerTitle="Porositë">
      <div className="mb-3 flex items-center gap-2">
        <StatChip value={done ? "0" : "1"} label="Në pritje" tone="border-amber-500/30 bg-amber-500/10 text-amber-600" />
        <StatChip value={done ? "43" : "42"} label="Përmbushur" tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-600" />
      </div>
      <OrderRow status={done ? "Fulfilled" : "Pending"} s={1} />
      <Confetti at={50} />
      {done && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600" style={{ opacity: note, transform: `translateY(${(1 - note) * 10}px)` }}>
          <Check className="h-4 w-4" /> Klienti u njoftua automatikisht
        </div>
      )}
      <Cursor path={[[600, 320], [615, 68]]} clickAt={46} />
    </AdminShell>
  );
};

/* ── composition ─────────────────────────────────────────────────────── */
export const JourneyFilm = ({ copy }: { copy: LandingCopy }) => {
  const scenes = [
    { C: <S1_Posts />, url: "instagram.com/butiku.i.eliras" },
    { C: <S2_Login copy={copy} />, url: "instantshop.al/login" },
    { C: <S3_Sync />, url: "instantshop.al/dashboard" },
    { C: <S4_Products />, url: "instantshop.al/products" },
    { C: <S5_Live />, url: "instantshop.al/butiku-i-eliras" },
    { C: <S6_Search />, url: "instantshop.al/butiku-i-eliras" },
    { C: <S7_Cart />, url: "instantshop.al/butiku-i-eliras" },
    { C: <S8_Pay />, url: "instantshop.al/checkout" },
    { C: <S9_Order />, url: "instantshop.al/orders" },
    { C: <S10_Fulfill />, url: "instantshop.al/orders" },
  ];
  return (
    <AbsoluteFill className="landing bg-background font-sans text-foreground">
      {scenes.map((s, i) => (
        <Sequence key={i} from={i * SCENE_FRAMES} durationInFrames={SCENE_FRAMES}>
          <Stage idx={i} copy={copy} url={s.url}>{s.C}</Stage>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
