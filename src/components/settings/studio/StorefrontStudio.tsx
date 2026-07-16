// Storefront Studio — design editor for the custom /shop storefront.
// IA: Layout (wireframes) → Colors → everything else, grouped by relevance.
// Every enumerated option is shown as a rendered, themed visual demo in a
// responsive multi-column grid. Right: sticky live preview (16:9 / 9:16).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Instagram, Palette, Store, Check, RotateCcw,
  LayoutGrid, Type as TypeIcon, Sparkles, Component, ListOrdered, LayoutTemplate, PanelTop,
  Plus, Loader2, CloudOff, Undo2, Redo2, Dices, BookmarkPlus, Trash2, Search as SearchIcon,
  ChevronDown, PanelBottom, Image as ImageIcon, Sun, Moon, SwatchBook, SlidersHorizontal,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useShop } from '@/contexts/ShopContext';
import { fontCategories } from '@/contexts/AppearanceContext';
import { getStorefrontPath, getStorefrontUrl, type StorefrontType } from '@/lib/storefront';
import { showSuccess } from '@/utils/toast';
import { useStorefrontStudio } from '@/storefront/theme/useStorefrontStudio';
import { buildTokens } from '@/storefront/config/tokens';
import { LayoutSelector } from '@/storefront/preview/LayoutSelector';
import { TEMPLATES } from '@/storefront/templates';
import { BLOCK_REGISTRY } from '@/storefront/blocks/registry';
import { hslToHex } from '@/utils/colors';
import { idealForeground, idealMutedForeground, SURFACE_PAIRS, wcagGrade, contrastRatio } from '@/storefront/lib/contrast';
import { DEFAULT_DARK_TOKENS } from '@/storefront/config/defaults';
import { Row, SelectRow, SwitchRow, SliderRow, SegmentRow, ColorRow } from './controls';
import { FilterVisibilityModal } from '@/components/filters/FilterVisibilityModal';
import { isFilterVisible, CORE_FILTER_KEYS, deriveAttributeKeys } from '@/components/filters/filterVisibility';
import { useProductData } from '@/hooks/useProductData';
import { OptionGrid } from './OptionGrid';
import { SectionList } from './SectionList';
import { DockedPreview, ScaledFrame } from './DockedPreview';
import { TemplateMarquee } from './TemplateMarquee';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const FONT_OPTIONS = Array.from(new Set(Object.values(fontCategories).flatMap((c) => [...c.headings, ...c.body]))).sort();
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const opts = (vals: string[]) => vals.map((v) => ({ value: v, label: cap(v) }));

const FontSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
    <SelectContent className="max-h-72">{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
  </Select>
);

const Sub = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mt-5 mb-1 first:mt-0">{children}</p>
);

/** Collapsible sub-section inside an accordion group — expanded by default,
    collapsible via its small-caps header. */
const SubSection = ({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3 border-b border-border/60 pb-3 last:mb-0 last:border-b-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between py-1 text-left"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors group-hover:text-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {title}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pt-1">{children}</div>}
    </div>
  );
};

const SaveIndicator = ({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) => {
  if (status === 'idle') return null;
  const map = {
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-muted-foreground', spin: true },
    saved: { icon: Check, text: 'All changes saved', cls: 'text-emerald-600', spin: false },
    error: { icon: CloudOff, text: "Couldn't save — retrying", cls: 'text-destructive', spin: false },
  } as const;
  const { icon: Icon, text, cls, spin } = map[status];
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', cls)} role="status" aria-live="polite">
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} /> {text}
    </span>
  );
};

const GROUPS = [
  { id: 'general', label: 'General', icon: Sparkles },
  { id: 'homepage', label: 'Homepage', icon: PanelTop },
  { id: 'shopPage', label: 'Shop page', icon: LayoutGrid },
  { id: 'productPage', label: 'Product page', icon: Component },
  { id: 'cartPage', label: 'Cart page', icon: ListOrdered },
  { id: 'themes', label: 'My templates', icon: LayoutTemplate },
] as const;
type GroupId = (typeof GROUPS)[number]['id'];

const GROUP_META: Record<GroupId, { title: string; desc: string }> = {
  general: { title: 'General', desc: 'Design that applies everywhere — colors, light/dark, fonts, roundedness, glass, motion, components.' },
  homepage: { title: 'Homepage', desc: 'Navbar, every section and the footer — toggle visibility, drag to reorder, expand to style.' },
  shopPage: { title: 'Shop page', desc: 'The all-products listing — filters and layout.' },
  productPage: { title: 'Product page', desc: 'Gallery layout and the blocks shown on every product page.' },
  cartPage: { title: 'Cart page', desc: 'Settings for the full-page cart.' },
  themes: { title: 'My templates', desc: 'Save your current design and reuse it any time.' },
};

/** Pinned chrome row (Navbar / Footer) styled like a section row: visibility
    switch + expandable settings. Not draggable — chrome position is fixed. */
