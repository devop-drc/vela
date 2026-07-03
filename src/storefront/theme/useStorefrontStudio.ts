// Editor state for Storefront Studio. Loads the merchant's design_settings,
// extracts/normalizes the storefront config, and debounce-saves edits back into
// settings.storefront (merging, so the dashboard's own appearance is preserved).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StorefrontConfig } from '../config/types';
import { normalizeConfig } from '../config/normalize';
import { cloneConfig, DEFAULT_CONFIG } from '../config/defaults';
import { BLOCK_REGISTRY } from '../blocks/registry';
import { showError } from '@/utils/toast';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);

/** Immutable deep-set by dot-path, e.g. setPath(cfg, 'layout.header.variant', 'minimal'). */
function setPath<T>(obj: T, path: string, value: any): T {
  const keys = path.split('.');
  const out: any = Array.isArray(obj) ? [...(obj as any)] : { ...obj };
  let cur = out;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cur[k] = isObj(cur[k]) || Array.isArray(cur[k]) ? (Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] }) : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return out;
}

/** Deep-merge a partial config over a base (arrays replace). */
function mergeDeep<T>(base: T, src: any): T {
  if (!isObj(base) || !isObj(src)) return (src ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k of Object.keys(src)) {
    out[k] = isObj((base as any)[k]) && isObj(src[k]) ? mergeDeep((base as any)[k], src[k]) : src[k];
  }
  return out;
}

