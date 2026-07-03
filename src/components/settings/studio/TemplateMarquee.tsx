// Auto-scrolling template shelf shown above the Studio workspace. Every card
// is the REAL storefront homepage (demo products) rendered live and scaled
// down; hovering pauses the marquee, clicking asks to apply the template.

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Marquee } from '@/components/ui/marquee';
import { TEMPLATES } from '@/storefront/templates';
import type { StorefrontConfig } from '@/storefront/config/types';
import { ScaledFrame } from './DockedPreview';

interface Props {
  activeTemplateId?: string | null;
  onPick: (config: StorefrontConfig, templateId: string) => void;
}

export const TemplateMarquee = ({ activeTemplateId, onPick }: Props) => (
  <div className="overflow-hidden rounded-xl border bg-card py-3">
    <div className="mb-2 flex items-baseline justify-between px-4">
      <p className="text-sm font-semibold">Templates</p>
      <p className="text-xs text-muted-foreground">Hover to pause · click to apply</p>
    </div>
    <Marquee pauseOnHover speed={28}>
      {TEMPLATES.map((t) => {
        const active = activeTemplateId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t.config, t.id)}
            className={cn(
              'group relative mx-2 w-60 shrink-0 overflow-hidden rounded-lg border-2 text-left transition-all hover:shadow-md',
              active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
            )}
          >
            <ScaledFrame src={`/demo-shop?template=${t.id}`} virtualW={1280} virtualH={760} title={`${t.name} template`} className="rounded-none border-0" />
            {active && (
              <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
            <div className="flex items-baseline justify-between gap-2 border-t bg-background/95 px-2.5 py-1.5">
              <span className="text-xs font-semibold">{t.name}</span>
              <span className="truncate text-[10px] text-muted-foreground">{t.businessType}</span>
            </div>
          </button>
        );
      })}
    </Marquee>
  </div>
);
