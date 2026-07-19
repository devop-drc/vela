/**
 * Hero product walkthrough (Remotion, via @remotion/player) — a faithful,
 * cursor-driven tour of the real app inside one persistent browser window, in
 * the exact order it happens. Nine beats:
 *   0 Products page → cursor clicks the red "Full Sync"
 *   1 Sync widget analyzes each Instagram post (progress → "Sync Complete")
 *   2 The real storefront, live, with the extracted products
 *   3 Storefront Studio cycling through all our real templates
 *   4 A customer searches & filters
 *   5 Adds to cart (drawer slides in)
 *   6 Checkout details → pays by cash or card (RaiAccept)
 *   7 Admin: the order arrives → cursor sets it "Fulfilled"
 *   8 Revenue ticks up on the dashboard
 * Storefront beats use the REAL storefront components + templates; admin beats
 * are faithful reconstructions per the app's design. Landscape composition.
 */
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, Easing, Img, useVideoConfig } from "remotion";
import {
  Home, Package, Archive, ShoppingBag, Settings, RefreshCw, Plus, Filter, ArrowUpDown, LayoutGrid, List,
  Search, SlidersHorizontal, Loader2, CheckCircle2, Check, Zap, Info, CreditCard, Banknote, Bell, Sparkles,
  Palette, ChevronDown, Instagram, Star, ShieldCheck, ArrowRight, Clock,
} from "lucide-react";
import { StorefrontContext } from "@/contexts/StorefrontContext";
import { CartProvider } from "@/contexts/CartContext";
import { StorefrontThemeProvider } from "@/storefront/theme/StorefrontThemeProvider";
import { ProductCard } from "@/storefront/components/ProductCard";
import { TEMPLATES } from "@/storefront/templates";
import { PRODUCTS, MOCK_CONTEXT } from "@/pages/DemoShop";
import type { LandingCopy } from "../copy";

export const FPS = 30;
export const SCENE = 80; // snappy beats
export const SCENES = 9;
export const HERO_FRAMES = SCENE * SCENES;

