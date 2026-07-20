// Storefront Studio — design editor for the custom /shop storefront.
// IA: Layout (wireframes) → Colors → everything else, grouped by relevance.
// Every enumerated option is shown as a rendered, themed visual demo in a
// responsive multi-column grid. Right: sticky live preview (16:9 / 9:16).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
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
const opts = (vals: string[]) => vals.map((v) => ({ value: v, label: i18n.t('studio.opt_' + v.replace(/-/g, '_'), { defaultValue: cap(v) }) }));

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
  const { t } = useTranslation();
  if (status === 'idle') return null;
  const map = {
    saving: { icon: Loader2, text: 'studio.saving', cls: 'text-muted-foreground', spin: true },
    saved: { icon: Check, text: 'studio.all_saved', cls: 'text-emerald-600', spin: false },
    error: { icon: CloudOff, text: 'studio.save_error_retrying', cls: 'text-destructive', spin: false },
  } as const;
  const { icon: Icon, text, cls, spin } = map[status];
  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', cls)} role="status" aria-live="polite">
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} /> {t(text)}
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

// Values are i18n keys — render with t(GROUP_META[id].title / .desc).
const GROUP_META: Record<GroupId, { title: string; desc: string }> = {
  general: { title: 'studio.general', desc: 'studio.general_desc' },
  homepage: { title: 'studio.homePage', desc: 'studio.homepage_desc' },
  shopPage: { title: 'studio.shopPage', desc: 'studio.shop_page_desc' },
  productPage: { title: 'studio.productPage', desc: 'studio.product_page_desc' },
  cartPage: { title: 'studio.cart_page', desc: 'studio.cart_page_desc' },
  themes: { title: 'studio.my_templates', desc: 'studio.my_templates_desc' },
};

/** Pinned chrome row (Navbar / Footer) styled like a section row: visibility
    switch + expandable settings. Not draggable — chrome position is fixed. */
