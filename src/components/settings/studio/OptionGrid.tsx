// A labelled grid of visual option cards. Each card shows a rendered Demo of the
// option (themed by the live storefront tokens) + its label. Responsive: more
// columns on wider screens. Replaces plain dropdowns for visual choices.

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Demo } from './OptionDemo';

export interface TokenStyle {
  style: React.CSSProperties;
  className: string;
  attrs: Record<string, string>;
}

interface Props {
  label: string;
  kind: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  token: TokenStyle;
  /** Columns at the lg breakpoint (default 3). */
  cols?: 2 | 3 | 4;
}

const COLS: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };

export const OptionGrid = ({ label, kind, value, options, onChange, token, cols = 3 }: Props) => (
  <div className="py-2">
    <p className="text-sm font-medium mb-2">{label}</p>
    <div className={cn('grid grid-cols-2 gap-2', COLS[cols])}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn('group relative rounded-lg border-2 overflow-hidden text-left transition-all hover:shadow-sm', active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40')}
          >
            <div className="h-16 p-2 flex items-center justify-center bg-muted/30" style={token.style as React.CSSProperties}>
              <div className={cn('w-full h-full flex items-center justify-center', token.className)} {...token.attrs}>
                <Demo kind={kind} value={o.value} />
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 bg-card">
              <span className="text-xs font-medium">{o.label}</span>
              {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
