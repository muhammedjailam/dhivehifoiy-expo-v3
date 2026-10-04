import { createPersistedStore } from './store';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ReaderTint = 'none' | 'sepia' | 'night';

export type ReaderSettings = {
  /** vertical = continuous scroll, horizontal = page by page */
  mode: 'vertical' | 'horizontal';
  /** Right-to-left page turning (Dhivehi books) when paging horizontally. */
  rtl: boolean;
  /** 0 = fit width, 1 = fit height, 2 = fit page */
  fit: 0 | 1 | 2;
  tint: ReaderTint;
  /** 0..0.7 extra dimming applied over the page */
  dim: number;
  keepAwake: boolean;
  lockOrientation: boolean;
};

type SettingsState = {
  theme: ThemePreference;
  reader: ReaderSettings;
  recentSearches: string[];
  /** Customer id that owns the encrypted downloads on this device. */
  downloadsOwner: number | null;
  pushRegistered: boolean;
};

export const defaultReaderSettings: ReaderSettings = {
  mode: 'vertical',
  rtl: true,
  fit: 0,
  tint: 'none',
  dim: 0,
  keepAwake: true,
  lockOrientation: false,
};

export const settingsStore = createPersistedStore<SettingsState>('settings.v1', {
  theme: 'system',
  reader: defaultReaderSettings,
  recentSearches: [],
  downloadsOwner: null,
  pushRegistered: false,
});

export const useSettings = <S,>(selector: (s: SettingsState) => S) => settingsStore.use(selector);

export function setThemePreference(theme: ThemePreference) {
  settingsStore.set((s) => ({ ...s, theme }));
}

export function updateReaderSettings(patch: Partial<ReaderSettings>) {
  settingsStore.set((s) => ({ ...s, reader: { ...defaultReaderSettings, ...s.reader, ...patch } }));
}

export function pushRecentSearch(term: string) {
  const q = term.trim();
  if (q.length < 2) return;
  settingsStore.set((s) => ({
    ...s,
    recentSearches: [q, ...s.recentSearches.filter((t) => t !== q)].slice(0, 8),
  }));
}

export function clearRecentSearches() {
  settingsStore.set((s) => ({ ...s, recentSearches: [] }));
}
