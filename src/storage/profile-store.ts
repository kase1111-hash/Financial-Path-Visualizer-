/**
 * Profile Storage
 *
 * CRUD operations for financial profiles.
 */

import type { ID } from '@models/common';
import type { FinancialProfile } from '@models/profile';
import type { Trajectory } from '@models/trajectory';
import { getDatabase } from './db';

/**
 * Save a profile to the database.
 * Updates existing profile or creates new one.
 */
export async function saveProfile(profile: FinancialProfile): Promise<void> {
  const db = await getDatabase();
  await db.put('profiles', profile);
}

/**
 * Load a profile by ID.
 */
export async function loadProfile(id: ID): Promise<FinancialProfile | undefined> {
  const db = await getDatabase();
  return db.get('profiles', id);
}

/**
 * Load all profiles.
 */
export async function loadAllProfiles(): Promise<FinancialProfile[]> {
  const db = await getDatabase();
  return db.getAll('profiles');
}

/**
 * Load profiles sorted by last updated (most recent first).
 */
export async function loadProfilesByUpdated(): Promise<FinancialProfile[]> {
  const db = await getDatabase();
  const profiles = await db.getAllFromIndex('profiles', 'by-updated');
  return profiles.reverse(); // Most recent first
}

/**
 * Delete a profile by ID.
 */
export async function deleteProfile(id: ID): Promise<void> {
  const db = await getDatabase();

  // Delete the profile
  await db.delete('profiles', id);

  // Also delete any cached trajectory for this profile
  await db.delete('trajectories', id);
}

/**
 * Check if a profile exists.
 */
export async function profileExists(id: ID): Promise<boolean> {
  const db = await getDatabase();
  const profile = await db.get('profiles', id);
  return profile !== undefined;
}

/**
 * Count total profiles.
 */
export async function countProfiles(): Promise<number> {
  const db = await getDatabase();
  return db.count('profiles');
}

/**
 * Save a trajectory for a profile.
 */
export async function saveTrajectory(trajectory: Trajectory): Promise<void> {
  const db = await getDatabase();
  await db.put('trajectories', trajectory);
}

/**
 * Load a trajectory for a profile.
 */
export async function loadTrajectory(profileId: ID): Promise<Trajectory | undefined> {
  const db = await getDatabase();
  return db.get('trajectories', profileId);
}

/**
 * Delete a trajectory for a profile.
 */
export async function deleteTrajectory(profileId: ID): Promise<void> {
  const db = await getDatabase();
  await db.delete('trajectories', profileId);
}

/**
 * Clear all profiles and trajectories.
 */
export async function clearAllProfiles(): Promise<void> {
  const db = await getDatabase();
  await db.clear('profiles');
  await db.clear('trajectories');
}

/**
 * Get the most recently updated profile.
 */
export async function getMostRecentProfile(): Promise<FinancialProfile | undefined> {
  const profiles = await loadProfilesByUpdated();
  return profiles[0];
}

/**
 * Search profiles by name.
 */
export async function searchProfilesByName(query: string): Promise<FinancialProfile[]> {
  const profiles = await loadAllProfiles();
  const lowerQuery = query.toLowerCase();
  return profiles.filter((p) => p.name.toLowerCase().includes(lowerQuery));
}

/**
 * Duplicate a profile with a new ID.
 */
export async function duplicateProfile(
  id: ID,
  newName?: string
): Promise<FinancialProfile | undefined> {
  const profile = await loadProfile(id);
  if (!profile) return undefined;

  const { cloneProfile } = await import('@models/profile');
  const duplicate = cloneProfile(profile, newName);
  await saveProfile(duplicate);

  return duplicate;
}

/**
 * Get profile summary stats for storage management.
 */
export interface ProfileStorageInfo {
  id: ID;
  name: string;
  updatedAt: Date;
  estimatedSize: number;
}

export async function getProfileStorageInfo(): Promise<ProfileStorageInfo[]> {
  const profiles = await loadAllProfiles();

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    updatedAt: profile.updatedAt,
    // Rough size estimate based on JSON serialization
    estimatedSize: JSON.stringify(profile).length,
  }));
}
