// Tiny rendered demos for each design option, themed by the live storefront
// tokens (the wrapping OptionGrid applies the token CSS vars). Each returns a
// compact visual (~h-14) that conveys the option at a glance.

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const box = 'bg-card border';
const dot = 'bg-primary';

const Tiles = ({ n, h = 'h-5' }: { n: number; h?: string }) => (
  <div className="grid gap-1 w-full" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
    {Array.from({ length: n }).map((_, i) => <div key={i} className={cn(box, h)} style={{ borderRadius: 'var(--radius-sm)' }} />)}
  </div>
);

const HeaderBar = ({ kind }: { kind: 'classic' | 'minimal' | 'centered' | 'split' }) => (
  <div className="flex items-center justify-between h-4 w-full px-1 bg-card border rounded-sm">
    {kind === 'centered' ? (<><div className="h-1 w-3 bg-muted-foreground/40 rounded-full" /><div className={cn('h-1.5 w-6 rounded-full', dot)} /><div className="h-1 w-3 bg-muted-foreground/40 rounded-full" /></>)
      : kind === 'minimal' ? (<><div className={cn('h-1.5 w-5 rounded-full', dot)} /><div className="h-1 w-3 bg-muted-foreground/40 rounded-full" /></>)
      : kind === 'split' ? (<><div className={cn('h-1.5 w-5 rounded-full', dot)} /><div className="flex gap-1"><span className="h-1 w-2 bg-muted-foreground/40 rounded-full" /><span className="h-1 w-2 bg-muted-foreground/40 rounded-full" /></div><div className="h-1 w-2 bg-muted-foreground/40 rounded-full" /></>)
      : (<><div className={cn('h-1.5 w-5 rounded-full', dot)} /><div className="flex gap-1"><span className="h-1 w-2 bg-muted-foreground/40 rounded-full" /><span className="h-1 w-2 bg-muted-foreground/40 rounded-full" /><span className="h-1 w-2 bg-muted-foreground/40 rounded-full" /></div><div className="h-1 w-2 bg-muted-foreground/40 rounded-full" /></>)}
  </div>
);

