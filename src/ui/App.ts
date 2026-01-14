/**
 * Main Application Component
 *
 * Handles routing and main layout.
 */

import type { FinancialProfile } from '@models/profile';
import { createProfile } from '@models/profile';
import { createElement, clearChildren } from '@ui/utils/dom';
import { appStore, type AppState } from '@ui/utils/state';
import { createQuickStart } from '@ui/views/QuickStart';
import { createProfileEditor } from '@ui/views/editor/ProfileEditor';
import { createTrajectoryView } from '@ui/views/TrajectoryView';
import { createOptimizationsView } from '@ui/views/OptimizationsView';
import { createScenarioManager } from '@ui/views/ScenarioManager';
import { createCompareView } from '@ui/views/CompareView';
import { createSettingsView } from '@ui/views/SettingsView';
import { createHelpView } from '@ui/views/HelpView';
import { navigateToCompare } from '@ui/utils/state';
import { loadProfile, loadAllProfiles } from '@storage/profile-store';
import {
  getPreferences,
  applyTheme,
  watchSystemTheme,
  getThemeFromLocalStorage,
  getLastProfileIdFromLocalStorage,
  saveLastProfileIdToLocalStorage,
} from '@storage/preferences';

export interface AppComponent {
  /** The root DOM element */
  element: HTMLElement;
  /** Mount the app to a container */
  mount(container: HTMLElement): void;
  /** Destroy the app */
  destroy(): void;
}

/**
 * Create the main application.
 */
export function createApp(): AppComponent {
  const root = createElement('div', { class: 'app', id: 'app' });

  let currentView: { element: HTMLElement; destroy(): void } | null = null;
  let currentProfile: FinancialProfile | null = null;

  const cleanups: (() => void)[] = [];

  // Apply theme immediately from localStorage
  const initialTheme = getThemeFromLocalStorage();
  applyTheme(initialTheme);

  // Header
  const header = createElement('header', { class: 'app-header' });
  const logo = createElement('div', { class: 'app-header__logo' }, ['Financial Path Visualizer']);
  header.appendChild(logo);

  const nav = createElement('nav', { class: 'app-header__nav' });
  header.appendChild(nav);
  root.appendChild(header);

  // Main content area
  const main = createElement('main', { class: 'app-main' });
  root.appendChild(main);

  // Loading overlay
  const loadingOverlay = createElement('div', { class: 'app-loading', style: 'display: none' });
  loadingOverlay.appendChild(createElement('div', { class: 'app-loading__spinner' }));
  loadingOverlay.appendChild(createElement('div', { class: 'app-loading__text' }, ['Loading...']));
  root.appendChild(loadingOverlay);

  // Error toast
  const errorToast = createElement('div', { class: 'app-error', style: 'display: none' });
  root.appendChild(errorToast);

  // Subscribe to state changes
  const unsubscribe = appStore.subscribe((state, prevState) => {
    // Handle view changes
    if (state.view !== prevState.view || state.profileId !== prevState.profileId) {
      renderView(state);
    }

    // Handle loading state
    loadingOverlay.style.display = state.isLoading ? 'flex' : 'none';

    // Handle error state
    if (state.error) {
      showError(state.error);
    }
  });
  cleanups.push(unsubscribe);

  function showError(message: string): void {
    errorToast.textContent = message;
    errorToast.style.display = 'block';

    setTimeout(() => {
      errorToast.style.display = 'none';
      appStore.update({ error: null });
    }, 5000);
  }

  async function renderView(state: AppState): Promise<void> {
    // Destroy previous view
    if (currentView) {
      currentView.destroy();
      currentView = null;
    }

    clearChildren(main);

    // Load profile if needed
    if (state.profileId && state.profileId !== currentProfile?.id) {
      currentProfile = (await loadProfile(state.profileId)) ?? null;
      if (currentProfile) {
        saveLastProfileIdToLocalStorage(currentProfile.id);
      }
    }

    switch (state.view) {
      case 'quick-start':
        currentView = createQuickStart();
        break;

      case 'editor':
        if (currentProfile) {
          currentView = createProfileEditor({
            profile: currentProfile,
            onSave: (profile) => {
              currentProfile = profile;
            },
          });
        } else {
          // Create new profile if none exists
          currentProfile = createProfile();
          currentView = createProfileEditor({
            profile: currentProfile,
            onSave: (profile) => {
              currentProfile = profile;
            },
          });
        }
        break;

      case 'trajectory':
        if (currentProfile) {
          currentView = createTrajectoryView({ profile: currentProfile });
        } else {
          // Redirect to quick-start if no profile
          appStore.update({ view: 'quick-start' });
          return;
        }
        break;

      case 'optimizations':
        if (currentProfile) {
          currentView = createOptimizationsView({ profile: currentProfile });
        } else {
          // Redirect to quick-start if no profile
          appStore.update({ view: 'quick-start' });
          return;
        }
        break;

      case 'compare':
        if (currentProfile) {
          currentView = createScenarioManager({
            profile: currentProfile,
            onCompare: (baselineId, alternateId, changes) => {
              navigateToCompare(baselineId, alternateId, changes);
            },
          });
        } else {
          // Redirect to quick-start if no profile
          appStore.update({ view: 'quick-start' });
          return;
        }
        break;

      case 'compare-detail':
        if (state.compareBaselineId && state.compareAlternateId) {
          currentView = createCompareView({
            baselineId: state.compareBaselineId,
            alternateId: state.compareAlternateId,
            changes: state.compareChanges,
          });
        } else {
          // Redirect to compare if no comparison data
          appStore.update({ view: 'compare' });
          return;
        }
        break;

      case 'settings':
        currentView = createSettingsView();
        break;

      case 'help':
        currentView = createHelpView();
        break;
    }

    if (currentView) {
      main.appendChild(currentView.element);
    }
  }

  async function initialize(): Promise<void> {
    // Load preferences
    const prefs = await getPreferences();
    applyTheme(prefs.theme);

    // Watch for system theme changes
    if (prefs.theme === 'system') {
      const unwatchTheme = watchSystemTheme(() => {
        applyTheme('system');
      });
      cleanups.push(unwatchTheme);
    }

    // Check for existing profiles
    const profiles = await loadAllProfiles();

    if (profiles.length > 0) {
      // Try to load last profile
      const lastProfileId = getLastProfileIdFromLocalStorage() ?? prefs.lastProfileId;
      const lastProfile = lastProfileId
        ? profiles.find((p: FinancialProfile) => p.id === lastProfileId)
        : profiles[0];

      if (lastProfile) {
        currentProfile = (await loadProfile(lastProfile.id)) ?? null;
        appStore.update({
          view: 'trajectory',
          profileId: lastProfile.id,
        });
        return;
      }
    }

    // Show quick start for new users
    renderView(appStore.get());
  }

  return {
    element: root,

    mount(container: HTMLElement): void {
      container.appendChild(root);
      initialize();
    },

    destroy(): void {
      if (currentView) {
        currentView.destroy();
      }
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
