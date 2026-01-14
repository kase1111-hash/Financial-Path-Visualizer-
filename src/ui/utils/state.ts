/**
 * State Management
 *
 * Simple reactive state for UI components.
 */

import type { Change } from '@models/comparison';

/**
 * A listener function that receives state changes.
 */
export type StateListener<T> = (state: T, prevState: T) => void;

/**
 * A simple reactive store.
 */
export interface Store<T> {
  /** Get current state */
  get(): T;
  /** Update state */
  set(newState: T): void;
  /** Partially update state */
  update(partial: Partial<T>): void;
  /** Subscribe to changes */
  subscribe(listener: StateListener<T>): () => void;
}

/**
 * Create a reactive store.
 */
export function createStore<T extends object>(initialState: T): Store<T> {
  let state = { ...initialState };
  const listeners = new Set<StateListener<T>>();

  function notify(prevState: T): void {
    for (const listener of listeners) {
      listener(state, prevState);
    }
  }

  return {
    get() {
      return state;
    },

    set(newState: T) {
      const prevState = state;
      state = { ...newState };
      notify(prevState);
    },

    update(partial: Partial<T>) {
      const prevState = state;
      state = { ...state, ...partial };
      notify(prevState);
    },

    subscribe(listener: StateListener<T>) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Application state.
 */
export interface AppState {
  /** Current view */
  view: 'quick-start' | 'editor' | 'trajectory' | 'compare' | 'compare-detail' | 'settings' | 'optimizations';
  /** Current profile ID */
  profileId: string | null;
  /** Whether profile has unsaved changes */
  isDirty: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Comparison baseline profile ID */
  compareBaselineId: string | null;
  /** Comparison alternate profile ID */
  compareAlternateId: string | null;
  /** Changes made in comparison */
  compareChanges: Change[];
}

/**
 * Initial app state.
 */
export const initialAppState: AppState = {
  view: 'quick-start',
  profileId: null,
  isDirty: false,
  isLoading: false,
  error: null,
  compareBaselineId: null,
  compareAlternateId: null,
  compareChanges: [],
};

/**
 * Global app store.
 */
export const appStore = createStore<AppState>(initialAppState);

/**
 * Navigate to a view.
 */
export function navigate(view: AppState['view']): void {
  appStore.update({ view, error: null });
}

/**
 * Set loading state.
 */
export function setLoading(isLoading: boolean): void {
  appStore.update({ isLoading });
}

/**
 * Set error.
 */
export function setError(error: string | null): void {
  appStore.update({ error, isLoading: false });
}

/**
 * Set current profile.
 */
export function setCurrentProfile(profileId: string | null): void {
  appStore.update({ profileId, isDirty: false });
}

/**
 * Mark profile as dirty (has unsaved changes).
 */
export function markDirty(): void {
  appStore.update({ isDirty: true });
}

/**
 * Mark profile as clean (saved).
 */
export function markClean(): void {
  appStore.update({ isDirty: false });
}

/**
 * Navigate to comparison view with specific profiles.
 */
export function navigateToCompare(baselineId: string, alternateId: string, changes: Change[]): void {
  appStore.update({
    view: 'compare-detail',
    compareBaselineId: baselineId,
    compareAlternateId: alternateId,
    compareChanges: changes,
    error: null,
  });
}
