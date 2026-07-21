import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_STUDIO_SETTINGS, TEMPLATE_IDS, type StudioSettings } from '@/lib/igStudio';

/**
 * Instagram Studio settings — one jsonb row per merchant, merged over the
 * defaults so new knobs get sane values for existing rows. Saves are
 * debounced upserts.
 */
export const useStudioSettings = () => {
  const { userId } = useAuth();
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('instagram_studio_settings')
        .select('settings')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.settings) {
        const merged = {
          ...DEFAULT_STUDIO_SETTINGS,
          ...data.settings,
          captionStyle: { ...DEFAULT_STUDIO_SETTINGS.captionStyle, ...(data.settings.captionStyle ?? {}) },
          transform: { ...DEFAULT_STUDIO_SETTINGS.transform, ...(data.settings.transform ?? {}) },
        };
        // Retired template ids (plain/minimal/split/polaroid) → valid defaults.
        if (!TEMPLATE_IDS.includes(merged.template)) merged.template = DEFAULT_STUDIO_SETTINGS.template;
        if (!TEMPLATE_IDS.includes(merged.storyTemplate)) merged.storyTemplate = DEFAULT_STUDIO_SETTINGS.storyTemplate;
        setSettings(merged);
      }
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const update = useCallback((patch: Partial<StudioSettings>) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        ...patch,
        captionStyle: { ...prev.captionStyle, ...(patch.captionStyle ?? {}) },
        transform: { ...prev.transform, ...(patch.transform ?? {}) },
      };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (!userId) return;
        supabase.from('instagram_studio_settings')
          .upsert({ user_id: userId, settings: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
          .then(({ error }) => { if (error) console.error('Studio settings save failed:', error.message); });
      }, 600);
      return next;
    });
  }, [userId]);

  return { settings, update, isLoading };
};
