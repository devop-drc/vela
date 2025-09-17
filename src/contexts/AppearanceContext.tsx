import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

// --- THEME DEFINITIONS ---
interface ColorScheme {
  '--background': string;
  '--foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--card': string;
}

interface Theme {
  name: string;
  light: ColorScheme;
  dark: ColorScheme; // Note: Dark mode is defined but not yet implemented via a toggle.
}

export const presetThemes: Theme[] = [
  {
    name: 'Default',
    light: {
      '--background': '220 10% 98%', '--foreground': '220 10% 20%', '--primary': '220 10% 15%',
      '--primary-foreground': '0 0% 100%', '--card': '220 10% 100%',
    },
    dark: {
      '--background': '220 10% 10%', '--foreground': '220 10% 95%', '--primary': '220 10% 98%',
      '--primary-foreground': '220 10% 10%', '--card': '220 10% 15%',
    },
  },
  {
    name: 'Forest',
    light: {
      '--background': '120 15% 97%', '--foreground': '120 25% 15%', '--primary': '120 35% 30%',
      '--primary-foreground': '120 15% 95%', '--card': '120 10% 100%',
    },
    dark: {
      '--background': '120 25% 10%', '--foreground': '120 10% 90%', '--primary': '120 30% 70%',
      '--primary-foreground': '120 25% 15%', '--card': '120 25% 15%',
    },
  },
  {
    name: 'Rose',
    light: {
      '--background': '350 100% 98%', '--foreground': '350 40% 25%', '--primary': '350 70% 45%',
      '--primary-foreground': '350 100% 98%', '--card': '350 100% 100%',
    },
    dark: {
      '--background': '350 30% 12%', '--foreground': '350 30% 90%', '--primary': '350 80% 75%',
      '--primary-foreground': '350 40% 15%', '--card': '350 30% 18%',
    },
  },
  {
    name: 'Ocean',
    light: {
      '--background': '205 100% 97%', '--foreground': '215 50% 20%', '--primary': '210 80% 45%',
      '--primary-foreground': '205 100% 98%', '--card': '205 100% 100%',
    },
    dark: {
      '--background': '215 50% 10%', '--foreground': '205 30% 90%', '--primary': '205 90% 70%',
      '--primary-foreground': '215 50% 15%', '--card': '215 50% 15%',
    },
  },
];
// --- END THEME DEFINITIONS ---

interface DesignSettings {
  themeName: string;
  isAdvanced: boolean;
  '--background': string;
  '--foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--card': string;
  '--radius': string;
}

const defaultSettings: DesignSettings = {
  themeName: 'Default',
  isAdvanced: false,
  ...presetThemes[0].light,
  '--radius': '1.5rem',
};

interface AppearanceContextType {
  settings: DesignSettings;
  setTheme: (themeName: string) => void;
  updateSetting: (key: keyof DesignSettings, value: string) => void;
  resetSettings: () => void;
  isLoading: boolean;
  isAdvanced: boolean;
  setAdvanced: (isAdvanced: boolean) => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

const applySettingsToDOM = (settings: Partial<DesignSettings>) => {
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith('--')) {
      document.documentElement.style.setProperty(key, value as string);
    }
  }
};

export const AppearanceProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<DesignSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('design_settings').select('settings').eq('user_id', session.user.id).single();

      if (data?.settings) {
        const savedSettings = data.settings as Partial<DesignSettings>;
        const theme = presetThemes.find(t => t.name === savedSettings.themeName) || presetThemes[0];
        
        // If not in advanced mode, apply the theme colors. Otherwise, use saved custom colors.
        const themeColors = theme.light;
        const finalSettings = {
          ...defaultSettings,
          ...themeColors,
          ...savedSettings,
        };
        setSettings(finalSettings);
      } else if (error && error.code !== 'PGRST116') {
        console.error("Error fetching design settings:", error);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [session]);

  useEffect(() => {
    applySettingsToDOM(settings);
  }, [settings]);

  const debouncedSave = useCallback(
    debounce(async (newSettings: DesignSettings) => {
      if (!session?.user) return;
      const { error } = await supabase
        .from('design_settings').upsert({ user_id: session.user.id, settings: newSettings }, { onConflict: 'user_id' });
      if (error) console.error("Error saving settings:", error);
    }, 1000),
    [session]
  );

  const setTheme = (themeName: string) => {
    const theme = presetThemes.find(t => t.name === themeName) || presetThemes[0];
    setSettings(prev => {
      const newSettings = { ...prev, ...theme.light, themeName, isAdvanced: false };
      debouncedSave(newSettings);
      return newSettings;
    });
  };

  const updateSetting = (key: keyof DesignSettings, value: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value, themeName: 'Custom' };
      debouncedSave(newSettings);
      return newSettings;
    });
  };
  
  const setAdvanced = (isAdvanced: boolean) => {
    setSettings(prev => {
        const newSettings = { ...prev, isAdvanced };
        debouncedSave(newSettings);
        return newSettings;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    debouncedSave(defaultSettings);
  };

  return (
    <AppearanceContext.Provider value={{ settings, setTheme, updateSetting, resetSettings, isLoading, isAdvanced: settings.isAdvanced, setAdvanced }}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (context === undefined) throw new Error('useAppearance must be used within an AppearanceProvider');
  return context;
};

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}