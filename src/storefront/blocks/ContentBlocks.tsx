// Data-free content blocks: value props, rich text, promo banner. All copy is
// editable via section props with sensible commerce defaults.

import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, MessageCircle, RotateCcw, Sparkles, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { SfButton } from '../components/SfButton';

/* ── Value props ───────────────────────────────────────────────────────── */
// variant: row (slim inline strip) | cards (glass tiles)
const DEFAULT_VALUE_ITEMS = [
  { icon: 'truck', title: 'Fast delivery', text: 'Straight to your door, anywhere.' },
  { icon: 'shield', title: 'Secure payment', text: 'Pay by card or on delivery.' },
  { icon: 'chat', title: 'Real support', text: 'Message us any time on Instagram.' },
];
const VALUE_ICONS: Record<string, any> = { truck: Truck, shield: ShieldCheck, chat: MessageCircle, returns: RotateCcw };

interface ValueItem { icon?: string; title: string; text?: string }

export const ValuePropsBlock = ({ props }: { props: { variant?: 'row' | 'cards'; items?: ValueItem[] } }) => {
  const items: ValueItem[] = props.items?.length ? props.items : DEFAULT_VALUE_ITEMS;
  const variant = props.variant ?? 'row';

  if (variant === 'cards') {
    return (
      <div className="grid gap-[var(--sf-grid-gap)] sm:grid-cols-3">
        {items.map((it, i) => {
          const Icon = VALUE_ICONS[it.icon ?? ''] ?? Truck;
          return (
            <div key={i} className="sf-glass flex flex-col items-center p-6 text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="h-6 w-6" /></span>
              <h3 className="sf-heading font-semibold mb-1">{it.title}</h3>
              {it.text && <p className="text-sm text-muted-foreground">{it.text}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 border-y py-5 sm:flex-row sm:gap-10 md:gap-14">
      {items.map((it, i) => {
        const Icon = VALUE_ICONS[it.icon ?? ''] ?? Truck;
        return (
          <div key={i} className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <div className="leading-tight">
              <p className="text-sm font-semibold">{it.title}</p>
              {it.text && <p className="text-xs text-muted-foreground">{it.text}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Rich text ─────────────────────────────────────────────────────────── */
// variant: centered | split (title left, body right). Defaults to the shop's
// own about text so it's never empty on a fresh store.
export const RichTextBlock = ({ props }: { props: { variant?: 'centered' | 'split'; title?: string; body?: string } }) => {
  const { shopDetails } = useStorefront();
  const title = props.title || `About ${shopDetails?.shop_name ?? 'us'}`;
  const body = props.body || shopDetails?.about;
  if (!body) return null;

  if (props.variant === 'split') {
    return (
      <div className="grid gap-4 border-t pt-8 md:grid-cols-[1fr_2fr] md:gap-12">
        <h2 className="sf-heading text-2xl md:text-3xl font-bold leading-tight">{title}</h2>
        <p className="text-muted-foreground leading-relaxed md:text-lg">{body}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="sf-heading text-2xl md:text-3xl font-bold mb-4">{title}</h2>
      <p className="text-muted-foreground leading-relaxed md:text-lg">{body}</p>
    </div>
  );
};

/* ── Promo banner ──────────────────────────────────────────────────────── */
// variant: gradient | outline. Heading defaults to the shop headline.
export const PromoBannerBlock = ({ props }: { props: { variant?: 'gradient' | 'outline'; heading?: string; text?: string; ctaLabel?: string } }) => {
  const { shopDetails } = useStorefront();
  const config = useStorefrontConfig();
  if (!shopDetails) return null;
  const heading = props.heading || shopDetails.headline;
  if (!heading) return null;
  const to = `/shop/${shopDetails.slug}/products`;

  if (props.variant === 'outline') {
    return (
      <div
        className="group flex flex-col items-center gap-5 overflow-hidden border border-primary/25 bg-primary/[0.04] px-6 py-8 text-center md:flex-row md:justify-between md:px-10 md:text-left"
        style={{ borderRadius: 'var(--sf-radius-card)' }}
      >
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Tag className="h-5 w-5" />
          </span>
          <div>
            <h2 className="sf-heading text-xl font-bold md:text-2xl">{heading}</h2>
            {props.text && <p className="mt-1 max-w-md text-sm text-muted-foreground">{props.text}</p>}
          </div>
        </div>
        <SfButton asChild size="lg" className="shrink-0">
          <Link to={to} className="group/cta">
            {props.ctaLabel || 'Shop Now'}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
          </Link>
        </SfButton>
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden px-6 py-12 text-center md:py-16"
      style={{
        borderRadius: 'var(--sf-radius-card)',
        background: 'linear-gradient(120deg, hsl(var(--primary)), hsl(var(--sf-primary-2)))',
      }}
    >
      {/* Depth: soft glow blobs + a faint dot grid over the flat gradient. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '18px 18px', color: 'hsl(var(--primary-foreground))' }}
        />
      </div>

      <div className="relative">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> {props.ctaLabel ? 'Special offer' : 'Don’t miss out'}
        </span>
        <h2 className="sf-heading mx-auto max-w-2xl text-2xl font-bold text-primary-foreground drop-shadow-sm md:text-4xl">{heading}</h2>
        {props.text && <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/85 md:text-base">{props.text}</p>}
        <div className="mt-7">
          {/* Deliberately NOT the themed SfButton: on the brand-gradient surface
              the theme's own button styles (esp. the gradient variant) vanish
              into the background — this CTA must stay a high-contrast pill. */}
          <Link
            to={to}
            className="group/cta inline-flex h-12 items-center rounded-full bg-white px-8 text-base font-semibold text-zinc-900 shadow-xl transition-all duration-200 hover:scale-[1.04] hover:shadow-2xl"
          >
            {props.ctaLabel || 'Shop Now'}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};
