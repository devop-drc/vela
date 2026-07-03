// Grayscale structural wireframe of a layout preset — arrangement only, no
// colors/fonts/effects. Reads the preset's structural fields and draws neutral
// boxes so merchants compare STRUCTURE independent of styling.

import { StorefrontConfig, SectionInstance } from '../config/types';
import { cn } from '@/lib/utils';

interface Props {
  structure: Partial<StorefrontConfig>;
  className?: string;
  device?: 'desktop' | 'mobile';
}

const bar = 'bg-zinc-300 rounded-[2px]';
const tile = 'bg-zinc-200 rounded-[3px] border border-zinc-300/70';

export const LayoutWireframe = ({ structure, className, device = 'desktop' }: Props) => {
  const mobile = device === 'mobile';
  const headerVariant = structure.layout?.header?.variant ?? 'classic';
  // On mobile the desktop sidebar collapses; navigation is the bottom bar.
  const sidebar = !mobile && structure.layout?.nav?.desktop === 'sidebar';
  const bottomBar = mobile && (structure.layout?.nav?.mobileBottomBar ?? true);
  const cols = mobile ? 2 : (structure.layout?.productGrid?.columns ?? 4);
  const footerVariant = structure.layout?.footer?.variant ?? 'rich';
  const sections: SectionInstance[] = (structure.pages?.home as SectionInstance[]) || [];
  const heroVariant = sections.find((s) => s.type === 'hero')?.props?.variant ?? 'banner';
  const enabled = sections.filter((s) => s.enabled);

  const Header = (
    <div className="flex items-center justify-between h-4 px-1.5 border-b border-zinc-200 bg-zinc-50">
      {headerVariant === 'centered' ? (
        <>
          <div className={cn(bar, 'h-1 w-4')} />
          <div className={cn(bar, 'h-1.5 w-8')} />
          <div className={cn(bar, 'h-1 w-4')} />
        </>
      ) : headerVariant === 'minimal' ? (
        <>
          <div className={cn(bar, 'h-1.5 w-7')} />
          <div className={cn(bar, 'h-1 w-4')} />
        </>
      ) : (
        <>
          <div className={cn(bar, 'h-1.5 w-7')} />
          <div className="flex gap-1"><div className={cn(bar, 'h-1 w-3')} /><div className={cn(bar, 'h-1 w-3')} /><div className={cn(bar, 'h-1 w-3')} /></div>
          <div className={cn(bar, 'h-1 w-3')} />
        </>
      )}
    </div>
  );

  const Hero = () => {
    if (heroVariant === 'split') {
      return (
        <div className="flex gap-1.5 h-10">
          <div className="flex-1 flex flex-col justify-center gap-1 p-1.5 bg-zinc-100 rounded-[3px]"><div className={cn(bar, 'h-1.5 w-3/4')} /><div className={cn(bar, 'h-1 w-1/2')} /><div className="bg-zinc-400 rounded-[2px] h-2 w-8 mt-1" /></div>
          <div className="flex-1 bg-zinc-200 rounded-[3px] border border-zinc-300/70" />
        </div>
      );
    }
    const h = heroVariant === 'full' ? 'h-14' : heroVariant === 'compact' ? 'h-6' : 'h-10';
    return (
      <div className={cn('bg-zinc-200 border border-zinc-300/70 rounded-[3px] flex flex-col items-center justify-center gap-1', h)}>
        <div className={cn(bar, 'h-1.5 w-12')} />
        {heroVariant !== 'compact' && <div className={cn(bar, 'h-1 w-8')} />}
        <div className="bg-zinc-400 rounded-[2px] h-2 w-8 mt-0.5" />
      </div>
    );
  };

  const Row = (s: SectionInstance, i: number) => {
    if (s.type === 'announcementMarquee') return <div key={i} className={cn(bar, 'h-1.5 w-full')} />;
    if (s.type === 'viewAllCta') return <div key={i} className="flex justify-center"><div className="bg-zinc-400 rounded-[2px] h-2.5 w-12" /></div>;
    if (s.type === 'categoryGrid') {
      return <div key={i} className="grid grid-cols-4 gap-1">{Array.from({ length: 4 }).map((_, k) => <div key={k} className={cn(tile, 'h-5')} />)}</div>;
    }
    // product sections
    const grid = s.props?.display === 'grid';
    const n = grid ? Math.min(cols, 5) : 4;
    return (
      <div key={i} className="space-y-1">
        <div className={cn(bar, 'h-1 w-10')} />
        <div className={cn('grid gap-1', grid ? '' : 'grid-flow-col auto-cols-[22%]')} style={grid ? { gridTemplateColumns: `repeat(${n}, 1fr)` } : undefined}>
          {Array.from({ length: n }).map((_, k) => <div key={k} className={cn(tile, 'h-8')} />)}
        </div>
      </div>
    );
  };

  const Footer = (
    <div className={cn('bg-zinc-100 border-t border-zinc-200 mt-1', footerVariant === 'hidden' ? 'h-0' : footerVariant === 'minimal' ? 'h-2.5' : footerVariant === 'columns' ? 'h-7' : 'h-9')} />
  );

  const BottomBar = (
    <div className="flex items-center justify-around bg-zinc-50 border-t border-zinc-200 h-4 shrink-0">
      {Array.from({ length: 4 }).map((_, k) => <span key={k} className={cn('h-1.5 w-1.5 rounded-full', k === 0 ? 'bg-zinc-400' : 'bg-zinc-300')} />)}
    </div>
  );

  return (
    <div className={cn('bg-white text-zinc-400 overflow-hidden pointer-events-none select-none flex flex-col', className)}>
      {mobile ? (
        <div className="flex items-center justify-between h-4 px-1.5 border-b border-zinc-200 bg-zinc-50">
          <div className={cn(bar, 'h-1.5 w-7')} />
          <div className={cn(bar, 'h-1 w-4')} />
        </div>
      ) : Header}
      <div className="flex flex-1 min-h-0">
        {sidebar && (
          <div className="w-7 border-r border-zinc-200 bg-zinc-50 p-1 space-y-1.5 shrink-0">
            {Array.from({ length: 5 }).map((_, k) => <div key={k} className={cn(bar, 'h-1 w-full')} />)}
          </div>
        )}
        <div className="flex-1 min-w-0 p-1.5 space-y-1.5 overflow-hidden">
          <Hero />
          {enabled.filter((s) => s.type !== 'hero').slice(0, mobile ? 3 : 4).map(Row)}
        </div>
      </div>
      {Footer}
      {bottomBar && BottomBar}
    </div>
  );
};
