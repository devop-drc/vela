// Storefront Studio — a simple, curated web editor for the storefront.
//
// Philosophy: NOT a granular knob-for-everything panel. A generalised editor
// with a handful of well-chosen options per category that combine harmoniously.
// Every option shows a mini illustration of its effect (StudioGlyphs), routes
// through the design system (config → tokens → components) so it's live in the
// interactive preview, and the whole thing is a Business-plan feature.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useShop } from '@/contexts/ShopContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useStorefrontStudio } from '@/storefront/theme/useStorefrontStudio';
import { DockedPreview, ScaledFrame } from './DockedPreview';
import { DualPreview } from './DualPreview';
import { Glyph } from './StudioGlyphs';
import { SectionList } from './SectionList';
import { FontCombobox } from './FontCombobox';
import { TEMPLATES } from '@/storefront/templates';
import { generateTheme } from '@/storefront/lib/palette';
import { hslToHex } from '@/utils/colors';
import { BLOCK_REGISTRY } from '@/storefront/blocks/registry';
import type { SectionInstance } from '@/storefront/config/types';
import { getStorefrontPath, getStorefrontUrl } from '@/lib/storefront';
import type { StorefrontType } from '@/lib/storefront';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Undo2, Redo2, RotateCcw, Check, Wand2, Plus,
  Palette, Type as TypeIcon, Square, LayoutTemplate, Layers, Sparkles,
  Store, Sparkle, Crown, SlidersHorizontal,
} from 'lucide-react';
import { FilterVisibilityModal } from '@/components/filters/FilterVisibilityModal';
import { isFilterVisible, CORE_FILTER_KEYS, deriveAttributeKeys } from '@/components/filters/filterVisibility';
import { useProductData } from '@/hooks/useProductData';

// ── Curated data ─────────────────────────────────────────────────────────────

const FONT_PAIRS = [
  { id: 'clean', name: 'Clean', heading: 'Inter', body: 'Inter' },
  { id: 'modern', name: 'Modern', heading: 'Space Grotesk', body: 'Inter' },
  { id: 'bold', name: 'Bold', heading: 'Syne', body: 'DM Sans' },
  { id: 'elegant', name: 'Elegant', heading: 'Playfair Display', body: 'Lato' },
  { id: 'editorial', name: 'Editorial', heading: 'Cormorant Garamond', body: 'Source Sans Pro' },
  { id: 'classic', name: 'Classic', heading: 'Lora', body: 'Source Sans Pro' },
];

type Opt = { value: string | number; label?: string };
const opts = (...v: (string | number)[]): Opt[] => v.map((x) => ({ value: x }));

// ── Building blocks ──────────────────────────────────────────────────────────

/**
 * Live template preview: the REAL storefront UI (/demo-shop over mock data)
 * rendered with the template applied, scaled into the card. Lazy-loaded
 * iframes, so off-screen templates don't boot until scrolled into view.
 */
function TemplateRenderPreview({ id, name }: { id: string; name: string }) {
  return (
    <ScaledFrame
      src={`/demo-shop?template=${id}`}
      virtualW={1280}
      virtualH={760}
      title={`${name} template preview`}
      className="pointer-events-none mb-1.5 select-none"
    />
  );
}