const BRAND = "brand-gradient";
type Lang = "sq" | "en";
const t = (lang: Lang, en: string, sq: string) => (lang === "sq" ? sq : en);
const inAt = (frame: number, delay = 0, damping = 12) => spring({ frame: frame - delay, fps: FPS, config: { damping, stiffness: 150 } });
const typed = (frame: number, text: string, start: number, cps = 2.4) => text.slice(0, Math.max(0, Math.floor((frame - start) / cps)));
const cO = (local: number) => interpolate(local, [0, 9, SCENE - 9, SCENE], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const URLS = ["vela.al/products", "vela.al/products", "butiku-i-eliras.vela.al", "vela.al/settings", "butiku-i-eliras.vela.al/products", "butiku-i-eliras.vela.al", "butiku-i-eliras.vela.al/checkout", "vela.al/orders", "vela.al/dashboard"];

/* ── app shell (sidebar + header) for admin beats ───────────────────── */
const NAV = [["Dashboard", Home], ["Products", Package], ["Out of Stock", Archive], ["Orders", ShoppingBag], ["Settings", Settings]] as const;
const AdminShell = ({ active, title, children }: { active: string; title: string; children: React.ReactNode }) => (
  <div className="flex h-full bg-white">
    <aside className="flex w-40 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/70 p-2.5">
      <div className="mb-3 flex items-center gap-2 px-1"><img src="/vela-icon.svg" alt="" className="h-6 w-6 rounded-md" /><span className="font-display-brand text-[13px] font-bold text-zinc-900">Vela</span></div>
      {NAV.map(([label, Icon]) => (
        <span key={label} className={`mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] ${label === active ? "bg-zinc-900 font-semibold text-white" : "text-zinc-500"}`}><Icon className="h-3.5 w-3.5" /> {label}</span>
      ))}
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5"><span className="text-[13px] font-bold text-zinc-900">{title}</span><span className="rounded-md bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white">Sign up</span></div>
      <div className="relative min-h-0 flex-1 overflow-hidden p-3.5">{children}</div>
    </div>
  </div>
);
const Chip = ({ dot, tone, children }: { dot?: string; tone: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm ${tone}`}>{dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}{children}</span>
);

/* real storefront providers. `contain: paint` gives this box its own containing
 * block so the theme's `position: fixed` page background stays inside the
 * preview instead of leaking into the composition margins under the zoom. */
const Storefront = ({ tpl = 0, children }: { tpl?: number; children: React.ReactNode }) => (
  <StorefrontContext.Provider value={MOCK_CONTEXT as any}>
    <CartProvider>
      <div className="relative h-full overflow-hidden bg-white" style={{ contain: "paint" }}>
        <StorefrontThemeProvider config={TEMPLATES[tpl % TEMPLATES.length].config} className="h-full overflow-hidden bg-white">
          {children}
        </StorefrontThemeProvider>
      </div>
    </CartProvider>
  </StorefrontContext.Provider>
);
const StoreHead = ({ lang }: { lang: Lang }) => (
  <div className="flex items-center gap-2 border-b border-zinc-200 px-3.5 py-2.5">
    <img src="/vela-icon.svg" alt="" className="h-5 w-5 rounded-md" />
    <span className="sf-heading font-display-brand text-[12px] font-bold text-zinc-900">Shop Name</span>
    <div className="ml-auto flex items-center gap-3 text-zinc-400"><Search className="h-3.5 w-3.5" /><span className="relative"><ShoppingBag className="h-3.5 w-3.5" /></span></div>
  </div>
);

/* ── 0 · Products page + Full Sync ──────────────────────────────────── */
const B0_Products = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const syncing = f > 46;
  return (
    <AdminShell active="Products" title={t(lang, "Products", "Produktet")}>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Chip tone="bg-zinc-100 border-zinc-200 text-zinc-700"><Package className="h-3 w-3 text-zinc-400" /> 235 {t(lang, "Total", "Gjithsej")}</Chip>
        <Chip dot="bg-emerald-500" tone="bg-emerald-500/10 border-emerald-500/25 text-emerald-700">228 {t(lang, "Active", "Aktive")}</Chip>
        <Chip dot="bg-amber-500" tone="bg-amber-500/10 border-amber-500/25 text-amber-700">5 {t(lang, "Draft", "Draft")}</Chip>
        <Chip dot="bg-red-500" tone="bg-red-500/10 border-red-500/25 text-red-700">2 {t(lang, "Out of Stock", "Pa stok")}</Chip>
      </div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-white"><Plus className="h-3.5 w-3.5" /> {t(lang, "Add Product", "Shto")}</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] text-zinc-600"><Filter className="h-3.5 w-3.5" /> {t(lang, "Filters", "Filtra")}</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] text-zinc-600"><ArrowUpDown className="h-3.5 w-3.5" /> {t(lang, "Sort", "Rendit")}</span>
          <span className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5"><span className="rounded-md bg-white p-1 shadow-sm"><LayoutGrid className="h-3.5 w-3.5 text-zinc-700" /></span><span className="p-1"><List className="h-3.5 w-3.5 text-zinc-400" /></span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-[11px] text-zinc-600"><Instagram className="h-3.5 w-3.5" /> {t(lang, "Import", "Importo")}</span>
          <span data-tgt="sync" className={`inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-transform ${syncing ? "scale-95" : ""}`}><RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> {t(lang, "Full Sync", "Sinkronizim i Plotë")}</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {PRODUCTS.slice(0, 8).map((p, i) => { const s = inAt(f, 2 + i * 2); return (
          <div key={p.id} className="overflow-hidden rounded-lg border border-zinc-200" style={{ opacity: s }}>
            <Img src={p.media_url} className="aspect-square w-full object-cover" />
            <div className="p-1.5"><div className="truncate text-[10px] font-semibold text-zinc-800">{p.name}</div><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-zinc-900">{p.price.toLocaleString()} ALL</span><span className="rounded bg-emerald-500/15 px-1 text-[8px] font-bold text-emerald-600">Active</span></div></div>
          </div>
        ); })}
      </div>
    </AdminShell>
  );
};

/* ── 1 · Sync analysis widget ───────────────────────────────────────── */
const B1_Sync = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const total = 24;
  const prog = Math.min(total, Math.floor(interpolate(f, [6, SCENE - 16], [0, total], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const pct = Math.round((prog / total) * 100);
  const done = prog >= total;
  const cur = PRODUCTS[prog % PRODUCTS.length];
  const created = Math.min(18, Math.floor(prog * 0.75));
  const updated = Math.min(6, prog - created);
  return (
    <AdminShell active="Products" title={t(lang, "Products", "Produktet")}>
      <div className="grid grid-cols-4 gap-2.5 opacity-60">
        {PRODUCTS.slice(0, 8).map((p) => <div key={p.id} className="overflow-hidden rounded-lg border border-zinc-200"><Img src={p.media_url} className="aspect-square w-full object-cover" /><div className="h-7" /></div>)}
      </div>
      {/* sync widget bottom-left */}
      <div className="absolute bottom-3 left-3 w-[300px] rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-2xl backdrop-blur" style={{ opacity: inAt(f, 2), transform: `translateY(${(1 - inAt(f, 2)) * 12}px)` }}>
        <div className="flex items-center gap-2">
          {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <><Loader2 className="h-4 w-4 animate-spin text-red-600" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" /></>}
          <span className="text-[12px] font-bold text-zinc-900">{done ? t(lang, "Sync Complete", "Sinkronizimi Përfundoi") : t(lang, "Syncing Products", "Duke Sinkronizuar")}</span>
          <span className="ml-auto font-mono text-[10px] tabular-nums text-zinc-400">{done ? "45s" : `${Math.floor(f / 30)}s`}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className={`h-full rounded-full ${BRAND}`} style={{ width: `${pct}%` }} /></div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500"><span className="truncate">{done ? t(lang, "All posts analyzed", "Të gjitha u analizuan") : t(lang, "The system is analyzing your posts…", "Sistemi po analizon…")}</span><span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {prog}/{total}</span></div>
        {!done ? (
          <>
            <div className="mt-2 flex gap-1.5">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600"><Package className="h-2.5 w-2.5" /> {created} {t(lang, "new", "të reja")}</span>
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-600"><Zap className="h-2.5 w-2.5" /> {updated} {t(lang, "updated", "përditësuar")}</span>
            </div>
            <div className="mt-2 flex items-center gap-2.5 rounded-md border border-zinc-200 bg-zinc-50 p-1.5">
              <Img src={cur.media_url} className="h-9 w-9 rounded object-cover" />
              <div className="min-w-0"><div className="truncate text-[11px] font-medium text-zinc-800">{cur.name || t(lang, "Analyzing…", "Duke analizuar…")}</div><div className="text-[9px] text-zinc-500">{cur.category} · {cur.price.toLocaleString()} ALL</div></div>
            </div>
          </>
        ) : (
          <div data-tgt="summary" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"><Info className="h-3.5 w-3.5" /> {t(lang, "Summary", "Përmbledhje")}</div>
        )}
      </div>
    </AdminShell>
  );
};

/* ── 2 · storefront live ────────────────────────────────────────────── */
const B2_Store = ({ copy, lang }: { copy: LandingCopy; lang: Lang }) => {
  const f = useCurrentFrame();
  const live = inAt(f, 16, 10);
  return (
    <div className="relative h-full">
      <Storefront tpl={0}>
        <div className="flex h-full flex-col">
          <StoreHead lang={lang} />
          <div className={`px-3.5 py-2.5 text-white ${BRAND}`}><div className="text-[9px] opacity-90">{copy.screen.banner1}</div><div className="text-[13px] font-bold">{copy.screen.banner2}</div></div>
          <div className="grid grid-cols-4 gap-2.5 p-3">
            {PRODUCTS.slice(0, 4).map((p, i) => { const s = inAt(f, 3 + i * 4); return <div key={p.id} data-tgt={i === 0 ? "prod" : undefined} style={{ opacity: s, transform: `translateY(${(1 - s) * 14}px)` }}><ProductCard product={p as any} /></div>; })}
          </div>
        </div>
      </Storefront>
      <div className="absolute left-1/2 top-2.5 -translate-x-1/2" style={{ opacity: live, transform: `translate(-50%,0) scale(${0.6 + live * 0.4})` }}><span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold text-white shadow-lg ${BRAND}`}><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE</span></div>
    </div>
  );
};

