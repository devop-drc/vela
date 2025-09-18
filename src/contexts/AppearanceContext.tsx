import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

// --- THEME DEFINITIONS ---
interface ColorScheme {
  '--background': string;
  '--foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--secondary': string;
  '--secondary-foreground': string;
  '--card': string;
}

interface Theme {
  name: string;
  light: ColorScheme;
  dark: ColorScheme;
}

export const presetThemes: Theme[] = [
  {
    name: 'Onyx',
    light: { '--background': '0 0% 100%', '--foreground': '240 10% 3.9%', '--primary': '240 5.9% 10%', '--primary-foreground': '0 0% 98%', '--secondary': '0 0% 96%', '--secondary-foreground': '240 5.9% 10%', '--card': '0 0% 100%' },
    dark: { '--background': '240 10% 3.9%', '--foreground': '0 0% 98%', '--primary': '0 0% 98%', '--primary-foreground': '240 5.9% 10%', '--secondary': '240 10% 8%', '--secondary-foreground': '0 0% 98%', '--card': '240 10% 3.9%' },
  },
  {
    name: 'Nautical',
    light: { '--background': '204 100% 96%', '--foreground': '215 60% 22%', '--primary': '210 79% 46%', '--primary-foreground': '0 0% 100%', '--secondary': '204 100% 92%', '--secondary-foreground': '215 60% 22%', '--card': '204 100% 99%' },
    dark: { '--background': '215 60% 12%', '--foreground': '204 20% 94%', '--primary': '210 90% 66%', '--primary-foreground': '215 60% 12%', '--secondary': '215 60% 16%', '--secondary-foreground': '204 20% 94%', '--card': '215 60% 16%' },
  },
  {
    name: 'Sakura',
    light: { '--background': '345 100% 97%', '--foreground': '343 35% 30%', '--primary': '343 85% 65%', '--primary-foreground': '0 0% 100%', '--secondary': '345 100% 93%', '--secondary-foreground': '343 35% 30%', '--card': '345 100% 99%' },
    dark: { '--background': '343 35% 12%', '--foreground': '345 20% 94%', '--primary': '343 90% 75%', '--primary-foreground': '343 35% 12%', '--secondary': '343 35% 16%', '--secondary-foreground': '345 20% 94%', '--card': '343 35% 16%' },
  },
  {
    name: 'Evergreen',
    light: { '--background': '140 70% 97%', '--foreground': '140 40% 18%', '--primary': '140 60% 30%', '--primary-foreground': '0 0% 100%', '--secondary': '140 70% 93%', '--secondary-foreground': '140 40% 18%', '--card': '140 70% 99%' },
    dark: { '--background': '140 40% 8%', '--foreground': '140 20% 94%', '--primary': '140 70% 60%', '--primary-foreground': '140 40% 8%', '--secondary': '140 40% 12%', '--secondary-foreground': '140 20% 94%', '--card': '140 40% 12%' },
  },
  {
    name: 'Sunset',
    light: { '--background': '30 100% 97%', '--foreground': '25 50% 25%', '--primary': '20 90% 55%', '--primary-foreground': '0 0% 100%', '--secondary': '30 100% 93%', '--secondary-foreground': '25 50% 25%', '--card': '30 100% 99%' },
    dark: { '--background': '25 50% 10%', '--foreground': '30 20% 94%', '--primary': '30 95% 70%', '--primary-foreground': '25 50% 10%', '--secondary': '25 50% 14%', '--secondary-foreground': '30 20% 94%', '--card': '25 50% 14%' },
  },
  {
    name: 'Latte',
    light: { '--background': '38 60% 96%', '--foreground': '38 30% 25%', '--primary': '38 50% 45%', '--primary-foreground': '0 0% 100%', '--secondary': '38 60% 92%', '--secondary-foreground': '38 30% 25%', '--card': '38 60% 99%' },
    dark: { '--background': '38 30% 10%', '--foreground': '38 20% 94%', '--primary': '38 70% 70%', '--primary-foreground': '38 30% 10%', '--secondary': '38 30% 14%', '--secondary-foreground': '38 20% 94%', '--card': '38 30% 14%' },
  },
  {
    name: 'Mint',
    light: { '--background': '160 70% 97%', '--foreground': '160 40% 20%', '--primary': '160 60% 40%', '--primary-foreground': '0 0% 100%', '--secondary': '160 70% 93%', '--secondary-foreground': '160 40% 20%', '--card': '160 70% 99%' },
    dark: { '--background': '160 40% 10%', '--foreground': '160 20% 94%', '--primary': '160 70% 65%', '--primary-foreground': '160 40% 10%', '--secondary': '160 40% 14%', '--secondary-foreground': '160 20% 94%', '--card': '160 40% 14%' },
  },
  {
    name: 'Lavender',
    light: { '--background': '250 100% 98%', '--foreground': '250 40% 25%', '--primary': '250 65% 60%', '--primary-foreground': '0 0% 100%', '--secondary': '250 100% 94%', '--secondary-foreground': '250 40% 25%', '--card': '250 100% 99%' },
    dark: { '--background': '250 40% 12%', '--foreground': '250 20% 94%', '--primary': '250 80% 80%', '--primary-foreground': '250 40% 12%', '--secondary': '250 40% 16%', '--secondary-foreground': '250 20% 94%', '--card': '250 40% 16%' },
  },
];
// --- END THEME DEFINITIONS ---

