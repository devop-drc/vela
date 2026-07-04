// "Match my storefront" — when the owner opts in, the dashboard shell adopts
// the storefront's design tokens (colors, radius, dark mode) in real time.
// The Studio dispatches `sf-settings-updated` on every save so edits restyle
// the dashboard live without a reload.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeConfig } from '@/storefront/config';
import { buildTokens, resolveMode } from '@/storefront/config/tokens';

interface MatchTheme {
  style: React.CSSProperties;
  className: string;
}

export const SF_SETTINGS_EVENT = 'sf-settings-updated';

export function useStorefrontMatchTheme(): MatchTheme | null {
  const [raw, setRaw] = useState<Record<string, any> | null>(null);
  const [prefersDark, setPrefersDark] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;
      const { data } = await supabase.from('design_settings').select('settings').eq('user_id', session.user.id).maybeSingle();
      if (mounted) setRaw((data?.settings as Record<string, any>) ?? {});
    })();
    const onUpdate = (e: Event) => setRaw({ ...(e as CustomEvent).detail });
    window.addEventListener(SF_SETTINGS_EVENT, onUpdate);
    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onScheme = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql?.addEventListener?.('change', onScheme);
    return () => {
      mounted = false;
      window.removeEventListener(SF_SETTINGS_EVENT, onUpdate);
      mql?.removeEventListener?.('change', onScheme);
    };
  }, []);

  return useMemo(() => {
    if (!raw?.dashboardMatchesStorefront) return null;
    const config = normalizeConfig(raw);
    const tokens = buildTokens(config, prefersDark);
    // Colors + radius only — dashboard keeps its own fonts/layout so nothing breaks.
    const style: Record<string, string> = {};
    for (const [k, v] of Object.entries(tokens.vars)) {
      if (k.startsWith('--') && !k.startsWith('--sf-')) style[k] = String(v);
    }
    return {
      style: style as React.CSSProperties,
      className: resolveMode(config, prefersDark) === 'dark' ? 'dark' : '',
    };
  }, [raw, prefersDark]);
}
