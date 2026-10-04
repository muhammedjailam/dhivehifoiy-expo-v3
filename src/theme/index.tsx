import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Appearance, I18nManager, Platform, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { dark, light, type Palette } from './colors';
import { useSettings } from '../lib/settings';

export * from './colors';

const ThemeContext = createContext<Palette>(light);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSettings((s) => s.theme);
  const system = useColorScheme();

  useEffect(() => {
    // Keeps native UI (alerts, pickers, keyboard) in sync with the in-app choice.
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const palette = scheme === 'dark' ? dark : light;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.bg).catch(() => {});
  }, [palette.bg]);

  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Re-provides a palette (used by portals so overlays keep the theme of where they were declared). */
export function ThemeScope({ value, children }: { value: Palette; children: React.ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Forces the dark palette for a subtree (reader chrome is always dark). */
export function ForceDark({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={dark}>{children}</ThemeContext.Provider>;
}

export const fonts = {
  waheed: 'MVWaheed',
  faseyha: 'MVFaseyha',
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const isRTL = () => I18nManager.isRTL;

/** Icon that points "back" in the current layout direction. */
export const backIcon = () => (I18nManager.isRTL ? 'chevron-forward' : 'chevron-back');
/** Icon that points "forward / more" in the current layout direction. */
export const forwardIcon = () => (I18nManager.isRTL ? 'chevron-back' : 'chevron-forward');

export function useShadow(level: 1 | 2 | 3 = 1) {
  const t = useTheme();
  return useMemo(() => {
    const presets = {
      1: { opacity: 0.08, radius: 8, y: 3, elevation: 2 },
      2: { opacity: 0.14, radius: 14, y: 6, elevation: 6 },
      3: { opacity: 0.22, radius: 24, y: 12, elevation: 12 },
    } as const;
    const p = presets[level];
    return Platform.select({
      ios: {
        shadowColor: t.shadow,
        shadowOpacity: t.scheme === 'dark' ? p.opacity * 2 : p.opacity,
        shadowRadius: p.radius,
        shadowOffset: { width: 0, height: p.y },
      },
      default: { elevation: p.elevation, shadowColor: t.shadow },
    });
  }, [t, level]);
}
