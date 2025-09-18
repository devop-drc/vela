import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

// --- THEME DEFINITIONS ---
interface ColorScheme {
  '--background': string;
  '--foreground': string;
  '--muted': string;
  '--muted-foreground': string;
  '--popover': string;
  '--popover-foreground': string;
  '--card': string;
  '--card-foreground': string;
  '--border': string;
  '--input': string;
  '--primary': string;
  '--primary-foreground': string;
  '--secondary': string;
  '--secondary-foreground': string;
  '--accent': string;
  '--accent-foreground': string;
  '--destructive': string;
  '--destructive-foreground': string;
  '--warning': string;
  '--warning-foreground': string;
  '--info': string;
  '--info-foreground': string;
  '--ring': string;
}

interface Theme {
  name: string;
  light: ColorScheme;
  dark: ColorScheme;
}

const sharedColors = {
  destructive: '0 84.2% 60.2%',
  destructiveForeground: '0 0% 98%',
  warning: '47.9 95.8% 53.1%',
  warningForeground: '48 96% 10%',
  info: '217.2 91.2% 59.8%',
  infoForeground: '0 0% 98%',
};

export const presetThemes: Theme[] = [
  {
    name: 'Onyx',
    light: { '--background': '0 0% 100%', '--foreground': '240 10% 3.9%', '--muted': '0 0% 96.1%', '--muted-foreground': '240 3.8% 46.1%', '--popover': '0 0% 100%', '--popover-foreground': '240 10% 3.9%', '--card': '0 0% 100%', '--card-foreground': '240 10% 3.9%', '--border': '0 0% 89.8%', '--input': '0 0% 89.8%', '--primary': '240 5.9% 10%', '--primary-foreground': '0 0% 98%', '--secondary': '0 0% 96.1%', '--secondary-foreground': '240 5.9% 10%', '--accent': '0 0% 94.1%', '--accent-foreground': '240 5.9% 10%', '--ring': '240 5.9% 10%', '--destructive': sharedColors.destructive, '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': sharedColors.info, '--info-foreground': sharedColors.infoForeground },
    dark: { '--background': '240 10% 3.9%', '--foreground': '0 0% 98%', '--muted': '240 3.7% 15.9%', '--muted-foreground': '240 5% 64.9%', '--popover': '240 10% 3.9%', '--popover-foreground': '0 0% 98%', '--card': '240 10% 3.9%', '--card-foreground': '0 0% 98%', '--border': '240 3.7% 15.9%', '--input': '240 3.7% 15.9%', '--primary': '0 0% 98%', '--primary-foreground': '240 5.9% 10%', '--secondary': '240 3.7% 15.9%', '--secondary-foreground': '0 0% 98%', '--accent': '240 3.7% 15.9%', '--accent-foreground': '0 0% 98%', '--ring': '0 0% 98%', '--destructive': '0 72% 51%', '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': '217.2 91.2% 59.8%', '--info-foreground': sharedColors.infoForeground },
  },
  {
    name: 'Nautical',
    light: { '--background': '204 100% 96%', '--foreground': '215 60% 22%', '--muted': '204 100% 92%', '--muted-foreground': '215 60% 42%', '--popover': '204 100% 99%', '--popover-foreground': '215 60% 22%', '--card': '204 100% 99%', '--card-foreground': '215 60% 22%', '--border': '204 100% 88%', '--input': '204 100% 88%', '--primary': '210 79% 46%', '--primary-foreground': '0 0% 100%', '--secondary': '204 100% 92%', '--secondary-foreground': '215 60% 22%', '--accent': '204 100% 90%', '--accent-foreground': '215 60% 22%', '--ring': '210 79% 46%', '--destructive': sharedColors.destructive, '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': sharedColors.info, '--info-foreground': sharedColors.infoForeground },
    dark: { '--background': '215 60% 12%', '--foreground': '204 20% 94%', '--muted': '215 60% 16%', '--muted-foreground': '204 20% 74%', '--popover': '215 60% 12%', '--popover-foreground': '204 20% 94%', '--card': '215 60% 16%', '--card-foreground': '204 20% 94%', '--border': '215 60% 20%', '--input': '215 60% 20%', '--primary': '210 90% 66%', '--primary-foreground': '215 60% 12%', '--secondary': '215 60% 16%', '--secondary-foreground': '204 20% 94%', '--accent': '215 60% 20%', '--accent-foreground': '204 20% 94%', '--ring': '210 90% 66%', '--destructive': '0 72% 51%', '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': '217.2 91.2% 59.8%', '--info-foreground': sharedColors.infoForeground },
  },
  {
    name: 'Sakura',
    light: { '--background': '345 100% 97%', '--foreground': '343 35% 30%', '--muted': '345 100% 93%', '--muted-foreground': '343 35% 50%', '--popover': '345 100% 99%', '--popover-foreground': '343 35% 30%', '--card': '345 100% 99%', '--card-foreground': '343 35% 30%', '--border': '345 100% 89%', '--input': '345 100% 89%', '--primary': '343 85% 65%', '--primary-foreground': '0 0% 100%', '--secondary': '345 100% 93%', '--secondary-foreground': '343 35% 30%', '--accent': '345 100% 91%', '--accent-foreground': '343 35% 30%', '--ring': '343 85% 65%', '--destructive': sharedColors.destructive, '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': sharedColors.info, '--info-foreground': sharedColors.infoForeground },
    dark: { '--background': '343 35% 12%', '--foreground': '345 20% 94%', '--muted': '343 35% 16%', '--muted-foreground': '345 20% 74%', '--popover': '343 35% 12%', '--popover-foreground': '345 20% 94%', '--card': '343 35% 16%', '--card-foreground': '345 20% 94%', '--border': '343 35% 20%', '--input': '343 35% 20%', '--primary': '343 90% 75%', '--primary-foreground': '343 35% 12%', '--secondary': '343 35% 16%', '--secondary-foreground': '345 20% 94%', '--accent': '343 35% 20%', '--accent-foreground': '345 20% 94%', '--ring': '343 90% 75%', '--destructive': '0 72% 51%', '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': '217.2 91.2% 59.8%', '--info-foreground': sharedColors.infoForeground },
  },
  {
    name: 'Evergreen',
    light: { '--background': '140 70% 97%', '--foreground': '140 40% 18%', '--muted': '140 70% 93%', '--muted-foreground': '140 40% 38%', '--popover': '140 70% 99%', '--popover-foreground': '140 40% 18%', '--card': '140 70% 99%', '--card-foreground': '140 40% 18%', '--border': '140 70% 89%', '--input': '140 70% 89%', '--primary': '140 60% 30%', '--primary-foreground': '0 0% 100%', '--secondary': '140 70% 93%', '--secondary-foreground': '140 40% 18%', '--accent': '140 70% 91%', '--accent-foreground': '140 40% 18%', '--ring': '140 60% 30%', '--destructive': sharedColors.destructive, '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': sharedColors.info, '--info-foreground': sharedColors.infoForeground },
    dark: { '--background': '140 40% 8%', '--foreground': '140 20% 94%', '--muted': '140 40% 12%', '--muted-foreground': '140 20% 74%', '--popover': '140 40% 8%', '--popover-foreground': '140 20% 94%', '--card': '140 40% 12%', '--card-foreground': '140 20% 94%', '--border': '140 40% 16%', '--input': '140 40% 16%', '--primary': '140 70% 60%', '--primary-foreground': '140 40% 8%', '--secondary': '140 40% 12%', '--secondary-foreground': '140 20% 94%', '--accent': '140 40% 16%', '--accent-foreground': '140 20% 94%', '--ring': '140 70% 60%', '--destructive': '0 72% 51%', '--destructive-foreground': sharedColors.destructiveForeground, '--warning': sharedColors.warning, '--warning-foreground': sharedColors.warningForeground, '--info': '217.2 91.2% 59.8%', '--info-foreground': sharedColors.infoForeground },
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

interface DesignSettings extends ColorScheme {
  themeName: string;
  isAdvanced: boolean;
  sidebarStyle: 'primary' | 'card';
  '--radius': string;
  fontSans: string;
  fontHeading: string;
  backgroundImageUrl?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundRepeat?: 'no-repeat' | 'repeat';
  backgroundBrightness?: number;
}

const defaultSettings: DesignSettings = {
  themeName: 'Onyx',
  isAdvanced: false,
  sidebarStyle: 'primary',
  ...presetThemes[0].light,
  '--radius': '1.5rem',
  fontSans: 'Inter',
  fontHeading: 'Inter',
  backgroundBrightness: 100,
};

interface AppearanceContextType {
  settings: DesignSettings;
  setTheme: (themeName: string) => void;
  updateSetting: (key: keyof DesignSettings, value: string | boolean | number) => void;
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
  const root = document.documentElement;
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value as string);
    }
  }
  if (settings.fontSans) {
    root.style.setProperty('--font-sans', `'${settings.fontSans}', sans-serif`);
    loadGoogleFont(settings.fontSans);
  }
  if (settings.fontHeading) {
    root.style.setProperty('--font-heading', `'${settings.fontHeading}', sans-serif`);
    loadGoogleFont(settings.fontHeading);
  }

  const bgOverlay = document.getElementById('background-overlay');
  if (!bgOverlay) return;

  if (settings.backgroundImageUrl) {
    bgOverlay.style.backgroundImage = `url(${settings.backgroundImageUrl})`;
    bgOverlay.style.backgroundSize = settings.backgroundSize || 'cover';
    bgOverlay.style.backgroundRepeat = settings.backgroundRepeat || 'no-repeat';
    bgOverlay.style.backgroundPosition = 'center';
  } else {
    bgOverlay.style.backgroundImage = 'none';
  }
  bgOverlay.style.filter = `brightness(${settings.backgroundBrightness || 100}%)`;
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

  const updateSetting = (key: keyof DesignSettings, value: string | boolean | number) => {
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