export const Demo = ({ kind, value }: { kind: string; value: string }) => {
  const { t } = useTranslation();
  const r = { borderRadius: 'var(--radius-sm)' };
  switch (kind) {
    // ── Hero ──
    case 'hero': {
      if (value === 'split') return <div className="flex gap-1 w-full h-12"><div className="flex-1 flex flex-col justify-center gap-1 p-1"><div className="h-1.5 w-3/4 bg-foreground/30 rounded-full" /><div className={cn('h-2 w-6 mt-0.5', dot)} style={r} /></div><div className="flex-1 bg-primary" style={r} /></div>;
      if (value === 'minimal') return <div className="flex flex-col items-center justify-center gap-1 h-12"><div className="h-2 w-12 bg-foreground/40 rounded-full" /><div className={cn('h-2 w-7', dot)} style={r} /></div>;
      const tall = value === 'full' ? 'h-12' : value === 'compact' ? 'h-6' : 'h-10';
      const bg = value === 'gradient' ? 'bg-gradient-to-br from-primary to-accent' : 'bg-primary';
      return <div className={cn('w-full flex flex-col items-center justify-center gap-1 text-primary-foreground', tall, bg)} style={r}><div className="h-1.5 w-12 bg-current opacity-90 rounded-full" />{value !== 'compact' && <div className="h-2 w-7 bg-current opacity-60 rounded-sm" />}</div>;
    }
    // ── Header ──
    case 'header': return <div className="w-full flex flex-col gap-1"><HeaderBar kind={value as any} /><Tiles n={3} h="h-4" /></div>;
    // ── Bottom nav ──
    case 'bottomBarStyle': {
      const inner = <div className="flex justify-around items-center h-4 bg-card border">{[0,1,2,3].map(i => <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i===0?dot:'bg-muted-foreground/40')} />)}</div>;
      if (value === 'floating') return <div className="w-full h-12 relative bg-muted/40" style={r}><div className="absolute bottom-1 inset-x-1 rounded-full overflow-hidden">{inner}</div></div>;
      if (value === 'minimal') return <div className="w-full h-12 relative bg-muted/40" style={r}><div className="absolute bottom-0 inset-x-0 flex justify-around items-center h-3 bg-card border-t">{[0,1,2,3].map(i=><span key={i} className={cn('h-1 w-1 rounded-full', i===0?dot:'bg-muted-foreground/40')} />)}</div></div>;
      return <div className="w-full h-12 relative bg-muted/40" style={r}><div className="absolute bottom-0 inset-x-0">{inner}</div></div>;
    }
    // ── Banner ──
    case 'banner': {
      if (value === 'gradient') return <div className="w-full h-5 flex items-center justify-center bg-gradient-to-r from-primary to-accent" style={r}><div className="h-1.5 w-16 bg-primary-foreground/80 rounded-full" /></div>;
      if (value === 'static') return <div className="w-full h-5 flex items-center justify-center gap-2 bg-primary/10 border-y border-primary/20">{[0,1,2].map(i=><span key={i} className="h-1.5 w-6 bg-primary/60 rounded-full" />)}</div>;
      return <div className="w-full h-5 flex items-center gap-2 px-1 overflow-hidden bg-primary/10 border-y border-primary/20">{[0,1,2,3,4].map(i=><span key={i} className="h-1.5 w-6 bg-primary/50 rounded-full shrink-0" />)}</div>;
    }
    // ── Footer ──
    case 'footer': {
      const h = value === 'hidden' ? 'h-0' : value === 'minimal' ? 'h-3' : value === 'columns' ? 'h-7' : 'h-9';
      return <div className="w-full flex flex-col justify-end h-12"><Tiles n={3} h="h-3" /><div className={cn('mt-1 bg-muted border-t', h)} /></div>;
    }
    // ── Product card ──
    case 'productCard': {
      if (value === 'overlay') return <div className="w-16 relative bg-primary h-16" style={r}><div className="absolute inset-x-0 bottom-0 p-1"><div className="h-1.5 w-3/4 bg-primary-foreground/80 rounded-full" /></div></div>;
      if (value === 'minimal') return <div className="w-16"><div className="bg-card border h-12" style={r} /><div className="h-1.5 w-3/4 bg-foreground/30 rounded-full mt-1" /></div>;
      if (value === 'compact') return <div className="w-full flex items-center gap-1 bg-card border p-1" style={r}><div className="h-7 w-7 bg-muted shrink-0" style={r} /><div className="flex-1 space-y-1"><div className="h-1.5 w-3/4 bg-foreground/30 rounded-full" /><div className={cn('h-1.5 w-1/3', dot)} style={{borderRadius:99}} /></div></div>;
      if (value === 'polaroid') return <div className="w-16 bg-white p-1 pb-2 shadow"><div className="bg-muted h-10" /><div className="h-1 w-3/4 bg-zinc-400 rounded-full mx-auto mt-1" /></div>;
      if (value === 'editorial') return <div className="w-14"><div className="bg-muted h-12" style={r} /><div className="h-1 w-8 bg-foreground/40 rounded-full mt-1" /><div className="h-1.5 w-10 bg-foreground/25 rounded-full mt-0.5" /></div>;
      return <div className="w-16 bg-card border overflow-hidden" style={r}><div className="bg-muted h-10" /><div className="p-1 space-y-1"><div className="h-1.5 w-3/4 bg-foreground/30 rounded-full" /><div className={cn('h-1.5 w-1/3', dot)} style={{borderRadius:99}} /></div></div>;
    }
    // ── Cart ──
    case 'cart': {
      const items = <div className="space-y-1 p-1">{[0,1].map(i=><div key={i} className="flex gap-1 items-center"><div className="h-3 w-3 bg-muted" style={{borderRadius:2}}/><div className="h-1.5 flex-1 bg-foreground/20 rounded-full" /></div>)}</div>;
      if (value === 'modal') return <div className="w-full h-12 relative bg-muted/40 flex items-center justify-center" style={r}><div className="w-10 bg-card border shadow" style={r}>{items}</div></div>;
      if (value === 'page') return <div className="w-full h-12 bg-card border" style={r}>{items}</div>;
      return <div className="w-full h-12 relative bg-muted/40 overflow-hidden" style={r}><div className="absolute right-0 top-0 bottom-0 w-8 bg-card border-l shadow">{items}</div></div>;
    }
    // ── Gallery layout ──
    case 'gallery': {
      if (value === 'top') return <div className="w-full space-y-1"><div className="bg-muted h-7 w-full" style={r} /><div className="space-y-1"><div className="h-1.5 w-3/4 bg-foreground/30 rounded-full" /><div className={cn('h-2 w-6', dot)} style={r} /></div></div>;
      if (value === 'full-bleed') return <div className="bg-muted h-12 w-full" style={r} />;
      return <div className="w-full flex gap-1 h-12"><div className="flex-1 bg-muted" style={r} /><div className="flex-1 space-y-1 py-1"><div className="h-1.5 w-3/4 bg-foreground/30 rounded-full" /><div className="h-1 w-1/2 bg-foreground/20 rounded-full" /><div className={cn('h-2 w-6 mt-1', dot, value==='sticky-split' && 'opacity-100')} style={r} /></div></div>;
    }
    // ── Corners ──
    case 'corners': {
      const rad = value === 'pill' ? 999 : value === 'round' ? 12 : value === 'soft' ? 6 : 0;
      return <div className="bg-primary h-10 w-10" style={{ borderRadius: rad }} />;
    }
    // ── Shadow ──
    case 'shadow': {
      const sh = value === 'none' ? 'none' : value === 'sm' ? '0 1px 3px rgba(0,0,0,.2)' : value === 'md' ? '0 4px 10px rgba(0,0,0,.18)' : value === 'lg' ? '0 10px 22px rgba(0,0,0,.22)' : '0 18px 34px rgba(0,0,0,.28)';
      return <div className="bg-card border h-10 w-10" style={{ borderRadius: 'var(--radius-sm)', boxShadow: sh }} />;
    }
    // ── Density ──
    case 'density': {
      const gap = value === 'spacious' ? 'gap-2' : value === 'cozy' ? 'gap-0.5' : 'gap-1';
      return <div className={cn('flex flex-col w-full', gap)}>{[0,1,2].map(i=><div key={i} className="h-2 bg-card border rounded-sm" />)}</div>;
    }
    // ── Container width ──
    case 'container': {
      const w = value === 'compact' ? 'w-1/2' : value === 'standard' ? 'w-2/3' : value === 'wide' ? 'w-5/6' : 'w-full';
      return <div className="w-full flex justify-center"><div className={cn('h-10 bg-card border', w)} style={r} /></div>;
    }
    // ── Grid columns ──
    case 'gridColumns': return <Tiles n={Number(value)} h="h-7" />;
    // ── Button ──
    case 'button': {
      if (value === 'outline') return <div className="h-6 w-16 border-2 border-primary text-primary flex items-center justify-center" style={r}><span className="h-1.5 w-8 bg-primary rounded-full" /></div>;
      if (value === 'soft') return <div className="h-6 w-16 bg-primary/15 flex items-center justify-center" style={r}><span className="h-1.5 w-8 bg-primary rounded-full" /></div>;
      if (value === 'gradient') return <div className="h-6 w-16 bg-gradient-to-r from-primary to-accent flex items-center justify-center" style={r}><span className="h-1.5 w-8 bg-primary-foreground/80 rounded-full" /></div>;
      return <div className="h-6 w-16 bg-primary flex items-center justify-center" style={r}><span className="h-1.5 w-8 bg-primary-foreground/80 rounded-full" /></div>;
    }
    // ── Badge ──
    case 'badge': {
      if (value === 'outline') return <div className="h-4 w-12 border border-primary text-primary rounded-full" />;
      if (value === 'soft') return <div className="h-4 w-12 bg-primary/15 rounded-full" />;
      return <div className="h-4 w-12 bg-primary rounded-full" />;
    }
    // ── Simple two/three-way layout choices ──
    case 'productsLayout': return value === 'list'
      ? <div className="w-full space-y-1">{[0,1,2].map(i=><div key={i} className="h-2.5 bg-card border rounded-sm" />)}</div>
      : <Tiles n={3} h="h-5" />;
    case 'filters': {
      if (value === 'sidebar') return <div className="w-full flex gap-1 h-12"><div className="w-4 bg-card border" style={r} /><div className="flex-1"><Tiles n={2} h="h-5" /></div></div>;
      if (value === 'drawer') return <div className="w-full h-12 relative bg-muted/40" style={r}><div className="absolute left-0 top-0 bottom-0 w-4 bg-card border-r" /><div className="pl-5 pt-1"><Tiles n={2} h="h-4" /></div></div>;
      return <div className="w-full space-y-1"><div className="h-2.5 bg-card border rounded-sm" /><Tiles n={3} h="h-4" /></div>;
    }
    case 'ordersStyle': return value === 'table'
      ? <div className="w-full space-y-0.5">{[0,1,2,3].map(i=><div key={i} className="h-2 bg-card border-b" />)}</div>
      : <div className="w-full space-y-1">{[0,1].map(i=><div key={i} className="h-4 bg-card border rounded-sm" />)}</div>;
    case 'mode': return <div className={cn('h-10 w-full flex items-center justify-center', value==='dark'?'bg-zinc-900':value==='light'?'bg-zinc-50 border':'bg-gradient-to-r from-zinc-50 to-zinc-900')} style={r}><span className={cn('h-2 w-8 rounded-full', value==='dark'?'bg-zinc-100':'bg-zinc-800')} /></div>;
    case 'motion': return <div className="w-full flex items-center justify-center gap-1 h-10">{[0,1,2].map(i=><span key={i} className={cn('bg-primary rounded-full', value==='none'?'h-1.5 w-1.5':value==='subtle'?'h-2 w-1.5':value==='standard'?'h-3 w-1.5':'h-4 w-1.5')} style={{transitionDelay:`${i*60}ms`}} />)}</div>;
    case 'headingCase': return <div className="h-10 flex items-center justify-center"><span className={cn('text-xs font-bold', value==='uppercase'&&'uppercase', value==='capitalize'&&'capitalize')}>{t('studio_panels.demo_title')}</span></div>;
    default: return <div className="h-10 flex items-center justify-center text-[10px] text-muted-foreground capitalize">{value}</div>;
  }
};
