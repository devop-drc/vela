import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import Marquee from "react-fast-marquee";
import {
  Instagram, Sparkles, ShoppingBag, ArrowRight, Check, Wand2,
  Package, BarChart3, CreditCard, Zap, Menu, X, Lock, Search,
  TrendingUp, Bell, Sun, Moon, Mail, Send, Gift,
} from "lucide-react";
import {
  RiTShirt2Line, RiBrushLine, RiVipDiamondLine, RiRunLine, RiHome5Line,
  RiScissors2Line, RiHandbagLine, RiCake3Line, RiPaletteLine,
  RiBearSmileLine, RiHeartPulseLine, RiCameraLensLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useReveal } from "@/components/landing/useReveal";
import { Counter, Magnetic, prefersReducedMotion } from "@/components/landing/anim";
import {
  SplitText, BlurText, ShinyText, SpotlightCard, Tilted, StarBorder, Particles, CircularText,
} from "@/components/landing/bits";
import { en, sq, type LandingCopy } from "@/components/landing/copy";
import "@/components/landing/landing.css";

// Remotion journey film — heavy, so it loads only when the section is reached.
const JourneySection = lazy(() => import("@/components/landing/journey/JourneySection"));

gsap.registerPlugin(ScrollTrigger);

const BRAND = "brand-gradient";
// Gradient text uses the same fluid blob mesh as .brand-gradient —
// the motion itself is the effect, so no extra shimmer layers.
const GradientText = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("brand-text", className)}>{children}</span>
);

const BENTO_ICONS = [Sparkles, Wand2, Package, CreditCard, ShoppingBag, BarChart3];
const BENTO_SPANS = ["sm:col-span-2", "", "", "sm:col-span-2", "sm:col-span-2", ""];

// Remix icons for the category marquee (order matches copy.marquee.cats).
const CAT_ICONS = [
  RiTShirt2Line, RiBrushLine, RiVipDiamondLine, RiRunLine, RiHome5Line, RiScissors2Line,
  RiHandbagLine, RiCake3Line, RiPaletteLine, RiBearSmileLine, RiHeartPulseLine, RiCameraLensLine,
];
const CAT_TINTS = [
  "bg-fuchsia-500/12 text-fuchsia-500",
  "bg-amber-500/12 text-amber-500",
  "bg-pink-500/12 text-pink-500",
  "bg-violet-500/12 text-violet-500",
  "bg-emerald-500/12 text-emerald-500",
  "bg-sky-500/12 text-sky-500",
];

// Annual billing: 2 months free on Pro & Business only.
const ANNUAL_FREE_MONTHS: Record<string, number> = { starter: 0, pro: 2, business: 2 };

const THEME_KEY = "landing-theme";
const LANG_CHOSEN_KEY = "landing-lang-chosen";

/* ─────────────────────────────── Nav ─────────────────────────────── */
const BrandMark = ({ size = "h-8 w-8" }: { size?: string }) => (
  <span className={cn("relative grid place-items-center rounded-[10px] text-white shadow-md shadow-fuchsia-500/25 ring-1 ring-white/25 ring-inset", size, BRAND)}>
    <ShoppingBag className="h-4 w-4" />
    <span className={cn("absolute inset-0 -z-10 rounded-[10px] opacity-50 blur-md", BRAND)} />
  </span>
);

/** Editorial section eyebrow — part of the brand language. */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm">
    <span className={cn("h-1.5 w-1.5 animate-pulse rounded-full", BRAND)} />
    {children}
  </span>
);

interface NavProps {
  active: string;
  copy: LandingCopy;
  dark: boolean;
  onToggleTheme: () => void;
  lang: "sq" | "en";
  onSetLang: (l: "sq" | "en") => void;
}

