import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

// Define the structure of our design settings
interface DesignSettings {
  '--background': string;
  '--foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--card': string;
  '--radius': string;
}

// Define the default theme based on your globals.css
const defaultSettings: DesignSettings = {
  '--background': '220 10% 98%',
  '--foreground': '220 10% 20%',
  '--primary': '220 10% 15%',
  '--primary-foreground': '0 0% 100%',
  '--card': '220 10% 100%',
  '--radius': '1.5rem',
};

interface AppearanceContextType {
  settings: DesignSettings;
  updateSetting: (key: keyof DesignSettings, value: string) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

// Helper to apply settings to the root element
const applySettingsToDOM = (settings: DesignSettings) => {
  for (const [key, value] of Object.entries(settings)) {
    if (key === '--radius') {
      document.documentElement.style.setProperty(key, value);
    } else {
      document.documentElement.style.setProperty(key, value);
    }
  }
};

export const AppearanceProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<DesignSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch settings from Supabase on load
  useEffect(() => {
    const fetchSettings = async () => {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('design_settings')
        .select('settings')
        .eq('user_id', session.user.id)
        .single();

      if (data && data.settings) {
        setSettings({ ...defaultSettings, ...data.settings });
      } else if (error && error.code !== 'PGRST116') { // Ignore 'no rows found' error
        console.error("Error fetching design settings:", error);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, [session]);

  // Apply settings to DOM whenever they change
  useEffect(() => {
    applySettingsToDOM(settings);
  }, [settings]);

  const debouncedSave = useCallback(
    debounce(async (newSettings: DesignSettings) => {
      if (!session?.user) return;
      const { error } = await supabase
        .from('design_settings')
        .upsert({ user_id: session.user.id, settings: newSettings }, { onConflict: 'user_id' });
      if (error) {
        console.error("Error saving settings:", error);
      }
    }, 1000),
    [session]
  );

  const updateSetting = (key: keyof DesignSettings, value: string) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      debouncedSave(newSettings);
      return newSettings;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    debouncedSave(defaultSettings);
  };

  return (
    <AppearanceContext.Provider value={{ settings, updateSetting, resetSettings, isLoading }}>
      {children}
    </AppearanceContext.Provider>
  );
};

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
};

// Debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}