import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MediaItem } from '@/components/MediaItem';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { SfButton } from '../components/SfButton';
import { useSfT } from '../lib/visitorPrefs';

type HeroVariant = 'banner' | 'compact' | 'full' | 'split' | 'minimal' | 'gradient' | 'collage' | 'editorial' | 'slideshow' | 'split-slideshow' | 'marquee-type' | 'video';
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
  const { ld } = useSfT();

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
    ? { backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--sf-primary-2)))' }
    : hero.mediaUrl && hero.mediaType !== 'video'
    ? { backgroundImage: `url(${hero.mediaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: `hsl(${config.theme.tokens.primary})` };

  // Universal full-bleed background media so EVERY hero shows imagery, never a
  // flat panel: custom video → custom image → rolling product slideshow →
  // brand gradient (only when the shop has no photos at all yet).
  const heroMedia = (blur = false) => {
    if (hero.mediaUrl && hero.mediaType === 'video') {
      return <video data-sf-parallax autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" src={hero.mediaUrl} />;
    }
    if (hero.mediaUrl) {
      return <div className={cn('absolute inset-0 bg-cover bg-center', blur && 'scale-110 blur-xl')} style={{ backgroundImage: `url(${hero.mediaUrl})` }} aria-hidden />;
    }
    if (slideshowSources.length > 0) {
      return (
        <div className={cn('absolute inset-0', blur && 'scale-110 blur-xl')} aria-hidden>
          <Slideshow sources={slideshowSources} intervalMs={(props.slideInterval ?? 5) * 1000} />
        </div>
      );
    }
    return <div className="absolute inset-0" aria-hidden style={{ backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--sf-primary-2)))' }} />;
  };

  const cta = (
    <SfButton asChild size="lg" className="text-base px-6 py-5 shadow-xl hover:scale-105 transition-transform">
      <Link to={`/shop/${shopDetails.slug}/products`}>{ld(props.ctaLabel, 'shopNow')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
    </SfButton>
  );

  const logo = props.showLogo && shopDetails.logo_url && (
    <Avatar className="h-16 w-16"><AvatarImage src={shopDetails.logo_url} /><AvatarFallback>{shopDetails.shop_name?.[0]}</AvatarFallback></Avatar>
  );

  // Minimal — an airy, understated hero: a clean frosted-glass card floating over
  // a softly-lit media backdrop. Restrained type, lots of breathing room.
  if (variant === 'minimal') {
    return (
      <section className="relative flex min-h-[440px] items-center justify-center overflow-hidden sf-card md:min-h-[520px]" style={{ borderRadius: 'var(--sf-radius-card)' }}>
        {heroMedia()}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/35" aria-hidden />
        <div className="relative z-10 mx-4 w-full max-w-md border border-white/25 bg-card/85 p-8 text-center text-card-foreground shadow-2xl backdrop-blur-xl md:p-12" style={{ borderRadius: 'var(--sf-radius-card)' }}>
          {logo && <div className="mb-5 flex justify-center">{logo}</div>}
          <h1 className="sf-heading text-3xl font-bold leading-tight tracking-tight md:text-5xl">{shopDetails.shop_name}</h1>
          {shopDetails.headline && <p className="mx-auto mt-3 max-w-sm text-muted-foreground md:text-lg">{shopDetails.headline}</p>}
          <div className="mt-7 flex justify-center">{cta}</div>
        </div>
      </section>
    );
  }

  // Split-slideshow — copy on the left, a rolling product slideshow on the right.
  if (variant === 'split-slideshow') {
    return (
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        <div className="flex flex-col justify-center p-8 md:p-12">
          {logo && <div className="mb-4">{logo}</div>}
          <h1 className="sf-heading sf-hero-title font-bold leading-tight mb-3">{shopDetails.shop_name}</h1>
          {shopDetails.headline && <p className="text-lg text-muted-foreground mb-6 max-w-md">{shopDetails.headline}</p>}
          <div>{cta}</div>
        </div>
        <div className="relative min-h-[300px] overflow-hidden md:min-h-[420px]" style={{ borderRadius: 'var(--sf-radius-card)' }}>
          {slideshowSources.length > 0 ? (
            <Slideshow sources={slideshowSources} intervalMs={(props.slideInterval ?? 4) * 1000} />
          ) : (
            <div className="absolute inset-0" style={mediaStyle} />
          )}
        </div>
      </div>
    );
  }

  // Marquee-type — huge scrolling shop name behind a floating product image.
  if (variant === 'marquee-type') {
    const img = slideshowSources[0];
    const line = `${shopDetails.shop_name} — `;
    return (
      <div className="relative overflow-hidden py-10 md:py-16" style={{ borderRadius: 'var(--sf-radius-card)' }}>
        {heroMedia(true)}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-hidden />
        <div className="pointer-events-none relative z-10 select-none whitespace-nowrap leading-none" aria-hidden>
          {[0, 1].map((row) => (
            <div key={row} className={cn('sf-heading flex font-bold uppercase', row === 1 && 'opacity-30')} style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)' }}>
              <span className="sf-marquee-row flex shrink-0" style={{ animationDirection: row === 1 ? 'reverse' : undefined }}>
                <span className="text-primary/15">{line.repeat(4)}</span>
                <span className="text-primary/15">{line.repeat(4)}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-5 text-center">
            {img && (
              <div className="w-44 overflow-hidden shadow-2xl md:w-56" style={{ borderRadius: 'var(--sf-radius-card)' }}>
                <MediaItem src={img} alt={shopDetails.shop_name} className="aspect-[4/5] w-full object-cover" />
              </div>
            )}
            {shopDetails.headline && <p className="max-w-md px-4 text-base font-medium md:text-lg">{shopDetails.headline}</p>}
            {cta}
          </div>
        </div>
      </div>
    );
  }

  // Video — full-height motion hero (uses effects.hero media when it's a
  // video; falls back to the slideshow so it never renders empty).
  if (variant === 'video') {
    const hasVideo = hero.mediaUrl && hero.mediaType === 'video';
    return (
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden text-center" style={{ borderRadius: 'var(--sf-radius-card)' }}>
        {hasVideo ? (
          <video data-sf-parallax autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" src={hero.mediaUrl} />
        ) : slideshowSources.length > 0 ? (
          <Slideshow sources={slideshowSources} intervalMs={(props.slideInterval ?? 5) * 1000} />
        ) : (
          <div className="absolute inset-0" style={mediaStyle} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
        <div className="relative z-10 flex max-w-3xl flex-col items-center p-8 text-white md:p-14">
          {logo && <div className="mb-5">{logo}</div>}
          <h1 className="sf-heading sf-hero-title mb-3 font-bold leading-tight drop-shadow-lg">{shopDetails.shop_name}</h1>
          {shopDetails.headline && <p className="mb-6 text-lg drop-shadow-md md:text-2xl">{shopDetails.headline}</p>}
          {cta}
        </div>
      </section>
    );
  }

  // Editorial — oversized masthead type between thin rules, over a media bg.
  if (variant === 'editorial') {
    return (
      <section className="relative overflow-hidden py-10 sf-card md:py-16" style={{ borderRadius: 'var(--sf-radius-card)' }}>
        {heroMedia()}
        <div className="absolute inset-0 bg-black/55" aria-hidden />
        <div className="relative z-10 mx-4 border-y border-white/25 py-8 text-center text-white md:py-14">
          {shopDetails.headline && (
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/70 md:mb-6 md:text-sm">{shopDetails.headline}</p>
          )}
          <h1 className="sf-heading break-words text-[clamp(2.75rem,10vw,7.5rem)] font-bold leading-[0.95] drop-shadow-lg">{shopDetails.shop_name}</h1>
          {shopDetails.about && <p className="mx-auto mt-5 max-w-xl text-sm text-white/80 md:mt-7 md:text-base">{shopDetails.about}</p>}
          <div className="mt-7 md:mt-9">{cta}</div>
        </div>
      </section>
    );
  }

  // Collage — copy beside a tilted stack of real product photos. Always has
  // imagery to show since it draws from the catalog itself.
  if (variant === 'collage' && productImages.length >= 2) {
    return (
      <div className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-10">
        <div className="text-center md:text-left">
          {logo && <div className="mb-5 flex justify-center md:justify-start">{logo}</div>}
          <h1 className="sf-heading sf-hero-title font-bold leading-tight mb-4">{shopDetails.shop_name}</h1>
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
              style={{ borderRadius: 'var(--sf-radius-card)' }}
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
      <section className="relative overflow-hidden py-4 md:py-10">
        <div className="grid items-center gap-8 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
          {/* Copy */}
          <div className="relative z-10 flex flex-col items-start justify-center">
            {logo && <div className="mb-6">{logo}</div>}
            <h1 className="sf-heading sf-hero-title font-bold leading-[1.02] tracking-tight">{shopDetails.shop_name}</h1>
            {shopDetails.headline && <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{shopDetails.headline}</p>}
            <div className="mt-9">{cta}</div>
          </div>
          {/* Framed media: brand glow halo + offset accent panel + a floating
              secondary product thumbnail for depth. */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-primary/30 via-primary/5 to-transparent blur-3xl" aria-hidden />
            <div className="absolute -right-4 -top-4 bottom-10 left-10 -z-10 hidden rounded-[2rem] border border-primary/15 bg-primary/10 md:block" aria-hidden />
            <div
              className={cn('relative aspect-[4/5] overflow-hidden shadow-2xl ring-1 ring-black/5 md:aspect-[5/6]', config.effects.hero?.blob && 'hero-blob-background show-blob')}
              style={{ ...splitStyle, borderRadius: 'var(--sf-radius-card)' }}
            >
              {hero.mediaUrl && hero.mediaType === 'video' && (
                <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" src={hero.mediaUrl} />
              )}
            </div>
            {productImages[1] && (
              <div className="absolute -bottom-6 -left-6 hidden aspect-square w-28 overflow-hidden border-4 border-background shadow-xl md:block" style={{ borderRadius: 'var(--sf-radius-card)' }} aria-hidden>
                <MediaItem src={productImages[1]} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Gradient — a vibrant brand-gradient panel with drifting light blobs and a
  // pair of floating, tilted product cards. Bold and playful.
  if (variant === 'gradient') {
    return (
      <section className="relative overflow-hidden sf-card" style={{ borderRadius: 'var(--sf-radius-card)' }}>
        <div className="absolute inset-0" aria-hidden style={{ backgroundImage: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--sf-primary-2)))' }} />
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-white/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-black/15 blur-3xl" aria-hidden />
        <div className="relative z-10 grid items-center gap-8 p-8 md:grid-cols-2 md:gap-10 md:p-14">
          <div className="text-primary-foreground">
            {logo && <div className="mb-5">{logo}</div>}
            <h1 className="sf-heading sf-hero-title font-bold leading-[0.98] drop-shadow-sm">{shopDetails.shop_name}</h1>
            {shopDetails.headline && <p className="mt-5 max-w-md text-lg opacity-90 md:text-xl">{shopDetails.headline}</p>}
            <div className="mt-9">{cta}</div>
          </div>
          {productImages[0] && (
            <div className="relative mx-auto hidden w-full max-w-sm md:block">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-white/25 blur-2xl" aria-hidden />
              <div className="relative aspect-[4/5] rotate-3 overflow-hidden shadow-2xl ring-[6px] ring-white/40 transition-transform duration-500 hover:rotate-0" style={{ borderRadius: 'var(--sf-radius-card)' }}>
                <MediaItem src={productImages[0]} alt="" className="h-full w-full object-cover" />
              </div>
              {productImages[1] && (
                <div className="absolute -bottom-7 -left-7 aspect-square w-32 -rotate-6 overflow-hidden shadow-xl ring-[6px] ring-white/40" style={{ borderRadius: 'var(--sf-radius-card)' }} aria-hidden>
                  <MediaItem src={productImages[1]} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Full — a cinematic, near-full-viewport immersive hero with a scroll cue.
  if (variant === 'full') {
    return (
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden text-center sf-card" style={{ borderRadius: 'var(--sf-radius-card)' }}>
        {heroMedia()}
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30" aria-hidden />
        <div className="relative z-10 max-w-3xl px-6 text-white">
          {logo && <div className="mb-6 flex justify-center">{logo}</div>}
          <h1 className="sf-heading sf-hero-title font-bold leading-[0.98] drop-shadow-2xl">{shopDetails.shop_name}</h1>
          {shopDetails.headline && <p className="mx-auto mt-5 max-w-xl text-lg text-white/90 drop-shadow md:text-2xl">{shopDetails.headline}</p>}
          {shopDetails.about && <p className="mx-auto mt-4 max-w-xl text-sm text-white/75 drop-shadow md:text-base">{shopDetails.about}</p>}
          <div className="mt-9 flex justify-center">{cta}</div>
        </div>
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/70" aria-hidden>
          <ChevronDown className="h-7 w-7 animate-bounce" />
        </div>
      </section>
    );
  }

  // banner / slideshow / compact — an editorial full-bleed cover with the copy
  // anchored bottom-left over a directional gradient (magazine-cover energy).
  const short = variant === 'compact';
  return (
    <section
      className={cn('relative flex items-end overflow-hidden sf-card', short ? 'min-h-[280px] md:min-h-[320px]' : 'min-h-[500px] md:min-h-[600px]', config.effects.hero?.blob && 'hero-blob-background show-blob')}
      style={{ borderRadius: 'var(--sf-radius-card)' }}
    >
      {heroMedia()}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/45 to-transparent" aria-hidden />
      <div className="relative z-10 w-full max-w-2xl p-7 text-white md:p-14">
        {!short && props.showLogo && shopDetails.logo_url && (
          <Avatar className="mb-5 h-16 w-16 border-2 border-white/70 shadow-md">
            <AvatarImage src={shopDetails.logo_url} alt={shopDetails.shop_name} />
            <AvatarFallback className="bg-white text-2xl font-bold text-primary">{shopDetails.shop_name?.[0]}</AvatarFallback>
          </Avatar>
        )}
        <h1 className="sf-heading sf-hero-title font-bold leading-[0.98] drop-shadow-xl">{shopDetails.shop_name}</h1>
        {!short && shopDetails.headline && <p className="mt-4 max-w-lg text-lg text-white/90 drop-shadow md:text-2xl">{shopDetails.headline}</p>}
        <div className="mt-7">{cta}</div>
      </div>
    </section>
  );
};
