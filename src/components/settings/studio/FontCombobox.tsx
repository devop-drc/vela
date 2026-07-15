// Searchable Google-Fonts picker. Any family from the curated list can be
// applied to headings or body; each name previews in its own typeface (loaded
// lazily on hover so we never fetch 150 fonts at once).

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { loadGoogleFont } from '@/lib/fontUtils';
import { GOOGLE_FONTS } from '@/storefront/lib/googleFonts';

export function FontCombobox({ label, value, placeholder, onChange }: {
  label?: string; value: string; placeholder?: string; onChange: (family: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [previewed, setPreviewed] = useState<Set<string>>(() => new Set(value ? [value] : []));

  const preview = (family: string) => {
    setPreviewed((cur) => {
      if (cur.has(family)) return cur;
      loadGoogleFont(family);
      const next = new Set(cur); next.add(family); return next;
    });
  };

  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="h-9 w-full justify-between px-2.5 font-normal">
            <span className="truncate" style={{ fontFamily: `'${value}', sans-serif` }}>{value || placeholder || t('studio.chooseFont')}</span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command>
            <CommandInput placeholder={t('studio.searchFonts')} className="text-sm" />
            <CommandList>
              <CommandEmpty>{t('studio.noFont')}</CommandEmpty>
              <CommandGroup>
                {GOOGLE_FONTS.map((f) => (
                  <CommandItem
                    key={f.family}
                    value={f.family}
                    onMouseEnter={() => preview(f.family)}
                    onSelect={() => { preview(f.family); onChange(f.family); setOpen(false); }}
                    className="gap-2"
                  >
                    <Check className={cn('h-4 w-4 shrink-0', value === f.family ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate" style={previewed.has(f.family) ? { fontFamily: `'${f.family}', sans-serif` } : undefined}>{f.family}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{f.category}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
