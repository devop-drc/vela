import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { showError, showSuccess } from '@/utils/toast';
import { hexToHsl } from '@/utils/colors';

// --- THEME DEFINITIONS ---
interface ColorScheme {
  '--background': string;
  '--foreground': string;
  '--card': string;
  '--card-foreground': string;
  '--popover': string;
  '--popover-foreground': string;
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
  '--border': string;
  '--input': string;
  '--ring': string;
  '--muted'?: string;
  '--muted-foreground'?: string;
}

export interface CustomTheme extends Theme {
  id: string;
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
  const card = `${bg.split(' ')[0]} ${Math.max(0, parseFloat(bg.split(' ')[1]) - 2)}% ${Math.min(100, parseFloat(bg.split(' ')[2]) + 2)}%`;
  return {
    name,
    light: {
      '--background': bg, '--foreground': fg, '--muted': `${bg.split(' ')[0]} 10% 96%`, '--muted-foreground': `${fg.split(' ')[0]} 5% 45%`,
      '--popover': bg, '--popover-foreground': fg, '--card': card, '--card-foreground': fg,
      '--border': `${bg.split(' ')[0]} 10% 90%`, '--input': `${bg.split(' ')[0]} 10% 90%`, '--primary': p, '--primary-foreground': pFg,
      '--secondary': s, '--secondary-foreground': sFg, '--accent': a, '--accent-foreground': aFg, '--ring': p,
      ...sharedColors,
    },
  };
};

