// Announcement bar — two kinds of item, clearly distinguished:
//  • Promotion announcements (automatic): generated from the shop's active
//    promotions. The storefront only receives promotions within their schedule,
//    so an announcement's dates/duration/repetition always match its promotion
//    by construction — nothing to author or sync. Rendered as a clickable
//    "deal" chip (tag icon + underline) that opens the products page filtered
//    to that promotion's products.
//  • Manual announcements (info): free-form messages the owner writes — shortage
//    notices, off-hours, free-shipping, etc. Rendered as a plain, non-clickable
//    info chip with its own icon.
// Consecutive items are divided by a separator so they never blur together.
//
// variant (props.variant, falling back to config.layout.banner.style):
//  marquee | static | gradient | stacked

import { useNavigate } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { Marquee } from '@/components/ui/marquee';
import { getIcon } from '@/lib/iconLibrary';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';

type Variant = 'marquee' | 'static' | 'gradient' | 'stacked';
interface Props { props: { variant?: Variant } }

interface BarItem {
  key: string;
  message: string;
  kind: 'promo' | 'info';
  promotionId?: string;
  iconName?: string;
}

export const AnnouncementMarqueeBlock = ({ props }: Props) => {
  const { promotions, marqueeElements, shopDetails } = useStorefront();
  const config = useStorefrontConfig();
  const navigate = useNavigate();

  // Promotions (clickable deals) first, then manual info announcements.
  const items: BarItem[] = [
    ...(promotions || []).map((p) => ({ key: `promo-${p.id}`, message: p.name, kind: 'promo' as const, promotionId: p.id })),
    ...(marqueeElements || []).map((el) => ({ key: `info-${el.id}`, message: el.message, kind: 'info' as const, iconName: el.icon_name })),
  ];

  if (items.length === 0) return null;
  // Global on/off for the announcement bar.
  if (config.layout.header.showAnnouncementBar === false) return null;
  const style: Variant = props?.variant ?? config.layout.banner?.style ?? 'marquee';

  const openPromotion = (id: string) => {
    if (shopDetails?.slug) navigate(`/shop/${shopDetails.slug}/products?promotion=${id}`);
  };

  // Decorative divider between announcements.
  const Sep = ({ light }: { light?: boolean }) => (
    <span className={cn('flex select-none items-center px-3', light ? 'text-primary-foreground/40' : 'text-primary/30')} aria-hidden>
      <span className="h-3 w-px bg-current" />
    </span>
  );

  // Promotion → clickable, underlined, tag icon. Info → plain, its own icon,
  // slightly lighter weight so the two read as clearly different kinds.
  const Chip = ({ item, light }: { item: BarItem; light?: boolean }) => {
    const color = light ? 'text-primary-foreground' : 'text-primary';
    if (item.kind === 'promo') {
      return (
        <button
          type="button"
          onClick={() => openPromotion(item.promotionId!)}
          aria-label={`Shop the “${item.message}” promotion`}
          className={cn('group flex items-center gap-2 whitespace-nowrap px-4 text-base font-bold transition-opacity hover:opacity-80', color)}
        >
          <Tag className="h-4 w-4 shrink-0" />
          <span className="underline decoration-current/40 decoration-2 underline-offset-4 group-hover:decoration-current">{item.message}</span>
        </button>
      );
    }
    const Icon = getIcon(item.iconName);
    return (
      <div className={cn('flex items-center gap-2 whitespace-nowrap px-4 text-base font-medium opacity-90', color)}>
        <Icon className="h-4 w-4 shrink-0 opacity-70" />
        <span>{item.message}</span>
      </div>
    );
  };

  if (style === 'static') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 py-3 border-y-2 border-primary/20 bg-primary/10">
        {items.map((item, i) => (
          <div key={item.key} className="flex items-center">
            {i > 0 && <Sep />}
            <Chip item={item} />
          </div>
        ))}
      </div>
    );
  }

  if (style === 'stacked') {
    return (
      <div className="flex flex-col items-center gap-2">
        {items.map((item) => {
          const Icon = item.kind === 'promo' ? Tag : getIcon(item.iconName);
          const inner = (<><Icon className="h-4 w-4 shrink-0" /><span>{item.message}</span></>);
          const cls = cn(
            'inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-sm',
            item.kind === 'promo'
              ? 'border border-primary bg-primary/15 font-semibold text-primary transition-colors hover:bg-primary/25'
              : 'border border-primary/20 bg-primary/5 font-medium text-primary/90'
          );
          return item.kind === 'promo' ? (
            <button key={item.key} type="button" onClick={() => openPromotion(item.promotionId!)} className={cls}>{inner}</button>
          ) : (
            <div key={item.key} className={cls}>{inner}</div>
          );
        })}
      </div>
    );
  }

  if (style === 'gradient') {
    return (
      <div className="overflow-hidden py-3 text-center" style={{ background: `linear-gradient(90deg, hsl(${config.theme.tokens.primary}), hsl(${config.theme.tokens.accent}))`, borderRadius: 'var(--radius)' }}>
        <Marquee pauseOnHover>
          {items.map((item) => (
            <span key={item.key} className="flex items-center">
              <Chip item={item} light />
              <Sep light />
            </span>
          ))}
        </Marquee>
      </div>
    );
  }

  return (
    <Marquee pauseOnHover className="py-3 border-y-2 border-primary/20 bg-primary/10">
      {items.map((item) => (
        <span key={item.key} className="flex items-center">
          <Chip item={item} />
          <Sep />
        </span>
      ))}
    </Marquee>
  );
};
