import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WAITLIST_MODE, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL, scrollToInterest, waitlistCtaLabel } from "@/config/launch";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  Instagram, Sparkles, ShoppingBag, ArrowRight, Check, Wand2,
  Package, BarChart3, CreditCard, Lock, Search, Play,
  TrendingUp, Bell, Sun, Moon, Mail, Phone, Send, Gift, Star, ShieldCheck,
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
import { VelaMark } from "@/components/landing/VelaMark";
import { Counter, Magnetic, prefersReducedMotion } from "@/components/landing/anim";
import {
  SplitText, BlurText, ShinyText, SpotlightCard, Tilted, StarBorder, CircularText,
} from "@/components/landing/bits";
import { en, sq, type LandingCopy } from "@/components/landing/copy";
import "@/components/landing/landing.css";

// Remotion film — heavy, so it loads only when its section is reached. One
// combined motion graphic serves both the hero and the "how it works" section.
import HeroFilmVideo from "@/components/landing/HeroFilmVideo";
// Eager, NOT lazy: a lazy splash chunk arrived a few frames after the
// (prerendered) landing painted — the page flashed, then the splash covered
// it. GSAP is already in this bundle, so eager costs nothing.
import SplashScreen from "@/components/landing/SplashScreen";
const MomentumBand = lazy(() => import("@/components/landing/MomentumBand"));
const ComparisonTable = lazy(() => import("@/components/landing/ComparisonTable"));
const ProblemSection = lazy(() => import("@/components/landing/ProblemSection"));
const TrustStrip = lazy(() => import("@/components/landing/TrustStrip"));
const HowItWorks = lazy(() => import("@/components/landing/HowItWorks"));
const FeatureShowcase = lazy(() => import("@/components/landing/FeatureShowcase"));
const ModulesSection = lazy(() => import("@/components/landing/ModulesSection"));
const Calculator = lazy(() => import("@/components/landing/Calculator"));
// React Bits effects (brand-adapted at the call sites; sources in landing/fx/)
import SpecularButton from "@/components/landing/fx/SpecularButton";
import Waves from "@/components/landing/fx/Waves";
import ScrollVelocity from "@/components/landing/fx/ScrollVelocity";
import StaggeredMenu from "@/components/landing/fx/StaggeredMenu";
import BorderGlow from "@/components/landing/fx/BorderGlow";
import ScrollReveal from "@/components/landing/fx/ScrollReveal";
const MagicRings = lazy(() => import("@/components/landing/fx/MagicRings"));
const ImageTrail = lazy(() => import("@/components/landing/fx/ImageTrail"));

gsap.registerPlugin(ScrollTrigger);

const BRAND = "brand-gradient";

// Scroll lock for the mobile menu. The CSS class blocks native (touch)
// scrolling, but Lenis scrolls the window PROGRAMMATICALLY on wheel — which
// ignores overflow:hidden — so the instance must be stopped too.
let activeLenis: Lenis | null = null;
const lockMenuScroll = (lock: boolean) => {
  document.documentElement.classList.toggle("ls-menu-lock", lock);
  if (lock) activeLenis?.stop();
  else activeLenis?.start();
};
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
  "bg-red-500/12 text-red-500",
  "bg-amber-500/12 text-amber-500",
  "bg-pink-500/12 text-pink-500",
  "bg-violet-500/12 text-violet-500",
  "bg-emerald-500/12 text-emerald-500",
  "bg-sky-500/12 text-sky-500",
];

// Annual billing: 2 months free on Pro & Business only.
const ANNUAL_FREE_MONTHS: Record<string, number> = { starter: 0, pro: 1, business: 2 };

const THEME_KEY = "landing-theme";
const LANG_CHOSEN_KEY = "landing-lang-chosen";

/* ─────────────────────────────── Nav ─────────────────────────────── */
// The Vela sailboat app-mark (public/vela-icon.svg). Kept as a thin wrapper so
// every prior BrandMark call site now renders the real brand logo.
const BrandMark = ({ size = "h-9 w-9" }: { size?: string }) => <VelaMark size={size} />;

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

/** Mounts children only while the wrapper is near the viewport — keeps WebGL
    canvases (three.js rings, waves, ogl buttons' fx) from animating forever
    after the user scrolls past them. */
