// Tiny wireframe illustrations for every Storefront Studio option, so each
// choice SHOWS what it does at a glance (layout, colours, corners, badges,
// shadows, animation, …). All CSS/div based, theme-token coloured, ~h-9.

import { cn } from '@/lib/utils';

const Frame = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn('relative h-9 w-full overflow-hidden rounded-md bg-muted/60 ring-1 ring-inset ring-border/60', className)}>
    {children}
  </div>
);

const Bar = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn('rounded-[2px] bg-foreground/25', className)} style={style} />
);

/** A tiny "product card" tile used inside grid/shop/cards glyphs. */
const Tile = ({ className }: { className?: string }) => (
  <div className={cn('rounded-[2px] bg-foreground/20', className)} />
);

export function Glyph({ kind, value }: { kind: string; value: string | number }) {
  const v = String(value);

  switch (kind) {
    case 'corners': {
      const r = v === 'sharp' ? '0px' : v === 'soft' ? '3px' : v === 'round' ? '8px' : '999px';
      return <Frame><div className="absolute inset-[7px] border-2 border-primary bg-primary/10" style={{ borderRadius: r }} /></Frame>;
    }

    case 'mode':
      return (
        <Frame className={v === 'dark' ? 'bg-zinc-800 ring-zinc-700' : v === 'auto' ? '' : ''}>
          {v === 'auto'
            ? <><div className="absolute inset-y-0 left-0 w-1/2 bg-background" /><div className="absolute inset-y-0 right-0 w-1/2 bg-zinc-800" /><div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" /></>
            : <div className={cn('absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full', v === 'dark' ? 'bg-zinc-500' : 'bg-amber-400')} />}
        </Frame>
      );

    case 'hero':
      return (
        <Frame>
          {v === 'banner' && <><Bar className="absolute inset-x-1 top-1 h-1" /><div className="absolute inset-x-1.5 top-3 bottom-1.5 rounded-[2px] bg-primary/40" /></>}
          {v === 'split' && <><div className="absolute left-1.5 top-2 bottom-2 w-1/2 space-y-1"><Bar className="h-1 w-4/5" /><Bar className="h-1 w-2/3" /></div><div className="absolute right-1.5 top-1.5 bottom-1.5 w-2/5 rounded-[2px] bg-primary/40" /></>}
          {v === 'minimal' && <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 space-y-1"><Bar className="mx-auto h-1 w-3/4" /><Bar className="mx-auto h-1 w-1/2" /></div>}
          {v === 'full' && <div className="absolute inset-1 rounded-[2px] bg-primary/45" />}
          {v === 'gradient' && <div className="absolute inset-1 rounded-[2px]" style={{ background: 'linear-gradient(120deg, hsl(var(--primary)), hsl(var(--accent)))', opacity: .7 }} />}
        </Frame>
      );

    case 'navbar':
      return (
        <Frame>
          <div className="absolute inset-x-1 top-1 flex h-2 items-center rounded-[2px] bg-foreground/10 px-1">
            {v === 'minimal' && <Bar className="h-1 w-3" />}
            {v === 'centered' && <div className="mx-auto flex items-center gap-1"><Bar className="h-1 w-2" /><div className="h-1.5 w-1.5 rounded-full bg-primary" /><Bar className="h-1 w-2" /></div>}
            {v === 'split' && <><Bar className="h-1 w-3" /><Bar className="ml-auto h-1 w-3" /></>}
            {v === 'classic' && <><div className="h-1.5 w-1.5 rounded-full bg-primary" /><Bar className="ml-1 h-1 w-2" /><Bar className="ml-auto h-1 w-4" /></>}
          </div>
          <div className="absolute inset-x-1.5 bottom-1 top-4 rounded-[2px] bg-foreground/10" />
        </Frame>
      );

    case 'presentation': // navbar style
      return (
        <Frame>
          {v === 'bar' && <div className="absolute inset-x-0 top-0 h-2.5 bg-primary/40" />}
          {v === 'floating' && <div className="absolute inset-x-2 top-1.5 h-2.5 rounded-full bg-primary/40 shadow" />}
          {v === 'minimal' && <div className="absolute inset-x-2 top-2 flex justify-between"><Bar className="h-1 w-2" /><Bar className="h-1 w-4" /></div>}
          <div className="absolute inset-x-1.5 bottom-1 top-5 rounded-[2px] bg-foreground/10" />
        </Frame>
      );

    case 'banner':
      return (
        <Frame>
          {v === 'marquee' && <div className="absolute inset-x-0 top-2.5 flex h-2 items-center gap-1 overflow-hidden px-1"><Bar className="h-1 w-6" /><Bar className="h-1 w-4" /><Bar className="h-1 w-8" /><Bar className="h-1 w-3" /></div>}
          {v === 'static' && <div className="absolute inset-x-0 top-3 h-2 bg-primary/20"><Bar className="mx-auto mt-0.5 h-1 w-8" /></div>}
          {v === 'gradient' && <div className="absolute inset-x-0 top-2.5 h-2.5" style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))', opacity: .7 }} />}
        </Frame>
      );

    case 'nav':
      return (
        <Frame>
          {v === 'topbar'
            ? <><div className="absolute inset-x-0 top-0 h-2 bg-primary/40" /><div className="absolute inset-x-1.5 bottom-1 top-3 rounded-[2px] bg-foreground/10" /></>
            : <><div className="absolute inset-y-0 left-0 w-2.5 bg-primary/40" /><div className="absolute inset-y-1.5 left-4 right-1.5 rounded-[2px] bg-foreground/10" /></>}
        </Frame>
      );

    case 'footer':
      return (
        <Frame>
          <div className="absolute inset-x-1.5 top-1 bottom-4 rounded-[2px] bg-foreground/10" />
          {v === 'rich' && <div className="absolute inset-x-1.5 bottom-1 flex h-2.5 gap-1"><div className="flex-1 space-y-0.5"><Bar className="h-0.5 w-full" /><Bar className="h-0.5 w-2/3" /></div><div className="flex-1 space-y-0.5"><Bar className="h-0.5 w-full" /><Bar className="h-0.5 w-1/2" /></div><div className="flex-1 space-y-0.5"><Bar className="h-0.5 w-2/3" /><Bar className="h-0.5 w-full" /></div></div>}
          {v === 'columns' && <div className="absolute inset-x-1.5 bottom-1 flex h-2.5 gap-1"><Bar className="h-full flex-1" /><Bar className="h-full flex-1" /><Bar className="h-full flex-1" /></div>}
          {v === 'minimal' && <Bar className="absolute inset-x-3 bottom-1.5 h-1" />}
          {v === 'hidden' && <div className="absolute inset-x-3 bottom-1.5 h-1 border-t border-dashed border-foreground/30" />}
        </Frame>
      );

    case 'shop':
      return (
        <Frame>
          {v === 'grid'
            ? <div className="absolute inset-1.5 grid grid-cols-3 gap-1">{Array.from({ length: 6 }).map((_, i) => <Tile key={i} />)}</div>
            : <div className="absolute inset-1.5 space-y-1">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex gap-1"><Tile className="h-2 w-2 shrink-0" /><Bar className="mt-0.5 h-1 flex-1" /></div>)}</div>}
        </Frame>
      );

    case 'grid': {
      const n = Number(value);
      return <Frame><div className="absolute inset-1.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>{Array.from({ length: n }).map((_, i) => <Tile key={i} className="h-full" />)}</div></Frame>;
    }

    case 'gallery':
      return (
        <Frame>
          {v === 'left' && <><Tile className="absolute left-1.5 top-1.5 bottom-1.5 w-1/2" /><div className="absolute right-1.5 top-2 bottom-2 w-2/5 space-y-1"><Bar className="h-1 w-full" /><Bar className="h-1 w-2/3" /><Bar className="h-1.5 w-1/2 bg-primary/50" /></div></>}
          {v === 'top' && <><Tile className="absolute inset-x-1.5 top-1.5 h-4" /><div className="absolute inset-x-3 bottom-1.5 space-y-0.5"><Bar className="h-1 w-full" /><Bar className="h-1 w-1/2 bg-primary/50" /></div></>}
          {v === 'sticky-split' && <><Tile className="absolute left-1.5 top-1.5 bottom-1.5 w-1/2" /><div className="absolute right-1.5 top-2 bottom-2 w-2/5 rounded-[2px] bg-foreground/10 ring-1 ring-primary/40" /></>}
          {v === 'full-bleed' && <Tile className="absolute inset-1" />}
        </Frame>
      );

    case 'cart':
      return (
        <Frame>
          <div className="absolute inset-1.5 rounded-[2px] bg-foreground/10" />
          {v === 'drawer' && <div className="absolute inset-y-1 right-1 w-1/3 rounded-[2px] bg-primary/40 shadow" />}
          {v === 'modal' && <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-primary/40 shadow" />}
          {v === 'page' && <div className="absolute inset-1.5 rounded-[2px] bg-primary/30"><Bar className="absolute inset-x-2 top-2 h-1" /></div>}
        </Frame>
      );

    case 'cards':
      return (
        <Frame>
          {(v === 'classic' || v === 'minimal') && <div className="absolute inset-x-2 inset-y-1.5"><Tile className="h-4 w-full" /><Bar className={cn('mt-1 h-1', v === 'minimal' ? 'w-1/2' : 'w-2/3')} /></div>}
          {v === 'overlay' && <div className="absolute inset-x-2 inset-y-1.5"><Tile className="h-full w-full" /><Bar className="absolute inset-x-1 bottom-1 h-1 w-2/3 bg-background/80" /></div>}
          {v === 'editorial' && <div className="absolute inset-x-2.5 inset-y-1"><Tile className="h-4 w-full" /><Bar className="mt-1 h-0.5 w-1/3" /><Bar className="mt-0.5 h-1 w-3/4" /></div>}
          {v === 'compact' && <div className="absolute inset-x-2 top-1/2 flex -translate-y-1/2 items-center gap-1"><Tile className="h-3.5 w-3.5" /><div className="space-y-0.5"><Bar className="h-1 w-6" /><Bar className="h-1 w-4" /></div></div>}
          {v === 'polaroid' && <div className="absolute inset-x-3 inset-y-1 bg-card p-1 shadow"><Tile className="h-3.5 w-full" /><Bar className="mx-auto mt-0.5 h-1 w-2/3" /></div>}
          {v === 'frame' && <div className="absolute inset-2 border border-foreground/30 p-0.5"><Tile className="h-full w-full" /></div>}
          {v === 'ticket' && <div className="absolute inset-x-3 inset-y-1"><Tile className="h-3.5 w-full" /><div className="mt-0.5 border-t border-dashed border-foreground/30" /><Bar className="mt-0.5 h-1 w-1/2" /></div>}
        </Frame>
      );

    case 'buttons':
      return (
        <Frame>
          <div className={cn(
            'absolute left-1/2 top-1/2 flex h-4 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
            v === 'solid' && 'bg-primary',
            v === 'outline' && 'border-2 border-primary',
            v === 'soft' && 'bg-primary/20',
          )} style={v === 'gradient' ? { background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))' } : undefined}>
            <span className={cn('h-1 w-6 rounded-full', v === 'outline' || v === 'soft' ? 'bg-primary' : 'bg-primary-foreground')} />
          </div>
        </Frame>
      );

    case 'buttonShape': {
      const r = v === 'sharp' ? '0px' : v === 'pill' ? '999px' : '5px';
      return <Frame><div className="absolute left-1/2 top-1/2 h-4 w-14 -translate-x-1/2 -translate-y-1/2 bg-primary" style={{ borderRadius: r }} /></Frame>;
    }

    case 'badges':
      return (
        <Frame>
          <div className={cn(
            'absolute left-1/2 top-1/2 h-3 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full',
            v === 'solid' && 'bg-primary',
            v === 'soft' && 'bg-primary/20',
            v === 'outline' && 'border border-primary',
          )} />
        </Frame>
      );

    case 'shadows': {
      const shadow = v === 'none' ? 'none'
        : v === 'sm' ? '0 1px 2px rgba(0,0,0,.2)'
        : v === 'md' ? '0 3px 8px rgba(0,0,0,.25)'
        : v === 'lg' ? '0 6px 14px rgba(0,0,0,.3)'
        : '0 10px 20px -4px rgba(0,0,0,.4)';
      return <Frame><div className="absolute left-1/2 top-1/2 h-5 w-8 -translate-x-1/2 -translate-y-1/2 rounded bg-card" style={{ boxShadow: shadow }} /></Frame>;
    }

    case 'spacing': { // density: comfortable/cozy/spacious
      const gap = v === 'cozy' ? '1px' : v === 'spacious' ? '4px' : '2.5px';
      return <Frame><div className="absolute inset-1.5 flex flex-col justify-center" style={{ gap }}>{Array.from({ length: 3 }).map((_, i) => <Bar key={i} className="h-1.5 w-full" />)}</div></Frame>;
    }

    case 'motion':
      return (
        <Frame>
          {v === 'none' && <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded bg-primary/50" />}
          {v !== 'none' && (
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2" style={{ left: v === 'subtle' ? '35%' : v === 'standard' ? '40%' : '45%' }}>
              <div className="flex items-center gap-0.5">
                {v === 'expressive' && <span className="h-0.5 w-1 rounded bg-primary/20" />}
                {v !== 'subtle' && <span className="h-1 w-1.5 rounded bg-primary/40" />}
                <span className="h-1 w-2 rounded bg-primary/60" />
                <div className="h-3 w-3 rounded bg-primary" />
              </div>
            </div>
          )}
        </Frame>
      );

    default:
      return <Frame />;
  }
}
