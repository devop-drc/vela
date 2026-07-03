// Layout selector — wireframe thumbnails of structural presets. Clicking applies
// the structure (arrangement) while keeping the merchant's colors/fonts/effects.

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAYOUT_PRESETS, LayoutPreset } from '../layouts';
import { LayoutWireframe } from './LayoutWireframe';

interface Props {
  activeId?: string | null;
  onApply: (preset: LayoutPreset) => void;
}

export const LayoutSelector = ({ activeId, onApply }: Props) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {LAYOUT_PRESETS.map((l) => {
      const active = activeId === l.id;
      return (
        <button
          key={l.id}
          type="button"
          onClick={() => onApply(l)}
          className={cn(
            'group text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-md',
            active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
          )}
        >
          {/* 16:9 desktop wireframe with a 9:16 mobile inset */}
          <div className="relative bg-zinc-100" style={{ aspectRatio: '16 / 9' }}>
            <LayoutWireframe structure={l.structure} device="desktop" className="absolute inset-0 h-full w-full" />
            <div className="absolute bottom-1.5 right-1.5 h-[72%] rounded-[4px] overflow-hidden border-2 border-white/90 shadow-md bg-white" style={{ aspectRatio: '9 / 16' }}>
              <LayoutWireframe structure={l.structure} device="mobile" className="h-full w-full" />
            </div>
            {active && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-10">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="text-sm font-semibold leading-tight">{l.name}</p>
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{l.description}</p>
          </div>
        </button>
      );
    })}
  </div>
);
