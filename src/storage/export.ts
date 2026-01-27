/**
 * Export/Import
 *
 * JSON file export and import for profiles.
 */

import type { FinancialProfile } from '@models/profile';
import { createProfile } from '@models/profile';
import { generateId } from '@models/common';

/**
 * Export file format version.
 * Increment when making breaking changes to the export format.
 */
const EXPORT_VERSION = '1.0';

/**
 * Maximum allowed import file size in bytes (10 MB).
 * Prevents memory issues from very large files.
 */
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Exported data structure.
 */
export interface ExportData {
  /** Export format version */
  version: string;
  /** Application identifier */
  app: 'financial-path-visualizer';
  /** When the export was created */
  exportedAt: string;
  /** The exported profile */
  profile: FinancialProfile;
}

/**
 * Export result with metadata.
 */
export interface ExportResult {
  filename: string;
  data: ExportData;
  json: string;
  size: number;
}

/**
 * Import result.
 */
export interface ImportResult {
  success: boolean;
  profile?: FinancialProfile;
  error?: string;
  warnings: string[];
}

/**
 * Generate a safe filename for export.
 */
function generateFilename(profile: FinancialProfile): string {
  // Sanitize the profile name for use as filename
  const safeName = profile.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  const date = new Date().toISOString().split('T')[0];
  return `${safeName}-${date}.json`;
}

/**
 * Export a profile to JSON string.
 */
export function exportToJson(profile: FinancialProfile): ExportResult {
  const data: ExportData = {
    version: EXPORT_VERSION,
    app: 'financial-path-visualizer',
    exportedAt: new Date().toISOString(),
    profile,
  };

  const json = JSON.stringify(data, null, 2);

  return {
    filename: generateFilename(profile),
    data,
    json,
    size: json.length,
  };
}

/**
 * Download a profile as a JSON file.
 */
export function downloadProfile(profile: FinancialProfile): void {
  const { filename, json } = exportToJson(profile);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Validate that a value is an array (if present).
 * Returns true if the value is undefined (will be filled by defaults) or is a valid array.
 */
function isValidArrayField(value: unknown): boolean {
  if (value === undefined) {
    return true; // Will be filled with defaults during migration
  }
  return Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null);
}

/**
 * Validate profile data structure.
 * Checks that required fields exist and optional fields have correct types if present.
 * Missing optional fields will be filled with defaults during migration.
 */
function validateProfileData(profile: unknown): boolean {
  if (typeof profile !== 'object' || profile === null) {
    return false;
  }

  const p = profile as Record<string, unknown>;

  // Required string fields
  if (typeof p.id !== 'string' || typeof p.name !== 'string') {
    return false;
  }

  // Core array fields must be arrays if present (will be filled with defaults if missing)
  if (!isValidArrayField(p.income) ||
      !isValidArrayField(p.debts) ||
      !isValidArrayField(p.obligations) ||
      !isValidArrayField(p.assets) ||
      !isValidArrayField(p.goals)) {
    return false;
  }

  // Assumptions must be an object if present (will be filled with defaults if missing)
  if (p.assumptions !== undefined && (typeof p.assumptions !== 'object' || p.assumptions === null)) {
    return false;
  }

  return true;
}

/**
 * Validate export data structure.
 */
function validateExportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Basic structure validation
  if (typeof obj.version !== 'string' ||
      obj.app !== 'financial-path-visualizer' ||
      typeof obj.exportedAt !== 'string') {
    return false;
  }

  // Validate profile structure (allows partial profiles that will be filled with defaults)
  return validateProfileData(obj.profile);
}

/**
 * Validate and sanitize numeric fields in imported data.
 * Returns warnings for any corrected values.
 */
