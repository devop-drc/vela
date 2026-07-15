// A small, accurate template thumbnail rendered through the REAL token engine
// (StorefrontThemeProvider) so the preview can never drift from the live look.
// Uses a self-contained representative composition (no data context needed).

import { StorefrontConfig } from '../config/types';
import { buildTokens, resolveMode } from '../config/tokens';
import { cn } from '@/lib/utils';

interface Props {
  config: StorefrontConfig;
  className?: string;
  device?: 'desktop' | 'mobile';
}

const Tile = () => (
  <div className="sf-glass overflow-hidden">
    <div className="aspect-square bg-muted" style={{ background: 'hsl(var(--accent))' }} />
    <div className="p-1.5">
      <div className="h-1.5 w-3/4 rounded-full bg-foreground/20 mb-1" />
      <div className="h-1.5 w-1/3 rounded-full bg-primary/60" />
    </div>
  </div>
);

export const TemplatePreview = ({ config, className, device = 'desktop' }: Props) => {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const tokens = buildTokens(config, prefersDark);
  const mode = resolveMode(config, prefersDark);
  const cols = device === 'mobile' ? 2 : 3;

  return (
    <div
      className={cn(tokens.classes, 'pointer-events-none select-none overflow-hidden', mode === 'dark' && 'dark', className)}
      style={tokens.vars as React.CSSProperties}
      {...tokens.attrs}
    >
      <div className="bg-background text-foreground h-full flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-3 h-7 border-b bg-card/80">
          <div className="h-2 w-12 rounded-full bg-foreground/70 sf-heading" />
          <div className="flex gap-1.5">
            <div className="h-1.5 w-6 rounded-full bg-foreground/25" />
            <div className="h-1.5 w-6 rounded-full bg-foreground/25" />
          </div>
        </div>
        {/* hero */}
        <div className="m-2 flex flex-col items-center justify-center text-center h-16 bg-primary text-primary-foreground" style={{ borderRadius: 'var(--sf-radius-card)' }}>
          <div className="h-2.5 w-20 rounded-full bg-current opacity-90 mb-1" />
          <div className="h-3 w-10 rounded-full bg-current opacity-60" style={{ borderRadius: 'var(--radius-full)' }} />
        </div>
        {/* product grid */}
        <div className="grid gap-1.5 px-2 pb-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols * 2 }).map((_, i) => <Tile key={i} />)}
        </div>
      </div>
    </div>
  );
};
