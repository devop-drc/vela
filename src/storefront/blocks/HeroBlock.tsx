import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MediaItem } from '@/components/MediaItem';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { SfButton } from '../components/SfButton';

type HeroVariant = 'banner' | 'compact' | 'full' | 'split' | 'minimal' | 'gradient' | 'collage' | 'editorial' | 'slideshow';
interface Props { props: { variant?: HeroVariant; showLogo?: boolean; ctaLabel?: string; slideshowImages?: string; slideInterval?: number } }

/** Crossfading background slideshow. `sources` cycle on a timer; reduced-motion
    users get a static first image. */
const Slideshow = ({ sources, intervalMs }: { sources: string[]; intervalMs: number }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (sources.length < 2) return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % sources.length), Math.max(2500, intervalMs));
    return () => clearInterval(t);
  }, [sources.length, intervalMs]);
  return (
    <div className="absolute inset-0" aria-hidden>
      {sources.map((src, i) => (
        <div
          key={src + i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${src})`, opacity: i === idx ? 1 : 0 }}
        />
      ))}
    </div>
  );
};

export const HeroBlock = ({ props }: Props) => {
  const { shopDetails, products } = useStorefront();
  const config = useStorefrontConfig();

  // Slideshow sources: owner-picked URLs (one per line in the Studio) win;
  // otherwise the newest product photos roll.
  const slideshowSources = useMemo(() => {
    const custom = (props.slideshowImages || '')
      .split(/[\n,]+/).map((s) => s.trim()).filter((s) => /^https?:\/\/|^\//.test(s));
    if (custom.length > 0) return custom.slice(0, 10);
    return (products || [])
      .map((p: any) => p.thumbnail_url || p.media_gallery?.[0] || p.media_url)
      .filter(Boolean)
      .slice(0, 6);
  }, [props.slideshowImages, products]);

  if (!shopDetails) return null;

  const variant = props.variant ?? 'banner';
  const hero = config.effects.hero ?? {};
  const minH = variant === 'full' ? 'min-h-[70vh]' : variant === 'compact' ? 'min-h-[220px]' : 'min-h-[440px]';
  const productImages = (products || [])
    .map((p: any) => p.thumbnail_url || p.media_gallery?.[0] || p.media_url)
    .filter(Boolean)
    .slice(0, 4);

  const mediaStyle: React.CSSProperties = variant === 'gradient'
    ? { backgroundImage: `linear-gradient(135deg, hsl(${config.theme.tokens.primary}), hsl(${config.theme.tokens.accent}))` }
    : hero.mediaUrl && hero.mediaType !== 'video'
    ? { backgroundImage: `url(${hero.mediaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: `hsl(${config.theme.tokens.primary})` };

  const cta = (
    <SfButton asChild size="lg" className="text-base px-6 py-5 shadow-xl hover:scale-105 transition-transform">
      <Link to={`/shop/${shopDetails.slug}/products`}>{props.ctaLabel || 'Shop Now'} <ArrowRight className="ml-2 h-4 w-4" /></Link>
    </SfButton>
  );

  const logo = props.showLogo && shopDetails.logo_url && (
    <Avatar className="h-16 w-16"><AvatarImage src={shopDetails.logo_url} /><AvatarFallback>{shopDetails.shop_name?.[0]}</AvatarFallback></Avatar>
  );

  // Minimal — no media/card, text in theme foreground on the page background.
  if (variant === 'minimal') {
    return (
      <div className="text-center py-12 md:py-16">
        {logo && <div className="mb-4 flex justify-center">{logo}</div>}
        <h1 className="sf-heading text-4xl md:text-6xl font-bold mb-3">{shopDetails.shop_name}</h1>
        {shopDetails.headline && <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">{shopDetails.headline}</p>}
        <div>{cta}</div>
      </div>
    );
  }

  // Editorial — oversized type between thin rules, magazine masthead energy.
  if (variant === 'editorial') {
    return (
      <div className="py-10 md:py-16">
        <div className="border-y py-8 md:py-14 text-center">
          {shopDetails.headline && (
            <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4 md:mb-6">{shopDetails.headline}</p>
          )}
          <h1 className="sf-heading font-bold leading-[0.95] text-[clamp(2.75rem,10vw,7.5rem)] break-words">{shopDetails.shop_name}</h1>
          {shopDetails.about && <p className="mt-5 md:mt-7 max-w-xl mx-auto text-muted-foreground text-sm md:text-base">{shopDetails.about}</p>}
          <div className="mt-7 md:mt-9">{cta}</div>
        </div>
      </div>
    );
  }

  // Collage — copy beside a tilted stack of real product photos. Always has
  // imagery to show since it draws from the catalog itself.
  if (variant === 'collage' && productImages.length >= 2) {
    return (
      <div className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-10">
        <div className="text-center md:text-left">
          {logo && <div className="mb-5 flex justify-center md:justify-start">{logo}</div>}
          <h1 className="sf-heading text-4xl md:text-5xl xl:text-6xl font-bold leading-tight mb-4">{shopDetails.shop_name}</h1>
          {shopDetails.headline && <p className="text-lg md:text-xl text-muted-foreground mb-7 max-w-md mx-auto md:mx-0">{shopDetails.headline}</p>}
          <div>{cta}</div>
        </div>
        <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4 px-3 [overflow-x:clip]">
          {productImages.slice(0, 4).map((src, i) => (
            <div
              key={i}
              className={cn(
                'overflow-hidden bg-muted shadow-lg sf-card transition-transform duration-300 hover:rotate-0 hover:scale-[1.03]',
                i === 0 && 'rotate-[-3deg] aspect-[4/5]',
                i === 1 && 'rotate-[2.5deg] mt-8 aspect-square',
                i === 2 && 'rotate-[2deg] -mt-4 aspect-square',
                i === 3 && 'rotate-[-2deg] mt-2 aspect-[4/5]'
              )}
              style={{ borderRadius: 'var(--radius)' }}
            >
              <MediaItem src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'split' || variant === 'collage') {
    // collage with <2 product images degrades to split.
    const splitImage = hero.mediaUrl && hero.mediaType !== 'video' ? hero.mediaUrl : productImages[0];
    const splitStyle: React.CSSProperties = splitImage
      ? { backgroundImage: `url(${splitImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : mediaStyle;
    return (
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col justify-center p-8 md:p-12">
          {logo && <div className="mb-4">{logo}</div>}
          <h1 className="sf-heading text-4xl md:text-5xl font-bold leading-tight mb-3">{shopDetails.shop_name}</h1>
          {shopDetails.headline && <p className="text-lg text-muted-foreground mb-6 max-w-md">{shopDetails.headline}</p>}
          <div>{cta}</div>
        </div>
        <div className={cn('relative overflow-hidden min-h-[300px]', config.effects.hero?.blob && 'hero-blob-background show-blob')} style={{ ...splitStyle, borderRadius: 'var(--radius)' }}>
          {hero.mediaUrl && hero.mediaType === 'video' && (
            <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" src={hero.mediaUrl} />
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn('relative overflow-hidden flex items-center justify-center text-center sf-card', minH, config.effects.hero?.blob && 'hero-blob-background show-blob')}
      style={{ ...(variant === 'slideshow' ? {} : mediaStyle), borderRadius: 'var(--radius)' }}
    >
      {variant === 'slideshow' && slideshowSources.length > 0 && (
        <Slideshow sources={slideshowSources} intervalMs={(props.slideInterval ?? 4) * 1000} />
      )}
      {hero.mediaUrl && hero.mediaType === 'video' && (
        <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover z-0" src={hero.mediaUrl} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
      <div className="relative z-10 max-w-3xl mx-auto p-8 md:p-14 text-primary-foreground flex flex-col items-center">
        {props.showLogo && shopDetails.logo_url && variant !== 'compact' && (
          <Avatar className="h-24 w-24 mb-5 border-4 border-primary-foreground shadow-md">
            <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
            <AvatarFallback className="text-4xl font-bold bg-primary-foreground text-primary">{shopDetails.shop_name?.[0]}</AvatarFallback>
          </Avatar>
        )}
        <h1 className="sf-heading text-4xl md:text-6xl font-bold mb-3 leading-tight drop-shadow-lg">{shopDetails.shop_name}</h1>
        {shopDetails.headline && variant !== 'compact' && <p className="text-lg md:text-2xl mb-4 drop-shadow-md">{shopDetails.headline}</p>}
        {shopDetails.about && variant === 'full' && <p className="text-base md:text-lg mb-6 drop-shadow-md max-w-2xl">{shopDetails.about}</p>}
        <div className="mt-2">{cta}</div>
      </div>
    </section>
  );
};