/* ── 3 · Storefront Studio — cycle every real template ──────────────── */
const B3_Studio = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const tpl = Math.floor(f / 12) % TEMPLATES.length;
  return (
    <div className="flex h-full bg-white">
      {/* control rail */}
      <div className="w-36 shrink-0 border-r border-zinc-200 p-2.5">
        <div className="text-[11px] font-bold text-zinc-900">{t(lang, "Storefront Studio", "Studio")}</div>
        <div className="mt-2 rounded-lg border border-zinc-200 p-2"><div className="text-[9px] text-zinc-400">{t(lang, "Template", "Template")}</div><div className="mt-0.5 flex items-center justify-between text-[11px] font-semibold text-zinc-800">{TEMPLATES[tpl].name} <ChevronDown className="h-3 w-3 text-zinc-400" /></div></div>
        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-zinc-200 p-1 text-[10px]"><span className="flex-1 rounded bg-zinc-100 px-2 py-1 text-center"><Instagram className="mx-auto h-3 w-3" /></span><span className={`flex-1 rounded px-2 py-1 text-center text-white ${BRAND}`}><Palette className="mx-auto h-3 w-3" /></span></div>
        <div className="mt-3 space-y-1.5">{[t(lang, "Colors", "Ngjyrat"), t(lang, "Typography", "Fontet"), t(lang, "Layout", "Struktura"), t(lang, "Sections", "Seksionet")].map((s) => <div key={s} className="rounded-md bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-500">{s}</div>)}</div>
      </div>
      {/* live preview */}
      <div className="min-w-0 flex-1 p-3">
        <div className="h-full overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
          <Storefront tpl={tpl}>
            <div className="flex h-full flex-col">
              <StoreHead lang={lang} />
              <div className="grid grid-cols-3 gap-2 p-2.5">{PRODUCTS.slice(0, 3).map((p) => <ProductCard key={p.id} product={p as any} />)}</div>
            </div>
          </Storefront>
        </div>
      </div>
      {/* template strip */}
      <div className="w-32 shrink-0 space-y-1.5 overflow-hidden border-l border-zinc-200 p-2">
        {TEMPLATES.map((tp, i) => <div key={tp.id} data-tgt={i === tpl ? "tpl" : undefined} className={`rounded-lg border-2 px-2 py-1.5 text-[10px] font-medium transition-all ${i === tpl ? "border-red-500 bg-red-500/5 text-zinc-900" : "border-transparent text-zinc-500"}`}>{i === tpl && <Check className="mr-1 inline h-2.5 w-2.5 text-red-500" />}{tp.name}</div>)}
      </div>
    </div>
  );
};

