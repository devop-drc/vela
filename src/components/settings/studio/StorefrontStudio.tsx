// Storefront Studio — design editor for the custom /shop storefront.
// IA: Layout (wireframes) → Colors → everything else, grouped by relevance.
// Every enumerated option is shown as a rendered, themed visual demo in a
// responsive multi-column grid. Right: sticky live preview (16:9 / 9:16).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Instagram, Palette, Store, Check, RotateCcw,
  LayoutGrid, Type as TypeIcon, Sparkles, Component, ListOrdered, LayoutTemplate, PanelTop,
  Plus, Loader2, CloudOff, Undo2, Redo2, Dices, BookmarkPlus, Trash2,
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
import { idealForeground, idealMutedForeground, SURFACE_PAIRS, wcagGrade } from '@/storefront/lib/contrast';
import { DEFAULT_DARK_TOKENS } from '@/storefront/config/defaults';
import { Row, SelectRow, SwitchRow, SliderRow, SegmentRow, ColorRow } from './controls';
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
  { id: 'layout', label: 'Layout', icon: LayoutGrid },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'type', label: 'Type', icon: TypeIcon },
  { id: 'style', label: 'Style', icon: Sparkles },
  { id: 'parts', label: 'Parts', icon: Component },
  { id: 'nav', label: 'Header & nav', icon: PanelTop },
  { id: 'sections', label: 'Sections', icon: ListOrdered },
  { id: 'themes', label: 'Templates', icon: LayoutTemplate },
] as const;
type GroupId = (typeof GROUPS)[number]['id'];

const GROUP_META: Record<GroupId, { title: string; desc: string }> = {
  layout: { title: 'Layout', desc: 'Pick a structure — arrangement only, your colors stay.' },
  colors: { title: 'Colors', desc: 'Palette, mode and individual colors (text auto-contrasts).' },
  type: { title: 'Typography', desc: 'Fonts, sizing and headings.' },
  style: { title: 'Style & effects', desc: 'Corners, shadows, glass, motion and background.' },
  parts: { title: 'Components', desc: 'Product cards, buttons, cart, gallery and spacing.' },
  nav: { title: 'Header & navigation', desc: 'Header, hero, banner, bottom bar and footer styles.' },
  sections: { title: 'Sections & pages', desc: 'Arrange the homepage and page options.' },
  themes: { title: 'My templates', desc: 'Save your current design and reuse it any time.' },
};

