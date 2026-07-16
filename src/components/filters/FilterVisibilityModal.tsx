// Modal for choosing which filter groups customers (or the admin) can use on a
// product-listing surface. Shared between the admin Products page (controls the
// page's own filter panel) and the Storefront Studio (controls the /shop page).
// Presentational over a sparse visibility map: a missing key means "visible".

import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Search, Layers, CircleDollarSign, PackageCheck, Star, Tag as TagIcon, SlidersHorizontal, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAttributeIcon } from '@/lib/attributeIcons';
import {
  AttributeDef, ProductLite, deriveAttributeKeys, attributeValues, filterKeyTitle, isFilterVisible,
} from './filterVisibility';

const CORE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; blurb: string }> = {
  categories: { icon: Layers, blurb: 'Browse by product category' },
  priceRange: { icon: CircleDollarSign, blurb: 'Min–max price slider' },
  availability: { icon: PackageCheck, blurb: 'In stock / out of stock' },
  rating: { icon: Star, blurb: 'Minimum review rating' },
  tags: { icon: TagIcon, blurb: 'Browse by tag' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which surface these toggles affect — shown under the title. */
  description: string;
  allCategories: string[];
  allTags: string[];
  allDetailsAttributes: AttributeDef[];
  allProducts: ProductLite[];
  visibilityMap: Record<string, boolean>;
  onToggle: (key: string, visible: boolean) => void;
  onSetMany: (keys: string[], visible: boolean) => void;
}

export function FilterVisibilityModal({
  open, onOpenChange, description,
  allCategories, allTags, allDetailsAttributes, allProducts,
  visibilityMap, onToggle, onSetMany,
}: Props) {
  const [query, setQuery] = useState('');

  const { options, specs } = useMemo(
    () => deriveAttributeKeys(allDetailsAttributes, allProducts),
    [allDetailsAttributes, allProducts]
  );

  // Core groups: price/availability/rating always exist; categories & tags only
  // when the catalog actually has some.
  const coreKeys = useMemo(() => {
    const keys: string[] = [];
    if (allCategories.length > 0) keys.push('categories');
    keys.push('priceRange', 'availability', 'rating');
    if (allTags.length > 0) keys.push('tags');
    return keys;
  }, [allCategories.length, allTags.length]);

  const previewFor = (key: string): string[] => {
    if (key === 'categories') return allCategories.slice(0, 3);
    if (key === 'tags') return allTags.slice(0, 3);
    if (key in CORE_META) return [];
    return attributeValues(key, allDetailsAttributes, allProducts).slice(0, 3);
  };

  const matches = (key: string) =>
    !query.trim() || filterKeyTitle(key).toLowerCase().includes(query.trim().toLowerCase());

  const sections: Array<{ title: string; icon: React.ComponentType<{ className?: string }>; keys: string[] }> = [
    { title: 'Core filters', icon: SlidersHorizontal, keys: coreKeys.filter(matches) },
    { title: 'Options', icon: Layers, keys: options.filter(matches) },
    { title: 'Specifications', icon: ClipboardList, keys: specs.filter(matches) },
  ].filter((s) => s.keys.length > 0);

  const allKeys = [...coreKeys, ...options, ...specs];
  const visibleCount = allKeys.filter((k) => isFilterVisible(visibilityMap, k)).length;

  const FilterCard = ({ keyName }: { keyName: string }) => {
    const on = isFilterVisible(visibilityMap, keyName);
    const Icon = CORE_META[keyName]?.icon ?? getAttributeIcon(keyName);
    const blurb = CORE_META[keyName]?.blurb;
    const preview = previewFor(keyName);
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={on}
        onClick={() => onToggle(keyName, !on)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(keyName, !on); } }}
        className={cn(
          'group flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors select-none',
          on ? 'border-primary/40 bg-primary/[0.03]' : 'border-border opacity-70 hover:opacity-100',
          'hover:bg-muted/50'
        )}
      >
        <div className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-md transition-colors',
          on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{filterKeyTitle(keyName)}</p>
          {preview.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {preview.map((v) => (
                <span key={v} className="inline-flex max-w-[120px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {v}
                </span>
              ))}
            </div>
          ) : blurb ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{blurb}</p>
          ) : null}
        </div>
        <Switch
          checked={on}
          onCheckedChange={(v) => onToggle(keyName, v)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`${on ? 'Hide' : 'Show'} ${filterKeyTitle(keyName)} filter`}
          className="shrink-0"
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 pb-4 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Filter visibility
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search filters…"
                className="h-9 pl-8"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={() => onSetMany(allKeys.filter(matches), true)}>
              Show all
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => onSetMany(allKeys.filter(matches), false)}>
              Hide all
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-4">
            {sections.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No filters match "{query}".</p>
            )}
            {sections.map((s) => (
              <div key={s.title}>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <s.icon className="h-3.5 w-3.5" /> {s.title}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {s.keys.map((k) => <FilterCard key={k} keyName={k} />)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          {visibleCount} of {allKeys.length} filter groups visible
        </div>
      </DialogContent>
    </Dialog>
  );
}
