// Announcement banner. Variant comes from the section instance (props.variant)
// with config.layout.banner.style as the legacy fallback:
//  marquee  — continuous scrolling ticker
//  static   — centered, non-scrolling row
//  gradient — bold primary gradient bar
//  stacked  — one slim centered row per announcement

import { Marquee } from '@/components/ui/marquee';
import { getIcon } from '@/lib/iconLibrary';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

type Variant = 'marquee' | 'static' | 'gradient' | 'stacked';
interface Props { props: { variant?: Variant } }

export const AnnouncementMarqueeBlock = ({ props }: Props) => {
  const { marqueeElements } = useStorefront();
  const config = useStorefrontConfig();
  if (!marqueeElements || marqueeElements.length === 0) return null;
  // The header setting is the global on/off for announcements.
  if (config.layout.header.showAnnouncementBar === false) return null;
  const style: Variant = props?.variant ?? config.layout.banner?.style ?? 'marquee';

  const Item = ({ el, light }: { el: any; light?: boolean }) => {
    const Icon = getIcon(el.icon_name);
    return (
      <div className={cn('flex items-center gap-3 text-base font-semibold px-4', light ? 'text-primary-foreground' : 'text-primary')}>
        <Icon className="h-5 w-5" />
        <span>{el.message}</span>
      </div>
    );
  };

  if (style === 'static') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-3 border-y-2 border-primary/20 bg-primary/10">
        {marqueeElements.map((el) => <Item key={el.id} el={el} />)}
      </div>
    );
  }

  if (style === 'stacked') {
    return (
      <div className="flex flex-col items-center gap-2">
        {marqueeElements.map((el) => {
          const Icon = getIcon(el.icon_name);
          return (
            <div key={el.id} className="inline-flex items-center gap-2.5 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              <Icon className="h-4 w-4" />
              <span>{el.message}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (style === 'gradient') {
    return (
      <div className="overflow-hidden py-3 text-center" style={{ background: `linear-gradient(90deg, hsl(${config.theme.tokens.primary}), hsl(${config.theme.tokens.accent}))`, borderRadius: 'var(--radius)' }}>
        <Marquee pauseOnHover>
          {marqueeElements.map((el) => <Item key={el.id} el={el} light />)}
        </Marquee>
      </div>
    );
  }

  return (
    <Marquee pauseOnHover className="py-3 border-y-2 border-primary/20 bg-primary/10">
      {marqueeElements.map((el) => <Item key={el.id} el={el} />)}
    </Marquee>
  );
};
