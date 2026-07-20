// Studio "Sections" tab — drag-sortable homepage section list. Each row
// expands to a layout-variant picker + the block's editable props, all driven
// by the block registry metadata (variants / editableProps).

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { BLOCK_REGISTRY, type BlockDef } from '@/storefront/blocks/registry';
import type { SectionInstance } from '@/storefront/config/types';

interface Props {
  sections: SectionInstance[];
  onChange: (next: SectionInstance[]) => void;
  onRemove: (index: number) => void;
}

const VariantPicker = ({ def, section, onProp }: { def: BlockDef; section: SectionInstance; onProp: (key: string, value: any) => void }) => {
  const { t } = useTranslation();
  if (!def.variantProp || !def.variants?.length) return null;
  const current = section.props?.[def.variantProp] ?? def.defaultProps?.[def.variantProp] ?? def.variants[0].value;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('studio.layout')}</p>
      <div className="flex flex-wrap gap-1.5">
        {def.variants.map((v) => (
          <button
            key={v.value}
            type="button"
            onClick={() => onProp(def.variantProp!, v.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              current === v.value ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:border-primary/50'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const PropEditors = ({ def, section, onProp }: { def: BlockDef; section: SectionInstance; onProp: (key: string, value: any) => void }) => {
  if (!def.editableProps?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {def.editableProps.map((p) => {
        const value = section.props?.[p.key] ?? def.defaultProps?.[p.key];
        if (p.kind === 'toggle') {
          return (
            <label key={p.key} className="flex items-center justify-between gap-2 text-xs font-medium">
              {p.label}
              <Switch checked={!!value} onCheckedChange={(c) => onProp(p.key, c)} />
            </label>
          );
        }
        if (p.kind === 'number') {
          return (
            <label key={p.key} className="space-y-1 text-xs font-medium">
              {p.label}
              <Input
                type="number" className="h-8 text-xs" value={value ?? ''} min={p.min} max={p.max}
                onChange={(e) => {
                  const n = e.target.value === '' ? undefined : Number(e.target.value);
                  onProp(p.key, n === undefined || isNaN(n) ? undefined : Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, n)));
                }}
              />
            </label>
          );
        }
        return (
          <label key={p.key} className="space-y-1 text-xs font-medium">
            {p.label}
            <Input className="h-8 text-xs" value={value ?? ''} placeholder={p.placeholder} onChange={(e) => onProp(p.key, e.target.value)} />
          </label>
        );
      })}
    </div>
  );
};

const SortableRow = ({
  section, index, expanded, onToggleExpand, onEnable, onRemove, onProp,
}: {
  section: SectionInstance;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onEnable: (enabled: boolean) => void;
  onRemove: () => void;
  onProp: (key: string, value: any) => void;
}) => {
  const { t } = useTranslation();
  const def = BLOCK_REGISTRY[section.type];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const hasDetails = !!(def?.variants?.length || def?.editableProps?.length);
  const Icon = def?.icon;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-md border bg-card', isDragging && 'z-10 opacity-80 shadow-lg')}
    >
      <div className="flex items-center gap-2 p-2">
        <button type="button" className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground" aria-label={t('studio_panels.drag_to_reorder', { name: def?.label || section.type })} {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <Switch checked={section.enabled} onCheckedChange={onEnable} />
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className={cn('flex-1 text-sm', !section.enabled && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{def?.label || section.type}</span>
        {hasDetails && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand} aria-label={t('studio_panels.edit_section', { name: def?.label || section.type })} aria-expanded={expanded}>
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={t('studio_panels.remove_section', { name: def?.label || section.type })}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {expanded && hasDetails && def && (
        <div className="space-y-3 border-t bg-muted/30 p-3">
          <VariantPicker def={def} section={section} onProp={onProp} />
          <PropEditors def={def} section={section} onProp={onProp} />
        </div>
      )}
    </div>
  );
};

export const SectionList = ({ sections, onChange, onRemove }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(sections, from, to));
  };

  const setProp = (index: number, key: string, value: any) =>
    onChange(sections.map((s, i) => (i === index ? { ...s, props: { ...s.props, [key]: value } } : s)));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sections.map((s, i) => (
            <SortableRow
              key={s.id}
              section={s}
              index={i}
              expanded={expandedId === s.id}
              onToggleExpand={() => setExpandedId((cur) => (cur === s.id ? null : s.id))}
              onEnable={(enabled) => onChange(sections.map((x, k) => (k === i ? { ...x, enabled } : x)))}
              onRemove={() => onRemove(i)}
              onProp={(key, value) => setProp(i, key, value)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
