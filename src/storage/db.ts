/**
 * IndexedDB Database
 *
 * Database schema and connection management for local storage.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FinancialProfile } from '@models/profile';
import type { Trajectory } from '@models/trajectory';

/**
 * Database schema definition.
 */
export interface FinancialDB extends DBSchema {
  profiles: {
    key: string;
    value: FinancialProfile;
    indexes: {
      'by-updated': Date;
      'by-name': string;
    };
  };
  trajectories: {
    key: string;
    value: Trajectory;
    indexes: {
      'by-profile': string;
      'by-generated': Date;
    };
  };
  preferences: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'financial-path-visualizer';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<FinancialDB> | null = null;

/**
 * Get or create the database connection.
 */
export async function getDatabase(): Promise<IDBPDatabase<FinancialDB>> {
  if (dbInstance !== null) {
    return dbInstance;
  }

  dbInstance = await openDB<FinancialDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, _transaction) {
      // Handle migrations based on old version
      if (oldVersion < 1) {
        // Create profiles store
        const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
        profileStore.createIndex('by-updated', 'updatedAt');
        profileStore.createIndex('by-name', 'name');

        // Create trajectories store
        const trajectoryStore = db.createObjectStore('trajectories', {
          keyPath: 'profileId',
        });
        trajectoryStore.createIndex('by-profile', 'profileId');
        trajectoryStore.createIndex('by-generated', 'generatedAt');

        // Create preferences store
        db.createObjectStore('preferences');
      }

      // Future migrations would go here:
      // if (oldVersion < 2) { ... }
    },
    blocked() {
      console.warn('Database blocked - close other tabs to continue');
    },
    blocking() {
      // Close our connection to allow the other tab to upgrade
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance !== null) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the entire database.
 * Use with caution - this removes all data.
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();
  await indexedDB.deleteDatabase(DB_NAME);
}

/**
 * Check if IndexedDB is available.
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * Get database storage estimate.
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
} | null> {
  if (!navigator.storage?.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

  return { usage, quota, percentUsed };
}