/* ── 4 · search & filter ────────────────────────────────────────────── */
const B4_Search = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const q = typed(f, t(lang, "fustan", "fustan"), 8, 3);
  const filtered = f > 30;
  const cats = ["All", "Fustane", "Aksesorë", "Çanta", "Këpucë"];
  return (
    <Storefront tpl={0}>
      <div className="flex h-full flex-col">
        <StoreHead lang={lang} />
        <div className="flex items-center gap-2 px-3.5 pt-3">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-700"><Search className="h-3.5 w-3.5 text-zinc-400" /><span>{q}</span><span className="animate-pulse">|</span></div>
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-3 py-1.5 text-[11px] text-zinc-600"><SlidersHorizontal className="h-3.5 w-3.5" /> {t(lang, "Filters", "Filtra")}</span>
        </div>
        <div className="flex gap-1.5 px-3.5 pt-2.5">{cats.map((c, i) => <span key={c} data-tgt={c === "Fustane" ? "cat" : undefined} className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${(filtered && c === "Fustane") || (!filtered && i === 0) ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>{c}</span>)}</div>
        <div className="grid grid-cols-4 gap-2.5 p-3">{PRODUCTS.slice(0, 4).map((p, i) => <div key={p.id} style={{ opacity: filtered ? (i === 0 ? 1 : 0.18) : 1, transform: filtered && i === 0 ? "scale(1.03)" : undefined, transition: "opacity .3s" }}><ProductCard product={p as any} /></div>)}</div>
      </div>
    </Storefront>
  );
};