const ChromeRow = ({ icon: Icon, label, enabled, onToggle, children }: {
  icon: any; label: string; enabled: boolean; onToggle: (on: boolean) => void; children: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center gap-2 p-2">
        <span className="w-4 shrink-0" aria-hidden />
        <Switch checked={enabled} onCheckedChange={onToggle} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className={cn('flex-1 text-sm', !enabled && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{label}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen((o) => !o)} aria-label={t('studio.edit_label', { label })} aria-expanded={open}>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </Button>
      </div>
      {open && <div className="space-y-1 border-t bg-muted/30 p-3">{children}</div>}
    </div>
  );
};

// Searchable index of every Studio setting → which accordion group holds it.
// `label` is an i18n key — render/match with t(label); keywords stay as
// search-only helper terms.
const SETTINGS_INDEX: { label: string; group: GroupId; keywords?: string }[] = [
  { label: 'studio.layout_presets', group: 'general', keywords: 'structure arrangement wireframe preset' },
  { label: 'studio.si_background', group: 'general', keywords: 'background color image gradient overlay brightness page' },
  { label: 'studio.si_quick_palettes', group: 'general', keywords: 'palette scheme colors preset' },
  { label: 'studio.si_color_mode', group: 'general', keywords: 'dark light mode auto theme' },
  { label: 'studio.si_text_colors', group: 'general', keywords: 'text foreground muted font color readable contrast' },
  { label: 'studio.si_brand_colors', group: 'general', keywords: 'primary accent brand card secondary border' },
  { label: 'studio.si_fonts', group: 'general', keywords: 'font typography typeface family' },
  { label: 'studio.si_font_size', group: 'general', keywords: 'size scale ratio letter spacing line height weight case uppercase' },
  { label: 'studio.si_corners', group: 'general', keywords: 'rounded corners radius sharp pill soft border width' },
  { label: 'studio.si_shadows', group: 'general', keywords: 'shadow depth elevation dramatic tint' },
  { label: 'studio.si_motion', group: 'general', keywords: 'animation motion gsap reveal expressive subtle' },
  { label: 'studio.si_glass', group: 'general', keywords: 'glass blur transparency grain texture' },
  { label: 'studio.si_card_hover', group: 'general', keywords: 'hover lift zoom glow tilt' },
  { label: 'studio.si_product_card', group: 'general', keywords: 'card overlay polaroid minimal editorial frame ticket caption' },
  { label: 'studio.si_buttons_badges', group: 'general', keywords: 'button pill outline gradient soft badge' },
  { label: 'studio.si_cart_style', group: 'general', keywords: 'cart basket checkout drawer' },
  { label: 'studio.si_gallery', group: 'productPage', keywords: 'gallery images sticky split full bleed' },
  { label: 'studio.section_headings', group: 'general', keywords: 'headings eyebrow titles centered editorial rule' },
  { label: 'studio.si_container', group: 'general', keywords: 'spacing width compact wide grid columns gap density' },
  { label: 'studio.si_header', group: 'homepage', keywords: 'header navbar bar floating minimal sticky blur logo topbar' },
  { label: 'studio.si_desktop_nav', group: 'homepage', keywords: 'sidebar navigation menu desktop categories' },
  { label: 'studio.si_hero', group: 'homepage', keywords: 'hero banner slideshow video marquee collage editorial full' },
  { label: 'studio.announcementBanner', group: 'homepage', keywords: 'announcement marquee ticker bar stacked' },
  { label: 'studio.si_mobile_bar', group: 'homepage', keywords: 'bottom bar mobile floating hamburger menu' },
  { label: 'studio.footer_style', group: 'homepage', keywords: 'footer columns rich minimal hidden' },
  { label: 'studio.si_home_sections', group: 'homepage', keywords: 'sections blocks reorder drag add hero slider' },
  { label: 'studio.si_product_sections', group: 'productPage', keywords: 'product detail reviews related specifications gallery' },
  { label: 'studio.si_shop_filters', group: 'shopPage', keywords: 'filters sidebar drawer topbar list grid' },
  { label: 'studio.si_filter_visibility', group: 'shopPage', keywords: 'filter visibility price availability rating reviews tags options specifications hide show' },
  { label: 'studio.si_my_templates', group: 'themes', keywords: 'save template custom design reuse' },
];

export const StorefrontStudio = () => {
  const { t } = useTranslation();
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
        return t(s.label).toLowerCase().includes(q) || (s.keywords ?? '').toLowerCase().includes(q) || t(GROUP_META[s.group].title).toLowerCase().includes(q);
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
    showSuccess(t('studio.surprise_toast'));
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
    showSuccess(t === 'instagram' ? i18n.t('studio.storefront_set_instagram') : i18n.t('studio.storefront_set_custom'));
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
            <SubSection title={t('studio.layout_presets')} icon={LayoutTemplate}>{panel('layout')}</SubSection>
            <SubSection title={t('studio.colors_background')} icon={Palette}>{panel('colors')}</SubSection>
            <SubSection title={t('studio.typography')} icon={TypeIcon}>{panel('type')}</SubSection>
            <SubSection title={t('studio.style_effects')} icon={Sparkles}>{panel('style')}</SubSection>
            <SubSection title={t('studio.components_spacing')} icon={Component}>{panel('parts')}</SubSection>
          </div>
        );

      case 'homepage': {
        const addableBlocks = Object.entries(BLOCK_REGISTRY).filter(([, def]) => def.scope === 'home' || def.scope === 'both');
        return (
          <div>
            <p className="mb-2 text-[11px] text-muted-foreground">{t('studio.homepage_intro')}</p>
            <div className="space-y-2">
              <ChromeRow
                icon={PanelTop}
                label={t('studio.navbar')}
                enabled={!config.layout.header.hidden}
                onToggle={(on) => update('layout.header.hidden', !on)}
              >
                {grid(t('studio.header_content'), 'header', config.layout.header.variant, ['classic', 'minimal', 'centered', 'split'], (v) => update('layout.header.variant', v), 4)}
                {grid(t('studio.navbarStyle'), 'navbarPresentation', config.layout.header.presentation ?? 'bar', [
                  { value: 'bar', label: t('studio.opt_bar') },
                  { value: 'floating', label: t('studio.opt_floating') },
                  { value: 'minimal', label: t('studio.opt_minimal') },
                ], (v) => update('layout.header.presentation', v))}
                <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-2">
                  <SwitchRow label={t('studio.sticky')} checked={config.layout.header.sticky} onChange={(v) => update('layout.header.sticky', v)} />
                  <SwitchRow label={t('studio.blur')} checked={config.layout.header.blur} onChange={(v) => update('layout.header.blur', v)} />
                  <SwitchRow label={t('studio.show_search')} checked={config.layout.header.showSearch} onChange={(v) => update('layout.header.showSearch', v)} />
                  <SwitchRow label={t('studio.transparent_over_hero')} checked={config.layout.header.transparentOnHero} onChange={(v) => update('layout.header.transparentOnHero', v)} />
                  <SegmentRow label={t('studio.desktop_nav')} value={config.layout.nav.desktop} onChange={(v) => update('layout.nav.desktop', v)} options={[{ value: 'topbar', label: t('studio.topBar') }, { value: 'sidebar', label: t('studio.sidebar') }]} />
                  <SwitchRow label={t('studio.announcements')} hint={t('studio.announcements_hint')} checked={config.layout.header.showAnnouncementBar !== false} onChange={(v) => update('layout.header.showAnnouncementBar', v)} />
                </div>
                <Sub>{t('studio.mobile_bottom_bar')}</Sub>
                <SwitchRow label={t('studio.show_bottom_bar')} hint={t('studio.bottom_bar_hint')} checked={config.layout.nav.mobileBottomBar} onChange={(v) => update('layout.nav.mobileBottomBar', v)} />
                {config.layout.nav.mobileBottomBar && grid(t('studio.bottom_bar_style'), 'bottomBarStyle', config.layout.nav.bottomBarStyle || 'bar', ['bar', 'floating', 'minimal'], (v) => update('layout.nav.bottomBarStyle', v))}
              </ChromeRow>

              <SectionList
                sections={home}
                onChange={(next) => update('pages.home', next)}
                onRemove={(i) => removeSection(i)}
              />

              <ChromeRow
                icon={PanelBottom}
                label={t('studio.footer')}
                enabled={config.layout.footer.variant !== 'hidden'}
                onToggle={(on) => update('layout.footer.variant', on ? 'rich' : 'hidden')}
              >
                {grid(t('studio.footer_style'), 'footer', config.layout.footer.variant === 'hidden' ? 'rich' : config.layout.footer.variant, ['rich', 'columns', 'minimal'], (v) => update('layout.footer.variant', v))}
              </ChromeRow>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2"><Plus className="h-3.5 w-3.5 mr-1.5" /> {t('studio.addSection')}</Button>
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
            {grid(t('common.filters'), 'filters', config.pages.products.filters, [{ value: 'sidebar', label: t('studio.filtersSidebar') }, { value: 'drawer', label: t('studio.filtersDrawer') }, { value: 'topbar', label: t('studio.filtersTopbar') }], (v) => update('pages.products.filters', v))}
            <Sub>{t('studio.filterVisibility')}</Sub>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t('studio.available_filters')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('studio.available_filters_desc', { visible: visibleCount, total: storefrontFilterKeys.length })}
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => setFilterVisOpen(true)}>
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> {t('studio.manage')}
              </Button>
            </div>
            {grid(t('studio.layout'), 'productsLayout', config.pages.products.layout, [{ value: 'grid', label: t('studio.grid') }, { value: 'list', label: t('studio.list') }], (v) => update('pages.products.layout', v), 2)}
            {grid(t('studio.grid_columns'), 'gridColumns', String(config.layout.productGrid.columns), [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }], (v) => update('layout.productGrid.columns', Number(v)), 4)}
          </div>
        );
      }

      case 'productPage': {
        const addableDetailBlocks = Object.entries(BLOCK_REGISTRY).filter(([, def]) => def.scope === 'productDetail' || def.scope === 'both');
        return (
          <div>
            {grid(t('studio.gallery_layout'), 'gallery', config.components.productGalleryLayout, [{ value: 'left', label: t('studio.gallery_left') }, { value: 'top', label: t('studio.gallery_top') }, { value: 'sticky-split', label: t('studio.gallery_sticky_split') }, { value: 'full-bleed', label: t('studio.gallery_full_bleed') }], (v) => update('components.productGalleryLayout', v), 4)}
            <Sub>{t('studio.sections')}</Sub>
            <p className="mb-2 text-[11px] text-muted-foreground">{t('studio.product_sections_hint')}</p>
            <SectionList
              sections={config.pages.productDetail}
              onChange={(next) => update('pages.productDetail', next)}
              onRemove={(i) => removeSection(i, 'productDetail')}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2"><Plus className="h-3.5 w-3.5 mr-1.5" /> {t('studio.addSection')}</Button>
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
            <p className="mb-2 text-[11px] text-muted-foreground">{t('studio.cart_page_hint')}</p>
            {grid(t('studio.orders_page_style'), 'ordersStyle', config.pages.orders.style, ['cards', 'table'], (v) => update('pages.orders.style', v), 2)}
          </div>
        );

      case 'layout':
        return <LayoutSelector activeId={config.layoutId} onApply={(l) => { mergePartial(l.structure); showSuccess(t('studio.layout_applied', { name: l.name })); }} />;

      case 'colors':
        return (
          <div>
            <SubSection title={t('studio.palettes_mode')} icon={SwatchBook}>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => applyPalette(t)} title={t.name}
                    className={cn('flex items-center gap-1 rounded-full border p-1 pr-2.5 transition-colors', config.theme.paletteId === t.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40')}>
                    <span className="flex -space-x-1">{(['primary', 'background', 'accent'] as const).map((k) => <span key={k} className="h-4 w-4 rounded-full border border-black/10" style={{ background: hslToHex(t.config.theme.tokens[k]) }} />)}</span>
                    <span className="text-[11px] font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
              {grid(t('studio.color_mode'), 'mode', config.theme.mode, [{ value: 'light', label: t('studio.light') }, { value: 'dark', label: t('studio.dark') }, { value: 'auto', label: t('studio.auto') }], (v) => update('theme.mode', v))}
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
                { tk: 'primary', label: t('studio.token_primary') },
                { tk: 'card', label: t('studio.token_card') },
                { tk: 'accent', label: t('studio.token_accent') },
                { tk: 'secondary', label: t('studio.token_secondary') },
                { tk: 'muted', label: t('studio.token_muted') },
                { tk: 'foreground', label: t('studio.token_text'), vs: 'background' },
                { tk: 'muted-foreground', label: t('studio.token_muted_text'), vs: 'background' },
                { tk: 'border', label: t('studio.token_border') },
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
                            title={t('studio.contrast_wcag', { grade: grade === 'fail' ? t('studio.below_aa') : grade })}
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
                  <SubSection title={t('studio.background')} icon={ImageIcon}>
                  <SelectRow label={t('studio.bg_type')} value={config.effects.background.type} onChange={(v) => update('effects.background.type', v)} options={[{ value: 'solid', label: t('studio.bg_solid') }, { value: 'gradient', label: t('studio.opt_gradient') }, { value: 'image', label: t('studio.imageType') }]} />
                  {config.effects.background.type === 'solid' && (
                    <ColorRow
                      label={t('studio.background_color')}
                      hsl={config.effects.background.color || (editingDark ? darkVal('background') : lightVal('background'))}
                      onChange={setSolidBackground}
                    />
                  )}
                  {config.effects.background.type === 'image' && (
                    <Row label={t('studio.image_url')}><Input className="w-[150px] h-8 text-xs" value={config.effects.background.imageUrl || ''} onChange={(e) => update('effects.background.imageUrl', e.target.value)} placeholder="https://…" /></Row>
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
                          <ColorRow label={t('studio.gradient_from')} hsl={g.from} onChange={(hsl) => setG({ from: hsl })} />
                          <ColorRow label={t('studio.gradient_to')} hsl={g.to} onChange={(hsl) => setG({ to: hsl })} />
                        </div>
                        <SliderRow label={t('studio.angle')} value={g.angle} min={0} max={360} step={5} unit="°" onChange={(v) => setG({ angle: v })} />
                      </div>
                    );
                  })()}
                  {config.effects.background.type !== 'solid' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                      <SliderRow label={t('studio.brightness')} value={config.effects.background.brightness ?? 100} min={50} max={150} unit="%" onChange={(v) => update('effects.background.brightness', v)} />
                      <SliderRow label={t('studio.bg_overlay')} value={config.effects.background.overlay ?? 0} min={0} max={80} unit="%" onChange={(v) => update('effects.background.overlay', v)} />
                    </div>
                  )}
                  </SubSection>

                  <SubSection title={editingDark ? t('studio.colors_dark_active') : t('studio.individual_colors')} icon={editingDark ? Moon : Sun}>
                    <TokenGrid
                      val={editingDark ? darkVal : lightVal}
                      set={editingDark ? setDarkColor : setColor}
                    />
                    <p className="text-[11px] text-muted-foreground mt-2">{t('studio.wcag_hint')}</p>
                  </SubSection>
                  {config.theme.mode !== 'light' && (
                    <SubSection title={editingDark ? t('studio.light_colors_inactive') : t('studio.dark_colors')} icon={editingDark ? Sun : Moon}>
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {editingDark
                          ? (config.theme.mode === 'auto' ? t('studio.auto_light_hint') : t('studio.dark_shop_light_hint'))
                          : t('studio.dark_overrides_hint')}
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
              <Row label={t('studio.headingFont')}><FontSelect value={config.typography.headingFont} onChange={(v) => update('typography.headingFont', v)} /></Row>
              <Row label={t('studio.bodyFont')}><FontSelect value={config.typography.bodyFont} onChange={(v) => update('typography.bodyFont', v)} /></Row>
            </div>
            {grid(t('studio.heading_case'), 'headingCase', config.typography.headingTransform, ['none', 'uppercase', 'capitalize'], (v) => update('typography.headingTransform', v))}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              <SliderRow label={t('studio.base_size')} value={config.typography.baseSize} min={13} max={20} unit="px" onChange={(v) => update('typography.baseSize', v)} />
              <SliderRow label={t('studio.scale_ratio')} value={config.typography.scaleRatio} min={1.1} max={1.5} step={0.01} onChange={(v) => update('typography.scaleRatio', v)} />
              <SliderRow label={t('studio.heading_weight')} value={config.typography.headingWeight} min={400} max={900} step={100} onChange={(v) => update('typography.headingWeight', v)} />
              <SliderRow label={t('studio.letter_spacing')} value={config.typography.letterSpacing} min={-0.05} max={0.1} step={0.005} unit="em" onChange={(v) => update('typography.letterSpacing', v)} />
              <SliderRow label={t('studio.body_weight')} value={config.typography.bodyWeight} min={300} max={600} step={100} onChange={(v) => update('typography.bodyWeight', v)} />
              <SliderRow label={t('studio.line_height')} value={config.typography.lineHeight} min={1.3} max={2} step={0.05} onChange={(v) => update('typography.lineHeight', v)} />
            </div>
          </div>
        );

      case 'style':
        return (
          <div>
            <Sub>{t('studio.groups.corners')}</Sub>
            {grid(t('studio.corner_style'), 'corners', config.shape.radiusStyle, [{ value: 'sharp', label: t('studio.shapeSharp') }, { value: 'soft', label: t('studio.corner_soft') }, { value: 'round', label: t('studio.corner_round') }, { value: 'pill', label: t('studio.shapePill') }], (v) => update('shape.radiusStyle', v), 4)}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              <SliderRow label={t('studio.corner_radius')} value={config.shape.radius} min={0} max={32} unit="px" onChange={(v) => update('shape.radius', v)} />
              <SliderRow label={t('studio.border_width')} value={config.shape.borderWidth} min={0} max={4} unit="px" onChange={(v) => update('shape.borderWidth', v)} />
            </div>
            <Sub>{t('studio.depth_motion')}</Sub>
            {grid(t('studio.shadow'), 'shadow', config.effects.shadow, ['none', 'sm', 'md', 'lg', 'dramatic'], (v) => update('effects.shadow', v), 4)}
            {config.effects.shadow !== 'none' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                <SwitchRow
                  label={t('studio.tinted_shadows')} hint={t('studio.tinted_shadows_hint')}
                  checked={!!config.effects.shadowColor}
                  onChange={(on) => update('effects.shadowColor', on ? config.theme.tokens.primary : undefined)}
                />
                {config.effects.shadowColor && (
                  <ColorRow label={t('studio.shadow_tint')} hsl={config.effects.shadowColor} onChange={(hsl) => update('effects.shadowColor', hsl)} />
                )}
              </div>
            )}
            {grid(t('studio.motion'), 'motion', config.effects.motion, ['none', 'subtle', 'standard', 'expressive'], (v) => update('effects.motion', v), 4)}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 pt-1">
              <SwitchRow label={t('studio.glassmorphism')} checked={config.effects.glass.enabled} onChange={(v) => update('effects.glass.enabled', v)} />
              <SwitchRow label={t('studio.scroll_reveal')} checked={config.effects.scrollReveal} onChange={(v) => update('effects.scrollReveal', v)} />
              <SwitchRow label={t('studio.film_grain')} checked={config.effects.grain} onChange={(v) => update('effects.grain', v)} />
              <SelectRow label={t('studio.card_hover')} value={config.effects.hoverEffect} onChange={(v) => update('effects.hoverEffect', v)} options={opts(['none', 'lift', 'zoom', 'glow', 'tilt'])} />
            </div>
            {config.effects.glass.enabled && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                <SliderRow label={t('studio.glass_blur')} value={config.effects.glass.blur} min={2} max={30} unit="px" onChange={(v) => update('effects.glass.blur', v)} />
                <SliderRow label={t('studio.glass_opacity')} value={config.effects.glass.opacity} min={20} max={100} unit="%" onChange={(v) => update('effects.glass.opacity', v)} />
              </div>
            )}
          </div>
        );

      case 'parts':
        return (
          <div>
            {grid(t('studio.product_card'), 'productCard', config.components.productCard, ['classic', 'overlay', 'minimal', 'editorial', 'compact', 'polaroid', 'frame', 'caption-hover', 'ticket'], (v) => update('components.productCard', v))}
            {grid(t('studio.button'), 'button', config.components.button, ['solid', 'outline', 'soft', 'gradient'], (v) => update('components.button', v), 4)}
            {grid(t('studio.badges'), 'badge', config.components.badge, ['solid', 'soft', 'outline'], (v) => update('components.badge', v))}
            {grid(t('studio.cart'), 'cart', config.components.cart, ['drawer', 'modal', 'page'], (v) => update('components.cart', v))}
            {grid(t('studio.section_headings'), 'sectionHeader', config.layout.sectionHeader ?? 'centered', [
              { value: 'centered', label: t('studio.opt_centered') },
              { value: 'left', label: t('studio.heading_eyebrow_left') },
              { value: 'editorial', label: t('studio.heading_editorial_rule') },
            ], (v) => update('layout.sectionHeader', v))}
            <Sub>{t('studio.spacing')}</Sub>
            {grid(t('studio.containerWidth'), 'container', config.layout.containerWidth, ['compact', 'standard', 'wide', 'full'], (v) => update('layout.containerWidth', v), 4)}
            {grid(t('studio.density'), 'density', config.layout.density, ['comfortable', 'cozy', 'spacious'], (v) => update('layout.density', v))}
          </div>
        );

      case 'themes':
        return (
          <div>
            <Sub>{t('studio.my_templates')}</Sub>
            <div className="flex items-center gap-2 mb-3">
              <Input
                className="h-8 max-w-[220px] text-xs"
                placeholder={t('studio.name_design_placeholder')}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && templateName.trim()) { saveAsTemplate(templateName); setTemplateName(''); showSuccess(t('studio.design_saved')); } }}
              />
              <Button
                variant="outline" size="sm" disabled={!templateName.trim()}
                onClick={() => { saveAsTemplate(templateName); setTemplateName(''); showSuccess(t('studio.design_saved')); }}
              >
                <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> {t('studio.save_current_design')}
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
                    <Button variant="outline" size="sm" className="h-7" onClick={() => setPendingTemplate({ config: t.config, id: null })}>{i18n.t('common.apply')}</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={i18n.t('studio.delete_template', { name: t.name })} onClick={() => deleteCustomTemplate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {customTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('studio.no_saved_designs')}</p>
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
              <p className="text-sm font-semibold leading-tight">{t('studio.storefront_style')}</p>
              <p className="text-xs text-muted-foreground">{t('studio.visibleLabel')}</p>
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
              <Palette className="h-4 w-4" /> {t('studio.customDesign')}
            </button>
          </div>
        </div>

        {type === 'instagram' ? (
          /* Fixed design — just show how it looks on both devices. */
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Instagram className="h-4 w-4" /> {t('studio.ig_preview_title')}</CardTitle>
              <CardDescription>{t('studio.ig_look_fixed_1')} <b>{t('studio.customDesign')}</b> {t('studio.ig_look_fixed_2')}</CardDescription>
            </CardHeader>
            <CardContent>
              {previewPath ? (
                <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('studio.desktop')}</p>
                    <ScaledFrame src={previewPath} virtualW={1280} virtualH={800} title={t('studio.ig_desktop_title')} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('studio.mobile')}</p>
                    <ScaledFrame src={previewPath} virtualW={390} virtualH={780} title={t('studio.ig_mobile_title')} />
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('studio.save_shop_name_preview')}</p>
              )}
              {previewUrl && (
                <div className="mt-3 text-right">
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">{t('studio.open_storefront')}</a>
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
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('studio.template_label')}</span>
                <Select
                  value={TEMPLATES.some((t) => t.id === config.templateId) ? (config.templateId as string) : 'custom'}
                  onValueChange={(id) => {
                    const t = TEMPLATES.find((x) => x.id === id);
                    if (t) setPendingTemplate({ config: t.config, id: t.id });
                  }}
                >
                  <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {!TEMPLATES.some((t) => t.id === config.templateId) && <SelectItem value="custom">{t('studio.customDesign')}</SelectItem>}
                    {TEMPLATES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={undo} aria-label={t('common.undo')} title={t('studio.undo_title')}><Undo2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={redo} aria-label={t('studio.redo')} title={t('studio.redo_title')}><Redo2 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={surpriseMe} aria-label={t('studio.surprise_me')} title={t('studio.surprise_me_title')}><Dices className="h-4 w-4" /></Button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <SaveIndicator status={saveStatus} />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSaveOpen(true)}>
                  <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" /> {t('studio.save_design')}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0"><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> {t('studio.reset')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('studio.resetTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('studio.resetBody')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('studio.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={reset}>{t('studio.resetConfirm')}</AlertDialogAction>
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
                      placeholder={t('studio.search_settings_placeholder')}
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
                            <span className="min-w-0 truncate font-medium">{t(s.label)}</span>
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{t(GROUP_META[s.group].title)}</span>
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
                            <span className="font-semibold">{t(GROUP_META[g.id].title)}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 pt-0.5">
                          <p className="mb-3 text-xs text-muted-foreground">{t(GROUP_META[g.id].desc)}</p>
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
        description={t('studio.filterVisibilityHint')}
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
            <DialogTitle>{t('studio.save_this_design')}</DialogTitle>
            <DialogDescription>{t('studio.save_design_desc')}</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder={t('studio.design_name_example')}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && templateName.trim()) {
                saveAsTemplate(templateName); setTemplateName(''); setSaveOpen(false); showSuccess(t('studio.design_saved'));
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>{t('studio.cancel')}</Button>
            <Button
              disabled={!templateName.trim()}
              onClick={() => { saveAsTemplate(templateName); setTemplateName(''); setSaveOpen(false); showSuccess(t('studio.design_saved')); }}
            >
              <BookmarkPlus className="mr-1.5 h-4 w-4" /> {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingTemplate} onOpenChange={(o) => !o && setPendingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('studio.apply_template_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('studio.apply_template_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('studio.keep_my_design')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingTemplate) { applyTemplate(pendingTemplate.config, pendingTemplate.id); showSuccess(t('studio.look_applied')); }
              setPendingTemplate(null);
            }}>{t('studio.apply_look')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