const LandingNav = ({ active, copy, dark, onToggleTheme, lang, onSetLang }: NavProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#how", label: copy.nav.how },
    { href: "#features", label: copy.nav.features },
    { href: "#studio", label: copy.nav.studio },
    { href: "#pricing", label: copy.nav.pricing },
    { href: "#faq", label: copy.nav.faq },
  ];

  const LangSwitch = ({ className }: { className?: string }) => (
    <div className={cn("flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-medium", className)}>
      {(["sq", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => onSetLang(l)}
          className={cn(
            "rounded-full px-2.5 py-1 uppercase transition-colors",
            lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="scroll-progress absolute inset-x-0 top-0 h-[2.5px] origin-left scale-x-0 brand-gradient" />
      <div className="mx-auto max-w-6xl px-4 pt-3.5">
        <nav className={cn(
          "glass-surface flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300",
          scrolled && "shadow-xl"
        )}>
          <a href="#top" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[17px] font-bold tracking-tight">InstantShop</span>
          </a>

          <div className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href}
                className={cn("rounded-full px-3.5 py-1.5 text-sm transition-colors",
                  active === l.href.slice(1) ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <LangSwitch />
            <button
              onClick={onToggleTheme}
              aria-label={dark ? "Light mode" : "Dark mode"}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button asChild variant="ghost" size="sm"><Link to="/login">{copy.nav.login}</Link></Button>
            <Magnetic>
              <Button asChild size="sm" className={cn("text-white hover:opacity-90", BRAND)}>
                <Link to="/register">{copy.nav.cta}</Link>
              </Button>
            </Magnetic>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onToggleTheme}
              aria-label={dark ? "Light mode" : "Dark mode"}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setOpen((v) => !v)} aria-label="Menu">
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="mt-2 rounded-2xl border border-border bg-background/95 px-5 py-4 backdrop-blur-xl lg:hidden">
            <div className="flex flex-col gap-3">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground">{l.label}</a>
              ))}
              <LangSwitch className="self-start" />
              <div className="mt-1 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1"><Link to="/login">{copy.nav.login}</Link></Button>
                <Button asChild size="sm" className={cn("flex-1 text-white", BRAND)}><Link to="/register">{copy.nav.cta}</Link></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

/* ─────────────── Hero visual: browser + phone DOM mockups ─────────────── */
type Screen = LandingCopy["screen"];

const ProductTile = ({ p, tiny }: { p: Screen["products"][number]; tiny?: boolean }) => (
  // Mirrors the real storefront ProductCard "standard" variant: 4:5 image,
  // name + price stacked, token-driven surfaces.
  <div className={cn("overflow-hidden rounded-lg border border-border bg-card", tiny ? "p-1.5" : "p-2")}>
    <div className="aspect-[4/5] w-full rounded-md bg-gradient-to-br from-muted to-accent" />
    <div className={cn("mt-1.5 truncate font-medium", tiny ? "text-[9px]" : "text-[10px]")}>{p.name}</div>
    <div className={cn("text-muted-foreground", tiny ? "text-[8px]" : "text-[9px]")}>{p.cat}</div>
    <div className={cn("mt-0.5 font-bold", tiny ? "text-[9px]" : "text-[10px]")}>{p.price}</div>
  </div>
);

/** Browser frame around the REAL app: /demo rendered in a scaled iframe
    (desktop only, mounted after the hero settles), with a hand-built
    storefront preview underneath as the instant fallback. */
const BrowserMock = ({ screen, iframeOn }: { screen: Screen; iframeOn: boolean }) => {
  const [ready, setReady] = useState(false);
  return (
    <div className="w-[620px] max-w-[94vw] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-fuchsia-900/10">
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="mx-auto flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1 text-[10px] text-muted-foreground">
          <Lock className="h-2.5 w-2.5" /> {ready ? "instantshop.al/demo" : "instantshop.al/butiku-i-eliras"}
        </div>
        <span className="w-12" />
      </div>

      <div className="relative h-[300px] sm:h-[320px]">
        {/* Fallback: hand-built storefront preview (always instant) */}
        <div className={cn("absolute inset-0 transition-opacity duration-700", ready && "opacity-0")}>
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className={cn("h-5 w-5 rounded-md", BRAND)} />
              <span className="text-xs font-semibold">{screen.shop}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Search className="h-3 w-3" />
              <ShoppingBag className="h-3 w-3" />
            </div>
          </div>
          <div className="flex flex-col justify-center gap-0.5 bg-gradient-to-br from-muted to-accent px-4 py-4">
            <div className="text-[10px] font-medium text-foreground/70">{screen.banner1}</div>
            <div className="text-sm font-bold leading-tight">{screen.banner2}</div>
          </div>
          <div className="grid grid-cols-4 gap-2 p-3">
            {screen.products.map((p) => <ProductTile key={p.name} p={p} />)}
          </div>
        </div>

        {/* The real app, live: /demo dashboard in a scaled iframe */}
        {iframeOn && (
          <iframe
            src="/demo"
            title="InstantShop demo"
            loading="lazy"
            onLoad={() => setReady(true)}
            className={cn("absolute left-0 top-0 origin-top-left transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
            style={{ width: 1280, height: 663, transform: "scale(0.4828)", border: 0, pointerEvents: "none" }}
          />
        )}
      </div>
    </div>
  );
};

/** Phone frame around the REAL storefront: /demo-shop in a scaled iframe,
    with a hand-built preview as the instant fallback. */
const PhoneMock = ({ screen, iframeOn }: { screen: Screen; iframeOn: boolean }) => {
  const [ready, setReady] = useState(false);
  return (
    <div className="relative h-[370px] w-[185px] overflow-hidden rounded-[1.9rem] border-[7px] border-zinc-900 bg-background shadow-2xl shadow-black/25 ring-1 ring-border">
      {/* Fallback preview */}
      <div className={cn("absolute inset-0 transition-opacity duration-700", ready && "opacity-0")}>
        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
          <span className={cn("h-4 w-4 rounded", BRAND)} />
          <span className="text-[9px] font-semibold">{screen.shop}</span>
          <ShoppingBag className="ml-auto h-2.5 w-2.5 text-muted-foreground" />
        </div>
        <div className="flex flex-col justify-center gap-0.5 bg-gradient-to-br from-muted to-accent px-2.5 py-2.5">
          <div className="text-[8px] font-medium text-foreground/70">{screen.banner1}</div>
          <div className="text-[10px] font-bold leading-tight">{screen.banner2}</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-2">
          {screen.products.slice(0, 2).map((p) => <ProductTile key={p.name} p={p} tiny />)}
        </div>
        <div className="px-2 pb-2">
          <div className={cn("rounded-md py-1.5 text-center text-[8px] font-semibold text-white", BRAND)}>{screen.addToCart}</div>
        </div>
      </div>

      {/* The REAL storefront, live */}
      {iframeOn && (
        <iframe
          src="/demo-shop?view=products"
          title="InstantShop storefront demo"
          loading="lazy"
          onLoad={() => setReady(true)}
          className={cn("absolute left-0 top-0 origin-top-left transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
          style={{ width: 390, height: 815, transform: "scale(0.4385)", border: 0, pointerEvents: "none" }}
        />
      )}
    </div>
  );
};

const HeroVisual = ({ copy, iframeOn }: { copy: LandingCopy; iframeOn: boolean }) => (
  <div className="hero-visual relative mx-auto h-[400px] w-full max-w-5xl sm:h-[470px]">
    <div className={cn("pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14] blur-3xl", BRAND)} />

    {/* Browser: the real app in a scaled iframe (fallback: storefront preview) */}
    <div className="hv-stage absolute left-1/2 top-3 -translate-x-1/2">
      <Tilted max={5}><div className="ls-float3"><BrowserMock screen={copy.screen} iframeOn={iframeOn} /></div></Tilted>
    </div>

    {/* Rotating sticker (React Bits CircularText) */}
    <div className="hv-item pointer-events-none absolute -top-10 right-[24%] z-20 hidden lg:block" data-depth="24">
      <div className="hv-enter">
        <CircularText text={copy.hero.circular} className="h-24 w-24 text-muted-foreground" duration={18}>
          <span className={cn("grid h-9 w-9 place-items-center rounded-full text-white shadow-md", BRAND)}>
            <Sparkles className="h-4 w-4" />
          </span>
        </CircularText>
      </div>
    </div>

    {/* Phone overlapping bottom-right */}
    <div className="hv-stage absolute bottom-0 right-[4%] z-10 hidden sm:block lg:right-[14%]">
      <Tilted max={9}><div className="ls-float2"><PhoneMock screen={copy.screen} iframeOn={iframeOn} /></div></Tilted>
    </div>

    {/* Signature: the "Sa kushton?" DM — the pain the product removes,
        answered by a shop link. Plays as a small orchestrated sequence. */}
    <div className="hv-item pointer-events-none absolute -top-2 left-0 z-10 hidden w-[190px] md:block lg:left-[3%]" data-depth="34">
      <div className="hv-enter"><div className="ls-float rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-2">
          <span className={cn("h-5 w-5 rounded-full", BRAND)} />
          <span className="text-[10px] font-semibold">{copy.screen.shop}</span>
          <Instagram className="ml-auto h-3 w-3 text-muted-foreground" />
        </div>
        <div className="dm-b1 mt-2 w-fit max-w-[88%] rounded-2xl rounded-bl-sm bg-muted px-2.5 py-1.5 text-[10px] leading-snug">
          {copy.hero.dm.ask}
        </div>
        <div className="dm-typing mt-1.5 flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-2.5 py-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <div className="dm-b2 ml-auto mt-1.5 w-fit max-w-[92%]">
          <div className={cn("rounded-2xl rounded-br-sm p-2 text-white", BRAND)}>
            <div className="text-[10px] font-medium">{copy.hero.dm.reply}</div>
            <div className="mt-1.5 rounded-lg bg-white/20 px-2 py-1.5 backdrop-blur">
              <div className="text-[9px] font-bold leading-tight">{copy.hero.dm.linkTitle}</div>
              <div className="text-[8px] text-white/85">{copy.hero.dm.linkSub}</div>
            </div>
          </div>
        </div>
      </div></div>
    </div>

    {/* Floating: order notification */}
    <div className="hv-item pointer-events-none absolute -top-3 right-0 z-10 hidden w-[180px] sm:block lg:right-[2%]" data-depth="46">
      <div className="hv-enter"><div className="ls-float3 flex items-center gap-2.5 rounded-2xl border border-border bg-card/90 p-3 shadow-xl backdrop-blur">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><Bell className="h-4 w-4" /></span>
        <div>
          <div className="text-xs font-semibold">{copy.screen.orderTitle}</div>
          <div className="text-[11px] text-muted-foreground">{copy.screen.orderBody}</div>
        </div>
      </div></div>
    </div>

    {/* Floating: revenue card bottom-left */}
    <div className="hv-item pointer-events-none absolute bottom-4 left-0 z-10 hidden w-[172px] sm:block lg:left-[5%]" data-depth="40">
      <div className="hv-enter"><div className="ls-float rounded-2xl border border-border bg-card/90 p-3 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{copy.screen.today}</span>
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-500"><TrendingUp className="h-3 w-3" /> 18%</span>
        </div>
        <div className="mt-0.5 text-lg font-bold">24,500 ALL</div>
        <div className="mt-2 flex h-8 items-end gap-1">
          {[40, 65, 45, 80, 60, 95, 75].map((h, i) => (
            <span key={i} className={cn("flex-1 rounded-sm", BRAND)} style={{ height: `${h}%` }} />
          ))}
        </div>
      </div></div>
    </div>
  </div>
);

/* ─────────────── Bento decorative mini-graphics ─────────────── */
const BentoArt = ({ index, screen }: { index: number; screen: Screen }) => {
  if (index === 0) {
    // AI flow: IG → sparkles → product
    return (
      <div className="pointer-events-none absolute right-7 top-1/2 hidden -translate-y-1/2 items-center gap-2.5 lg:flex">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm"><Instagram className="h-4 w-4" /></span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl text-white shadow-lg shadow-fuchsia-500/25", BRAND)}><Sparkles className="h-4 w-4" /></span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <div className="w-[120px] rounded-xl border border-border bg-card p-2 shadow-sm">
          <div className="text-[10px] font-semibold">{screen.products[0].name}</div>
          <div className="text-[9px] text-muted-foreground">{screen.products[0].cat}</div>
          <div className="text-[10px] font-bold">{screen.products[0].price}</div>
        </div>
      </div>
    );
  }
  if (index === 3) {
    // Payment card
    return (
      <div className="pointer-events-none absolute right-7 top-1/2 hidden -translate-y-1/2 lg:block">
        <div className={cn("ls-float h-[92px] w-[150px] rounded-xl p-3 text-white shadow-lg shadow-fuchsia-500/25", BRAND)}>
          <div className="flex items-center justify-between">
            <span className="h-5 w-7 rounded bg-white/30" />
            <CreditCard className="h-4 w-4 text-white/80" />
          </div>
          <div className="mt-4 text-[11px] font-semibold tracking-[0.18em]">•••• 4242</div>
          <div className="mt-0.5 text-[9px] text-white/75">Raiffeisen · RaiAccept</div>
        </div>
      </div>
    );
  }
  if (index === 4) {
    // Order rows
    return (
      <div className="pointer-events-none absolute right-7 top-1/2 hidden w-[190px] -translate-y-1/2 flex-col gap-2 lg:flex">
        {screen.products.slice(0, 2).map((p, i) => (
          <div key={p.name} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm">
            <span className={cn("h-2 w-2 rounded-full", i === 0 ? "bg-emerald-500" : "bg-amber-400")} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-medium">{p.name}</div>
            </div>
            <div className="text-[10px] font-bold">{p.price}</div>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ─────────────────────────────── Page ─────────────────────────────── */
const PLAN_PRICES: Record<string, number> = { starter: 990, pro: 1990, business: 3990 };
const fmt = (n: number) => n.toLocaleString("en-US");

export default function Landing() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [annual, setAnnual] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "dark"; } catch { return false; }
  });
  const [iframeOn, setIframeOn] = useState(false);
  const [studioReady, setStudioReady] = useState(false);
  const [interestName, setInterestName] = useState("");
  const [interestMsg, setInterestMsg] = useState("");

  // Lenis inertia scrolling, driven by GSAP's ticker and feeding
  // ScrollTrigger so scrubbed animations stay in sync. Anchor links glide
  // with a nav-height offset. Reduced-motion users keep native scrolling.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.15 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const el = document.querySelector(a.getAttribute("href") || "");
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -96 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  // Mount the live /demo iframe after the hero settles (desktop only).
  useEffect(() => {
    const t = setTimeout(() => {
      if (window.innerWidth >= 1024) setIframeOn(true);
    }, 1400);
    return () => clearTimeout(t);
  }, []);

  // Albanian-first: default new visitors to sq unless they've chosen a language.
  useEffect(() => {
    try {
      if (!localStorage.getItem(LANG_CHOSEN_KEY) && !i18n.language?.startsWith("sq")) {
        i18n.changeLanguage("sq");
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lang: "sq" | "en" = i18n.language?.startsWith("sq") ? "sq" : "en";
  const copy = useMemo(() => (lang === "sq" ? sq : en), [lang]);

  const setLang = (l: "sq" | "en") => {
    try { localStorage.setItem(LANG_CHOSEN_KEY, "1"); } catch { /* ignore */ }
    i18n.changeLanguage(l);
  };
  const toggleTheme = () => {
    setDark((d) => {
      try { localStorage.setItem(THEME_KEY, !d ? "dark" : "light"); } catch { /* ignore */ }
      return !d;
    });
  };

  useEffect(() => {
    document.title = lang === "sq"
      ? "InstantShop — Ktheje Instagramin në dyqan"
      : "InstantShop — Turn your Instagram into a store";
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate("/dashboard", { replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate, lang]);

  // Active-section highlight in nav.
  useEffect(() => {
    const ids = ["how", "features", "studio", "pricing", "faq"];
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActiveSection(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  useReveal(rootRef);

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();
    let removeMove: (() => void) | undefined;

    const ctx = gsap.context(() => {
      gsap.to(".scroll-progress", {
        scaleX: 1, ease: "none",
        scrollTrigger: { start: 0, end: () => document.body.scrollHeight - window.innerHeight, scrub: 0.3 },
      });

      if (reduced) return;

      // Hero entrance
      const tl = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.1 });
      tl.from(".hero-fade", { opacity: 0, y: 22, duration: 0.8, stagger: 0.09 })
        .from(".hero-grad", { opacity: 0, y: 26, filter: "blur(8px)", duration: 0.9 }, 0.55)
        .from(".hv-stage", { opacity: 0, y: 60, scale: 0.95, duration: 1, stagger: 0.15 }, "-=0.5")
        .from(".hv-enter", { opacity: 0, scale: 0.85, y: 16, duration: 0.7, stagger: 0.12 }, "-=0.7");

      // Mouse parallax on floating cards
      const items = gsap.utils.toArray<HTMLElement>(".hv-item");
      const setters = items.map((el) => ({
        depth: Number(el.dataset.depth || 20),
        xTo: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3" }),
        yTo: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3" }),
      }));
      const hero = rootRef.current?.querySelector(".hero-visual") as HTMLElement | null;
      const onMove = (e: MouseEvent) => {
        if (!hero) return;
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const ny = (e.clientY - (r.top + r.height / 2)) / r.height;
        setters.forEach((s) => { s.xTo(-nx * s.depth); s.yTo(-ny * s.depth); });
      };
      window.addEventListener("mousemove", onMove);
      removeMove = () => window.removeEventListener("mousemove", onMove);

      // Hero visual scroll parallax + gentle scale-away
      gsap.to(".hero-visual", {
        yPercent: 12, scale: 0.97, opacity: 0.6, ease: "none",
        scrollTrigger: { trigger: ".hero-visual", start: "top 35%", end: "bottom top", scrub: true },
      });

      // Studio: morph the demo accent through template colors
      const accents = ["#e11d63", "#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];
      const morph = gsap.timeline({ repeat: -1, scrollTrigger: { trigger: "#studio", start: "top 80%" } });
      accents.forEach((c) => {
        morph.to(".studio-accent", { backgroundColor: c, duration: 1.1, ease: "sine.inOut" })
             .to(".studio-accent-text", { color: c, duration: 1.1, ease: "sine.inOut" }, "<");
      });

      // Studio color swatches pulse in sequence
      gsap.utils.toArray<HTMLElement>(".studio-swatch").forEach((el, i) => {
        gsap.to(el, {
          scale: 1.25, duration: 0.55, ease: "sine.inOut", yoyo: true, repeat: -1, repeatDelay: 2.75,
          delay: i * 1.1,
          scrollTrigger: { trigger: "#studio", start: "top 80%" },
        });
      });

      // DM story: question → typing → shop-link reply, replaying gently.
      gsap.set(".dm-b1", { opacity: 0, scale: 0.8, transformOrigin: "bottom left" });
      gsap.set(".dm-b2", { opacity: 0, scale: 0.8, transformOrigin: "bottom right" });
      gsap.set(".dm-typing", { opacity: 0 });
      gsap.timeline({ repeat: -1, repeatDelay: 5, delay: 1.9 })
        .to(".dm-b1", { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" })
        .to(".dm-typing", { opacity: 1, duration: 0.2 }, "+=0.55")
        .to(".dm-typing", { opacity: 0, duration: 0.2 }, "+=1.1")
        .to(".dm-b2", { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.8)" }, "<")
        .to({}, { duration: 3 })
        .to(".dm-b1, .dm-b2", { opacity: 0, duration: 0.45 });

      // CTA lightning bolt: periodic wiggle
      gsap.timeline({ repeat: -1, repeatDelay: 2.6, scrollTrigger: { trigger: ".cta-panel", start: "top 85%" } })
        .to(".cta-zap", { rotate: 12, duration: 0.1, ease: "sine.inOut" })
        .to(".cta-zap", { rotate: -12, duration: 0.1 })
        .to(".cta-zap", { rotate: 8, duration: 0.1 })
        .to(".cta-zap", { rotate: 0, duration: 0.12 });

      // CTA panel: subtle breathing glow
      gsap.to(".cta-panel", {
        boxShadow: "0 0 90px -20px rgba(217,70,239,0.55)", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1,
        scrollTrigger: { trigger: ".cta-panel", start: "top 85%" },
      });
    }, rootRef);

    return () => { removeMove?.(); ctx.revert(); };
  }, []);

  const priceFor = (id: string) => {
    const m = PLAN_PRICES[id] ?? 0;
    if (!annual) return m;
    const paidMonths = 12 - (ANNUAL_FREE_MONTHS[id] ?? 0);
    return Math.round((m * paidMonths) / 12);
  };
  const yearlyTotal = (id: string) => (PLAN_PRICES[id] ?? 0) * (12 - (ANNUAL_FREE_MONTHS[id] ?? 0));

  return (
    <div id="top" ref={rootRef} className={cn("landing min-h-screen bg-background font-sans text-foreground antialiased", dark && "landing-dark")}>
      <div className="landing-noise" />
      <LandingNav active={activeSection} copy={copy} dark={dark} onToggleTheme={toggleTheme} lang={lang} onSetLang={setLang} />

      {/* ── Hero (full screen) ── */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden px-5">
        <div className="ls-mesh" />
        <div className="ls-grid pointer-events-none absolute inset-0" />
        <Particles className="pointer-events-none absolute inset-0 h-full w-full" count={70} dark={dark} />
        <div className={cn("ls-aurora pointer-events-none absolute -top-44 left-1/4 h-[480px] w-[580px] rounded-full blur-[130px]", dark ? "bg-fuchsia-600/20" : "bg-fuchsia-400/25")} />
        <div className={cn("ls-aurora pointer-events-none absolute -top-24 right-1/4 h-[440px] w-[540px] rounded-full blur-[130px]", dark ? "bg-amber-500/10" : "bg-amber-300/25")} style={{ animationDelay: "-8s" }} />

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col">
          <div className="mx-auto mt-32 max-w-3xl text-center sm:mt-36">
            <div className="hero-fade mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm backdrop-blur">
              <span className={cn("h-2 w-2 rounded-full", BRAND)} />
              <ShinyText>{copy.hero.badge}</ShinyText>
            </div>

            <h1 className="text-[2.5rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-[4rem]">
              <span className="block"><SplitText text={copy.hero.h1a} delay={0.15} /></span>
              <span className="block"><SplitText text={copy.hero.h1b} delay={0.35} /></span>
              <span className="hero-grad block"><GradientText>{copy.hero.h1c}</GradientText></span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              <BlurText delay={0.7} text={copy.hero.sub} />
            </p>

            <div className="hero-fade mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Magnetic>
                <StarBorder>
                  <Button asChild size="lg" className={cn("h-12 gap-2 rounded-full px-8 text-base text-white hover:opacity-90", BRAND)}>
                    <Link to="/register">{copy.hero.ctaPrimary} <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </StarBorder>
              </Magnetic>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-8 text-base">
                <Link to="/demo">{copy.hero.ctaSecondary}</Link>
              </Button>
            </div>
            <p className="hero-fade mt-4 text-sm text-muted-foreground">
              <Check className="mr-1 inline h-4 w-4 text-emerald-500" /> {copy.hero.risk}
            </p>
          </div>

          <div className="relative mt-10 flex-1">
            <HeroVisual copy={copy} iframeOn={iframeOn} />
          </div>
        </div>

        {/* fade into the next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Problem → Solution ── */}
      <section className="px-5 py-12">
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
          <SpotlightCard spotColor="rgba(239, 68, 68, 0.08)" className="reveal ls-card rounded-3xl border border-border bg-card p-8">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10 text-destructive"><X className="h-5 w-5" /></span>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{copy.problem.title}</h3>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              {copy.problem.items.map((t) => (
                <li key={t} className="flex gap-2.5"><X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" /> {t}</li>
              ))}
            </ul>
          </SpotlightCard>
          <SpotlightCard className="reveal ls-card grad-border rounded-3xl p-8">
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl text-white shadow-md shadow-fuchsia-500/25", BRAND)}><Check className="h-5 w-5" /></span>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide"><GradientText>{copy.solution.title}</GradientText></h3>
            <ul className="mt-4 space-y-3">
              {copy.solution.items.map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {t}</li>
              ))}
            </ul>
          </SpotlightCard>
        </div>
      </section>

      {/* ── AWWWards-style typographic divider ── */}
      <div className="overflow-hidden py-10">
        <Marquee gradient={false} speed={45} autoFill>
          <span className="ls-outline-text mx-4 text-6xl sm:text-7xl">
            {copy.journey.divider.split("·")[0]} · <span className="fill">{copy.journey.divider.split("·")[1]}</span> ·
          </span>
        </Marquee>
      </div>

      {/* ── The full journey — Remotion motion graphic of the real flow ── */}
      <section id="how" className="px-5 py-20">
        <div className="mx-auto max-w-[88rem]">
          <div className="reveal mx-auto max-w-2xl text-center">
            <Eyebrow>{copy.journey.badge}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.journey.title}</h2>
            <p className="mt-3 text-lg text-muted-foreground">{copy.journey.sub}</p>
          </div>
          <div className="reveal mt-12">
            <Suspense fallback={<div className="grid h-[420px] place-items-center rounded-3xl border border-border bg-card text-sm text-muted-foreground">…</div>}>
              <JourneySection copy={copy} />
            </Suspense>
          </div>
          {/* CTA at peak understanding — right after seeing the full flow */}
          <div className="reveal mt-12 flex flex-col items-center gap-3">
            <Magnetic>
              <StarBorder>
                <Button asChild size="lg" className={cn("h-12 gap-2 rounded-full px-8 text-base text-white hover:opacity-90", BRAND)}>
                  <Link to="/register">{copy.hero.ctaPrimary} <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </StarBorder>
            </Magnetic>
            <p className="text-sm text-muted-foreground"><Check className="mr-1 inline h-4 w-4 text-emerald-500" /> {copy.hero.risk}</p>
          </div>
        </div>
      </section>

      {/* ── Category marquee — breather after the film ── */}
      <section className="overflow-hidden border-y border-border/60 bg-card/40 py-7">
        <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{copy.marquee.title}</p>
        <div className="ls-marquee-mask flex flex-col gap-3.5">
          {[copy.marquee.cats.slice(0, 6), copy.marquee.cats.slice(6)].map((row, r) => (
            <Marquee key={r} gradient={false} speed={r === 0 ? 36 : 28} direction={r === 0 ? "left" : "right"} pauseOnHover autoFill>
              {row.map((c, i) => {
                const Icon = CAT_ICONS[r * 6 + i];
                const tint = CAT_TINTS[(r * 6 + i) % CAT_TINTS.length];
                return (
                  <span key={c} className="mx-2 flex items-center gap-2.5 rounded-full border border-border bg-card py-2 pl-2.5 pr-4 text-sm text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-fuchsia-500/40 hover:text-foreground hover:shadow-md">
                    <span className={cn("grid h-6 w-6 place-items-center rounded-full", tint)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {c}
                  </span>
                );
              })}
            </Marquee>
          ))}
        </div>
      </section>

      {/* ── Stats — quiet receipt strip ── */}
      <section className="px-5 py-14">
        <div className="reveal mx-auto max-w-4xl border-y border-dashed border-border py-8">
          <div className="grid grid-cols-2 gap-y-8 text-center sm:grid-cols-4 sm:[&>*+*]:border-l sm:[&>*+*]:border-dashed sm:[&>*+*]:border-border">
            {copy.stats.map((s, i) => (
              <div key={i} className="px-2">
                <div className="font-display text-3xl sm:text-4xl">
                  {s.value ? <span>{s.value}</span> : <Counter to={[5, 3, 0][i] ?? 0} suffix={s.suffix} />}
                </div>
                <div className="mt-1.5 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (bento) ── */}
      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mx-auto max-w-2xl text-center">
            <Eyebrow>{copy.features.badge}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.features.title}</h2>
            <p className="mt-3 text-lg text-muted-foreground">{copy.features.sub}</p>
          </div>
          <div className="mt-14 grid auto-rows-[1fr] gap-5 sm:grid-cols-3">
            {copy.features.items.map((f, i) => {
              const Icon = BENTO_ICONS[i];
              return (
                <SpotlightCard key={f.title} className={cn("reveal ls-card glare-hover group relative overflow-hidden rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-500/30", BENTO_SPANS[i])}>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className={cn("mt-4 text-lg", BENTO_SPANS[i] && "lg:max-w-[55%]")}>{f.title}</h3>
                  <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", BENTO_SPANS[i] && "lg:max-w-[55%]")}>{f.body}</p>
                  <BentoArt index={i} screen={copy.screen} />
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Storefront Studio spotlight ── */}
      <section id="studio" className="px-5 py-24">
        <div className="reveal ls-card relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[2rem] border border-border bg-card p-8 sm:p-12 lg:grid-cols-2">
          <div className={cn("ls-aurora pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl", dark ? "bg-fuchsia-600/15" : "bg-fuchsia-300/25")} />
          <div>
            <Eyebrow>{copy.studio.badge}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.studio.titleA} <GradientText>{copy.studio.titleB}</GradientText></h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{copy.studio.body}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {copy.studio.checklist.map((t) => (
                <li key={t} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {t}</li>
              ))}
            </ul>
            <Magnetic>
              <Button asChild size="lg" className={cn("mt-8 gap-2 rounded-full px-7 text-white hover:opacity-90", BRAND)}>
                <Link to="/register">{copy.studio.cta} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </Magnetic>
          </div>

          <div className="relative">
            {/* floating swatches */}
            <div className="absolute -top-5 left-6 z-10 flex gap-2">
              {["#e11d63", "#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b"].map((c) => (
                <span key={c} className="studio-swatch h-5 w-5 rounded-full border-2 border-background shadow-md" style={{ backgroundColor: c }} />
              ))}
            </div>
            <Tilted max={6}>
              <div className="relative rounded-2xl border border-border bg-background p-4 shadow-2xl shadow-black/10">
                <div className="flex items-center gap-1.5 pb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="relative h-[420px] overflow-hidden rounded-xl border border-border">
                  {/* Fallback: color-morphing mock (mobile + until the iframe loads) */}
                  <div className={cn("absolute inset-0 transition-opacity duration-700", studioReady && "opacity-0")}>
                    <div className="studio-accent flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: "#e11d63" }}>
                      <span className="text-sm font-semibold">{copy.studio.demoShop}</span>
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 p-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border p-2">
                          <div className="aspect-square rounded-md bg-gradient-to-br from-muted to-accent" />
                          <div className="mt-1.5 h-1.5 w-full rounded bg-muted-foreground/20" />
                          <div className="studio-accent-text mt-1 text-[10px] font-bold" style={{ color: "#e11d63" }}>1,990 ALL</div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 pt-0">
                      <div className="studio-accent rounded-lg py-2 text-center text-xs font-medium text-white" style={{ backgroundColor: "#e11d63" }}>{copy.screen.addToCart}</div>
                    </div>
                  </div>

                  {/* The REAL storefront cycling through real Studio templates */}
                  {iframeOn && (
                    <iframe
                      src="/demo-shop?cycle=1"
                      title="Storefront Studio demo"
                      loading="lazy"
                      onLoad={() => setStudioReady(true)}
                      className={cn("absolute left-0 top-0 origin-top-left transition-opacity duration-700", studioReady ? "opacity-100" : "opacity-0")}
                      style={{ width: 1100, height: 970, transform: "scale(0.4327)", border: 0, pointerEvents: "none" }}
                    />
                  )}
                </div>
              </div>
            </Tilted>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mx-auto max-w-2xl text-center">
            <Eyebrow>{copy.pricing.badge}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.pricing.title}</h2>
            <p className="mt-3 text-lg text-muted-foreground">{copy.pricing.sub}</p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
              <span className={cn("text-sm", !annual && "font-medium")}>{copy.pricing.monthly}</span>
              <Switch checked={annual} onCheckedChange={setAnnual} />
              <span className={cn("text-sm", annual && "font-medium")}>{copy.pricing.annual}</span>
            </div>
          </div>

          <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
            {copy.pricing.plans.map((p) => {
              const featured = p.id === "pro";
              return (
                <SpotlightCard
                  key={p.id}
                  className={cn(
                    "reveal ls-card relative flex flex-col rounded-3xl p-7",
                    featured
                      ? "grad-border shadow-[0_0_70px_-18px_rgba(217,70,239,0.4)] lg:-my-3 lg:py-10"
                      : "border border-border bg-card"
                  )}
                >
                  {featured && (
                    <span className={cn("absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-medium text-white shadow-md", BRAND)}>{copy.pricing.popular}</span>
                  )}
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
                  {(ANNUAL_FREE_MONTHS[p.id] ?? 0) > 0 && (
                    <div className={cn(
                      "grid transition-all duration-500 ease-out",
                      annual ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
                    )}>
                      <div className="overflow-hidden">
                        <span className={cn(
                          "plan-bonus inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/10 to-amber-400/10 px-3 py-1 text-xs font-medium text-fuchsia-600 transition-transform duration-500",
                          annual ? "scale-100" : "scale-75"
                        )}>
                          <Gift className="h-3.5 w-3.5" /> {copy.pricing.save}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="mt-5 flex items-end gap-1.5">
                    <span className={cn("text-4xl font-bold", featured && "brand-text")}>{fmt(priceFor(p.id))}</span>
                    <span className="mb-1 text-sm text-muted-foreground">{copy.pricing.perMonth}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {annual ? copy.pricing.billedYearly(fmt(yearlyTotal(p.id))) : copy.pricing.billedMonthly}
                  </p>
                  <Button asChild className={cn("mt-6 w-full rounded-full", featured && cn("text-white hover:opacity-90", BRAND))} variant={featured ? "default" : "outline"}>
                    <Link to="/register">{copy.pricing.cta}</Link>
                  </Button>
                  <ul className="mt-6 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}</li>
                    ))}
                  </ul>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials — hidden until we have real reviews ──
      <section className="px-5 py-24"> … </section> */}

      {/* ── I'm interested ── */}
      <section id="interest" className="px-5 py-24">
        <div className="reveal ls-card glare-hover mx-auto grid max-w-5xl gap-10 overflow-hidden rounded-[2rem] border border-border bg-card p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <Eyebrow>{copy.interest.badge}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.interest.title}</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{copy.interest.sub}</p>
            <Magnetic>
              <Button
                size="lg"
                className={cn("mt-8 gap-2 rounded-full px-7 text-white hover:opacity-90", BRAND)}
                onClick={() => {
                  const subject = encodeURIComponent(lang === "sq" ? "Interes për InstantShop" : "Interested in InstantShop");
                  const body = encodeURIComponent(copy.interest.placeholder);
                  window.location.href = `mailto:info@squaddcrm.com?subject=${subject}&body=${body}`;
                }}
              >
                <Sparkles className="h-4 w-4" /> {copy.interest.quick}
              </Button>
            </Magnetic>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> info@squaddcrm.com
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Input
              value={interestName}
              onChange={(e) => setInterestName(e.target.value)}
              placeholder={copy.interest.name}
              className="h-11 rounded-xl"
            />
            <Textarea
              value={interestMsg}
              onChange={(e) => setInterestMsg(e.target.value)}
              placeholder={copy.interest.placeholder}
              rows={6}
              className="rounded-xl"
            />
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl"
              onClick={() => {
                const subject = encodeURIComponent(lang === "sq" ? "Interes për InstantShop" : "Interested in InstantShop");
                const bodyText = `${interestMsg || copy.interest.placeholder}${interestName ? `\n\n— ${interestName}` : ""}`;
                window.location.href = `mailto:info@squaddcrm.com?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
              }}
            >
              <Send className="h-4 w-4" /> {copy.interest.send}
            </Button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-5 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="reveal text-center">
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.faq.title}</h2>
          </div>
          <div className="reveal ls-card mt-10 rounded-3xl border border-border bg-card px-6 sm:px-8">
            <Accordion type="single" collapsible>
              {copy.faq.items.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className={i === copy.faq.items.length - 1 ? "border-b-0" : undefined}>
                  <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-5 py-24">
        <div className={cn("cta-panel reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-8 py-20 text-center text-white sm:px-12", BRAND)}>
          <div className="cta-grid pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
          <div className="ls-aurora pointer-events-none absolute -left-10 -top-10 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
          <div className="ls-aurora pointer-events-none absolute -bottom-10 -right-10 h-60 w-60 rounded-full bg-white/10 blur-3xl" style={{ animationDelay: "-6s" }} />
          <Zap className="cta-zap relative mx-auto h-10 w-10" />
          <h2 className="relative mt-4 text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.cta.title}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-lg text-white/90">{copy.cta.sub}</p>
          <Magnetic>
            <Button asChild size="lg" className="relative mt-9 gap-2 rounded-full bg-white px-9 py-6 text-base font-semibold text-zinc-900 hover:bg-white/90">
              <Link to="/register">{copy.cta.button} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </Magnetic>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-5 pb-10 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-10 sm:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5">
                <BrandMark />
                <span className="font-semibold">InstantShop</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{copy.footer.tagline}</p>
            </div>
            <div className="flex gap-16">
              <div>
                <h4 className="text-sm font-semibold">{copy.footer.product}</h4>
                <div className="mt-3 flex flex-col gap-2.5 text-sm text-muted-foreground">
                  <a href="#features" className="hover:text-foreground">{copy.nav.features}</a>
                  <a href="#pricing" className="hover:text-foreground">{copy.nav.pricing}</a>
                  <Link to="/demo" className="hover:text-foreground">{copy.hero.ctaSecondary}</Link>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold">{copy.footer.account}</h4>
                <div className="mt-3 flex flex-col gap-2.5 text-sm text-muted-foreground">
                  <Link to="/login" className="hover:text-foreground">{copy.nav.login}</Link>
                  <Link to="/register" className="hover:text-foreground">{copy.footer.signup}</Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} InstantShop</p>
            <p className="text-xs text-muted-foreground">{copy.footer.made}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