/* ── 5 · add to cart (drawer slides in) ─────────────────────────────── */
const B5_Cart = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const added = f > 30;
  const drawer = inAt(f, 34, 13);
  return (
    <div className="relative h-full">
      <Storefront tpl={0}>
        <div className="flex h-full flex-col">
          <StoreHead lang={lang} />
          <div className="flex gap-5 p-5">
            <Img src={PRODUCTS[0].media_url} className="h-52 w-44 rounded-xl object-cover" />
            <div className="flex-1 pt-1">
              <div className="sf-heading text-[18px] font-bold text-zinc-900">{PRODUCTS[0].name}</div>
              <div className="mt-1 flex items-center gap-1 text-amber-400">{Array.from({ length: 5 }).map((_, s) => <Star key={s} className="h-3 w-3 fill-current" />)}<span className="ml-1 text-[10px] text-zinc-400">(23)</span></div>
              <div className="mt-2 text-[18px] font-bold text-zinc-900">3,500 ALL</div>
              <div className="mt-3 flex gap-1.5">{["S", "M", "L"].map((s, i) => <span key={s} className={`grid h-7 w-7 place-items-center rounded-md border text-[11px] ${i === 1 ? "border-zinc-900 font-bold" : "border-zinc-200 text-zinc-500"}`}>{s}</span>)}</div>
              <div className="flex items-center gap-3">
                <div data-tgt="addcart" className={`mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-bold text-white transition-transform ${added ? "scale-95" : ""} ${BRAND}`}>{added ? <><Check className="h-4 w-4" /> {t(lang, "Added", "U shtua")}</> : <><ShoppingBag className="h-4 w-4" /> {t(lang, "Add to cart", "Shto në shportë")}</>}</div>
                <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600"><Check className="h-3 w-3" /> {t(lang, "In stock", "Në stok")}</span>
              </div>
              <p className="mt-3 max-w-[320px] text-[11px] leading-relaxed text-zinc-500">{t(lang, "Flowing linen maxi dress, breathable and lightweight — perfect for warm days. Free returns within 14 days.", "Fustan lin i gjatë, i lehtë dhe i ajrosur — ideal për ditët e ngrohta. Kthim falas brenda 14 ditësh.")}</p>
              <div className="mt-3 flex gap-3 text-[10px] text-zinc-400">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {t(lang, "Secure checkout", "Pagesë e sigurt")}</span>
                <span className="inline-flex items-center gap-1"><ArrowRight className="h-3.5 w-3.5" /> {t(lang, "Fast delivery", "Dërgesë e shpejtë")}</span>
              </div>
            </div>
          </div>
          <div className="mt-auto border-t border-zinc-100 px-5 pb-4 pt-3">
            <div className="mb-2 text-[11px] font-bold text-zinc-800">{t(lang, "You may also like", "Të ngjashme")}</div>
            <div className="grid grid-cols-4 gap-2.5">{PRODUCTS.slice(1, 5).map((p) => <ProductCard key={p.id} product={p as any} />)}</div>
          </div>
        </div>
      </Storefront>
      {/* cart drawer */}
      <div className="absolute inset-y-0 right-0 w-64 border-l border-zinc-200 bg-white p-3.5 shadow-2xl" style={{ transform: `translateX(${(1 - drawer) * 100}%)` }}>
        <div className="flex items-center gap-2 text-[13px] font-bold text-zinc-900"><ShoppingBag className="h-4 w-4" /> {t(lang, "Your Cart", "Shporta jote")}</div>
        <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-zinc-200 p-2"><Img src={PRODUCTS[0].media_url} className="h-12 w-12 rounded object-cover" /><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-semibold text-zinc-800">{PRODUCTS[0].name}</div><div className="text-[9px] text-zinc-400">M · x1</div><div className="text-[11px] font-bold text-zinc-900">3,500 ALL</div></div></div>
        <div className="mt-3 space-y-1 text-[11px]"><div className="flex justify-between text-zinc-500"><span>{t(lang, "Subtotal", "Nëntotali")}</span><span>3,500 ALL</span></div><div className="flex justify-between text-zinc-500"><span>{t(lang, "Shipping", "Transporti")}</span><span className="font-semibold text-emerald-600">FREE</span></div></div>
        <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2 text-[13px] font-bold text-zinc-900"><span>{t(lang, "Total", "Totali")}</span><span>3,500 ALL</span></div>
        <div className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold text-white ${BRAND}`}>{t(lang, "Proceed to Checkout", "Vazhdo te arka")} <ArrowRight className="h-3.5 w-3.5" /></div>
      </div>
    </div>
  );
};

/* ── 6 · checkout details + payment ─────────────────────────────────── */
const Field = ({ label, value, w = "" }: { label: string; value: string; w?: string }) => (
  <div className={w}><div className="text-[9px] text-zinc-400">{label}</div><div className="mt-0.5 flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2 text-[11px] text-zinc-800">{value}<span className="animate-pulse text-zinc-300">{value ? "" : "|"}</span></div></div>
);
const B6_Checkout = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const card = f > 34;
  const paid = inAt(f, 58, 10);
  return (
    <Storefront tpl={0}>
      <div className="flex h-full">
        {/* form */}
        <div className="flex-1 border-r border-zinc-100 p-4">
          <div className="text-[12px] font-bold text-zinc-900">{t(lang, "Contact & Shipping", "Kontakti & Dërgesa")}</div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <Field label={t(lang, "First name", "Emri")} value={typed(f, "Ana", 4, 2)} />
            <Field label={t(lang, "Last name", "Mbiemri")} value={typed(f, "Kola", 10, 2)} />
            <Field label="Email" value={typed(f, "ana@mail.al", 16, 1.6)} w="col-span-2" />
            <Field label={t(lang, "Address", "Adresa")} value={typed(f, "Rr. Myslym Shyri 12", 24, 1.4)} w="col-span-2" />
            <Field label={t(lang, "City", "Qyteti")} value={typed(f, "Tiranë", 34, 2)} />
            <Field label={t(lang, "Country", "Shteti")} value="🇦🇱 Albania" />
          </div>
        </div>
        {/* payment */}
        <div className="w-56 shrink-0 p-4">
          <div className="text-[12px] font-bold text-zinc-900">{t(lang, "Payment", "Pagesa")}</div>
          <div className="mt-2.5 space-y-2">
            <div className={`flex items-center gap-2 rounded-lg border p-2 ${!card ? "border-zinc-900" : "border-zinc-200"}`}><span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-100 text-zinc-600"><Banknote className="h-3.5 w-3.5" /></span><span className="text-[11px] font-medium text-zinc-700">{t(lang, "Cash on delivery", "Para në dorëzim")}</span>{!card && <Check className="ml-auto h-3.5 w-3.5 text-zinc-900" />}</div>
            <div data-tgt="card" className={`flex items-center gap-2 rounded-lg border-2 p-2 transition-colors ${card ? "border-red-500 bg-red-500/5" : "border-zinc-200"}`}><span className={`grid h-7 w-7 place-items-center rounded-md text-white ${BRAND}`}><CreditCard className="h-3.5 w-3.5" /></span><div><div className="text-[11px] font-semibold text-zinc-800">{t(lang, "Card · RaiAccept", "Kartë · RaiAccept")}</div><div className="text-[8px] text-zinc-500">Raiffeisen</div></div>{card && <Check className="ml-auto h-3.5 w-3.5 text-red-500" />}</div>
          </div>
          <div data-tgt="order" className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold text-white transition-transform ${paid > 0 ? "scale-95" : ""} ${BRAND}`}><CheckCircle2 className="h-3.5 w-3.5" /> {t(lang, "Place Order", "Porosit")}</div>
          <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-zinc-400"><ShieldCheck className="h-3 w-3" /> {t(lang, "Securely processed", "E sigurt")}</div>
        </div>
      </div>
      {paid > 0.02 && (<div className="absolute inset-0 grid place-items-center bg-white/85 backdrop-blur-sm" style={{ opacity: Math.min(1, paid * 2) }}><div className="flex flex-col items-center" style={{ transform: `scale(${0.5 + paid * 0.5})` }}><span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white shadow-xl"><Check className="h-8 w-8" /></span><span className="mt-2 text-[14px] font-bold text-zinc-800">{t(lang, "Order placed ✓", "Porosia u krye ✓")}</span></div></div>)}
    </Storefront>
  );
};