export const fontCategories = {
  Modern: {
    headings: ["Syne", "Space Grotesk", "Manrope", "DM Sans", "Rubik", "Work Sans"],
    body: ["Inter", "Roboto", "Work Sans", "Manrope", "DM Sans", "Rubik"],
  },
  Elegant: {
    headings: ["Playfair Display", "Cormorant Garamond", "Libre Baskerville", "Lora", "Merriweather"],
    body: ["Lato", "Source Sans Pro", "Karla", "Nunito Sans", "Raleway"],
  },
  Minimalist: {
    headings: ["Inter", "Roboto", "Lato", "Source Sans Pro", "Nunito Sans", "Karla"],
    body: ["Inter", "Roboto", "Lato", "Source Sans Pro", "Nunito Sans", "Karla"],
  },
  Classic: {
    headings: ["Lora", "Merriweather", "PT Sans", "Arimo", "Libre Baskerville"],
    body: ["Source Sans Pro", "Lato", "Open Sans", "PT Sans", "Arimo"],
  },
};

interface DesignSettings {
  themeName: string;
  isAdvanced: boolean;
  sidebarStyle: 'primary' | 'card';
  '--background': string;
  '--foreground': string;
  '--primary': string;
  '--primary-foreground': string;
  '--secondary': string;
  '--secondary-foreground': string;
  '--card': string;
  '--radius': string;
  fontSans: string;
  fontHeading: string;
}

const defaultSettings: DesignSettings = {
  themeName: 'Onyx',
  isAdvanced: false,
  sidebarStyle: 'primary',
  ...presetThemes[0].light,
  '--radius': '1.5rem',
  fontSans: 'Inter',
  fontHeading: 'Inter',
};

interface AppearanceContextType {
  settings: DesignSettings;
  setTheme: (themeName: string) => void;
  updateSetting: (key: keyof DesignSettings, value: string | boolean) => void;
  resetSettings: () => void;
  randomizeTheme: () => void;
  isLoading: boolean;
  isAdvanced: boolean;
  setAdvanced: (isAdvanced: boolean) => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

const loadedFonts = new Set();
const loadGoogleFont = (fontName: string) => {
  if (loadedFonts.has(fontName) || fontName === 'Inter' || fontName.includes('system-ui')) {
    return;
  }
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;
  const link = document.createElement('link');
  link.id = `font-${fontName}`;
  link.href = fontUrl;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  loadedFonts.add(fontName);
};

const applySettingsToDOM = (settings: Partial<DesignSettings>) => {
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith('--')) {
      document.documentElement.style.setProperty(key, value as string);
    }
  }
  if (settings.fontSans) {
    document.documentElement.style.setProperty('--font-sans', `'${settings.fontSans}', sans-serif`);
    loadGoogleFont(settings.fontSans);
  }
  if (settings.fontHeading) {
    document.documentElement.style.setProperty('--font-heading', `'${settings.fontHeading}', sans-serif`);
    loadGoogleFont(settings.fontHeading);
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

  const updateSetting = (key: keyof DesignSettings, value: string | boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (key.startsWith('--')) {
        newSettings.themeName = 'Custom';
      }
      debouncedSave(newSettings);
      return newSettings;
    });
  };
  
  const setAdvanced = (isAdvanced: boolean) => {
    updateSetting('isAdvanced', isAdvanced);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    debouncedSave(defaultSettings);
  };

  const randomizeTheme = () => {
    const randomTheme = presetThemes[Math.floor(Math.random() * presetThemes.length)];
    const randomCategoryName = Object.keys(fontCategories)[Math.floor(Math.random() * Object.keys(fontCategories).length)] as keyof typeof fontCategories;
    const randomCategory = fontCategories[randomCategoryName];
    let headingFont = randomCategory.headings[Math.floor(Math.random() * randomCategory.headings.length)];
    let bodyFont = randomCategory.body[Math.floor(Math.random() * randomCategory.body.length)];
    if (randomCategoryName !== 'Minimalist') {
      while (headingFont === bodyFont) {
        bodyFont = randomCategory.body[Math.floor(Math.random() * randomCategory.body.length)];
      }
    }
    const randomSidebarStyle = (Math.random() > 0.5 ? 'primary' : 'card') as 'primary' | 'card';
    const randomRadius = `${(Math.random() * 1.5 + 0.25).toFixed(2)}rem`;

    const newSettings: DesignSettings = {
      ...defaultSettings,
      ...randomTheme.light,
      themeName: randomTheme.name,
      fontHeading: headingFont,
      fontSans: bodyFont,
      sidebarStyle: randomSidebarStyle,
      '--radius': randomRadius,
      isAdvanced: false,
    };

    setSettings(newSettings);
    debouncedSave(newSettings);
  };

  return (
    <AppearanceContext.Provider value={{ settings, setTheme, updateSetting, resetSettings, isLoading, isAdvanced: settings.isAdvanced, setAdvanced, randomizeTheme }}>
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