function sanitizeNumericFields(profile: FinancialProfile): string[] {
  const warnings: string[] = [];

  // Sanitize income fields
  for (const income of profile.income) {
    if (income.amount < 0) {
      warnings.push(`Income "${income.name}": corrected negative amount to 0`);
      income.amount = 0;
    }
    if (income.hoursPerWeek < 0) {
      warnings.push(`Income "${income.name}": corrected negative hours to 0`);
      income.hoursPerWeek = 0;
    }
    if (income.hoursPerWeek > 168) {
      warnings.push(`Income "${income.name}": corrected hours to max 168`);
      income.hoursPerWeek = 168;
    }
    if (income.expectedGrowth < -1) {
      warnings.push(`Income "${income.name}": corrected growth rate to -100%`);
      income.expectedGrowth = -1;
    }
  }

  // Sanitize debt fields
  for (const debt of profile.debts) {
    if (debt.principal < 0) {
      warnings.push(`Debt "${debt.name}": corrected negative principal to 0`);
      debt.principal = 0;
    }
    if (debt.interestRate < 0) {
      warnings.push(`Debt "${debt.name}": corrected negative interest rate to 0`);
      debt.interestRate = 0;
    }
    if (debt.minimumPayment < 0) {
      warnings.push(`Debt "${debt.name}": corrected negative minimum payment to 0`);
      debt.minimumPayment = 0;
    }
    if (debt.actualPayment < 0) {
      warnings.push(`Debt "${debt.name}": corrected negative actual payment to 0`);
      debt.actualPayment = 0;
    }
  }

  // Sanitize asset fields
  for (const asset of profile.assets) {
    if (asset.balance < 0) {
      warnings.push(`Asset "${asset.name}": corrected negative balance to 0`);
      asset.balance = 0;
    }
    if (asset.monthlyContribution < 0) {
      warnings.push(`Asset "${asset.name}": corrected negative contribution to 0`);
      asset.monthlyContribution = 0;
    }
    if (asset.expectedReturn < -1) {
      warnings.push(`Asset "${asset.name}": corrected return rate to -100%`);
      asset.expectedReturn = -1;
    }
  }

  // Sanitize assumption fields
  if (profile.assumptions.currentAge < 0) {
    warnings.push('Assumptions: corrected negative age to 0');
    profile.assumptions.currentAge = 0;
  }
  if (profile.assumptions.currentAge > 150) {
    warnings.push('Assumptions: corrected age to max 150');
    profile.assumptions.currentAge = 150;
  }
  if (profile.assumptions.lifeExpectancy < profile.assumptions.currentAge) {
    warnings.push('Assumptions: corrected life expectancy to be greater than current age');
    profile.assumptions.lifeExpectancy = profile.assumptions.currentAge + 30;
  }

  return warnings;
}

/**
 * Migrate old export formats to current version.
 */
function migrateExportData(data: ExportData): { profile: FinancialProfile; warnings: string[] } {
  const warnings: string[] = [];
  let profile = data.profile;

  // Handle version migrations
  if (data.version !== EXPORT_VERSION) {
    warnings.push(`Export was created with version ${data.version}, migrating to ${EXPORT_VERSION}`);

    // Future migrations would go here:
    // if (data.version === '0.9') { ... migrate ... }
  }

  // Ensure all required fields exist with defaults
  const defaultProfile = createProfile();

  // Merge with defaults to fill any missing fields
  profile = {
    ...defaultProfile,
    ...profile,
    assumptions: {
      ...defaultProfile.assumptions,
      ...profile.assumptions,
    },
  };

  // Validate and sanitize numeric field values
  const sanitizationWarnings = sanitizeNumericFields(profile);
  warnings.push(...sanitizationWarnings);

  // Generate new ID to avoid conflicts
  profile.id = generateId();
  profile.updatedAt = new Date();

  return { profile, warnings };
}

/**
 * Import a profile from JSON string.
 */
export function importFromJson(json: string): ImportResult {
  const warnings: string[] = [];

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return {
      success: false,
      error: 'Invalid JSON format',
      warnings,
    };
  }

  // Validate structure
  if (!validateExportData(parsed)) {
    return {
      success: false,
      error: 'Invalid export file format',
      warnings,
    };
  }

  // Migrate and validate
  try {
    const migrated = migrateExportData(parsed);
    warnings.push(...migrated.warnings);

    return {
      success: true,
      profile: migrated.profile,
      warnings,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to process export file',
      warnings,
    };
  }
}

/**
 * Import a profile from a File object.
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  // Validate file type
  if (!file.name.endsWith('.json')) {
    return {
      success: false,
      error: 'File must be a JSON file',
      warnings: [],
    };
  }

  // Validate file size
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return {
      success: false,
      error: `File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum allowed size is ${Math.round(MAX_IMPORT_FILE_SIZE / 1024 / 1024)}MB.`,
      warnings: [],
    };
  }

  // Read file contents
  let text: string;
  try {
    text = await file.text();
  } catch {
    return {
      success: false,
      error: 'Failed to read file',
      warnings: [],
    };
  }

  return importFromJson(text);
}

/**
 * Create a file input for importing profiles.
 * Returns a promise that resolves with the import result.
 */
export function createImportDialog(): Promise<ImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({
          success: false,
          error: 'No file selected',
          warnings: [],
        });
        return;
      }

      const result = await importFromFile(file);
      resolve(result);
    };

    input.oncancel = () => {
      resolve({
        success: false,
        error: 'Import cancelled',
        warnings: [],
      });
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * Export multiple profiles as a single file.
 */
export interface BulkExportData {
  version: string;
  app: 'financial-path-visualizer';
  exportedAt: string;
  profiles: FinancialProfile[];
}

export function exportMultipleProfiles(profiles: FinancialProfile[]): string {
  const data: BulkExportData = {
    version: EXPORT_VERSION,
    app: 'financial-path-visualizer',
    exportedAt: new Date().toISOString(),
    profiles,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Download multiple profiles as a single JSON file.
 */
export function downloadMultipleProfiles(profiles: FinancialProfile[]): void {
  const json = exportMultipleProfiles(profiles);
  const date = new Date().toISOString().split('T')[0];
  const filename = `financial-profiles-backup-${date}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
