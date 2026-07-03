// "View all products" call-to-action. Variants:
//  button — centered primary button (default)
//  banner — full-width gradient panel with heading + button
//  link   — quiet underlined text link

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { SfButton } from '../components/SfButton';

type Variant = 'button' | 'banner' | 'link';
interface Props { props: { label?: string; variant?: Variant; heading?: string } }

export const ViewAllCtaBlock = ({ props }: Props) => {
  const { shopDetails } = useStorefront();
  const config = useStorefrontConfig();
  if (!shopDetails) return null;
  const variant: Variant = props.variant ?? 'button';
  const label = props.label || 'View All Products';
  const to = `/shop/${shopDetails.slug}/products`;

  if (variant === 'link') {
    return (
      <div className="text-center">
        <Link
          to={to}
          onClick={() => window.scrollTo(0, 0)}
          className="inline-flex items-center gap-2 text-base font-semibold text-primary underline underline-offset-8 decoration-primary/40 transition-colors hover:decoration-primary"
        >
          {label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className="flex flex-col items-center gap-5 px-6 py-10 text-center md:flex-row md:justify-between md:px-12 md:text-left"
        style={{
          borderRadius: 'var(--radius)',
          background: `linear-gradient(120deg, hsl(${config.theme.tokens.primary}), hsl(${config.theme.tokens.accent}))`,
        }}
      >
        <div>
          <h2 className="sf-heading text-2xl md:text-3xl font-bold text-primary-foreground drop-shadow-sm">
            {props.heading || shopDetails.headline || shopDetails.shop_name}
          </h2>
          <p className="mt-1 text-sm text-primary-foreground/85">{shopDetails.about || ''}</p>
        </div>
        <SfButton asChild size="lg" className="shrink-0 bg-background text-foreground hover:bg-background/90 shadow-xl px-8 py-5 text-base">
          <Link to={to} onClick={() => window.scrollTo(0, 0)}>{label} <ArrowRight className="ml-2 h-5 w-5" /></Link>
        </SfButton>
      </div>
    );
  }

  return (
    <div className="text-center">
      <SfButton asChild size="lg" className="text-base px-8 py-5 shadow-xl hover:scale-105 transition-transform">
        <Link to={to} onClick={() => window.scrollTo(0, 0)}>
          {label} <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </SfButton>
    </div>
  );
};