const ChromeRow = ({ icon: Icon, label, enabled, onToggle, children }: {
  icon: any; label: string; enabled: boolean; onToggle: (on: boolean) => void; children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 p-2">
        <span className="w-4 shrink-0" aria-hidden />
        <Switch checked={enabled} onCheckedChange={onToggle} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className={cn('flex-1 text-sm', !enabled && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{label}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen((o) => !o)} aria-label={`Edit ${label}`} aria-expanded={open}>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      {open && <div className="space-y-1 border-t bg-muted/30 p-3">{children}</div>}
    </div>
  );
};

// Searchable index of every Studio setting → which accordion group holds it.
const SETTINGS_INDEX: { label: string; group: GroupId; keywords?: string }[] = [
  { label: 'Layout presets', group: 'general', keywords: 'structure arrangement wireframe preset' },
  { label: 'Background — solid / gradient / photo', group: 'general', keywords: 'background color image gradient overlay brightness page' },
  { label: 'Quick palettes', group: 'general', keywords: 'palette scheme colors preset' },
  { label: 'Color mode (light / dark / auto)', group: 'general', keywords: 'dark light mode auto theme' },
  { label: 'Text & muted text color', group: 'general', keywords: 'text foreground muted font color readable contrast' },
  { label: 'Primary / accent / card colors', group: 'general', keywords: 'primary accent brand card secondary border' },
  { label: 'Heading & body fonts', group: 'general', keywords: 'font typography typeface family' },
  { label: 'Font size, scale & weights', group: 'general', keywords: 'size scale ratio letter spacing line height weight case uppercase' },
  { label: 'Corners & border radius', group: 'general', keywords: 'rounded corners radius sharp pill soft border width' },
  { label: 'Shadows & shadow tint', group: 'general', keywords: 'shadow depth elevation dramatic tint' },
  { label: 'Motion & scroll reveal', group: 'general', keywords: 'animation motion gsap reveal expressive subtle' },
  { label: 'Glassmorphism & film grain', group: 'general', keywords: 'glass blur transparency grain texture' },
  { label: 'Card hover effect', group: 'general', keywords: 'hover lift zoom glow tilt' },
  { label: 'Product card design', group: 'general', keywords: 'card overlay polaroid minimal editorial frame ticket caption' },
  { label: 'Buttons & badges', group: 'general', keywords: 'button pill outline gradient soft badge' },
  { label: 'Cart style (drawer / modal / page)', group: 'general', keywords: 'cart basket checkout drawer' },
  { label: 'Product gallery layout', group: 'productPage', keywords: 'gallery images sticky split full bleed' },
  { label: 'Section headings', group: 'general', keywords: 'headings eyebrow titles centered editorial rule' },
  { label: 'Container width, density & grid', group: 'general', keywords: 'spacing width compact wide grid columns gap density' },
  { label: 'Header content & navbar style', group: 'homepage', keywords: 'header navbar bar floating minimal sticky blur logo topbar' },
  { label: 'Desktop navigation (topbar / sidebar)', group: 'homepage', keywords: 'sidebar navigation menu desktop categories' },
  { label: 'Hero style', group: 'homepage', keywords: 'hero banner slideshow video marquee collage editorial full' },
  { label: 'Announcement banner', group: 'homepage', keywords: 'announcement marquee ticker bar stacked' },
  { label: 'Mobile bottom bar & hamburger', group: 'homepage', keywords: 'bottom bar mobile floating hamburger menu' },
  { label: 'Footer style', group: 'homepage', keywords: 'footer columns rich minimal hidden' },
  { label: 'Homepage sections (reorder / variants)', group: 'homepage', keywords: 'sections blocks reorder drag add hero slider' },
  { label: 'Product page sections', group: 'productPage', keywords: 'product detail reviews related specifications gallery' },
  { label: 'Products page filters & layout', group: 'shopPage', keywords: 'filters sidebar drawer topbar list grid' },
  { label: 'Filter visibility (price, availability, reviews…)', group: 'shopPage', keywords: 'filter visibility price availability rating reviews tags options specifications hide show' },
  { label: 'My templates (saved designs)', group: 'themes', keywords: 'save template custom design reuse' },
];

export const StorefrontStudio = () => {
  const { shopDetails, updateShopDetails } = useShop();
  const {
    config, isLoading, saveStatus, update: rawUpdate, applyTemplate, mergePartial, reset, addSection, removeSection,
    undo, redo, canUndo, canRedo, customTemplates, saveAsTemplate, deleteCustomTemplate,
    dashboardMatch, setDashboardMatchesStorefront,
  } = useStorefrontStudio();
  // Smart preview steering: after an edit that's only visible on a specific
  // page/element, point the live preview there. Colors/type/shape are visible
  // everywhere, so those don't navigate (null).
  const [navTarget, setNavTarget] = useState<{ target: string; n: number } | null>(null);
  const lastNavRef = useRef<{ target: string; time: number }>({ target: '', time: 0 });
  const previewTargetFor = (path: string): string | null => {
    if (/^components\.productCard|^layout\.productGrid|^pages\.products/.test(path)) return 'products';
    if (/^components\.productGalleryLayout|^components\.badge|^pages\.productDetail/.test(path)) return 'productDetail';
    if (/^components\.cart|^components\.button/.test(path)) return 'cart';
    if (/^layout\.footer/.test(path)) return 'footer';
    if (/^pages\.orders/.test(path)) return 'orders';
    if (/^layout\.header|^layout\.nav|^layout\.banner|^pages\.home|^effects\.hero|^layout\.sectionHeader/.test(path)) return 'home';
    return null;
  };
  const update = (path: string, value: any) => {
    rawUpdate(path, value);
    const target = previewTargetFor(path);
    if (!target) return;
    const now = Date.now();
    // Don't re-navigate on every slider tick to the same spot.
    if (lastNavRef.current.target === target && now - lastNavRef.current.time < 1500) return;
    lastNavRef.current = { target, time: now };
    setNavTarget({ target, n: now });
  };
  const [type, setType] = useState<StorefrontType>((shopDetails?.storefront_type as StorefrontType) || 'instagram');
  const [pendingTemplate, setPendingTemplate] = useState<{ config: any; id: string | null } | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  // Storefront filter visibility — which filter groups the /shop products page
  // offers customers. Stored in the config (pages.products.filterVisibility);
  // the key list is derived from the merchant's real catalog.
  const [filterVisOpen, setFilterVisOpen] = useState(false);
  const { allProducts, allCategories, allTags, allDetailsAttributes } = useProductData();
  const storefrontFilterVis = config?.pages.products.filterVisibility ?? {};
  const storefrontFilterKeys = useMemo(() => {
    const { options, specs } = deriveAttributeKeys(allDetailsAttributes, allProducts);
    const core = CORE_FILTER_KEYS.filter((k) => {
      if (k === 'categories') return allCategories.length > 0;
      if (k === 'tags') return allTags.length > 0;
      return true;
    });
    return [...core, ...options, ...specs];
  }, [allCategories, allTags, allDetailsAttributes, allProducts]);
  // Controlled accordion + settings search (suggestions open the right group).
  const [openGroups, setOpenGroups] = useState<string[]>(['general']);
  const [settingQuery, setSettingQuery] = useState('');
  const settingMatches = settingQuery.trim().length > 0
    ? SETTINGS_INDEX.filter((s) => {
        const q = settingQuery.toLowerCase();
        return s.label.toLowerCase().includes(q) || (s.keywords ?? '').toLowerCase().includes(q) || GROUP_META[s.group].title.toLowerCase().includes(q);
      }).slice(0, 7)
    : [];
  const jumpToSetting = (group: GroupId) => {
    setOpenGroups((prev) => (prev.includes(group) ? prev : [...prev, group]));
    setSettingQuery('');
    requestAnimationFrame(() => {
      document.querySelector(`[data-group-item="${group}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => { if (shopDetails?.storefront_type) setType(shopDetails.storefront_type as StorefrontType); }, [shopDetails?.storefront_type]);

  // Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) while the Studio is on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // "Surprise me": cross-mix 3 random templates — palette from one, type &
  // shape from another, effects/components/pages from a third. Coherent but new.
  const surpriseMe = () => {
    const pick = () => TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)].config;
    const [a, b, c] = [pick(), pick(), pick()];
    applyTemplate({
      ...c,
      theme: a.theme,
      typography: b.typography,
      shape: b.shape,
    } as any, null);
    showSuccess('Surprise! Undo brings your design back.');
  };

  // Token style for themed option demos.
  const token = useMemo(() => {
    const t = buildTokens(config);
    return { style: t.vars as React.CSSProperties, className: cn(t.classes), attrs: t.attrs as Record<string, string> };
  }, [config]);

  const previewPath = shopDetails?.slug ? `${getStorefrontPath(shopDetails.slug, type)}?preview=1` : null;
  const previewUrl = shopDetails?.slug ? getStorefrontUrl(shopDetails.slug, type) : null;

  const changeType = async (t: StorefrontType) => {
    setType(t);
    await updateShopDetails({ storefront_type: t });
    showSuccess(t === 'instagram' ? 'Storefront set to Instagram style.' : 'Storefront set to Custom design.');
  };

  // Homepage section helpers.
  const home = config.pages.home;
  const heroVariant = home.find((s) => s.type === 'hero')?.props?.variant ?? 'banner';
  const setHeroVariant = (v: string) => update('pages.home', home.map((s) => (s.type === 'hero' ? { ...s, props: { ...s.props, variant: v } } : s)));
  const heroVariantOptions = (BLOCK_REGISTRY.hero.variants ?? []).map((v) => ({ value: v.value, label: v.label }));

  const applyPalette = (t: (typeof TEMPLATES)[number]) =>
    mergePartial({ theme: { ...config.theme, paletteId: t.id, tokens: t.config.theme.tokens, darkTokens: t.config.theme.darkTokens, mode: t.config.theme.mode } });

  // Picking a page background must keep body text readable: if the current
  // foreground fails WCAG on the new backdrop, re-derive foreground + muted
  // text for it — writing into whichever token set is ACTIVE (dark mode edits
  // must go to darkTokens or they'd be invisible).
  const keepTextReadableOn = (bgHsl: string) => {
    const prefersDarkNow = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
    const darkActive = config.theme.mode === 'dark' || (config.theme.mode === 'auto' && prefersDarkNow);
    const currentFg = darkActive
      ? ((config.theme.darkTokens as any)?.foreground ?? (DEFAULT_DARK_TOKENS as any).foreground ?? config.theme.tokens.foreground)
      : config.theme.tokens.foreground;
    if (contrastRatio(bgHsl, currentFg) >= 4.5) return;
    const patch = {
      foreground: idealForeground(bgHsl),
      'muted-foreground': idealMutedForeground(bgHsl),
    };
    if (darkActive) {
      mergePartial({ theme: { darkTokens: { ...(config.theme.darkTokens || {}), ...patch } } } as any);
    } else {
      mergePartial({ theme: { tokens: patch } } as any);
    }
  };

  const setColor = (tk: string, hsl: string) => {
    const pair = SURFACE_PAIRS[tk];
    if (!pair) { update(`theme.tokens.${tk}`, hsl); return; }
    const fg = tk === 'muted' ? idealMutedForeground(hsl) : idealForeground(hsl);
    mergePartial({ theme: { tokens: { [tk]: hsl, [pair]: fg } } as any });
  };

  const TypeCard = ({ value, icon: Icon, title, desc }: { value: StorefrontType; icon: any; title: string; desc: string }) => (
    <button type="button" onClick={() => changeType(value)} className={cn('flex-1 text-left rounded-xl border-2 p-4 transition-colors', type === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')}>
      <div className="flex items-center justify-between mb-1.5"><Icon className="h-5 w-5 text-primary" />{type === value && <Check className="h-4 w-4 text-primary" />}</div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
    </button>
  );

  const grid = (label: string, kind: string, value: string, vals: string[] | { value: string; label: string }[], onChange: (v: string) => void, cols: 2 | 3 | 4 = 3) => (
    <OptionGrid label={label} kind={kind} value={value} options={Array.isArray(vals) && typeof vals[0] === 'string' ? opts(vals as string[]) : (vals as any)} onChange={onChange} token={token} cols={cols} />
  );

  // `group` accepts the accordion GroupIds plus internal atomic panel names
  // that 'general' composes (layout/colors/type/style/parts).
  const panel = (group: string) => {
    switch (group) {
      case 'general':
        return (
          <div>
            <SubSection title="Layout presets" icon={LayoutTemplate}>{panel('layout')}</SubSection>
            <SubSection title="Colors & background" icon={Palette}>{panel('colors')}</SubSection>
            <SubSection title="Typography" icon={TypeIcon}>{panel('type')}</SubSection>
            <SubSection title="Style & effects" icon={Sparkles}>{panel('style')}</SubSection>
            <SubSection title="Components & spacing" icon={Component}>{panel('parts')}</SubSection>
          </div>
        );

      case 'homepage': {
        const addableBlocks = Object.entries(BLOCK_REGISTRY).filter(([, def]) => def.scope === 'home' || def.scope === 'both');
        return (
          <div>
            <p className="mb-2 text-[11px] text-muted-foreground">Toggle any part on or off, drag sections to reorder them on your storefront, expand to pick a layout and edit content.</p>
            <div className="space-y-2">
              <ChromeRow
                icon={PanelTop}
                label="Navbar"
                enabled={!config.layout.header.hidden}
                onToggle={(on) => update('layout.header.hidden', !on)}
              >
                {grid('Header content', 'header', config.layout.header.variant, ['classic', 'minimal', 'centered', 'split'], (v) => update('layout.header.variant', v), 4)}
                {grid('Navbar style', 'navbarPresentation', config.layout.header.presentation ?? 'bar', [
                  { value: 'bar', label: 'Bar' },
                  { value: 'floating', label: 'Floating' },
                  { value: 'minimal', label: 'Minimal' },
                ], (v) => update('layout.header.presentation', v))}
                <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
                  <SwitchRow label="Sticky" checked={config.layout.header.sticky} onChange={(v) => update('layout.header.sticky', v)} />
                  <SwitchRow label="Blur" checked={config.layout.header.blur} onChange={(v) => update('layout.header.blur', v)} />
                  <SwitchRow label="Show search" checked={config.layout.header.showSearch} onChange={(v) => update('layout.header.showSearch', v)} />
                  <SwitchRow label="Transparent over hero" checked={config.layout.header.transparentOnHero} onChange={(v) => update('layout.header.transparentOnHero', v)} />
                  <SegmentRow label="Desktop nav" value={config.layout.nav.desktop} onChange={(v) => update('layout.nav.desktop', v)} options={opts(['topbar', 'sidebar'])} />
                  <SwitchRow label="Announcements" hint="Global on/off for the announcement section" checked={config.layout.header.showAnnouncementBar !== false} onChange={(v) => update('layout.header.showAnnouncementBar', v)} />
                </div>
                <Sub>Mobile bottom bar</Sub>
                <SwitchRow label="Show bottom bar" hint="Off = a hamburger menu appears in the navbar on phones" checked={config.layout.nav.mobileBottomBar} onChange={(v) => update('layout.nav.mobileBottomBar', v)} />
                {config.layout.nav.mobileBottomBar && grid('Bottom bar style', 'bottomBarStyle', config.layout.nav.bottomBarStyle || 'bar', ['bar', 'floating', 'minimal'], (v) => update('layout.nav.bottomBarStyle', v))}
              </ChromeRow>

              <SectionList
                sections={home}
                onChange={(next) => update('pages.home', next)}
                onRemove={(i) => removeSection(i)}
              />

              <ChromeRow
                icon={PanelBottom}
                label="Footer"
                enabled={config.layout.footer.variant !== 'hidden'}
                onToggle={(on) => update('layout.footer.variant', on ? 'rich' : 'hidden')}
              >
                {grid('Footer style', 'footer', config.layout.footer.variant === 'hidden' ? 'rich' : config.layout.footer.variant, ['rich', 'columns', 'minimal'], (v) => update('layout.footer.variant', v))}
              </ChromeRow>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add section</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                {addableBlocks.map(([type, def]) => {
                  const Icon = def.icon;
                  return (
                    <DropdownMenuItem key={type} onClick={() => addSection(type)}>
                      <Icon className="h-4 w-4 mr-2 text-muted-foreground" /> {def.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }

      case 'shopPage': {
        const visibleCount = storefrontFilterKeys.filter((k) => isFilterVisible(storefrontFilterVis, k)).length;
        return (
          <div>
            {grid('Filters', 'filters', config.pages.products.filters, ['sidebar', 'drawer', 'topbar'], (v) => update('pages.products.filters', v))}
            <Sub>Filter visibility</Sub>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Available filters</p>
                <p className="text-xs text-muted-foreground">
                  {visibleCount} of {storefrontFilterKeys.length} filter groups shown to customers — price, availability, reviews, options, specifications…
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => setFilterVisOpen(true)}>
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Manage
              </Button>
            </div>
            {grid('Layout', 'productsLayout', config.pages.products.layout, ['grid', 'list'], (v) => update('pages.products.layout', v), 2)}
            {grid('Grid columns', 'gridColumns', String(config.layout.productGrid.columns), [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }], (v) => update('layout.productGrid.columns', Number(v)), 4)}
          </div>
        );
      }

      case 'productPage': {
        const addableDetailBlocks = Object.entries(BLOCK_REGISTRY).filter(([, def]) => def.scope === 'productDetail' || def.scope === 'both');
        return (
          <div>
            {grid('Gallery layout', 'gallery', config.components.productGalleryLayout, [{ value: 'left', label: 'Left' }, { value: 'top', label: 'Top' }, { value: 'sticky-split', label: 'Sticky split' }, { value: 'full-bleed', label: 'Full bleed' }], (v) => update('components.productGalleryLayout', v), 4)}
            <Sub>Sections</Sub>
            <p className="mb-2 text-[11px] text-muted-foreground">The gallery and info blocks sit side by side on desktop; the rest render below.</p>
            <SectionList
              sections={config.pages.productDetail}
              onChange={(next) => update('pages.productDetail', next)}
              onRemove={(i) => removeSection(i, 'productDetail')}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add section</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                {addableDetailBlocks.map(([type, def]) => {
                  const Icon = def.icon;
                  return (
                    <DropdownMenuItem key={type} onClick={() => addSection(type, 'productDetail')}>
                      <Icon className="h-4 w-4 mr-2 text-muted-foreground" /> {def.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }

      case 'cartPage':
        return (
          <div>
            <p className="mb-2 text-[11px] text-muted-foreground">Your cart opens as its own page (change under General → Components → Cart).</p>
            {grid('Orders page style', 'ordersStyle', config.pages.orders.style, ['cards', 'table'], (v) => update('pages.orders.style', v), 2)}
          </div>
        );

      case 'layout':
        return <LayoutSelector activeId={config.layoutId} onApply={(l) => { mergePartial(l.structure); showSuccess(`“${l.name}” layout applied.`); }} />;

      case 'colors':
        return (
          <div>
            <SubSection title="Palettes & mode" icon={SwatchBook}>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => applyPalette(t)} title={t.name}
                    className={cn('flex items-center gap-1 rounded-full border p-1 pr-2.5 transition-colors', config.theme.paletteId === t.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40')}>
                    <span className="flex -space-x-1">{(['primary', 'background', 'accent'] as const).map((k) => <span key={k} className="h-4 w-4 rounded-full border border-black/10" style={{ background: hslToHex(t.config.theme.tokens[k]) }} />)}</span>
                    <span className="text-[11px] font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
              {grid('Color mode', 'mode', config.theme.mode, ['light', 'dark', 'auto'], (v) => update('theme.mode', v))}
            </SubSection>
            {(() => {
              // ── Mode-aware color editing ─────────────────────────────────
              // The MAIN section always edits what the visitor actually sees:
              // in dark mode that's darkTokens (editing light tokens there is
              // invisible — the "pickers don't work" trap). The inactive set
              // is editable below.
              const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
              const editingDark = config.theme.mode === 'dark' || (config.theme.mode === 'auto' && prefersDark);
              const TOKEN_ROWS = [
                { tk: 'primary', label: 'Primary' },
                { tk: 'card', label: 'Card' },
                { tk: 'accent', label: 'Accent' },
                { tk: 'secondary', label: 'Secondary' },
                { tk: 'muted', label: 'Muted' },
                { tk: 'foreground', label: 'Text', vs: 'background' },
                { tk: 'muted-foreground', label: 'Muted text', vs: 'background' },
                { tk: 'border', label: 'Border' },
              ] as const;
              const lightVal = (tk: string): string => (config.theme.tokens as any)[tk];
              const darkVal = (tk: string): string =>
                (config.theme.darkTokens as any)?.[tk] ?? (DEFAULT_DARK_TOKENS as any)[tk] ?? lightVal(tk);
              const setDarkColor = (tk: string, hsl: string) => {
                const pair = SURFACE_PAIRS[tk];
                const patch: Record<string, string> = { [tk]: hsl };
                if (pair) patch[pair] = tk === 'muted' ? idealMutedForeground(hsl) : idealForeground(hsl);
                mergePartial({ theme: { darkTokens: { ...(config.theme.darkTokens || {}), ...patch } } } as any);
              };
              const TokenGrid = ({ val, set }: { val: (tk: string) => string; set: (tk: string, hsl: string) => void }) => (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                  {TOKEN_ROWS.map(({ tk, label, ...rest }) => {
                    const pair = SURFACE_PAIRS[tk];
                    const vs = (rest as any).vs as string | undefined;
                    const grade = pair ? wcagGrade(val(tk), val(pair)) : vs ? wcagGrade(val(vs), val(tk)) : null;
                    return (
                      <ColorRow
                        key={tk} label={label} hsl={val(tk)} onChange={(hsl) => set(tk, hsl)}
                        badge={grade && (
                          <span
                            title={`Contrast: WCAG ${grade === 'fail' ? 'below AA' : grade}`}
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                              grade === 'fail' ? 'bg-destructive/15 text-destructive' : 'bg-emerald-500/15 text-emerald-600'
                            )}
                          >
                            {grade === 'fail' ? '!' : grade}
                          </span>
                        )}
                      />
                    );
                  })}
                </div>
              );
              // The ONE background control: solid / gradient / photo. Picking a
              // solid color also updates the active token set's `background`
              // (cards, headers etc. key off it) and re-derives readable text.
              const setSolidBackground = (hsl: string) => {
                update('effects.background.color', hsl);
                (editingDark ? setDarkColor : setColor)('background', hsl);
              };
              return (
                <>
                  <SubSection title="Background" icon={ImageIcon}>
                  <SelectRow label="Type" value={config.effects.background.type} onChange={(v) => update('effects.background.type', v)} options={opts(['solid', 'gradient', 'image'])} />
                  {config.effects.background.type === 'solid' && (
                    <ColorRow
                      label="Background color"
                      hsl={config.effects.background.color || (editingDark ? darkVal('background') : lightVal('background'))}
                      onChange={setSolidBackground}
                    />
                  )}
                  {config.effects.background.type === 'image' && (
                    <Row label="Image URL"><Input className="w-[150px] h-8 text-xs" value={config.effects.background.imageUrl || ''} onChange={(e) => update('effects.background.imageUrl', e.target.value)} placeholder="https://…" /></Row>
                  )}
                  {config.effects.background.type === 'gradient' && (() => {
                    const g = config.effects.background.gradient ?? { enabled: true, from: config.theme.tokens.secondary, to: config.theme.tokens.accent, angle: 135 };
                    const setG = (patch: Partial<typeof g>) => {
                      const next = { ...g, enabled: true, ...patch };
                      update('effects.background.gradient', next);
                      // Pair text against the top of the gradient — most content
                      // sits there; the overlay slider is the escape hatch.
                      keepTextReadableOn(next.from);
                    };
                    return (
                      <div>
                        <div
                          className="mb-1 mt-2 h-10 w-full rounded-md border"
                          style={{ background: `linear-gradient(${g.angle}deg, hsl(${g.from}), hsl(${g.to}))` }}
                          aria-hidden
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                          <ColorRow label="From" hsl={g.from} onChange={(hsl) => setG({ from: hsl })} />
                          <ColorRow label="To" hsl={g.to} onChange={(hsl) => setG({ to: hsl })} />
                        </div>
                        <SliderRow label="Angle" value={g.angle} min={0} max={360} step={5} unit="°" onChange={(v) => setG({ angle: v })} />
                      </div>
                    );
                  })()}
                  {config.effects.background.type !== 'solid' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                      <SliderRow label="Brightness" value={config.effects.background.brightness ?? 100} min={50} max={150} unit="%" onChange={(v) => update('effects.background.brightness', v)} />
                      <SliderRow label="Overlay" value={config.effects.background.overlay ?? 0} min={0} max={80} unit="%" onChange={(v) => update('effects.background.overlay', v)} />
                    </div>
                  )}
                  </SubSection>

                  <SubSection title={editingDark ? 'Colors (dark mode — what visitors see now)' : 'Individual colors'} icon={editingDark ? Moon : Sun}>
                    <TokenGrid
                      val={editingDark ? darkVal : lightVal}
                      set={editingDark ? setDarkColor : setColor}
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">Badges show the WCAG contrast grade. Changing a surface re-derives its text automatically; the Text pickers override that manually.</p>
                  </SubSection>
                  {config.theme.mode !== 'light' && (
                    <SubSection title={editingDark ? 'Light mode colors (inactive)' : 'Dark mode colors'} icon={editingDark ? Sun : Moon}>
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {editingDark
                          ? (config.theme.mode === 'auto' ? 'Used when a visitor prefers light mode.' : 'Not shown while your shop is set to dark.')
                          : 'Overrides used when the storefront renders dark (auto follows the visitor).'}
                      </p>
                      <TokenGrid
                        val={editingDark ? lightVal : darkVal}
                        set={editingDark ? setColor : setDarkColor}
                      />
                    </SubSection>
                  )}
                </>
              );
            })()}
          </div>
        );

      case 'type':
        return (
          <div className="space-y-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              <Row label="Heading font"><FontSelect value={config.typography.headingFont} onChange={(v) => update('typography.headingFont', v)} /></Row>
              <Row label="Body font"><FontSelect value={config.typography.bodyFont} onChange={(v) => update('typography.bodyFont', v)} /></Row>
            </div>
            {grid('Heading case', 'headingCase', config.typography.headingTransform, ['none', 'uppercase', 'capitalize'], (v) => update('typography.headingTransform', v))}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              <SliderRow label="Base size" value={config.typography.baseSize} min={13} max={20} unit="px" onChange={(v) => update('typography.baseSize', v)} />
              <SliderRow label="Scale ratio" value={config.typography.scaleRatio} min={1.1} max={1.5} step={0.01} onChange={(v) => update('typography.scaleRatio', v)} />
              <SliderRow label="Heading weight" value={config.typography.headingWeight} min={400} max={900} step={100} onChange={(v) => update('typography.headingWeight', v)} />
              <SliderRow label="Letter spacing" value={config.typography.letterSpacing} min={-0.05} max={0.1} step={0.005} unit="em" onChange={(v) => update('typography.letterSpacing', v)} />
              <SliderRow label="Body weight" value={config.typography.bodyWeight} min={300} max={600} step={100} onChange={(v) => update('typography.bodyWeight', v)} />
              <SliderRow label="Line height" value={config.typography.lineHeight} min={1.3} max={2} step={0.05} onChange={(v) => update('typography.lineHeight', v)} />
            </div>
          </div>
        );

      case 'style':
        return (
          <div>
            <Sub>Corners</Sub>
            {grid('Corner style', 'corners', config.shape.radiusStyle, ['sharp', 'soft', 'round', 'pill'], (v) => update('shape.radiusStyle', v), 4)}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              <SliderRow label="Corner radius" value={config.shape.radius} min={0} max={32} unit="px" onChange={(v) => update('shape.radius', v)} />
              <SliderRow label="Border width" value={config.shape.borderWidth} min={0} max={4} unit="px" onChange={(v) => update('shape.borderWidth', v)} />
            </div>
            <Sub>Depth & motion</Sub>
            {grid('Shadow', 'shadow', config.effects.shadow, ['none', 'sm', 'md', 'lg', 'dramatic'], (v) => update('effects.shadow', v), 4)}
            {config.effects.shadow !== 'none' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                <SwitchRow
                  label="Tinted shadows" hint="Color the shadows instead of neutral gray"
                  checked={!!config.effects.shadowColor}
                  onChange={(on) => update('effects.shadowColor', on ? config.theme.tokens.primary : undefined)}
                />
                {config.effects.shadowColor && (
                  <ColorRow label="Shadow tint" hsl={config.effects.shadowColor} onChange={(hsl) => update('effects.shadowColor', hsl)} />
                )}
              </div>
            )}
            {grid('Motion', 'motion', config.effects.motion, ['none', 'subtle', 'standard', 'expressive'], (v) => update('effects.motion', v), 4)}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 pt-1">
              <SwitchRow label="Glassmorphism" checked={config.effects.glass.enabled} onChange={(v) => update('effects.glass.enabled', v)} />
              <SwitchRow label="Scroll reveal" checked={config.effects.scrollReveal} onChange={(v) => update('effects.scrollReveal', v)} />
              <SwitchRow label="Film grain" checked={config.effects.grain} onChange={(v) => update('effects.grain', v)} />
              <SelectRow label="Card hover" value={config.effects.hoverEffect} onChange={(v) => update('effects.hoverEffect', v)} options={opts(['none', 'lift', 'zoom', 'glow', 'tilt'])} />
            </div>
            {config.effects.glass.enabled && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                <SliderRow label="Glass blur" value={config.effects.glass.blur} min={2} max={30} unit="px" onChange={(v) => update('effects.glass.blur', v)} />
                <SliderRow label="Glass opacity" value={config.effects.glass.opacity} min={20} max={100} unit="%" onChange={(v) => update('effects.glass.opacity', v)} />
              </div>
            )}
          </div>
        );

      case 'parts':
        return (
          <div>
            {grid('Product card', 'productCard', config.components.productCard, ['classic', 'overlay', 'minimal', 'editorial', 'compact', 'polaroid', 'frame', 'caption-hover', 'ticket'], (v) => update('components.productCard', v))}
            {grid('Button', 'button', config.components.button, ['solid', 'outline', 'soft', 'gradient'], (v) => update('components.button', v), 4)}
            {grid('Badges', 'badge', config.components.badge, ['solid', 'soft', 'outline'], (v) => update('components.badge', v))}
            {grid('Cart', 'cart', config.components.cart, ['drawer', 'modal', 'page'], (v) => update('components.cart', v))}
            {grid('Section headings', 'sectionHeader', config.layout.sectionHeader ?? 'centered', [
              { value: 'centered', label: 'Centered' },
              { value: 'left', label: 'Eyebrow left' },
              { value: 'editorial', label: 'Editorial rule' },
            ], (v) => update('layout.sectionHeader', v))}
            <Sub>Spacing</Sub>
            {grid('Container width', 'container', config.layout.containerWidth, ['compact', 'standard', 'wide', 'full'], (v) => update('layout.containerWidth', v), 4)}
            {grid('Density', 'density', config.layout.density, ['comfortable', 'cozy', 'spacious'], (v) => update('layout.density', v))}
          </div>
        );

      case 'themes':
        return (
          <div>
            <Sub>My templates</Sub>
            <div className="flex items-center gap-2 mb-3">
              <Input
                className="h-8 max-w-[220px] text-xs"
                placeholder="Name this design…"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && templateName.trim()) { saveAsTemplate(templateName); setTemplateName(''); showSuccess('Design saved to My templates.'); } }}
              />
              <Button
                variant="outline" size="sm" disabled={!templateName.trim()}
                onClick={() => { saveAsTemplate(templateName); setTemplateName(''); showSuccess('Design saved to My templates.'); }}
              >
                <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> Save current design
              </Button>
            </div>
            {customTemplates.length > 0 && (
              <div className="mb-5 space-y-2">
                {customTemplates.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-md border p-2 pl-3">
                    <span className="flex -space-x-1">
                      {(['primary', 'background', 'accent'] as const).map((k) => (
                        <span key={k} className="h-4 w-4 rounded-full border border-black/10" style={{ background: hslToHex(t.config.theme.tokens[k]) }} />
                      ))}
                    </span>
                    <span className="flex-1 text-sm font-medium">{t.name}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>
                    <Button variant="outline" size="sm" className="h-7" onClick={() => setPendingTemplate({ config: t.config, id: null })}>Apply</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={`Delete ${t.name}`} onClick={() => deleteCustomTemplate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {customTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">No saved designs yet — tweak the storefront, then save it here (or with the bookmark button in the toolbar).</p>
            )}
          </div>
        );
    }
  };

  return (
    <>
      {/* ── Controls (the preview floats above on the right) ──────── */}
      <div className="space-y-6 min-w-0">
        {/* Storefront type — a simple toggle. Instagram = fixed look, preview only. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold leading-tight">Storefront style</p>
              <p className="text-xs text-muted-foreground">What visitors see when they open your shop link.</p>
            </div>
          </div>
          <div className="flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => changeType('instagram')}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', type === 'instagram' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
              aria-pressed={type === 'instagram'}
            >
              <Instagram className="h-4 w-4" /> Instagram
            </button>
            <button
              type="button"
              onClick={() => changeType('custom')}
              className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', type === 'custom' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
              aria-pressed={type === 'custom'}
            >
              <Palette className="h-4 w-4" /> Custom design
            </button>
          </div>
        </div>

        {type === 'instagram' ? (
          /* Fixed design — just show how it looks on both devices. */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Instagram className="h-4 w-4" /> Instagram-style preview</CardTitle>
              <CardDescription>This look is fixed. Switch to <b>Custom design</b> to unlock Storefront Studio.</CardDescription>
            </CardHeader>
            <CardContent>
              {previewPath ? (
                <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Desktop</p>
                    <ScaledFrame src={previewPath} virtualW={1280} virtualH={800} title="Instagram storefront — desktop" />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mobile</p>
                    <ScaledFrame src={previewPath} virtualW={390} virtualH={780} title="Instagram storefront — mobile" />
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Save your shop name to preview.</p>
              )}
              {previewUrl && (
                <div className="mt-3 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">Open storefront</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card><CardContent className="py-10"><Skeleton className="h-48 w-full" /></CardContent></Card>
        ) : (
          <>
          {/* ── Studio workspace: control rail + preview + template rail ── */}
          <div className="overflow-hidden rounded-xl border bg-card">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</span>
                <Select
                  value={TEMPLATES.some((t) => t.id === config.templateId) ? (config.templateId as string) : 'custom'}
                  onValueChange={(id) => {
                    const t = TEMPLATES.find((x) => x.id === id);
                    if (t) setPendingTemplate({ config: t.config, id: t.id });
                  }}
                >
                  <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!TEMPLATES.some((t) => t.id === config.templateId) && <SelectItem value="custom">Custom design</SelectItem>}
                    {TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={undo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={redo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)"><Redo2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={surpriseMe} aria-label="Surprise me" title="Surprise me — random remix"><Dices className="h-4 w-4" /></Button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <SaveIndicator status={saveStatus} />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSaveOpen(true)}>
                  <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> Save design
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0"><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset your entire design?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This restores every setting — colors, fonts, layout and sections — back to the default look. Your customizations can't be recovered.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={reset}>Reset design</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Rail + preview + vertical template marquee */}
            <div className="grid lg:grid-cols-[380px_minmax(0,1fr)_216px]">
              <div data-tour="studio-options" className="max-h-[520px] overflow-y-auto border-b lg:max-h-[calc(100vh-280px)] lg:min-h-[560px] lg:border-b-0 lg:border-r">
                {/* Settings search — type anything, jump straight to the control. */}
                <div className="sticky top-0 z-10 border-b bg-card px-3 py-2">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={settingQuery}
                      onChange={(e) => setSettingQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && settingMatches[0]) jumpToSetting(settingMatches[0].group); if (e.key === 'Escape') setSettingQuery(''); }}
                      placeholder="Search settings… (e.g. navbar, shadows, hero)"
                      className="h-8 pl-8 text-xs"
                    />
                    {settingMatches.length > 0 && (
                      <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-popover shadow-lg">
                        {settingMatches.map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => jumpToSetting(s.group)}
                            className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
                          >
                            <span className="min-w-0 truncate font-medium">{s.label}</span>
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{GROUP_META[s.group].title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Accordion type="multiple" value={openGroups} onValueChange={setOpenGroups} className="px-3 py-1">
                  {GROUPS.filter((g) => g.id !== 'cartPage' || config.components.cart === 'page').map((g) => {
                    const Icon = g.icon;
                    return (
                      <AccordionItem key={g.id} value={g.id} data-group-item={g.id} className="border-b last:border-b-0">
                        <AccordionTrigger className="py-3 text-sm hover:no-underline">
                          <span className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{GROUP_META[g.id].title}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 pt-0.5">
                          <p className="mb-3 text-xs text-muted-foreground">{GROUP_META[g.id].desc}</p>
                          {panel(g.id)}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
              <div className="p-3" data-tour="studio-preview">
                <DockedPreview
                  previewPath={previewPath}
                  previewUrl={previewUrl}
                  config={config}
                  navTarget={navTarget}
                  className="h-[480px] lg:h-[calc(100vh-304px)] lg:min-h-[536px]"
                />
              </div>
              {/* Vertical auto-scrolling template rail (desktop only). */}
              <div className="hidden border-l lg:block" data-tour="studio-templates">
                <TemplateMarquee
                  activeTemplateId={config.templateId}
                  onPick={(c, id) => setPendingTemplate({ config: c, id })}
                  className="lg:h-[calc(100vh-280px)] lg:min-h-[560px]"
                />
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Save-as-template dialog (toolbar bookmark button). */}
      <FilterVisibilityModal
        open={filterVisOpen}
        onOpenChange={setFilterVisOpen}
        description="Choose which filters customers can use on your storefront's products page. Changes save with your design."
        allCategories={allCategories}
        allTags={allTags}
        allDetailsAttributes={allDetailsAttributes}
        allProducts={allProducts}
        visibilityMap={storefrontFilterVis}
        onToggle={(key, visible) => update('pages.products.filterVisibility', { ...storefrontFilterVis, [key]: visible })}
        onSetMany={(keys, visible) => {
          const next = { ...storefrontFilterVis };
          keys.forEach((k) => { next[k] = visible; });
          update('pages.products.filterVisibility', next);
        }}
      />

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save this design</DialogTitle>
            <DialogDescription>Stores your current design in “My templates” so you can come back to it any time.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="e.g. Summer look"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && templateName.trim()) {
                saveAsTemplate(templateName); setTemplateName(''); setSaveOpen(false); showSuccess('Design saved to My templates.');
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button
              disabled={!templateName.trim()}
              onClick={() => { saveAsTemplate(templateName); setTemplateName(''); setSaveOpen(false); showSuccess('Design saved to My templates.'); }}
            >
              <BookmarkPlus className="mr-1.5 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingTemplate} onOpenChange={(o) => !o && setPendingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Applying a template replaces your current colors, fonts, layout and sections with the template's design. Any tweaks you've made will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my design</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingTemplate) { applyTemplate(pendingTemplate.config, pendingTemplate.id); showSuccess('Complete look applied.'); }
              setPendingTemplate(null);
            }}>Apply look</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
