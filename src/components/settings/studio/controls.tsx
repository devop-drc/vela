// Small reusable control rows for the Storefront Studio editor.

import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { hslToHex, hexToHsl } from '@/utils/colors';

export const Row = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-1.5">
    <div className="min-w-0">
      <Label className="text-sm">{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const SelectRow = ({ label, hint, value, options, onChange }: {
  label: string; hint?: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) => (
  <Row label={label} hint={hint}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  </Row>
);

export const SwitchRow = ({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) => (
  <Row label={label} hint={hint}><Switch checked={checked} onCheckedChange={onChange} /></Row>
);

export const SliderRow = ({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) => (
  <div className="py-2 space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <span className="text-xs text-muted-foreground tabular-nums">{value}{unit}</span>
    </div>
    <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
  </div>
);

export const SegmentRow = ({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) => (
  <div className="py-2 space-y-2">
    <Label className="text-sm">{label}</Label>
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn('px-2.5 py-1 rounded-md border text-xs transition-colors', value === o.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40')}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export const ColorRow = ({ label, hsl, onChange, badge }: { label: string; hsl: string; onChange: (hsl: string) => void; badge?: ReactNode }) => (
  <Row label={label}>
    <div className="flex items-center gap-2">
      {badge}
      <input
        type="color"
        value={hslToHex(hsl)}
        onChange={(e) => onChange(hexToHsl(e.target.value))}
        className="h-7 w-10 rounded border cursor-pointer bg-transparent p-0"
        aria-label={label}
      />
    </div>
  </Row>
);
