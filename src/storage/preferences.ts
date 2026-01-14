/**
 * Preferences Storage
 *
 * User preferences stored in IndexedDB and localStorage.
 */

import type { ID } from '@models/common';
import { getDatabase } from './db';

/**
 * User preferences.
 */
export interface UserPreferences {
  /** UI theme */
  theme: 'light' | 'dark' | 'system';
  /** Currency display format */
  currency: string;
  /** Date format */
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  /** Number format locale */
  numberLocale: string;
  /** Last opened profile ID */
  lastProfileId: ID | null;
  /** Whether to show onboarding */
  showOnboarding: boolean;
  /** Whether to auto-save changes */
  autoSave: boolean;
  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;
  /** Chart animation preference */
  animateCharts: boolean;
  /** Collapsed sidebar sections */
  collapsedSections: string[];
}

/**
 * Default preferences.
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  numberLocale: 'en-US',
  lastProfileId: null,
  showOnboarding: true,
  autoSave: true,
  autoSaveInterval: 30000, // 30 seconds
  animateCharts: true,
  collapsedSections: [],
};

const PREFERENCES_KEY = 'user-preferences';

/**
 * Get all preferences.
 */
export async function getPreferences(): Promise<UserPreferences> {
  try {
    const db = await getDatabase();
    const stored = await db.get('preferences', PREFERENCES_KEY);

    if (stored && typeof stored === 'object') {
      // Merge with defaults to ensure all keys exist
      return {
        ...DEFAULT_PREFERENCES,
        ...(stored as Partial<UserPreferences>),
      };
    }
  } catch (error) {
    console.warn('Failed to load preferences from IndexedDB, using defaults', error);
  }

  return { ...DEFAULT_PREFERENCES };
}

/**
 * Save all preferences.
 */
export async function savePreferences(preferences: UserPreferences): Promise<void> {
  try {
    const db = await getDatabase();
    await db.put('preferences', preferences, PREFERENCES_KEY);
  } catch (error) {
    console.error('Failed to save preferences to IndexedDB', error);
    throw error;
  }
}

/**
 * Update specific preferences.
 */
export async function updatePreferences(
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  const current = await getPreferences();
  const updated = { ...current, ...updates };
  await savePreferences(updated);
  return updated;
}

/**
 * Reset preferences to defaults.
 */
export async function resetPreferences(): Promise<UserPreferences> {
  await savePreferences(DEFAULT_PREFERENCES);
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Get a single preference value.
 */
export async function getPreference<K extends keyof UserPreferences>(
  key: K
): Promise<UserPreferences[K]> {
  const prefs = await getPreferences();
  return prefs[key];
}

/**
 * Set a single preference value.
 */
export async function setPreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): Promise<void> {
  await updatePreferences({ [key]: value });
}

// Theme-specific utilities

/**
 * Get the effective theme (resolving 'system' to actual theme).
 */
export function getEffectiveTheme(theme: UserPreferences['theme']): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Apply theme to the document.
 */
export function applyTheme(theme: UserPreferences['theme']): void {
  const effectiveTheme = getEffectiveTheme(theme);
  document.documentElement.setAttribute('data-theme', effectiveTheme);

  // Also set color-scheme for native elements
  document.documentElement.style.colorScheme = effectiveTheme;
}

/**
 * Watch for system theme changes.
 */
export function watchSystemTheme(callback: (isDark: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent): void => {
    callback(e.matches);
  };

  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

// localStorage utilities for quick access to critical preferences

const LS_THEME_KEY = 'fpv-theme';
const LS_LAST_PROFILE_KEY = 'fpv-last-profile';

/**
 * Get theme from localStorage (for immediate application before DB loads).
 */
export function getThemeFromLocalStorage(): UserPreferences['theme'] {
  try {
    const stored = localStorage.getItem(LS_THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage might be unavailable
  }
  return DEFAULT_PREFERENCES.theme;
}

/**
 * Save theme to localStorage (for quick access on next load).
 */
export function saveThemeToLocalStorage(theme: UserPreferences['theme']): void {
  try {
    localStorage.setItem(LS_THEME_KEY, theme);
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Get last profile ID from localStorage.
 */
export function getLastProfileIdFromLocalStorage(): ID | null {
  try {
    return localStorage.getItem(LS_LAST_PROFILE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save last profile ID to localStorage.
 */
export function saveLastProfileIdToLocalStorage(id: ID | null): void {
  try {
    if (id) {
      localStorage.setItem(LS_LAST_PROFILE_KEY, id);
    } else {
      localStorage.removeItem(LS_LAST_PROFILE_KEY);
    }
  } catch {
    // localStorage might be unavailable
  }
}
