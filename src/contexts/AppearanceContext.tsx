import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { showError, showSuccess, showLoading, dismissToast } from '@/utils/toast';
import { hexToHsl } from '@/utils/colors';

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
}

const sharedColors = {
  destructive: '0 84.2% 60.2%',
  destructiveForeground: '0 0% 98%',
  warning: '47.9 95.8% 53.1%',
  warningForeground: '48 96% 10%',
  info: '217.2 91.2% 59.8%',
  infoForeground: '0 0% 98%',
};

const createTheme = (name: string, p: string, s: string, a: string, bg: string, fg: string): Theme => {
  const pFg = `${p.split(' ')[0]} 20% 98%`;
  const sFg = fg;
  const aFg = fg;
  return {
    name,
    light: {
      '--background': bg, '--foreground': fg, '--muted': `${bg.split(' ')[0]} 10% 96%`, '--muted-foreground': `${fg.split(' ')[0]} 5% 45%`,
      '--popover': bg, '--popover-foreground': fg, '--card': `${bg.split(' ')[0]} 10% 99%`, '--card-foreground': fg,
      '--border': `${bg.split(' ')[0]} 10% 90%`, '--input': `${bg.split(' ')[0]} 10% 90%`, '--primary': p, '--primary-foreground': pFg,
      '--secondary': s, '--secondary-foreground': sFg, '--accent': a, '--accent-foreground': aFg, '--ring': p,
      ...sharedColors,
    },
  };
};

export const presetThemes: Theme[] = [
  createTheme('Onyx', '240 5.9% 10%', '0 0% 96.1%', '0 0% 94.1%', '0 0% 100%', '240 10% 3.9%'),
  createTheme('Nautical', '210 79% 46%', '204 100% 92%', '204 100% 90%', '204 100% 96%', '215 60% 22%'),
  createTheme('Sakura', '343 85% 65%', '345 100% 93%', '345 100% 91%', '345 100% 97%', '343 35% 30%'),
  createTheme('Evergreen', '140 60% 30%', '140 70% 93%', '140 70% 91%', '140 70% 97%', '140 40% 18%'),
  createTheme('Sunset', '25 95% 53%', '20 90% 94%', '20 90% 92%', '20 100% 97%', '20 50% 25%'),
  createTheme('Minty', '160 70% 40%', '160 80% 94%', '160 80% 92%', '160 100% 98%', '160 50% 20%'),
  createTheme('Industrial', '220 15% 40%', '220 10% 95%', '220 10% 93%', '220 10% 98%', '220 20% 15%'),
  createTheme('Rose Gold', '350 80% 60%', '350 100% 94%', '350 100% 92%', '350 100% 98%', '350 40% 25%'),
  createTheme('Cyberpunk', '260 90% 60%', '320 90% 15%', '320 90% 20%', '260 50% 5%', '260 20% 95%'),
  createTheme('Latte', '30 40% 40%', '30 30% 95%', '30 30% 93%', '30 20% 98%', '30 60% 15%'),
  createTheme('Oceanic', '200 80% 50%', '200 90% 94%', '200 90% 92%', '200 100% 98%', '200 60% 20%'),
  createTheme('Crimson', '0 70% 50%', '0 80% 96%', '0 80% 94%', '0 100% 99%', '0 50% 20%'),
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
  layoutStyle: 'floating' | 'docked';
  blurEnabled: boolean;
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
  layoutStyle: 'floating',
  blurEnabled: true,
};

interface AppearanceContextType {
  settings: DesignSettings;
  setTheme: (themeName: string) => void;
  updateSetting: (key: keyof DesignSettings, value: string | boolean | number) => void;
  resetSettings: () => void;
  randomizeTheme: () => void;
  generateAIDesign: () => Promise<void>;
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