function Group({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-border/70 pb-5 last:border-0">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Plain segmented control (used where the option is already self-illustrating). */
function Seg({ label, options, value, onChange }: { label?: string; options: Opt[]; value: any; onChange: (v: any) => void }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
            className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}>
            {o.label ?? String(o.value)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Illustrated option grid — each choice shows a mini render of its effect. */
function Choices({ label, kind, options, value, onChange, cols = 3 }: {
  label?: string; kind: string; options: Opt[]; value: any; onChange: (v: any) => void; cols?: number;
}) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
            className={cn('flex flex-col gap-1 rounded-lg border p-1.5 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === o.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted')}>
            <Glyph kind={kind} value={o.value} />
            <span className={cn('truncate text-[10px] font-medium capitalize', value === o.value ? 'text-primary' : 'text-muted-foreground')}>
              {o.label ?? String(o.value)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── First-time onboarding walkthrough ───────────────────────────────────────

interface WizardCtx {
  config: any;
  update: (path: string, value: any) => void;
  applyTemplate: (cfg: any, id: string | null) => void;
  applyPalette: (t: any) => void;
  applyFont: (p: any) => void;
  hero: { index: number; variant?: string; set: (v: string) => void };
  previewPath: string | null;
}

function OnboardingWizard({ ctx, onFinish }: { ctx: WizardCtx; onFinish: () => void }) {
  const { config, update, applyTemplate, applyPalette, applyFont, hero } = ctx;
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const steps: { title: string; blurb: string; body: React.ReactNode }[] = [
    {
      title: t('studio.onboarding.s1Title'),
      blurb: t('studio.onboarding.s1Blurb'),
      body: (
        <div className="grid place-items-center py-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"><Sparkles className="h-8 w-8" /></div>
        </div>
      ),
    },
    {
      title: t('studio.onboarding.s2Title'),
      blurb: t('studio.onboarding.s2Blurb'),
      body: (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEMPLATES.map((t) => {
            const active = config.templateId === t.id;
            return (
              <button key={t.id} type="button" onClick={() => applyTemplate(t.config, t.id)}
                className={cn('rounded-lg border p-2 text-left transition-colors', active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40')}>
                <TemplateRenderPreview id={t.id} name={t.name} />
                <p className="truncate text-xs font-medium">{t.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{t.businessType}</p>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: t('studio.onboarding.s3Title'),
      blurb: t('studio.onboarding.s3Blurb'),
      body: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => {
              const tk = t.config.theme.tokens; const active = config.theme.paletteId === t.id;
              return (
                <button key={t.id} type="button" onClick={() => applyPalette(t)} className={cn('flex items-center gap-1 rounded-full border p-1 pr-2.5', active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted')}>
                  <span className="flex overflow-hidden rounded-full border"><span className="h-4 w-4" style={{ background: `hsl(${tk.background})` }} /><span className="h-4 w-4" style={{ background: `hsl(${tk.primary})` }} /><span className="h-4 w-4" style={{ background: `hsl(${tk.accent})` }} /></span>
                  <span className="text-xs font-medium">{t.name}</span>
                </button>
              );
            })}
          </div>
          <Choices kind="mode" options={[{ value: 'light', label: t('studio.light') }, { value: 'dark', label: t('studio.dark') }, { value: 'auto', label: t('studio.auto') }]} value={config.theme.mode} onChange={(v) => update('theme.mode', v)} />
        </div>
      ),
    },
    {
      title: t('studio.onboarding.s4Title'),
      blurb: t('studio.onboarding.s4Blurb'),
      body: <Choices kind="corners" cols={4} options={opts('sharp', 'soft', 'round', 'pill')} value={config.shape.radiusStyle} onChange={(v) => update('shape.radiusStyle', v)} />,
    },
    {
      title: t('studio.onboarding.s5Title'),
      blurb: t('studio.onboarding.s5Blurb'),
      body: (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FONT_PAIRS.map((p) => {
            const active = p.heading === config.typography.headingFont && p.body === config.typography.bodyFont;
            return (
              <button key={p.id} type="button" onClick={() => applyFont(p)} className={cn('rounded-lg border p-2.5 text-left', active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted')}>
                <span className="block text-sm font-semibold" style={{ fontFamily: `'${p.heading}', sans-serif` }}>{p.name}</span>
                <span className="block text-[11px] text-muted-foreground" style={{ fontFamily: `'${p.body}', sans-serif` }}>Aa · quick brown fox</span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: t('studio.onboarding.s6Title'),
      blurb: t('studio.onboarding.s6Blurb'),
      body: (
        <div className="space-y-3">
          {hero.index >= 0 && <Choices label={t('studio.hero')} kind="hero" options={opts('banner', 'split', 'minimal', 'full', 'gradient')} value={hero.variant} onChange={hero.set} />}
          <Choices label={t('studio.navbar')} kind="navbar" cols={4} options={opts('minimal', 'centered', 'split', 'classic')} value={config.layout.header.variant} onChange={(v) => update('layout.header.variant', v)} />
          <Choices label={t('studio.footer')} kind="footer" cols={4} options={opts('rich', 'columns', 'minimal', 'hidden')} value={config.layout.footer.variant} onChange={(v) => update('layout.footer.variant', v)} />
        </div>
      ),
    },
    {
      title: t('studio.onboarding.s7Title'),
      blurb: t('studio.onboarding.s7Blurb'),
      body: (
        <div className="space-y-3">
          <Choices label={t('studio.productCards')} kind="cards" cols={4} options={opts('classic', 'minimal', 'overlay', 'editorial', 'compact', 'polaroid', 'frame', 'ticket')} value={config.components.productCard} onChange={(v) => update('components.productCard', v)} />
          <Choices label={t('studio.buttons')} kind="buttons" cols={4} options={opts('solid', 'outline', 'soft', 'gradient')} value={config.components.button} onChange={(v) => update('components.button', v)} />
        </div>
      ),
    },
    {
      title: t('studio.onboarding.s8Title'),
      blurb: t('studio.onboarding.s8Blurb'),
      body: <Choices kind="motion" cols={4} options={opts('none', 'subtle', 'standard', 'expressive')} value={config.effects.motion} onChange={(v) => update('effects.motion', v)} />,
    },
    {
      title: t('studio.onboarding.s9Title'),
      blurb: t('studio.onboarding.s9Blurb'),
      body: (
        <div className="grid place-items-center py-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-success/10 text-success ring-1 ring-inset ring-success/20"><Check className="h-8 w-8" /></div>
        </div>
      ),
    },
  ];

  const last = steps.length - 1;
  const s = steps[step];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onFinish(); }}>
      <DialogContent className="grid h-[92dvh] max-w-[min(1650px,96vw)] gap-0 overflow-hidden p-0 lg:grid-cols-[minmax(0,400px)_1fr]">
        {/* Step content */}
        <div className="flex h-full min-h-0 flex-col">
          <div className="space-y-1 px-4 pt-6 sm:px-6">
            <div className="mb-2 flex items-center gap-1.5">
              {steps.map((_, i) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-muted')} />)}
            </div>
            <DialogTitle className="font-heading text-xl font-semibold tracking-tight">{s.title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{s.blurb}</DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">{s.body}</div>
          <div className="flex items-center gap-2 border-t px-4 py-3 sm:px-6">
            {step === 0 && <button onClick={onFinish} className="text-xs font-medium text-muted-foreground hover:text-foreground">{t('studio.onboarding.skip')}</button>}
            {step > 0 && <Button variant="ghost" size="sm" onClick={() => setStep((n) => n - 1)}>{t('studio.onboarding.back')}</Button>}
            <span className="ml-auto text-[11px] text-muted-foreground">{step + 1} / {steps.length}</span>
            {step < last
              ? <Button size="sm" onClick={() => setStep((n) => n + 1)}>{t('studio.onboarding.next')}</Button>
              : <Button size="sm" onClick={onFinish}>{t('studio.onboarding.finish')}</Button>}
          </div>
        </div>
        {/* Live desktop + mobile preview, both synced as options change. */}
        <div className="hidden border-l bg-muted/30 p-5 lg:block">
          <DualPreview config={ctx.config} previewPath={ctx.previewPath} className="h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Business-plan gate ───────────────────────────────────────────────────────

function UpgradeGate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Crown className="h-7 w-7" />
      </div>
      <h2 className="font-heading text-2xl font-semibold tracking-tight">{t('studio.gate.title')}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('studio.gate.body')}</p>
      <ul className="mx-auto mt-5 grid max-w-sm gap-2 text-left text-sm">
        {[t('studio.gate.f1'), t('studio.gate.f2'), t('studio.gate.f3'), t('studio.gate.f4')].map((f) => (
          <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{f}</li>
        ))}
      </ul>
      <Button className="mt-6 brand-gradient border-0 text-white" onClick={() => navigate('/billing')}>
        <Sparkle className="mr-1.5 h-4 w-4" /> {t('studio.gate.cta')}
      </Button>
    </div>
  );
}

// ── Layout mode — per-page section editor (reorder / add / edit each block) ──

const PAGE_TABS = [
  { id: 'home', labelKey: 'studio.homePage', target: 'home' },
  { id: 'productDetail', labelKey: 'studio.productPage', target: 'productDetail' },
] as const;
type PageId = (typeof PAGE_TABS)[number]['id'];

function LayoutPanel({ config, update, addSection, removeSection, steer }: {
  config: any;
  update: (path: string, value: any) => void;
  addSection: (type: string, page?: PageId) => void;
  removeSection: (index: number, page?: PageId) => void;
  steer: (target: string) => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState<PageId>('home');
  const tab = PAGE_TABS.find((pt) => pt.id === page)!;
  const sections: SectionInstance[] = config.pages[page] ?? [];
  const scope = page === 'home' ? 'home' : 'productDetail';

  // Blocks that can be added to this page (registry-driven), minus ones the page
  // already has that only make sense once (chrome-ish detail blocks).
  const addable = Object.entries(BLOCK_REGISTRY).filter(
    ([, d]) => d.scope === scope || d.scope === 'both'
  );

  const switchPage = (p: PageId) => { setPage(p); steer(PAGE_TABS.find((pt) => pt.id === p)!.target); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-0.5">
        {PAGE_TABS.map((pt) => (
          <button key={pt.id} type="button" onClick={() => switchPage(pt.id)}
            className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              page === pt.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}>
            {t(pt.labelKey)}
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{t('studio.layoutHelp')}</p>

      <SectionList
        sections={sections}
        onChange={(next) => { update(`pages.${page}`, next); steer(tab.target); }}
        onRemove={(i) => { removeSection(i, page); steer(tab.target); }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <Plus className="h-4 w-4" /> {t('studio.addSection')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[60vh] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
          {addable.map(([type, d]) => {
            const Icon = d.icon;
            return (
              <DropdownMenuItem key={type} className="gap-2" onClick={() => { addSection(type, page); steer(tab.target); }}>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm">{d.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {page === 'productDetail' && (
        <p className="rounded-lg border border-dashed bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {t('studio.galleryTip')}
        </p>
      )}
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

export function SimpleStudio() {
  const { shopDetails, updateShopDetails } = useShop();
  const { plan, loading: subLoading } = useSubscription();
  const {
    config, isLoading, saveStatus, update, mergePartial, applyTemplate,
    addSection, removeSection, reset, undo, redo, canUndo, canRedo,
  } = useStorefrontStudio();

  const { t } = useTranslation();
  // Two editing surfaces: "style" (global look) and "layout" (per-page sections).
  const [mode, setMode] = useState<'style' | 'layout'>('style');

  // First-ever visit → run the guided onboarding walkthrough.
  const [showOnboard, setShowOnboard] = useState(() => {
    try { return !localStorage.getItem('vela:sf-onboarded:v1'); } catch { return false; }
  });
  const finishOnboard = () => {
    try { localStorage.setItem('vela:sf-onboarded:v1', '1'); } catch { /* private mode */ }
    setShowOnboard(false);
  };
  // Steer the live preview to the page where a setting is actually visible, so
  // no option ever "does nothing" (e.g. gallery lives on the product page).
  const [navTarget, setNavTarget] = useState<{ target: string; n: number } | null>(null);
  const steer = (target: string) => setNavTarget((prev) => ({ target, n: (prev?.n ?? 0) + 1 }));
  const updateSteer = (path: string, value: any, target: string) => { update(path, value); steer(target); };
  const storeType = (shopDetails?.storefront_type as StorefrontType) || 'instagram';

  const isBusiness = (plan?.name || '').toLowerCase().includes('business');

  const previewPath = shopDetails?.slug ? `${getStorefrontPath(shopDetails.slug, storeType)}?preview=1` : null;
  const previewUrl = shopDetails?.slug ? getStorefrontUrl(shopDetails.slug, storeType) : null;

  const heroIndex = useMemo(() => config.pages.home.findIndex((s) => s.type === 'hero'), [config.pages.home]);
  const heroVariant = heroIndex >= 0 ? (config.pages.home[heroIndex].props?.variant as string) : undefined;
  const setHero = (v: string) => { if (heroIndex >= 0) update(`pages.home.${heroIndex}.props.variant`, v); };

  const activeFontPair = FONT_PAIRS.find((p) => p.heading === config.typography.headingFont && p.body === config.typography.bodyFont)?.id;

  // Storefront filter visibility — which filter groups the /shop products page
  // offers customers. Saved with the design (pages.products.filterVisibility);
  // the key list is derived from the merchant's real catalog.
  const [filterVisOpen, setFilterVisOpen] = useState(false);
  const { allProducts, allCategories, allTags, allDetailsAttributes } = useProductData();
  const storefrontFilterVis = config.pages.products.filterVisibility ?? {};
  const storefrontFilterKeys = useMemo(() => {
    const { options, specs } = deriveAttributeKeys(allDetailsAttributes, allProducts);
    const core = CORE_FILTER_KEYS.filter((k) => {
      if (k === 'categories') return allCategories.length > 0;
      if (k === 'tags') return allTags.length > 0;
      return true;
    });
    return [...core, ...options, ...specs];
  }, [allCategories, allTags, allDetailsAttributes, allProducts]);
  const visibleFilterCount = storefrontFilterKeys.filter((k) => isFilterVisible(storefrontFilterVis, k)).length;

  const applyPalette = (t: (typeof TEMPLATES)[number]) =>
    mergePartial({ theme: { paletteId: t.id, tokens: t.config.theme.tokens, darkTokens: t.config.theme.darkTokens } as any });
  const applyFont = (p: (typeof FONT_PAIRS)[number]) =>
    mergePartial({ typography: { headingFont: p.heading, bodyFont: p.body } as any });
  // Pick a favourite colour → auto-build a matching light + dark palette.
  const applyBrandColor = (hex: string) => {
    const { tokens, darkTokens } = generateTheme(hex);
    mergePartial({ theme: { paletteId: 'custom', tokens, darkTokens } as any });
  };

  if (subLoading || isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }
  if (!isBusiness) return <UpgradeGate />;

  return (
    <>
    {showOnboard && (
      <OnboardingWizard
        ctx={{ config, update, applyTemplate, applyPalette, applyFont, hero: { index: heroIndex, variant: heroVariant, set: setHero }, previewPath }}
        onFinish={finishOnboard}
      />
    )}
    <FilterVisibilityModal
      open={filterVisOpen}
      onOpenChange={setFilterVisOpen}
      description={t('studio.filterVisibilityHint')}
      allCategories={allCategories}
      allTags={allTags}
      allDetailsAttributes={allDetailsAttributes}
      allProducts={allProducts}
      visibilityMap={storefrontFilterVis}
      onToggle={(key, visible) => updateSteer('pages.products.filterVisibility', { ...storefrontFilterVis, [key]: visible }, 'products')}
      onSetMany={(keys, visible) => {
        const next = { ...storefrontFilterVis } as Record<string, boolean>;
        keys.forEach((k) => { next[k] = visible; });
        updateSteer('pages.products.filterVisibility', next, 'products');
      }}
    />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      {/* ── Options rail ─────────────────────────────────────────────── */}
      <div className="flex max-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-1 border-b px-3 py-2">
          <div className="flex rounded-lg border p-0.5">
            {(['style', 'layout'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                {t(`studio.${m}`)}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="ml-1 h-7 gap-1.5 text-xs" onClick={() => setShowOnboard(true)}>
            <Wand2 className="h-3.5 w-3.5" /> {t('studio.guide')}
          </Button>
          <span className="ml-auto mr-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            {saveStatus === 'saving' && (<><Spinner className="h-3 w-3" /> {t('studio.saving')}</>)}
            {saveStatus === 'saved' && (<><Check className="h-3 w-3 text-success" /> {t('studio.saved')}</>)}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={undo} aria-label="Undo"><Undo2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={redo} aria-label="Redo"><Redo2 className="h-4 w-4" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('studio.resetTitle')} title={t('studio.resetTitle')}><RotateCcw className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('studio.resetTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('studio.resetBody')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('studio.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={reset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('studio.resetConfirm')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {mode === 'layout' ? (
            <LayoutPanel config={config} update={update} addSection={addSection} removeSection={removeSection} steer={steer} />
          ) : (
          <>
          <Group title={t('studio.groups.storefront')} icon={Store}>
            <Seg
              label={t('studio.visibleLabel')}
              options={[{ value: 'instagram', label: t('studio.instagramFeed') }, { value: 'custom', label: t('studio.customDesign') }]}
              value={storeType}
              onChange={(v) => updateShopDetails?.({ storefront_type: v } as any)}
            />
          </Group>

          <Group title={t('studio.groups.template')} icon={LayoutTemplate}>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => {
                const active = config.templateId === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => applyTemplate(t.config, t.id)}
                    className={cn('rounded-lg border p-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40')}>
                    <TemplateRenderPreview id={t.id} name={t.name} />
                    <p className="truncate text-xs font-medium">{t.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{t.businessType || t.description}</p>
                  </button>
                );
              })}
            </div>
          </Group>

          <Group title={t('studio.groups.colour')} icon={Palette}>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => {
                const tk = t.config.theme.tokens;
                const active = config.theme.paletteId === t.id;
                return (
                  <button key={t.id} type="button" title={t.name} onClick={() => applyPalette(t)}
                    className={cn('flex items-center gap-1 rounded-full border p-1 pr-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted')}>
                    <span className="flex overflow-hidden rounded-full border">
                      <span className="h-4 w-4" style={{ background: `hsl(${tk.background})` }} />
                      <span className="h-4 w-4" style={{ background: `hsl(${tk.primary})` }} />
                      <span className="h-4 w-4" style={{ background: `hsl(${tk.accent})` }} />
                    </span>
                    <span className="text-xs font-medium">{t.name}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-2">
              <input
                type="color"
                value={hslToHex(config.theme.tokens.primary)}
                onChange={(e) => applyBrandColor(e.target.value)}
                className="h-8 w-9 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                aria-label={t('studio.pickBrandColour')}
              />
              <span className="text-xs text-muted-foreground">{t('studio.pickColourHint')}</span>
            </label>
            <Choices label={t('studio.lightDark')} kind="mode"
              options={[{ value: 'light', label: t('studio.light') }, { value: 'dark', label: t('studio.dark') }, { value: 'auto', label: t('studio.auto') }]}
              value={config.theme.mode} onChange={(v) => update('theme.mode', v)} />
          </Group>

          <Group title={t('studio.groups.corners')} icon={Square}>
            <Choices kind="corners" cols={4} options={opts('sharp', 'soft', 'round', 'pill')} value={config.shape.radiusStyle} onChange={(v) => update('shape.radiusStyle', v)} />
          </Group>

          <Group title={t('studio.groups.fonts')} icon={TypeIcon}>
            <p className="text-xs font-medium text-muted-foreground">{t('studio.quickPairings')}</p>
            <div className="grid grid-cols-2 gap-2">
              {FONT_PAIRS.map((p) => (
                <button key={p.id} type="button" onClick={() => applyFont(p)}
                  className={cn('rounded-lg border p-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeFontPair === p.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted')}>
                  <span className="block text-sm font-semibold leading-tight" style={{ fontFamily: `'${p.heading}', sans-serif` }}>{p.name}</span>
                  <span className="block text-[11px] text-muted-foreground" style={{ fontFamily: `'${p.body}', sans-serif` }}>Aa · quick brown fox</span>
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-1">
              <FontCombobox label={t('studio.headingFont')} value={config.typography.headingFont} onChange={(f) => update('typography.headingFont', f)} />
              <FontCombobox label={t('studio.bodyFont')} value={config.typography.bodyFont} onChange={(f) => update('typography.bodyFont', f)} />
            </div>
          </Group>

          <Group title={t('studio.groups.layout')} icon={LayoutTemplate}>
            {heroIndex >= 0 && <Choices label={t('studio.hero')} kind="hero" options={opts('banner', 'split', 'minimal', 'full', 'gradient')} value={heroVariant} onChange={setHero} />}
            {heroIndex >= 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t('studio.heroBg')}</p>
                <input
                  type="url"
                  value={config.effects.hero?.mediaUrl ?? ''}
                  onChange={(e) => update('effects.hero.mediaUrl', e.target.value)}
                  placeholder="https://…"
                  className="h-9 w-full rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {config.effects.hero?.mediaUrl && (
                  <Seg options={[{ value: 'image', label: t('studio.imageType') }, { value: 'video', label: t('studio.videoType') }]} value={config.effects.hero?.mediaType ?? 'image'} onChange={(v) => update('effects.hero.mediaType', v)} />
                )}
                <p className="text-[11px] leading-relaxed text-muted-foreground">{t('studio.heroBgHint')}</p>
              </div>
            )}
            <Choices label={t('studio.navbar')} kind="navbar" cols={4} options={opts('minimal', 'centered', 'split', 'classic')} value={config.layout.header.variant} onChange={(v) => update('layout.header.variant', v)} />
            <Choices label={t('studio.navbarStyle')} kind="presentation" options={opts('bar', 'floating', 'minimal')} value={config.layout.header.presentation ?? 'bar'} onChange={(v) => update('layout.header.presentation', v)} />
            <Choices label={t('studio.announcementBanner')} kind="banner" options={opts('marquee', 'static', 'gradient')} value={config.layout.banner.style} onChange={(v) => update('layout.banner.style', v)} />
            <Choices label={t('studio.navigation')} kind="nav" cols={2} options={[{ value: 'topbar', label: t('studio.topBar') }, { value: 'sidebar', label: t('studio.sidebar') }]} value={config.layout.nav.desktop} onChange={(v) => update('layout.nav.desktop', v)} />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input type="checkbox" className="accent-primary" checked={config.layout.nav.showCategories} onChange={(e) => update('layout.nav.showCategories', e.target.checked)} />
              {t('studio.categoryMenu')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input type="checkbox" className="accent-primary" checked={config.layout.header.sticky} onChange={(e) => update('layout.header.sticky', e.target.checked)} />
              {t('studio.stickyHeader')}
            </label>
            <Choices label={t('studio.footer')} kind="footer" cols={4} options={opts('rich', 'columns', 'minimal', 'hidden')} value={config.layout.footer.variant} onChange={(v) => updateSteer('layout.footer.variant', v, 'footer')} />
          </Group>

          <Group title={t('studio.groups.pages')} icon={Layers}>
            <Choices label={t('studio.shopPage')} kind="shop" cols={2} options={[{ value: 'grid', label: t('studio.grid') }, { value: 'list', label: t('studio.list') }]} value={config.pages.products.layout} onChange={(v) => updateSteer('pages.products.layout', v, 'products')} />
            <Choices label={t('studio.shopFilters')} kind="filters" options={[{ value: 'sidebar', label: t('studio.filtersSidebar') }, { value: 'drawer', label: t('studio.filtersDrawer') }, { value: 'topbar', label: t('studio.filtersTopbar') }]} value={config.pages.products.filters} onChange={(v) => updateSteer('pages.products.filters', v, 'products')} />
            <div className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <div className="min-w-0">
                <p className="text-xs font-medium">{t('studio.filterVisibility')}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {t('studio.filterVisibilityCount', { visible: visibleFilterCount, total: storefrontFilterKeys.length })}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => setFilterVisOpen(true)}>
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> {t('studio.manage')}
              </Button>
            </div>
            <Choices label={t('studio.perRow')} kind="grid" cols={4} options={opts(2, 3, 4, 5)} value={config.layout.productGrid.columns} onChange={(v) => updateSteer('layout.productGrid.columns', Number(v), 'products')} />
            <Choices label={t('studio.gallery')} kind="gallery" cols={4} options={[{ value: 'left', label: t('studio.side') }, { value: 'top', label: t('studio.top') }, { value: 'sticky-split', label: t('studio.sticky') }, { value: 'full-bleed', label: t('studio.full') }]} value={config.components.productGalleryLayout} onChange={(v) => updateSteer('components.productGalleryLayout', v, 'productDetail')} />
            <Choices label={t('studio.cart')} kind="cart" options={opts('drawer', 'modal', 'page')} value={config.components.cart} onChange={(v) => updateSteer('components.cart', v, 'cart')} />
          </Group>

          <Group title={t('studio.groups.styleGroup')} icon={Sparkles}>
            <Choices label={t('studio.productCards')} kind="cards" cols={4} options={opts('classic', 'minimal', 'overlay', 'editorial', 'compact', 'polaroid', 'frame', 'ticket')} value={config.components.productCard} onChange={(v) => update('components.productCard', v)} />
            <Choices label={t('studio.buttons')} kind="buttons" cols={4} options={opts('solid', 'outline', 'soft', 'gradient')} value={config.components.button} onChange={(v) => update('components.button', v)} />
            <Choices label={t('studio.buttonShape')} kind="buttonShape" options={[{ value: 'inherit', label: t('studio.shapeAuto') }, { value: 'pill', label: t('studio.shapePill') }, { value: 'sharp', label: t('studio.shapeSharp') }]} value={config.components.buttonShape} onChange={(v) => update('components.buttonShape', v)} />
            <Choices label={t('studio.badges')} kind="badges" options={opts('solid', 'soft', 'outline')} value={config.components.badge} onChange={(v) => update('components.badge', v)} />
            <Choices label={t('studio.shadows')} kind="shadows" cols={5} options={opts('none', 'sm', 'md', 'lg', 'dramatic')} value={config.effects.shadow} onChange={(v) => update('effects.shadow', v)} />
            <Choices label={t('studio.density')} kind="spacing" options={[{ value: 'cozy', label: t('studio.compact') }, { value: 'comfortable', label: t('studio.comfortable') }, { value: 'spacious', label: t('studio.airy') }]} value={config.layout.density} onChange={(v) => update('layout.density', v)} />
            <Seg label={t('studio.sectionSpacing')} options={[{ value: 'tight', label: t('studio.tight') }, { value: 'normal', label: t('studio.normal') }, { value: 'airy', label: t('studio.airy') }]} value={config.layout.sectionSpacing} onChange={(v) => update('layout.sectionSpacing', v)} />
            <Seg label={t('studio.containerWidth')} options={[{ value: 'compact', label: t('studio.narrow') }, { value: 'standard', label: t('studio.standard') }, { value: 'wide', label: t('studio.wide') }, { value: 'full', label: t('studio.full') }]} value={config.layout.containerWidth} onChange={(v) => update('layout.containerWidth', v)} />
          </Group>

          <Group title={t('studio.groups.animation')} icon={Sparkles}>
            <Choices kind="motion" cols={4} options={opts('none', 'subtle', 'standard', 'expressive')} value={config.effects.motion} onChange={(v) => update('effects.motion', v)} />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input type="checkbox" className="accent-primary" checked={config.effects.glass.enabled} onChange={(e) => update('effects.glass.enabled', e.target.checked)} />
              {t('studio.frostedGlass')}
            </label>
          </Group>
          </>
          )}
        </div>
      </div>

      {/* ── Live, interactive preview (posts config on every change) ───── */}
      <DockedPreview config={config} previewPath={previewPath} previewUrl={previewUrl} navTarget={navTarget} className="h-[calc(100dvh-9rem)]" />
    </div>
    </>
  );
}