const WhenNear = ({ children, className, rootMargin = "240px" }: { children: React.ReactNode; className?: string; rootMargin?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return <div ref={ref} className={className}>{near ? children : null}</div>;
};

const LandingNav = ({ active, copy, dark, onToggleTheme, lang, onSetLang }: NavProps) => {
  const [scrolled, setScrolled] = useState(false);
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
          <a href="#top" className="flex items-center gap-3">
            <BrandMark />
            <span className="font-display-brand text-[19px] font-semibold tracking-tight">Vela</span>
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
            {!WAITLIST_MODE && <Button asChild variant="ghost" size="sm"><Link to="/login">{copy.nav.login}</Link></Button>}
            <Magnetic>
              <Button asChild size="sm" className={cn("text-white hover:opacity-90", BRAND)}>
                {WAITLIST_MODE
                  ? <a href="#interest" onClick={(e) => { e.preventDefault(); scrollToInterest(); }}>{waitlistCtaLabel(lang)}</a>
                  : <Link to="/register">{copy.nav.cta}</Link>}
              </Button>
            </Magnetic>
          </div>

          {/* pr-10 reserves the right edge for the StaggeredMenu hamburger chip */}
          <div className="flex items-center gap-1 pr-10 lg:hidden">
            <button
              onClick={onToggleTheme}
              aria-label={dark ? "Light mode" : "Dark mode"}
              className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </span>
            </button>
            {/* React Bits StaggeredMenu supplies the hamburger + fullscreen panel */}
          </div>
        </nav>
      </div>

      {/* Mobile nav — React Bits StaggeredMenu (fixed overlay; toggle sits in the navbar row) */}
      <div className="lg:hidden">
        <StaggeredMenu
          isFixed
          position="right"
          colors={["#7F1D3B", "#A31234"]}
          accentColor="#FF2E4D"
          menuButtonColor={dark ? "#F5F3F6" : "#2A1D22"}
          openMenuButtonColor={dark ? "#F5F3F6" : "#2A1D22"}
          logoUrl="/vela-icon.svg"
          displaySocials={false}
          displayItemNumbering={false}
          menuLabel={lang === "sq" ? "Meny" : "Menu"}
          closeLabel={lang === "sq" ? "Mbyll" : "Close"}
          onMenuOpen={() => lockMenuScroll(true)}
          onMenuClose={() => lockMenuScroll(false)}
          items={links.map((l) => ({ label: l.label, ariaLabel: l.label, link: l.href }))}
          panelBrand={
            <div className="flex items-center gap-3">
              <BrandMark />
              <span className="font-display-brand text-[19px] font-semibold tracking-tight text-foreground">Vela</span>
            </div>
          }
          panelFooter={
            <div className="flex flex-col gap-4">
              <div className="h-px w-full bg-border" />
              <div className={cn("grid gap-2.5", WAITLIST_MODE ? "grid-cols-1" : "grid-cols-2")}>
                {!WAITLIST_MODE && (
                <Link
                  to="/login"
                  onClick={() => lockMenuScroll(false)}
                  className="grid place-items-center rounded-full border border-border bg-card px-4 py-3 text-[15px] font-semibold text-foreground"
                >
                  {copy.nav.login}
                </Link>
                )}
                {WAITLIST_MODE ? (
                <a
                  href="#interest"
                  onClick={(e) => { e.preventDefault(); lockMenuScroll(false); scrollToInterest(); }}
                  className={cn("grid place-items-center rounded-full px-4 py-3 text-[15px] font-semibold text-white", BRAND)}
                >
                  {waitlistCtaLabel(lang)}
                </a>
                ) : (
                <Link
                  to="/register"
                  onClick={() => lockMenuScroll(false)}
                  className={cn("grid place-items-center rounded-full px-4 py-3 text-[15px] font-semibold text-white", BRAND)}
                >
                  {copy.nav.cta}
                </Link>
                )}
              </div>
              <div className="flex items-center justify-between">
                <LangSwitch />
                <span className="font-display-brand text-sm font-medium text-muted-foreground">
                  {lang === "sq" ? "Ngri velën." : "Set sail."}
                </span>
              </div>
            </div>
          }
        />
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
    <div className="w-[620px] max-w-[94vw] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl shadow-red-900/10">
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
            title="Vela demo"
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
          title="Vela storefront demo"
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
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl text-white shadow-lg shadow-red-500/25", BRAND)}><Sparkles className="h-4 w-4" /></span>
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
        <div className={cn("ls-float h-[92px] w-[150px] rounded-xl p-3 text-white shadow-lg shadow-red-500/25", BRAND)}>
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
const PLAN_PRICES: Record<string, number> = { starter: 500, pro: 1990, business: 3990 };
const fmt = (n: number) => n.toLocaleString("en-US");

export default function Landing() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  // Decorative React Bits effects (WebGL rings, waves, cursor trails) are
  // skipped for reduced-motion users AND on phones / low-end hardware: they
  // cost a ~500KB chunk plus continuous canvas work — mobile pays for that in
  // TBT, LCP, battery and dropped frames while gaining almost nothing at
  // small sizes. Desktop with a real GPU keeps the full show.
  const reduceFx = typeof window !== "undefined" && (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    window.matchMedia("(max-width: 1023px)").matches ||
    (navigator as any).connection?.saveData === true ||
    (navigator.hardwareConcurrency || 8) <= 4
  );

  // Scroll-perf: gradient background animations repaint every frame, so pause
  // every animated-gradient element while it is offscreen (measured 3× fps).
  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const els = rootEl.querySelectorAll<HTMLElement>(".brand-gradient, .brand-text, .grad-border, .ls-outline-text .fill");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { (e.target as HTMLElement).style.animationPlayState = e.isIntersecting ? "running" : "paused"; }),
      { rootMargin: "160px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);
  const [annual, setAnnual] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [splash, setSplash] = useState(() => {
    try { return !sessionStorage.getItem("vela-splash-seen"); } catch { return false; }
  });
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "dark"; } catch { return false; }
  });
  const [iframeOn, setIframeOn] = useState(false);
  const [studioReady, setStudioReady] = useState(false);
  const [activeTesti, setActiveTesti] = useState(0);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1440,
    h: typeof window !== "undefined" ? window.innerHeight : 900,
  }));
  // (The hero film is a plain <video> now — cheap enough to ship on every
  //  viewport, so the old filmInHero gating is gone.)

  // Lenis inertia scrolling, driven by GSAP's ticker and feeding
  // ScrollTrigger so scrubbed animations stay in sync. Anchor links glide
  // with a nav-height offset. Reduced-motion users keep native scrolling.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.15 });
    activeLenis = lenis;
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
      activeLenis = null;
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
      ? "Vela — Kthe Instagramin në dyqan online"
      : "Vela — Turn your Instagram into an online store";
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

  // Floating testimonials: gently shift which review is elevated on a loop.
  useEffect(() => {
    const t = setInterval(() => setActiveTesti((i) => (i + 1) % 3), 3600);
    return () => clearInterval(t);
  }, []);

  // Track viewport so the hero film can relocate responsively.
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      gsap.to(".scroll-progress", {
        scaleX: 1, ease: "none",
        scrollTrigger: { start: 0, end: () => document.body.scrollHeight - window.innerHeight, scrub: 0.3 },
      });

      if (reduced) return;

      // Hero entrance
      const tl = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.1 });
      tl.from(".hero-fade", { opacity: 0, y: 22, duration: 0.8, stagger: 0.09 })
        .from(".hero-grad", { opacity: 0, y: 26, filter: "blur(8px)", duration: 0.9 }, 0.55);

      // Hero visual scroll parallax + gentle scale-away. The hero film mounts
      // lazily (after the splash), so only wire this once the node exists —
      // otherwise GSAP warns "target .hero-visual not found" on every load.
      if (document.querySelector(".hero-visual")) {
        gsap.to(".hero-visual", {
          yPercent: 12, scale: 0.97, opacity: 0.6, ease: "none",
          scrollTrigger: { trigger: ".hero-visual", start: "top 35%", end: "bottom top", scrub: true },
        });
      }

      // CTA lightning bolt: periodic wiggle
      gsap.timeline({ repeat: -1, repeatDelay: 2.6, scrollTrigger: { trigger: ".cta-panel", start: "top 85%" } })
        .to(".cta-zap", { rotate: 12, duration: 0.1, ease: "sine.inOut" })
        .to(".cta-zap", { rotate: -12, duration: 0.1 })
        .to(".cta-zap", { rotate: 8, duration: 0.1 })
        .to(".cta-zap", { rotate: 0, duration: 0.12 });

      // CTA panel: subtle breathing glow
      gsap.to(".cta-panel", {
        boxShadow: "0 0 90px -20px rgba(255,46,77,0.55)", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1,
        scrollTrigger: { trigger: ".cta-panel", start: "top 85%" },
      });
    }, rootRef);

    return () => ctx.revert();
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
      {splash && (
        <Suspense fallback={null}>
          <SplashScreen onDone={() => { setSplash(false); try { sessionStorage.setItem("vela-splash-seen", "1"); } catch { /* private mode */ } }} />
        </Suspense>
      )}
      <div className="landing-noise" />
      <LandingNav active={activeSection} copy={copy} dark={dark} onToggleTheme={toggleTheme} lang={lang} onSetLang={setLang} />

      {/* ── Hero (full screen) ── */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
        <div className="ls-mesh" />
        {/* Magic rings + subtle waves replace the particle field (React Bits, brand
            palette). WhenNear unmounts both once the hero scrolls away. */}
        {!reduceFx && (
          <WhenNear className="pointer-events-none absolute inset-0">
            <Suspense fallback={null}>
              <div className="pointer-events-none absolute inset-0 opacity-60 [&>div]:h-full [&>div]:w-full">
                <MagicRings color="#FF2E4D" colorTwo="#F59E0B" ringCount={5} speed={0.5} opacity={dark ? 0.45 : 0.3} baseRadius={0.4} radiusStep={0.12} lineThickness={1.4} noiseAmount={0.14} fadeIn={1.2} />
              </div>
            </Suspense>
            <Waves
              lineColor={dark ? "rgba(255,46,77,0.08)" : "rgba(163,18,52,0.055)"}
              className="pointer-events-none absolute inset-0"
              xGap={18} yGap={46} waveAmpX={24} waveAmpY={11} waveSpeedX={0.0085} waveSpeedY={0.004}
            />
          </WhenNear>
        )}
        {/* aurora blobs v2 — three drifting, breathing pools (wine / neon / gold) */}
        <div className={cn("ls-aurora pointer-events-none absolute -top-48 left-[16%] h-[520px] w-[620px] rounded-full blur-[140px]", dark ? "bg-red-600/25" : "bg-red-400/30")} />
        <div className={cn("ls-aurora pointer-events-none absolute -top-20 right-[14%] h-[460px] w-[560px] rounded-full blur-[140px]", dark ? "bg-amber-500/[0.13]" : "bg-amber-300/30")} style={{ animationDelay: "-9s" }} />
        <div className={cn("ls-aurora pointer-events-none absolute bottom-[-160px] left-[38%] h-[420px] w-[520px] rounded-full blur-[150px]", dark ? "bg-[#7F1D3B]/30" : "bg-[#FF2E4D]/15")} style={{ animationDelay: "-17s" }} />

        {/* Hero content — mobile-first: a clean column (badge → headline → sub →
            CTAs → film) sized against the DYNAMIC viewport height; from lg the
            copy and film sit side by side in balanced columns that never
            overlap. The film always ships (it's a cheap <video> now). */}
        <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-8 px-5 pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-24 sm:gap-10 lg:grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-10 lg:px-6 lg:pb-16 lg:pt-24">
          {/* copy */}
          <div className="relative z-10 w-full max-w-xl text-center lg:max-w-none lg:text-left">
            <div className="hero-fade mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-sm backdrop-blur sm:mb-7">
              <span className={cn("h-2 w-2 rounded-full", BRAND)} />
              <ShinyText>{copy.hero.badge}</ShinyText>
            </div>

            <h1 className="text-[clamp(2.1rem,8.5vw,2.6rem)] leading-[1.06] tracking-tight sm:text-[3.1rem] lg:text-[2.9rem] xl:text-[3.4rem]">
              <span className="block"><SplitText text={copy.hero.h1a} delay={0.15} /></span>
              <span className="block"><SplitText text={copy.hero.h1b} delay={0.35} /></span>
              <span className="hero-grad block"><GradientText>{copy.hero.h1c}</GradientText></span>
            </h1>

            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground sm:mt-6 sm:text-xl lg:mx-0 lg:max-w-lg">
              <BlurText delay={0.7} text={copy.hero.sub} />
            </p>

            <div className="hero-fade mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4 lg:justify-start">
              <Magnetic>
                {/* React Bits SpecularButton — glass CTA with a brand-gold rim light */}
                <SpecularButton
                  size="lg"
                  radius={999}
                  tint="#A31234"
                  textColor="#ffffff"
                  lineColor="#FFD84D"
                  baseColor="#FF2E4D"
                  intensity={1.1}
                  followMouse={!reduceFx}
                  backgroundClassName="brand-gradient"
                  onClick={() => (WAITLIST_MODE ? scrollToInterest() : navigate("/register"))}
                  className="h-12 w-full font-semibold sm:w-auto"
                >
                  {WAITLIST_MODE ? waitlistCtaLabel(lang) : copy.hero.ctaPrimary} <ArrowRight className="h-4 w-4" />
                </SpecularButton>
              </Magnetic>
              <Button asChild size="lg" variant="outline" className="h-12 w-full gap-2 rounded-full border-border bg-card/80 px-8 text-base backdrop-blur sm:w-auto">
                <Link to="/demo">
                  <span className="grid h-5 w-5 place-items-center rounded-full brand-gradient">
                    <Play className="h-2.5 w-2.5 fill-white text-white" />
                  </span>
                  {copy.hero.ctaSecondary}
                </Link>
              </Button>
            </div>
            <p className="hero-fade mt-3.5 text-sm text-muted-foreground sm:mt-4">
              <Check className="mr-1 inline h-4 w-4 text-emerald-500" /> {copy.hero.risk}
            </p>
          </div>

          {/* film — its own column; the transparent video can scale up past
              the column edges (scale lives on THIS wrapper, never on
              .hero-visual whose transform GSAP owns) */}
          <div className="relative z-0 w-full max-w-2xl lg:max-w-none lg:origin-center lg:scale-125 xl:scale-[1.28] 2xl:scale-[1.45]">
            {/* pre-rendered hero film (see src/compositions/HeroFilm.tsx) */}
            <div className="hero-visual w-full">
              <HeroFilmVideo dark={dark} />
            </div>
          </div>
        </div>

        {/* fade into the next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Trust strip (S3) — for every kind of shop ── */}
      <Suspense fallback={<div className="h-[140px]" />}>
        <TrustStrip lang={lang} cats={copy.marquee.cats} />
      </Suspense>

      {/* ── Problem (S4) — personified pain, GSAP ── */}
      <Suspense fallback={<div className="h-[600px]" />}>
        <ProblemSection lang={lang} />
      </Suspense>

      {/* ── How it works (S6) — sticky-scroll steps, GSAP ── */}
      <Suspense fallback={<div className="h-[700px]" />}>
        <HowItWorks lang={lang} />
      </Suspense>

      {/* CTA at peak understanding — right after seeing the flow */}
      <div className="reveal flex flex-col items-center gap-3 px-5 pb-8">
        <Magnetic>
          <StarBorder>
            <Button asChild size="lg" className={cn("h-12 gap-2 rounded-full px-8 text-base text-white hover:opacity-90", BRAND)}>
              {WAITLIST_MODE
                ? <a href="#interest" onClick={(e) => { e.preventDefault(); scrollToInterest(); }}>{waitlistCtaLabel(lang)} <ArrowRight className="h-4 w-4" /></a>
                : <Link to="/register">{copy.hero.ctaPrimary} <ArrowRight className="h-4 w-4" /></Link>}
            </Button>
          </StarBorder>
        </Magnetic>
        <p className="text-sm text-muted-foreground"><Check className="mr-1 inline h-4 w-4 text-emerald-500" /> {copy.hero.risk}</p>
      </div>

      {/* ── Stats — quiet receipt strip ── */}
      <section className="px-5 py-8 sm:py-14">
        <div className="reveal mx-auto max-w-4xl border-y border-dashed border-border py-6 sm:py-8">
          <div className="grid grid-cols-2 gap-y-6 text-center sm:grid-cols-4 sm:gap-y-8 sm:[&>*+*]:border-l sm:[&>*+*]:border-dashed sm:[&>*+*]:border-border">
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

      {/* ── Feature showcase (S7) — alternating real-UI rows, GSAP ── */}
      <Suspense fallback={<div className="h-[800px]" />}>
        <FeatureShowcase lang={lang} />

        {/* Every module, pain-first */}
        <ModulesSection lang={lang} />
      </Suspense>

      {/* ── Scroll-velocity strip (React Bits) — momentum into the dark band ── */}
      {!reduceFx && (
        <section aria-hidden className="overflow-hidden border-y border-border/50 py-6 sm:py-8">
          <ScrollVelocity
            velocity={70}
            numCopies={8}
            className="font-display-brand font-semibold tracking-tight text-foreground/[0.08] text-[clamp(2.4rem,6vw,4.6rem)] leading-none"
            texts={[
              lang === "sq" ? "PA KOD · PAGESA NË LEKË · POROSITË LIVE · " : "NO CODE · PAYMENTS IN LEK · LIVE ORDERS · ",
              lang === "sq" ? "PROVO FALAS 7 DITË · DYQANI YT ONLINE · " : "TRY FREE FOR 7 DAYS · YOUR SHOP ONLINE · ",
            ]}
          />
        </section>
      )}

      {/* ── Momentum band — "Ti fle. Vela shet." (dark, GSAP) ── */}
      <Suspense fallback={<div className="h-[400px] bg-[#0b0a0e]" />}>
        <MomentumBand lang={lang} />
      </Suspense>


      {/* ── Comparison — Instagram / Shopify / Vela (GSAP) ── */}
      <Suspense fallback={<div className="h-[500px]" />}>
        <ComparisonTable lang={lang} />
      </Suspense>

      {/* ── Calculator (S11) — "sa po lë në tavolinë?" ── */}
      <Suspense fallback={<div className="h-[500px]" />}>
        <Calculator lang={lang} />
      </Suspense>

      {/* ── Social proof & trust ── */}
      <section id="reviews" className="cv-auto relative px-5 py-14 sm:py-24 lg:py-32">
        {/* React Bits ImageTrail — product shots trail the cursor between the cards */}
        {!reduceFx && (
          <Suspense fallback={null}>
            <div className="absolute inset-0 z-0 hidden overflow-hidden opacity-70 lg:block">
              {/* multi-category product shots (tech / fashion / shoes / accessories / jewelry / home) */}
              <ImageTrail
                variant={1}
                items={[
                  "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=400&q=70",
                  "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=400&q=70",
                ]}
              />
            </div>
          </Suspense>
        )}
        <div className="pointer-events-none relative z-10 mx-auto max-w-6xl [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_figure]:pointer-events-auto">
          <div className="reveal mx-auto max-w-2xl text-center">
            <Eyebrow>{copy.testimonials.title}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">
              {lang === "sq" ? "Shitësit që kaluan te Vela" : "Sellers who made the switch"}
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-3">
            {copy.testimonials.items.map((t, i) => {
              const active = i === activeTesti;
              const floatClass = ["ls-float", "ls-float2", "ls-float3"][i % 3];
              return (
                <figure
                  key={t.name}
                  className={cn(
                    "reveal ls-card relative rounded-3xl border bg-card p-7 transition-all duration-700",
                    floatClass,
                    active
                      ? "-translate-y-1.5 border-red-500/40 shadow-[0_0_50px_-20px_rgba(255,46,77,0.5)]"
                      : "border-border"
                  )}
                >
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, s) => <Star key={s} className="h-4 w-4 fill-current" />)}
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">“{t.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className={cn("grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white", BRAND)}>
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
          {/* trust badges */}
          <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {lang === "sq" ? "Enkriptim i nivelit bankar" : "Bank-level encryption"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Lock className="h-4 w-4" />
              {lang === "sq" ? "Pagesa të sigurta · Raiffeisen (RaiAccept)" : "Payments secured · Raiffeisen (RaiAccept)"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="cv-auto px-5 py-14 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mx-auto max-w-2xl text-center">
            <Eyebrow>{copy.pricing.badge}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.pricing.title}</h2>
            <p className="mt-3 text-lg text-muted-foreground">{copy.pricing.sub}</p>
            {/* Segmented billing-cycle toggle: the active side is a filled pill,
                so there's never ambiguity about which cycle is selected. */}
            <div className="mt-6 inline-flex items-center rounded-full border border-border bg-card p-1 shadow-sm" role="group" aria-label={`${copy.pricing.monthly} / ${copy.pricing.annual}`}>
              <button
                type="button"
                onClick={() => setAnnual(false)}
                aria-pressed={!annual}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  !annual ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {copy.pricing.monthly}
              </button>
              <button
                type="button"
                onClick={() => setAnnual(true)}
                aria-pressed={annual}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  annual ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {copy.pricing.annual}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  annual ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500/10 text-red-600"
                )}>
                  {copy.pricing.save}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile: Pro (featured) first — it's the flagship; pt-4 keeps its
              floating badge from clipping at the grid edge. */}
          <div className="mt-8 grid items-start gap-6 pt-4 sm:mt-12 lg:grid-cols-3 lg:pt-0">
            {copy.pricing.plans.map((p) => {
              const featured = p.id === "pro";
              const inner = (
                <>
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
                          "plan-bonus inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-red-500/10 to-amber-400/10 px-3 py-1 text-xs font-medium text-red-600 transition-transform duration-500",
                          annual ? "scale-100" : "scale-75"
                        )}>
                          <Gift className="h-3.5 w-3.5" /> {copy.pricing.saveMonths(ANNUAL_FREE_MONTHS[p.id] ?? 0)}
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
                    {WAITLIST_MODE
                      ? <a href="#interest" onClick={(e) => { e.preventDefault(); scrollToInterest(); }}>{waitlistCtaLabel(lang)}</a>
                      : <Link to="/register">{copy.pricing.trialCta}</Link>}
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">{copy.pricing.trialNote}</p>
                  <ul className="mt-6 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}</li>
                    ))}
                  </ul>
                </>
              );
              // Featured plan keeps its animated grad-border identity; the
              // others get the React Bits BorderGlow (cursor-tracked rim).
              // All three cards float gently (staggered periods so they drift
              // out of phase); reduced motion disables the keyframes globally.
              return featured ? (
                <SpotlightCard
                  key={p.id}
                  className="reveal ls-float2 ls-card relative order-first flex flex-col rounded-3xl p-5 grad-border shadow-[0_0_70px_-18px_rgba(255,46,77,0.4)] sm:p-7 lg:order-none lg:-my-3 lg:py-10"
                >
                  {inner}
                </SpotlightCard>
              ) : (
                <BorderGlow
                  key={p.id}
                  className={cn("reveal", p.id === "starter" ? "ls-float" : "ls-float3")}
                  glowColor="351 92% 60%"
                  backgroundColor="hsl(var(--card))"
                  borderRadius={24}
                  glowIntensity={0.85}
                  animated
                  colors={["#FF2E4D", "#F59E0B", "#A31234"]}
                >
                  <div className="relative flex flex-col p-5 sm:p-7">{inner}</div>
                </BorderGlow>
              );
            })}
          </div>

          {/* trial reassurance — React Bits ScrollReveal unblurs it word by word */}
          <ScrollReveal
            containerClassName="reveal mx-auto mt-8 max-w-2xl text-center"
            textClassName="!text-sm !font-normal !leading-relaxed text-muted-foreground"
            baseOpacity={0.15}
            baseRotation={1.5}
            blurStrength={3}
          >
            {copy.pricing.reassure}
          </ScrollReveal>

          {/* contact — lives inside the pricing section so "talk to us" sits right
              where the plan decision happens; #interest kept for deep links */}
          <div id="interest" className="reveal ls-card glare-hover mx-auto mt-12 max-w-3xl scroll-mt-24 overflow-hidden rounded-[2rem] border border-border bg-card p-6 text-center sm:mt-16 sm:p-12">
            <Eyebrow>{copy.interest.badge}</Eyebrow>
            <h3 className="mx-auto mt-2 max-w-xl text-[1.55rem] leading-tight tracking-tight sm:mt-3 sm:text-3xl sm:leading-tight">{copy.interest.title}</h3>
            <p className="mx-auto mt-2.5 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-lg">{copy.interest.sub}</p>
            <div className="mx-auto mt-7 grid max-w-lg gap-3 sm:grid-cols-2 sm:mt-9">
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className={cn("group flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-white transition-opacity hover:opacity-90", BRAND)}
              >
                <Phone className="h-5 w-5 shrink-0" />
                <span className="text-left">
                  <span className="block text-[11px] font-medium uppercase tracking-[0.14em] opacity-80">{lang === "sq" ? "Na telefono" : "Call us"}</span>
                  <span className="block text-[15px] font-semibold sm:text-base" dir="ltr">{CONTACT_PHONE}</span>
                </span>
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(lang === "sq" ? "Interes për Vela" : "Interested in Vela")}`}
                className="group flex items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 py-4 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <span className="min-w-0 text-left">
                  <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{lang === "sq" ? "Na shkruaj" : "Email us"}</span>
                  <span className="block truncate text-[14px] font-semibold sm:text-[15px]">{CONTACT_EMAIL}</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="cv-auto px-5 py-14 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl">
          <div className="reveal text-center">
            <Eyebrow>{lang === "sq" ? "Ndihmë" : "Help"}</Eyebrow>
            <h2 className="text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.faq.title}</h2>
          </div>
          <div className="reveal ls-card mt-8 rounded-3xl border border-border bg-card px-6 sm:mt-10 sm:px-8">
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
      <section className="cv-auto px-5 py-14 sm:py-24 lg:py-32">
        <div className={cn("cta-panel reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] px-6 py-14 text-center text-white sm:px-12 sm:py-20", BRAND)}>
          {/* React Bits MagicRings + Waves — the closing card breathes (unmounted offscreen) */}
          {!reduceFx && (
            <WhenNear className="pointer-events-none absolute inset-0">
              <Suspense fallback={null}>
                <div className="pointer-events-none absolute inset-0 opacity-50 [&>div]:h-full [&>div]:w-full">
                  <MagicRings color="#FFD84D" colorTwo="#FF2E4D" ringCount={4} speed={0.6} opacity={0.5} baseRadius={0.5} radiusStep={0.14} lineThickness={1.2} noiseAmount={0.12} />
                </div>
              </Suspense>
              <Waves lineColor="rgba(255,255,255,0.10)" className="pointer-events-none absolute inset-0" xGap={22} yGap={52} waveAmpX={20} waveAmpY={10} waveSpeedX={0.008} />
            </WhenNear>
          )}
          <img src="/ship-icon-white.svg" alt="" className="cta-zap relative mx-auto h-12 w-12" />
          <h2 className="relative mt-4 text-3xl tracking-tight sm:text-[2.6rem] sm:leading-tight">{copy.cta.title}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-lg text-white/90">{copy.cta.sub}</p>
          <Magnetic>
            {/* React Bits SpecularButton — glass on the gradient, gold rim light */}
            <SpecularButton
              size="lg"
              radius={999}
              tint="#FFFFFF"
              tintOpacity={0.16}
              blur={10}
              textColor="#ffffff"
              lineColor="#FFD84D"
              baseColor="#FFFFFF"
              intensity={1.15}
              followMouse={!reduceFx}
              onClick={() => (WAITLIST_MODE ? scrollToInterest() : navigate("/register"))}
              className="relative mt-8 font-semibold sm:mt-9"
            >
              {WAITLIST_MODE ? waitlistCtaLabel(lang) : copy.cta.button} <ArrowRight className="h-4 w-4" />
            </SpecularButton>
          </Magnetic>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-5 pb-10 pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-10 sm:flex-row">
            <div className="max-w-xs">
              <div className="flex items-center gap-3">
                <BrandMark />
                <span className="font-display-brand text-lg font-semibold">Vela</span>
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
                  {WAITLIST_MODE ? (
                    <a href="#interest" onClick={(e) => { e.preventDefault(); scrollToInterest(); }} className="hover:text-foreground">{waitlistCtaLabel(lang)}</a>
                  ) : (<>
                  <Link to="/login" className="hover:text-foreground">{copy.nav.login}</Link>
                  <Link to="/register" className="hover:text-foreground">{copy.footer.signup}</Link>
                  </>)}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Vela</p>
            <p className="text-xs text-muted-foreground">{copy.footer.made}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
