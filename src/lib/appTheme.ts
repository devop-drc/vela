// Admin-app light/dark theme. Persisted per device and applied by
// DashboardLayout so it covers every admin page without leaking into the
// landing page, auth pages, or storefronts (which theme themselves).
//
// Gotcha this module exists to solve: AppearanceContext writes the LIGHT
// token values inline on :root, and inline styles beat the `.dark` class
// rules in globals.css. Going dark therefore removes those inline color
// tokens so the `.dark` class can take effect — and AppearanceContext skips
// re-writing them while the class is present (see applySettingsToDOM).

import { useSyncExternalStore } from 'react';

export type AppTheme = 'light' | 'dark';

const KEY = 'vela-app-theme';

/** Color tokens that exist in both :root and .dark — the set AppearanceContext
    must not write inline while dark mode is active. */
export const THEME_TOKEN_KEYS = new Set([
  '--background', '--foreground', '--muted', '--muted-foreground',
  '--card', '--card-foreground', '--popover', '--popover-foreground',
  '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
  '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
  '--success', '--success-foreground', '--warning', '--warning-foreground',
  '--info', '--info-foreground', '--border', '--input', '--ring',
]);

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getAppTheme = (): AppTheme => {
  try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
};

/** Toggle the `dark` class and clear the inline light tokens that would beat it. */
export const applyAppTheme = (theme: AppTheme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  if (theme === 'dark') {
    THEME_TOKEN_KEYS.forEach((k) => root.style.removeProperty(k));
  }
};

export const setAppTheme = (theme: AppTheme) => {
  try { localStorage.setItem(KEY, theme); } catch { /* private mode */ }
  applyAppTheme(theme);
  notify();
};

export const useAppTheme = (): AppTheme => useSyncExternalStore(subscribe, getAppTheme, () => 'light');
