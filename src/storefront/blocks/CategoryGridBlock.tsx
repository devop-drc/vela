// Category navigation. Variants:
//  tiles  — icon tiles (default)
//  pills  — compact rounded chips, wraps on any width
//  mosaic — photo tiles using each category's own product imagery

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MediaItem } from '@/components/MediaItem';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { useStorefront } from '@/contexts/StorefrontContext';
import { SectionHeader } from '../components/SectionHeader';

type Variant = 'tiles' | 'pills' | 'mosaic';
interface Props { props: { title?: string; variant?: Variant } }

export const CategoryGridBlock = ({ props }: Props) => {
  const { products, shopDetails } = useStorefront();
  const variant: Variant = props.variant ?? 'tiles';

  const categories = useMemo(() => {
    const m = new Map<string, { count: number; img?: string }>();
    (products || []).forEach((p) => {
      const c = p.category || 'Uncategorized';
      const cur = m.get(c) || { count: 0 };
      const img = p.thumbnail_url || p.media_gallery?.[0] || p.media_url;
      m.set(c, { count: cur.count + 1, img: cur.img || (p.media_type !== 'video' ? img : cur.img) });
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  if (!shopDetails || categories.length === 0) return null;

  const heading = (
    <SectionHeader
      title={props.title || 'Shop by Category'}
      icon={Package}
      eyebrow="Browse"
      action={{ label: 'All products', to: `/shop/${shopDetails.slug}/products` }}
    />
  );
  const linkTo = (category: string) => `/shop/${shopDetails.slug}/products?category=${encodeURIComponent(category)}`;

  if (variant === 'pills') {
    return (
      <div>
        {heading}
        <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3">
          {categories.map(([category, { count }]) => {
            const Icon = getCategoryIcon(category);
            return (
              <Link
                key={category}
                to={linkTo(category)}
                className="sf-hoverable inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <Icon className="h-4 w-4 text-primary" />
                {category}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'mosaic') {
    const shown = categories.slice(0, 7);
    return (
      <div>
        {heading}
        <div className="grid grid-cols-2 gap-[var(--sf-grid-gap)] sm:grid-cols-3 lg:grid-cols-4 [grid-auto-rows:9rem] md:[grid-auto-rows:11rem]">
          {shown.map(([category, { count, img }], i) => (
            <Link
              key={category}
              to={linkTo(category)}
              className={cn(
                'sf-hoverable group relative block overflow-hidden bg-muted',
                i === 0 && 'col-span-2 row-span-2'
              )}
              style={{ borderRadius: 'var(--radius)' }}
            >
              {img ? (
                <MediaItem src={img} alt={category} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 bg-primary/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className={cn('sf-heading font-semibold text-white leading-tight drop-shadow', i === 0 ? 'text-xl md:text-2xl' : 'text-base')}>{category}</h3>
                <p className="text-[11px] text-white/85">{count} Products</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[var(--sf-grid-gap)]">
        {categories.map(([category, { count }]) => {
          const Icon = getCategoryIcon(category);
          return (
            <Link key={category} to={linkTo(category)} className="sf-hoverable sf-glass group flex flex-col items-center justify-center p-6 text-center">
              <Icon className="h-12 w-12 mb-3 text-primary" />
              <h3 className="sf-heading font-semibold text-base leading-tight mb-1 line-clamp-2">{category}</h3>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">{count} Products</Badge>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