export const StorefrontStudio = () => {
  const { shopDetails, updateShopDetails } = useShop();
  const {
    config, isLoading, saveStatus, update: rawUpdate, applyTemplate, mergePartial, reset, addSection, removeSection,
    undo, redo, canUndo, canRedo, customTemplates, saveAsTemplate, deleteCustomTemplate,
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

  const panel = (group: GroupId) => {
    switch (group) {
      case 'layout':
        return <LayoutSelector activeId={config.layoutId} onApply={(l) => { mergePartial(l.structure); showSuccess(`“${l.name}” layout applied.`); }} />;

      case 'colors':
        return (
          <div>
            <Sub>Quick palettes</Sub>
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
            <Sub>Individual colors</Sub>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              {(['primary', 'background', 'card', 'accent', 'secondary', 'muted', 'border'] as const).map((tk) => {
                const pair = SURFACE_PAIRS[tk];
                const grade = pair ? wcagGrade(config.theme.tokens[tk], config.theme.tokens[pair as keyof typeof config.theme.tokens]) : null;
                return (
                  <ColorRow
                    key={tk} label={cap(tk)} hsl={config.theme.tokens[tk]} onChange={(hsl) => setColor(tk, hsl)}
                    badge={grade && (
                      <span
                        title={`Text contrast on ${tk}: WCAG ${grade === 'fail' ? 'below AA' : grade}`}
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
            <p className="text-[11px] text-muted-foreground mt-2">Text colors adjust automatically for contrast — badges show the WCAG grade.</p>
            {config.theme.mode !== 'light' && (
              <>
                <Sub>Dark mode colors</Sub>
                <p className="text-[11px] text-muted-foreground mb-1">Overrides used when the storefront renders dark{config.theme.mode === 'auto' ? ' (auto follows the visitor)' : ''}.</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                  {(['primary', 'background', 'card', 'accent', 'secondary', 'muted', 'border'] as const).map((tk) => {
                    const current = config.theme.darkTokens?.[tk] ?? DEFAULT_DARK_TOKENS[tk] ?? config.theme.tokens[tk];
                    return (
                      <ColorRow
                        key={tk} label={cap(tk)} hsl={current}
                        onChange={(hsl) => {
                          const pair = SURFACE_PAIRS[tk];
                          const patch: Record<string, string> = { [tk]: hsl };
                          if (pair) patch[pair] = tk === 'muted' ? idealMutedForeground(hsl) : idealForeground(hsl);
                          mergePartial({ theme: { darkTokens: { ...(config.theme.darkTokens || {}), ...patch } } } as any);
                        }}
                      />
                    );
                  })}
                </div>
              </>
            )}
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
            <Sub>Background</Sub>
            <SelectRow label="Type" value={config.effects.background.type} onChange={(v) => update('effects.background.type', v)} options={opts(['solid', 'gradient', 'image'])} />
            {config.effects.background.type === 'image' && (
              <Row label="Image URL"><Input className="w-[150px] h-8 text-xs" value={config.effects.background.imageUrl || ''} onChange={(e) => update('effects.background.imageUrl', e.target.value)} placeholder="https://…" /></Row>
            )}
            {config.effects.background.type === 'gradient' && (() => {
              const g = config.effects.background.gradient ?? { enabled: true, from: config.theme.tokens.secondary, to: config.theme.tokens.accent, angle: 135 };
              const setG = (patch: Partial<typeof g>) => update('effects.background.gradient', { ...g, enabled: true, ...patch });
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              <SliderRow label="Brightness" value={config.effects.background.brightness ?? 100} min={50} max={150} unit="%" onChange={(v) => update('effects.background.brightness', v)} />
              <SliderRow label="Overlay" value={config.effects.background.overlay ?? 0} min={0} max={80} unit="%" onChange={(v) => update('effects.background.overlay', v)} />
            </div>
          </div>
        );

      case 'parts':
        return (
          <div>
            {grid('Product card', 'productCard', config.components.productCard, ['classic', 'overlay', 'minimal', 'editorial', 'compact', 'polaroid'], (v) => update('components.productCard', v))}
            {grid('Button', 'button', config.components.button, ['solid', 'outline', 'soft', 'gradient'], (v) => update('components.button', v), 4)}
            {grid('Badges', 'badge', config.components.badge, ['solid', 'soft', 'outline'], (v) => update('components.badge', v))}
            {grid('Cart', 'cart', config.components.cart, ['drawer', 'modal', 'page'], (v) => update('components.cart', v))}
            {grid('Product gallery', 'gallery', config.components.productGalleryLayout, [{ value: 'left', label: 'Left' }, { value: 'top', label: 'Top' }, { value: 'sticky-split', label: 'Sticky split' }, { value: 'full-bleed', label: 'Full bleed' }], (v) => update('components.productGalleryLayout', v), 4)}
            {grid('Section headings', 'sectionHeader', config.layout.sectionHeader ?? 'centered', [
              { value: 'centered', label: 'Centered' },
              { value: 'left', label: 'Eyebrow left' },
              { value: 'editorial', label: 'Editorial rule' },
            ], (v) => update('layout.sectionHeader', v))}
            <Sub>Spacing</Sub>
            {grid('Container width', 'container', config.layout.containerWidth, ['compact', 'standard', 'wide', 'full'], (v) => update('layout.containerWidth', v), 4)}
            {grid('Density', 'density', config.layout.density, ['comfortable', 'cozy', 'spacious'], (v) => update('layout.density', v))}
            {grid('Grid columns', 'gridColumns', String(config.layout.productGrid.columns), [{ value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }], (v) => update('layout.productGrid.columns', Number(v)), 4)}
          </div>
        );

      case 'nav':
        return (
          <div>
            <Sub>Header</Sub>
            {grid('Header style', 'header', config.layout.header.variant, ['classic', 'minimal', 'centered', 'split'], (v) => update('layout.header.variant', v), 4)}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
              <SwitchRow label="Sticky header" checked={config.layout.header.sticky} onChange={(v) => update('layout.header.sticky', v)} />
              <SwitchRow label="Header blur" checked={config.layout.header.blur} onChange={(v) => update('layout.header.blur', v)} />
              <SwitchRow label="Show search" checked={config.layout.header.showSearch} onChange={(v) => update('layout.header.showSearch', v)} />
              <SegmentRow label="Desktop nav" value={config.layout.nav.desktop} onChange={(v) => update('layout.nav.desktop', v)} options={opts(['topbar', 'sidebar'])} />
            </div>
            <Sub>Hero</Sub>
            {grid('Hero style', 'hero', heroVariant, heroVariantOptions, setHeroVariant, 4)}
            <Sub>Announcement banner</Sub>
            {grid('Banner style', 'banner', config.layout.banner?.style || 'marquee', ['marquee', 'static', 'gradient'], (v) => update('layout.banner.style', v))}
            <Sub>Mobile bottom bar</Sub>
            <SwitchRow label="Show bottom bar" checked={config.layout.nav.mobileBottomBar} onChange={(v) => update('layout.nav.mobileBottomBar', v)} />
            {config.layout.nav.mobileBottomBar && grid('Bottom bar style', 'bottomBarStyle', config.layout.nav.bottomBarStyle || 'bar', ['bar', 'floating', 'minimal'], (v) => update('layout.nav.bottomBarStyle', v))}
            <Sub>Footer</Sub>
            {grid('Footer style', 'footer', config.layout.footer.variant, ['rich', 'columns', 'minimal', 'hidden'], (v) => update('layout.footer.variant', v), 4)}
          </div>
        );

      case 'sections': {
        const addableBlocks = Object.entries(BLOCK_REGISTRY).filter(([, def]) => def.scope === 'home' || def.scope === 'both');
        const addableDetailBlocks = Object.entries(BLOCK_REGISTRY).filter(([, def]) => def.scope === 'productDetail' || def.scope === 'both');
        const detail = config.pages.productDetail;
        return (
          <div>
            <Sub>Homepage sections</Sub>
            <p className="text-[11px] text-muted-foreground mb-2">Drag to reorder. Expand a section to pick its layout style and edit its content.</p>
            <SectionList
              sections={home}
              onChange={(next) => update('pages.home', next)}
              onRemove={(i) => removeSection(i)}
            />
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
            <Sub>Product page sections</Sub>
            <p className="text-[11px] text-muted-foreground mb-2">The gallery and info blocks sit side by side on desktop; the rest render below.</p>
            <SectionList
              sections={detail}
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
            <Sub>Products page</Sub>
            {grid('Filters', 'filters', config.pages.products.filters, ['sidebar', 'drawer', 'topbar'], (v) => update('pages.products.filters', v))}
            {grid('Layout', 'productsLayout', config.pages.products.layout, ['grid', 'list'], (v) => update('pages.products.layout', v), 2)}
          </div>
        );
      }

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Storefront style</CardTitle>
            <CardDescription>Choose what visitors see when they open your shop link.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <TypeCard value="instagram" icon={Instagram} title="Instagram style" desc="Looks exactly like Instagram. Fixed design." />
            <TypeCard value="custom" icon={Palette} title="Custom design" desc="Fully customisable — layout, colors, fonts and more." />
          </CardContent>
        </Card>

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
          {/* Template shelf — live homepage renders, click to apply. */}
          <TemplateMarquee
            activeTemplateId={config.templateId}
            onPick={(c, id) => setPendingTemplate({ config: c, id })}
          />

          {/* ── Studio workspace: control rail + docked live preview ─────── */}
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

            {/* Rail + preview */}
            <div className="grid lg:grid-cols-[380px_minmax(0,1fr)]">
              <div className="max-h-[520px] overflow-y-auto border-b lg:max-h-[calc(100vh-280px)] lg:min-h-[560px] lg:border-b-0 lg:border-r">
                <Accordion type="multiple" defaultValue={['colors']} className="px-3 py-1">
                  {GROUPS.map((g) => {
                    const Icon = g.icon;
                    return (
                      <AccordionItem key={g.id} value={g.id} className="border-b last:border-b-0">
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
              <div className="p-3">
                <DockedPreview
                  previewPath={previewPath}
                  previewUrl={previewUrl}
                  config={config}
                  navTarget={navTarget}
                  className="h-[480px] lg:h-[calc(100vh-304px)] lg:min-h-[536px]"
                />
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* Save-as-template dialog (toolbar bookmark button). */}
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