// Monotonic counter for fallback section-id generation (no Math.random / Date.now).
let sectionIdCounter = 0;
/** Generate a stable, unique section id for a given block type. */
function makeSectionId(type: string): string {
  const uuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${type}-${++sectionIdCounter}`;
  return `${type}-${uuid}`;
}

function debounce<F extends (...a: any[]) => any>(fn: F, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** A design saved by the merchant as a reusable starting point. */
export interface CustomTemplate {
  id: string;
  name: string;
  createdAt: string;
  config: StorefrontConfig;
}

const HISTORY_LIMIT = 50;

export function useStorefrontStudio() {
  const [config, setConfig] = useState<StorefrontConfig>(() => cloneConfig(DEFAULT_CONFIG));
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  // Undo/redo — history state so canUndo/canRedo re-render the toolbar.
  const [history, setHistory] = useState<{ past: StorefrontConfig[]; future: StorefrontConfig[] }>({ past: [], future: [] });
  const rawSettingsRef = useRef<Record<string, any>>({});
  const userIdRef = useRef<string | null>(null);
  // Bumps each time the "saved" indicator should auto-fade back to idle.
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { if (mounted) setIsLoading(false); return; }
      userIdRef.current = uid;
      const { data } = await supabase.from('design_settings').select('settings').eq('user_id', uid).maybeSingle();
      if (!mounted) return;
      const raw = (data?.settings as Record<string, any>) || {};
      rawSettingsRef.current = raw;
      setConfig(normalizeConfig(raw));
      setCustomTemplates(Array.isArray(raw.customTemplates) ? raw.customTemplates : []);
      setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // The actual persist, debounced. Status flips to 'saving' synchronously on
  // each edit (below) so the UI reacts instantly; this resolves it to
  // 'saved' / 'error' once the network round-trip completes.
  const persist = useMemo(
    () => debounce(async (next: StorefrontConfig) => {
      const uid = userIdRef.current;
      if (!uid) { setSaveStatus('idle'); return; }
      const merged = { ...rawSettingsRef.current, storefront: next };
      const { error } = await supabase
        .from('design_settings')
        .upsert({ user_id: uid, settings: merged }, { onConflict: 'user_id' });
      if (error) {
        console.error('Storefront Studio save failed:', error);
        setSaveStatus('error');
        showError("Couldn't save your design changes — retrying.");
        return;
      }
      // Only commit the merged raw settings on success so a failed save doesn't
      // poison the base used by the next attempt.
      rawSettingsRef.current = merged;
      setSaveStatus('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800),
    []
  );

  const save = useCallback((next: StorefrontConfig) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaveStatus('saving');
    persist(next);
  }, [persist]);

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  // configRef mirrors `config` so commit/undo/redo work on the latest value
  // without side effects inside state updaters (StrictMode-safe).
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  /** Apply a change, recording the previous config for undo. */
  const commit = useCallback((updater: (prev: StorefrontConfig) => StorefrontConfig) => {
    const prev = configRef.current;
    const next = updater(prev);
    if (next === prev) return;
    configRef.current = next;
    setHistory((h) => ({ past: [...h.past.slice(-(HISTORY_LIMIT - 1)), prev], future: [] }));
    setConfig(next);
    save(next);
  }, [save]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const target = h.past[h.past.length - 1];
      const current = configRef.current;
      // Schedule outside the updater body semantics — refs + queued save are
      // idempotent, so a StrictMode double-invoke lands on the same state.
      configRef.current = target;
      queueMicrotask(() => { setConfig(target); save(target); });
      return { past: h.past.slice(0, -1), future: [current, ...h.future].slice(0, HISTORY_LIMIT) };
    });
  }, [save]);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const target = h.future[0];
      const current = configRef.current;
      configRef.current = target;
      queueMicrotask(() => { setConfig(target); save(target); });
      return { past: [...h.past.slice(-(HISTORY_LIMIT - 1)), current], future: h.future.slice(1) };
    });
  }, [save]);

  const update = useCallback((path: string, value: any) => {
    commit((prev) => {
      const next = setPath(prev, path, value);
      // Editing any design field detaches from the named template.
      if (!path.startsWith('templateId')) (next as any).templateId = prev.templateId;
      return next;
    });
  }, [commit]);

  const applyTemplate = useCallback((tplConfig: StorefrontConfig, templateId: string | null) => {
    commit(() => ({ ...cloneConfig(tplConfig), templateId }));
  }, [commit]);

  // Deep-merge a partial (e.g. a structural layout preset or a color palette)
  // over the current config, preserving everything not specified.
  const mergePartial = useCallback((partial: Partial<StorefrontConfig>) => {
    commit((prev) => mergeDeep(prev, partial));
  }, [commit]);

  const replaceConfig = useCallback((next: StorefrontConfig) => {
    commit(() => next);
  }, [commit]);

  const reset = useCallback(() => {
    commit(() => cloneConfig(DEFAULT_CONFIG));
  }, [commit]);

  // ── Page-builder helpers (home + product-detail sections) ───────────────
  /** Append a new section of `type` to a section page, seeded with its defaults. */
  const addSection = useCallback((type: string, page: 'home' | 'productDetail' = 'home') => {
    const def = BLOCK_REGISTRY[type];
    commit((prev) => {
      const section = { id: makeSectionId(type), type, enabled: true, props: { ...(def?.defaultProps || {}) } };
      const next = setPath(prev, `pages.${page}`, [...prev.pages[page], section]);
      (next as any).templateId = prev.templateId;
      return next;
    });
  }, [commit]);

  /** Remove the section at `index` from a section page. */
  const removeSection = useCallback((index: number, page: 'home' | 'productDetail' = 'home') => {
    commit((prev) => {
      const list = prev.pages[page].filter((_, i) => i !== index);
      const next = setPath(prev, `pages.${page}`, list);
      (next as any).templateId = prev.templateId;
      return next;
    });
  }, [commit]);

  // ── Custom template library (stored in settings.customTemplates) ────────
  const persistCustomTemplates = useCallback(async (list: CustomTemplate[]) => {
    const uid = userIdRef.current;
    setCustomTemplates(list);
    if (!uid) return;
    const merged = { ...rawSettingsRef.current, customTemplates: list };
    const { error } = await supabase
      .from('design_settings')
      .upsert({ user_id: uid, settings: merged }, { onConflict: 'user_id' });
    if (error) {
      console.error('Saving custom templates failed:', error);
      showError("Couldn't save your template.");
      return;
    }
    rawSettingsRef.current = merged;
  }, []);

  /** Save the current design under a name in the per-shop template library. */
  const saveAsTemplate = useCallback(async (name: string) => {
    const entry: CustomTemplate = {
      id: makeSectionId('tpl'),
      name: name.trim() || 'My design',
      createdAt: new Date().toISOString(),
      config: cloneConfig(configRef.current),
    };
    await persistCustomTemplates([entry, ...customTemplates].slice(0, 20));
    return entry;
  }, [customTemplates, persistCustomTemplates]);

  const deleteCustomTemplate = useCallback(async (id: string) => {
    await persistCustomTemplates(customTemplates.filter((t) => t.id !== id));
  }, [customTemplates, persistCustomTemplates]);

  return {
    config, isLoading, saveStatus,
    update, applyTemplate, mergePartial, replaceConfig, reset, addSection, removeSection,
    undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    customTemplates, saveAsTemplate, deleteCustomTemplate,
  };
}