  if (settings.blurEnabled) {
    root.classList.add('blur-enabled');
  } else {
    root.classList.remove('blur-enabled');
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
      if (key === '--border') {
        newSettings['--input'] = value as string;
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
    const randomHue = Math.floor(Math.random() * 360);
    const complementaryHue = (randomHue + 180) % 360;

    const randomColors = {
      '--primary': `${randomHue} ${Math.floor(Math.random() * 30 + 70)}% ${Math.floor(Math.random() * 20 + 40)}%`,
      '--primary-foreground': `${randomHue} 20% 95%`,
      '--background': `${randomHue} 20% 98%`,
      '--foreground': `${randomHue} 10% 10%`,
      '--card': `${randomHue} 20% 99%`,
      '--card-foreground': `${randomHue} 10% 10%`,
      '--secondary': `${randomHue} 20% 94%`,
      '--secondary-foreground': `${randomHue} 10% 10%`,
      '--accent': `${complementaryHue} 80% 95%`,
      '--accent-foreground': `${complementaryHue} 10% 10%`,
      '--border': `${randomHue} 20% 90%`,
      '--input': `${randomHue} 20% 90%`,
      '--ring': `${randomHue} ${Math.floor(Math.random() * 30 + 70)}% ${Math.floor(Math.random() * 20 + 40)}%`,
    };

    const randomCategoryName = Object.keys(fontCategories)[Math.floor(Math.random() * Object.keys(fontCategories).length)] as keyof typeof fontCategories;
    const randomCategory = fontCategories[randomCategoryName];
    let headingFont = randomCategory.headings[Math.floor(Math.random() * randomCategory.headings.length)];
    let bodyFont = randomCategory.body[Math.floor(Math.random() * randomCategory.body.length)];
    if (randomCategoryName !== 'Minimalist') {
      while (headingFont === bodyFont) { bodyFont = randomCategory.body[Math.floor(Math.random() * randomCategory.body.length)]; }
    }
    const randomSidebarStyle = (Math.random() > 0.5 ? 'primary' : 'card') as 'primary' | 'card';
    const randomRadius = `${(Math.random() * 1.5 + 0.25).toFixed(2)}rem`;

    const newSettings: DesignSettings = {
      ...defaultSettings,
      ...randomColors,
      themeName: 'Random',
      fontHeading: headingFont,
      fontSans: bodyFont,
      sidebarStyle: randomSidebarStyle,
      '--radius': randomRadius,
      isAdvanced: false,
    };

    setSettings(newSettings);
    debouncedSave(newSettings);
  };

  const generateAIDesign = async () => {
    const toastId = showLoading("Analyzing your brand with AI...");
    try {
        const { data, error } = await supabase.functions.invoke('generate-design-theme');
        if (error) throw error;
        if (data.error) throw new Error(data.error);

        const { themeName, colors, fonts, radius, sidebarStyle } = data;

        const newSettings: Partial<DesignSettings> = {
            themeName: themeName || 'AI Generated',
            '--primary': hexToHsl(colors.primary),
            '--primary-foreground': hexToHsl(colors.primaryForeground),
            '--secondary': hexToHsl(colors.secondary),
            '--secondary-foreground': hexToHsl(colors.secondaryForeground),
            '--background': hexToHsl(colors.background),
            '--foreground': hexToHsl(colors.foreground),
            '--card': hexToHsl(colors.card),
            '--card-foreground': hexToHsl(colors.cardForeground),
            '--accent': hexToHsl(colors.accent),
            '--accent-foreground': hexToHsl(colors.foreground),
            '--border': hexToHsl(colors.card).replace(/(\d+)%$/, (match, p1) => `${Math.max(0, parseInt(p1) - 5)}%`),
            '--ring': hexToHsl(colors.primary),
            fontHeading: fonts.heading,
            fontSans: fonts.body,
            '--radius': radius,
            sidebarStyle: sidebarStyle,
            isAdvanced: false,
        };
        
        newSettings['--input'] = newSettings['--border'];
        newSettings['--muted'] = newSettings['--secondary'];
        newSettings['--muted-foreground'] = newSettings['--secondary-foreground']?.replace(/(\d+)%$/, (match, p1) => `${Math.max(0, parseInt(p1) - 20)}%`);
        newSettings['--popover'] = newSettings['--background'];
        newSettings['--popover-foreground'] = newSettings['--foreground'];

        const finalSettings = { ...settings, ...newSettings };
        setSettings(finalSettings as DesignSettings);
        debouncedSave(finalSettings as DesignSettings);
        dismissToast(toastId);
        showSuccess("AI theme applied! ✨");

    } catch (err: any) {
        dismissToast(toastId);
        showError(err.message || "Failed to generate AI theme.");
    }
  };

  return (
    <AppearanceContext.Provider value={{ settings, setTheme, updateSetting, resetSettings, isLoading, isAdvanced: settings.isAdvanced, setAdvanced, randomizeTheme, generateAIDesign }}>
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