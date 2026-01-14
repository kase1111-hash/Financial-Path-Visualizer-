import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  getEffectiveTheme,
  getThemeFromLocalStorage,
  saveThemeToLocalStorage,
  getLastProfileIdFromLocalStorage,
  saveLastProfileIdToLocalStorage,
} from '@storage/preferences';

describe('preferences', () => {
  describe('DEFAULT_PREFERENCES', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_PREFERENCES.theme).toBe('system');
      expect(DEFAULT_PREFERENCES.currency).toBe('USD');
      expect(DEFAULT_PREFERENCES.dateFormat).toBe('MM/DD/YYYY');
      expect(DEFAULT_PREFERENCES.autoSave).toBe(true);
      expect(DEFAULT_PREFERENCES.autoSaveInterval).toBe(30000);
      expect(DEFAULT_PREFERENCES.showOnboarding).toBe(true);
      expect(DEFAULT_PREFERENCES.animateCharts).toBe(true);
    });
  });

  describe('getEffectiveTheme', () => {
    beforeEach(() => {
      // Mock matchMedia
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return light when theme is light', () => {
      expect(getEffectiveTheme('light')).toBe('light');
    });

    it('should return dark when theme is dark', () => {
      expect(getEffectiveTheme('dark')).toBe('dark');
    });

    it('should detect system preference when theme is system', () => {
      // Our mock returns dark for prefers-color-scheme: dark
      expect(getEffectiveTheme('system')).toBe('dark');
    });

    it('should handle light system preference', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        matches: false, // Light mode
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })));

      expect(getEffectiveTheme('system')).toBe('light');
    });
  });

  describe('localStorage utilities', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    describe('theme', () => {
      it('should save and retrieve theme', () => {
        saveThemeToLocalStorage('dark');
        expect(getThemeFromLocalStorage()).toBe('dark');

        saveThemeToLocalStorage('light');
        expect(getThemeFromLocalStorage()).toBe('light');

        saveThemeToLocalStorage('system');
        expect(getThemeFromLocalStorage()).toBe('system');
      });

      it('should return default for invalid stored value', () => {
        localStorage.setItem('fpv-theme', 'invalid');
        expect(getThemeFromLocalStorage()).toBe('system');
      });

      it('should return default when nothing stored', () => {
        expect(getThemeFromLocalStorage()).toBe('system');
      });
    });

    describe('lastProfileId', () => {
      it('should save and retrieve profile ID', () => {
        saveLastProfileIdToLocalStorage('profile-123');
        expect(getLastProfileIdFromLocalStorage()).toBe('profile-123');
      });

      it('should return null when nothing stored', () => {
        expect(getLastProfileIdFromLocalStorage()).toBeNull();
      });

      it('should clear when saving null', () => {
        saveLastProfileIdToLocalStorage('profile-123');
        saveLastProfileIdToLocalStorage(null);
        expect(getLastProfileIdFromLocalStorage()).toBeNull();
      });
    });
  });
});