/* ── 7 · admin order arrives → fulfilled ────────────────────────────── */
const B7_Orders = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const toast = inAt(f, 4, 12);
  const fulfilled = f > 46;
  const rev = fulfilled ? "2,845,000" : "2,841,500";
  return (
    <AdminShell active="Orders" title={t(lang, "Orders", "Porositë")}>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <Chip tone="bg-zinc-100 border-zinc-200 text-zinc-700"><ShoppingBag className="h-3 w-3 text-zinc-400" /> 1,891 {t(lang, "orders", "porosi")}</Chip>
        <Chip tone="bg-emerald-500/10 border-emerald-500/25 text-emerald-700"><Banknote className="h-3 w-3" /> {rev} ALL</Chip>
        <Chip tone="bg-amber-500/10 border-amber-500/25 text-amber-700"><Clock className="h-3 w-3" /> {fulfilled ? 0 : 1} {t(lang, "Pending", "Në pritje")}</Chip>
        <Chip tone="bg-emerald-500/10 border-emerald-500/25 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> {fulfilled ? 1843 : 1842} {t(lang, "Fulfilled", "Përmbushur")}</Chip>
      </div>
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <div className="grid grid-cols-[1fr_1.4fr_0.7fr_0.9fr_0.9fr] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[9px] font-semibold uppercase tracking-wide text-zinc-400"><span>{t(lang, "Order", "Porosia")}</span><span>{t(lang, "Customer", "Klienti")}</span><span>{t(lang, "Items", "Artikuj")}</span><span>{t(lang, "Status", "Statusi")}</span><span className="text-right">{t(lang, "Total", "Totali")}</span></div>
        {/* the new order */}
        <div className="grid grid-cols-[1fr_1.4fr_0.7fr_0.9fr_0.9fr] items-center gap-2 border-b border-zinc-100 px-3 py-2.5" style={{ background: f < 40 ? "rgba(255,46,77,0.05)" : undefined }}>
          <span className="font-mono text-[10px] text-zinc-600">#a1b2c3d4</span>
          <span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-zinc-800">Ana Kola</span><span className="block truncate text-[9px] text-zinc-400">ana@mail.al</span></span>
          <span className="text-[11px] text-zinc-600">1</span>
          <span><span data-tgt="status" className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-colors ${fulfilled ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-amber-300 bg-amber-100 text-amber-800"}`}>{fulfilled ? t(lang, "Fulfilled", "Përmbushur") : t(lang, "Pending", "Në pritje")} <ChevronDown className="h-2.5 w-2.5" /></span></span>
          <span className="text-right text-[11px] font-bold text-zinc-900">3,500 ALL</span>
        </div>
        {[["Bledi Marku", "bledi@mail.al", "2", "4,200 ALL"], ["Sara Deda", "sara.d@mail.al", "1", "2,800 ALL"], ["Erisa Hoxha", "erisa@mail.al", "3", "6,100 ALL"], ["Klodian Rama", "klodi@mail.al", "1", "1,900 ALL"], ["Fjola Berisha", "fjola@mail.al", "2", "3,400 ALL"], ["Endrit Leka", "endrit@mail.al", "1", "990 ALL"]].map(([n, e, it, v]) => (
          <div key={n} className="grid grid-cols-[1fr_1.4fr_0.7fr_0.9fr_0.9fr] items-center gap-2 border-b border-zinc-100 px-3 py-2.5 opacity-70 last:border-0"><span className="font-mono text-[10px] text-zinc-500">#{n.split(" ")[0].toLowerCase().slice(0, 4)}…</span><span className="min-w-0"><span className="block truncate text-[11px] font-medium text-zinc-700">{n}</span><span className="block truncate text-[9px] text-zinc-400">{e}</span></span><span className="text-[11px] text-zinc-500">{it}</span><span><span className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">{t(lang, "Fulfilled", "Përmbushur")}</span></span><span className="text-right text-[11px] font-semibold text-zinc-700">{v}</span></div>
        ))}
      </div>
      {/* new-order toast */}
      <div className="absolute right-4 top-3 w-52" style={{ opacity: toast * (f < 40 ? 1 : Math.max(0, 1 - (f - 40) / 8)), transform: `translateY(${(1 - toast) * -14}px)` }}>
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-2xl"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><Bell className="h-4 w-4" /></span><div><div className="text-[11px] font-bold text-zinc-800">{t(lang, "New order! 🎉", "Porosi e re! 🎉")}</div><div className="text-[10px] text-zinc-500">+3,500 ALL · {t(lang, "card", "kartë")}</div></div></div>
      </div>
    </AdminShell>
  );
};