export const presetThemes: Theme[] = [
  createTheme('Midnight Blush', '255 50% 40%', '330 80% 95%', '330 80% 88%', '255 30% 98%', '255 50% 15%'),
  createTheme('Emerald Sands', '150 60% 30%', '45 50% 95%', '45 50% 88%', '45 30% 99%', '150 50% 10%'),
  createTheme('Solar Flare', '35 95% 55%', '20 20% 25%', '20 20% 35%', '20 15% 12%', '35 100% 95%'),
  createTheme('Retro Groove', '180 70% 40%', '30 90% 95%', '30 90% 88%', '30 20% 99%', '180 60% 15%'),
  createTheme('Graphite & Gold', '220 15% 25%', '40 90% 95%', '40 90% 85%', '40 10% 98%', '40 90% 50%'),
  createTheme('Oceanic', '200 80% 50%', '200 90% 94%', '200 90% 92%', '200 100% 98%', '200 60% 20%'),
  createTheme('Crimson', '0 70% 50%', '0 80% 96%', '0 80% 94%', '0 100% 99%', '0 50% 20%'),
  createTheme('Onyx', '240 6% 10%', '0 0% 96%', '0 0% 94%', '0 0% 100%', '240 10% 4%'),
  createTheme('Sakura', '345 80% 60%', '345 50% 96%', '345 50% 92%', '345 20% 99%', '345 40% 20%'),
  createTheme('Forest', '120 40% 30%', '120 20% 95%', '120 20% 88%', '120 10% 98%', '120 50% 10%'),
  createTheme('Industrial', '210 10% 40%', '210 5% 95%', '210 5% 88%', '210 5% 99%', '210 15% 15%'),
  createTheme('Sunset', '25 90% 60%', '15 30% 96%', '15 30% 92%', '15 10% 99%', '15 60% 25%'),
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

export const curatedImages = [
  { src: 'https://images.unsplash.com/photo-1619204715997-1c8a4834f52d?q=80&w=2400', author: 'Prima Vista' },
  { src: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2400', author: 'Prima Vista' },
  { src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2400', author: 'Gradienta' },
  { src: 'https://images.unsplash.com/photo-1554034483-043a35442025?q=80&w=2400', author: 'Javier Miranda' },
  { src: 'https://images.unsplash.com/photo-1604079628040-94301bb21b91?q=80&w=2400', author: 'Gradienta' },
  { src: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2400', author: 'Scott Webb' },
  { src: 'https://images.unsplash.com/photo-1507525428034-b723a996f329?q=80&w=2400', author: 'Sean O.' },
  { src: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2400', author: 'John Towner' },
  { src: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=2400', author: 'John Fowler' },
  { src: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?q=80&w=2400', author: 'Alin Rusu' },
  { src: 'https://images.unsplash.com/photo-1536566482680-fca31930a0bd?q=80&w=2400', author: 'Dawid Zawiła' },
  { src: 'https://images.unsplash.com/photo-1614850523011-8f49ffc73908?q=80&w=2400', author: 'Scott Webb' },
];

interface DesignSettings extends ColorScheme {
  themeName: string;
  isAdvanced: boolean;
  sidebarStyle: 'primary' | 'card';
  '--radius': string;
  fontSans: string;
  fontHeading: string;
  backgroundImageUrl?: string;
  solidBackgroundColor?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundRepeat?: 'no-repeat' | 'repeat';
  backgroundBrightness?: number;
  backgroundContrast?: number;
  backgroundSaturation?: number;
  backgroundHue?: number;
  layoutStyle: 'floating' | 'docked';
  sidebarWidth: 'compact' | 'default' | 'spacious';
  blurEnabled: boolean;
  customThemes?: CustomTheme[];
}

const defaultSettings: DesignSettings = {
  themeName: 'Onyx',
  isAdvanced: false,
  sidebarStyle: 'primary',
  ...presetThemes[7].light,
  '--radius': '1.5rem',
  fontSans: 'Inter',
  fontHeading: 'Inter',
  backgroundBrightness: 100,
  backgroundContrast: 100,
  backgroundSaturation: 100,
  backgroundHue: 0,
  layoutStyle: 'floating',
  sidebarWidth: 'default',
  blurEnabled: true,
  customThemes: [],
};

interface AppearanceContextType {
  settings: DesignSettings;
  setTheme: (themeName: string) => void;
  updateSetting: (key: keyof DesignSettings, value: any) => void;
  resetSettings: () => void;
  randomizeTheme: () => void;
  isLoading: boolean;
  isAdvanced: boolean;
  setAdvanced: (isAdvanced: boolean) => void;
  saveCustomTheme: (themeName: string) => void;
  deleteCustomTheme: (themeId: string) => void;
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
    bgOverlay.style.backgroundColor = 'transparent';
    bgOverlay.style.backgroundSize = settings.backgroundSize || 'cover';
    bgOverlay.style.backgroundRepeat = settings.backgroundRepeat || 'no-repeat';
    bgOverlay.style.backgroundPosition = 'center';
  } else if (settings.solidBackgroundColor) {
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.backgroundColor = `hsl(${settings.solidBackgroundColor})`;
  } else {
    bgOverlay.style.backgroundImage = 'none';
    bgOverlay.style.backgroundColor = `hsl(${settings['--background']})`;
  }
  
  bgOverlay.style.filter = `
    brightness(${settings.backgroundBrightness || 100}%)
    contrast(${settings.backgroundContrast || 100}%)
    saturate(${settings.backgroundSaturation || 100}%)
    hue-rotate(${settings.backgroundHue || 0}deg)
  `;
};

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

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
    const allThemes = [...presetThemes, ...(settings.customThemes || [])];
    const theme = allThemes.find(t => t.name === themeName) || presetThemes[0];
    setSettings(prev => {
      const newSettings = { ...prev, ...theme.light, themeName, isAdvanced: false, solidBackgroundColor: undefined };
      debouncedSave(newSettings);
      return newSettings;
    });
  };

  const updateSetting = (key: keyof DesignSettings, value: any) => {
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
    const customThemes = settings.customThemes;
    const newSettings = { ...defaultSettings, customThemes };
    setSettings(newSettings);
    debouncedSave(newSettings);
  };

  const randomizeTheme = () => {
    // 1. Random Theme/Colors
    const randomTheme = getRandomItem(presetThemes);

    // 2. Random Fonts
    const fontCategoryName = getRandomItem(Object.keys(fontCategories)) as keyof typeof fontCategories;
    const { headings, body } = fontCategories[fontCategoryName];
    
    // eslint-disable-next-line prefer-const
    let headingFont = getRandomItem(headings);
    let bodyFont = getRandomItem(body);
    if (fontCategoryName !== 'Minimalist') {
      while (headingFont === bodyFont) {
        bodyFont = getRandomItem(body);
      }
    }

    // 3. Random Layout
    const sidebarStyle = getRandomItem<'primary' | 'card'>(['primary', 'card']);
    const layoutStyle = getRandomItem<'floating' | 'docked'>(['floating', 'docked']);
    const sidebarWidth = getRandomItem<'compact' | 'default' | 'spacious'>(['compact', 'default', 'spacious']);
    const radius = getRandomItem(['0.5rem', '0.75rem', '1.0rem', '1.5rem']);

    // 4. Random Background
    const backgroundType = getRandomItem(['default', 'image', 'solid']);
    let backgroundImageUrl: string | undefined = undefined;
    let solidBackgroundColor: string | undefined = undefined;

    if (backgroundType === 'image') {
      backgroundImageUrl = getRandomItem(curatedImages).src;
    } else if (backgroundType === 'solid') {
      const [h, s, l] = randomTheme.light['--background'].split(' ').map(parseFloat);
      solidBackgroundColor = `${h} ${s}% ${l - 2}%`;
    }
    
    // 5. Random Effects
    const blurEnabled = Math.random() > 0.5;
    const backgroundBrightness = 80 + Math.floor(Math.random() * 41); // 80-120
    const backgroundContrast = 90 + Math.floor(Math.random() * 41); // 90-130

    const newSettings: Partial<DesignSettings> = {
      ...randomTheme.light,
      themeName: randomTheme.name,
      isAdvanced: false,
      fontHeading: headingFont,
      fontSans: bodyFont,
      sidebarStyle,
      layoutStyle,
      sidebarWidth,
      '--radius': radius,
      backgroundImageUrl,
      solidBackgroundColor,
      blurEnabled,
      backgroundBrightness,
      backgroundContrast,
    };

    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      debouncedSave(updatedSettings);
      return updatedSettings;
    });
  };

  const saveCustomTheme = (themeName: string) => {
    setSettings(prev => {
      const newTheme: CustomTheme = {
        id: crypto.randomUUID(),
        name: themeName,
        light: {
          '--background': prev['--background'], '--foreground': prev['--foreground'], '--card': prev['--card'], '--card-foreground': prev['--card-foreground'],
          '--popover': prev['--popover'], '--popover-foreground': prev['--popover-foreground'], '--primary': prev['--primary'], '--primary-foreground': prev['--primary-foreground'],
          '--secondary': prev['--secondary'], '--secondary-foreground': prev['--secondary-foreground'], '--accent': prev['--accent'], '--accent-foreground': prev['--accent-foreground'],
          '--destructive': prev['--destructive'], '--destructive-foreground': prev['--destructive-foreground'], '--warning': prev['--warning'], '--warning-foreground': prev['--warning-foreground'],
          '--info': prev['--info'], '--info-foreground': prev['--info-foreground'], '--border': prev['--border'], '--input': prev['--input'], '--ring': prev['--ring'],
        }
      };
      const updatedThemes = [...(prev.customThemes || []), newTheme];
      const newSettings = { ...prev, customThemes: updatedThemes, themeName: newTheme.name };
      debouncedSave(newSettings);
      showSuccess(`Theme "${themeName}" saved!`);
      return newSettings;
    });
  };

  const deleteCustomTheme = (themeId: string) => {
    setSettings(prev => {
      const updatedThemes = (prev.customThemes || []).filter(t => t.id !== themeId);
      const newSettings = { ...prev, customThemes: updatedThemes };
      if (prev.themeName === prev.customThemes?.find(t => t.id === themeId)?.name) {
        newSettings.themeName = defaultSettings.themeName;
        Object.assign(newSettings, defaultSettings);
      }
      debouncedSave(newSettings);
      showSuccess("Custom theme deleted.");
      return newSettings;
    });
  };

  return (
    <AppearanceContext.Provider value={{ settings, setTheme, updateSetting, resetSettings, isLoading, isAdvanced: settings.isAdvanced, setAdvanced, randomizeTheme, saveCustomTheme, deleteCustomTheme }}>
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