/* ── 8 · revenue ticks up on the dashboard ──────────────────────────── */
const B8_Dashboard = ({ lang }: { lang: Lang }) => {
  const f = useCurrentFrame();
  const val = Math.round(interpolate(f, [8, 40], [2841500, 2845000], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const bars = [182, 231, 298, 372, 451, 560];
  const glow = inAt(f, 8, 10);
  return (
    <AdminShell active="Dashboard" title={t(lang, "Dashboard", "Paneli")}>
      <div className="grid grid-cols-4 gap-2.5">
        {[[t(lang, "Total Revenue", "Të ardhurat"), `${val.toLocaleString()} ALL`, Banknote, "bg-emerald-500/10 text-emerald-600", true], [t(lang, "Sales", "Shitjet"), "+1,891", CreditCard, "bg-blue-500/10 text-blue-600", false], [t(lang, "Active Products", "Produkte aktive"), "235", Package, "bg-violet-500/10 text-violet-600", false], [t(lang, "Customers", "Klientë"), "1,205", Bell, "bg-amber-500/10 text-amber-600", false]].map(([title, v, Icon, tint, hot]: any, i) => (
          <div key={i} data-tgt={hot ? "rev" : undefined} className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5" style={hot ? { boxShadow: `0 0 0 2px rgba(16,185,129,${glow * 0.4})` } : undefined}>
            <div className="flex items-center justify-between"><span className="text-[10px] text-zinc-400">{title}</span><span className={`rounded-md p-1 ${tint}`}><Icon className="h-3.5 w-3.5" /></span></div>
            <div className="mt-1 text-[15px] font-bold tabular-nums text-zinc-900">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1.7fr_1fr] gap-3">
        <div className="rounded-lg border border-zinc-200 p-3"><div className="text-[11px] font-bold text-zinc-900">{t(lang, "Business Overview", "Përmbledhje")}</div><div className="mt-3 flex h-24 items-end gap-2">{bars.map((h, i) => <div key={i} className="flex-1"><div className={`w-full rounded-t ${BRAND}`} style={{ height: `${(h / 560) * 90}px`, opacity: 0.5 + i * 0.08 }} /></div>)}</div><div className="mt-1 flex justify-between text-[8px] text-zinc-400">{["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => <span key={m}>{m}</span>)}</div></div>
        <div className="rounded-lg border border-zinc-200 p-3"><div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t(lang, "Live Activity", "Aktiviteti")}</div>
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/5 p-1.5" style={{ opacity: glow }}><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"><CheckCircle2 className="h-3 w-3" /></span><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-semibold text-zinc-800">{t(lang, "Order fulfilled", "Porosi e përmbushur")}</div><div className="text-[8px] text-zinc-400">Ana Kola · just now</div></div><span className="text-[10px] font-bold text-emerald-600">+3,500</span></div>
            {[["New order", "Bledi M.", "+4,200"], ["Card payment", "Sara D.", "+2,800"]].map(([tt, n, v]) => <div key={n} className="flex items-center gap-2 rounded-md bg-zinc-50 p-1.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-zinc-200 text-zinc-500"><ShoppingBag className="h-3 w-3" /></span><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-medium text-zinc-700">{tt}</div><div className="text-[8px] text-zinc-400">{n}</div></div><span className="text-[10px] font-bold text-zinc-500">{v}</span></div>)}
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

const BEATS = [B0_Products, B1_Sync, B2_Store, B3_Studio, B4_Search, B5_Cart, B6_Checkout, B7_Orders, B8_Dashboard];

// Renders one beat inside its Sequence, fading by the sequence-local frame so
// each beat gets a clean enter + exit at the cut.
const BeatSeq = ({ i, copy, lang }: { i: number; copy: LandingCopy; lang: Lang }) => {
  const local = useCurrentFrame();
  const Beat = BEATS[i] as (p: { copy: LandingCopy; lang: Lang }) => JSX.Element;
  return <div className="absolute inset-0" style={{ opacity: cO(local) }}><Beat copy={copy} lang={lang} /></div>;
};

/* Keyframed cursor per beat. Positions are window-content fractions (0..1),
 * measured from the real rendered targets so every click lands dead-on. Each
 * `click` frame is timed to the beat's own state change so the click *causes*
 * the effect (sync starts, filter applies, card selects, order fulfils…). */
const CURSOR: Record<number, { t: number; x: number; y: number; click?: boolean }[]> = {
  0: [{ t: 6, x: 0.5, y: 0.62 }, { t: 34, x: 0.919, y: 0.217 }, { t: 46, x: 0.919, y: 0.217, click: true }],
  1: [{ t: 10, x: 0.62, y: 0.45 }, { t: 54, x: 0.232, y: 0.922 }, { t: 66, x: 0.232, y: 0.922, click: true }],
  2: [{ t: 6, x: 0.62, y: 0.38 }, { t: 30, x: 0.13, y: 0.6 }, { t: 40, x: 0.13, y: 0.6, click: true }],
  3: [{ t: 6, x: 0.5, y: 0.5 }, { t: 22, x: 0.938, y: 0.2 }, { t: 30, x: 0.938, y: 0.2, click: true }, { t: 48, x: 0.9, y: 0.5 }, { t: 58, x: 0.9, y: 0.5, click: true }],
  4: [{ t: 6, x: 0.6, y: 0.5 }, { t: 20, x: 0.077, y: 0.211 }, { t: 30, x: 0.077, y: 0.211, click: true }],
  5: [{ t: 6, x: 0.45, y: 0.4 }, { t: 20, x: 0.28, y: 0.443 }, { t: 30, x: 0.28, y: 0.443, click: true }],
  6: [{ t: 8, x: 0.5, y: 0.5 }, { t: 26, x: 0.891, y: 0.246 }, { t: 34, x: 0.891, y: 0.246, click: true }, { t: 48, x: 0.891, y: 0.354 }, { t: 58, x: 0.891, y: 0.354, click: true }],
  7: [{ t: 8, x: 0.5, y: 0.42 }, { t: 34, x: 0.719, y: 0.303 }, { t: 46, x: 0.719, y: 0.303, click: true }],
  8: [{ t: 8, x: 0.6, y: 0.5 }, { t: 26, x: 0.267, y: 0.184 }, { t: 36, x: 0.267, y: 0.184, click: true }],
};

// Smooth 0→1→0 "punch-in" envelope around a click at frame tc.
const zoomBump = (local: number, tc: number) => {
  const b = interpolate(local, [tc - 10, tc, tc + 14, tc + 32], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return b * b * (3 - 2 * b); // smoothstep
};

export const HeroSplitFilm = ({ copy, lang = "en" }: { copy: LandingCopy; lang?: Lang; layout?: "landscape" | "portrait" }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const beat = Math.min(SCENES - 1, Math.floor(frame / SCENE));
  const local = frame - beat * SCENE;

  // window geometry
  const winX = 44, winY = 40, winW = W - 88, winH = H - 80, chrome = 34;
  const contentX = winX, contentY = winY + chrome, contentW = winW, contentH = winH - chrome;

  // cursor + click-driven zoom
  const kf = CURSOR[beat];
  let cursor: { x: number; y: number; ripple: number; press: number } | null = null;
  let zoom = 1, zx = W / 2, zy = H / 2;
  if (kf) {
    const times = kf.map((k) => k.t);
    const x = interpolate(local, times, kf.map((k) => k.x), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const y = interpolate(local, times, kf.map((k) => k.y), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    let ripple = 0, press = 0, bestBump = 0;
    kf.filter((k) => k.click).forEach((k) => {
      if (local >= k.t && local < k.t + 16) {
        ripple = Math.max(ripple, inAt(local, k.t, 11));
        press = Math.max(press, interpolate(local, [k.t - 3, k.t, k.t + 6], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      }
      const bump = zoomBump(local, k.t);
      // Clamp the focal point away from the extreme edges so the punch-in
      // enlarges the action without cropping the opposite side out of frame.
      if (bump > bestBump) {
        bestBump = bump;
        zx = contentX + Math.min(0.72, Math.max(0.28, k.x)) * contentW;
        zy = contentY + Math.min(0.74, Math.max(0.26, k.y)) * contentH;
      }
    });
    zoom = 1 + 0.11 * bestBump;
    cursor = { x: contentX + x * contentW, y: contentY + y * contentH, ripple, press };
  }

  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 0%, #efeaf6 0%, #e7e9f2 60%)" }} className="landing">
      <div className={`pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.1] blur-3xl ${BRAND}`} />
      {/* zoom layer — window + cursor scale together, anchored on the click */}
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${zx}px ${zy}px` }}>
      {/* browser window */}
      <div className="absolute overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_40px_90px_-24px_rgba(30,10,40,0.35)]" style={{ left: winX, top: winY, width: winW, height: winH }}>
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4" style={{ height: chrome }}>
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="mx-auto flex items-center gap-1.5 rounded-full bg-white px-4 py-0.5 text-[10px] text-zinc-400">{URLS[beat]}</div>
        </div>
        <div className="relative" data-hero-content style={{ height: contentH }}>
          {BEATS.map((_, i) => (
            <Sequence key={i} from={i * SCENE} durationInFrames={SCENE} layout="none">
              <BeatSeq i={i} copy={copy} lang={lang} />
            </Sequence>
          ))}
        </div>
      </div>
      {/* cursor — the wrapper origin IS the pointer tip (the click hotspot), so
          it sits exactly on the target; ripples are centred on that same point */}
      {cursor && (
        <div style={{ position: "absolute", left: cursor.x, top: cursor.y, zIndex: 60 }}>
          {cursor.ripple > 0 && (
            <>
              <span className="absolute rounded-full bg-red-500/25" style={{ left: -22, top: -22, height: 44, width: 44, opacity: 0.9 * (1 - cursor.ripple), transform: `scale(${0.2 + cursor.ripple * 1.1})` }} />
              <span className="absolute rounded-full border-2 border-red-500" style={{ left: -22, top: -22, height: 44, width: 44, opacity: 1 - cursor.ripple, transform: `scale(${0.2 + cursor.ripple * 1.6})` }} />
            </>
          )}
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: "absolute", left: -5, top: -3, transform: `scale(${1 - cursor.press * 0.22})`, transformOrigin: "5px 3px", filter: "drop-shadow(0 2px 5px rgba(0,0,0,.35))" }}><path d="M5 3l14 8-6 1.5L9.5 19 5 3z" fill="white" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </div>
      )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
