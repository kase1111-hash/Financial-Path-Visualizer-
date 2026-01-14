/**
 * Error Handling Utilities
 *
 * Centralized error handling with user-friendly messages and recovery options.
 */

import type { FinancialProfile } from '@models/profile';

/**
 * Error types for categorizing errors.
 */
export type ErrorType =
  | 'validation'
  | 'calculation'
  | 'storage'
  | 'network'
  | 'unknown';

/**
 * Application error with metadata.
 */
export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
  originalError?: Error;
}

/**
 * Create a standardized app error.
 */
export function createAppError(
  type: ErrorType,
  message: string,
  options: {
    userMessage?: string;
    recoverable?: boolean;
    context?: Record<string, unknown>;
    originalError?: Error;
  } = {}
): AppError {
  const userMessages: Record<ErrorType, string> = {
    validation: 'Some of your inputs may be invalid. Please check and try again.',
    calculation: 'There was an error calculating your projections. Please try again.',
    storage: 'Unable to save or load your data. Please check your browser settings.',
    network: 'Network error. Please check your connection and try again.',
    unknown: 'An unexpected error occurred. Please try again.',
  };

  const error: AppError = {
    type,
    message,
    userMessage: options.userMessage ?? userMessages[type],
    recoverable: options.recoverable ?? true,
  };

  if (options.context !== undefined) {
    error.context = options.context;
  }

  if (options.originalError !== undefined) {
    error.originalError = options.originalError;
  }

  return error;
}

/**
 * Wrap an async function with error handling.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorType: ErrorType = 'unknown',
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const options: { originalError?: Error } = {};
    if (err instanceof Error) {
      options.originalError = err;
    }
    const appError = createAppError(errorType, err instanceof Error ? err.message : String(err), options);

    if (onError) {
      onError(appError);
    } else {
      console.error(`[${errorType}]`, appError.message, appError.context);
    }

    return null;
  }
}

/**
 * Wrap a sync function with error handling.
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  errorType: ErrorType = 'unknown',
  onError?: (error: AppError) => void
): T | null {
  try {
    return fn();
  } catch (err) {
    const options: { originalError?: Error } = {};
    if (err instanceof Error) {
      options.originalError = err;
    }
    const appError = createAppError(errorType, err instanceof Error ? err.message : String(err), options);

    if (onError) {
      onError(appError);
    } else {
      console.error(`[${errorType}]`, appError.message, appError.context);
    }

    return null;
  }
}

/**
 * Validate a profile and return any errors.
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateProfile(profile: FinancialProfile): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for at least one income source
  if (profile.income.length === 0) {
    errors.push({
      field: 'income',
      message: 'At least one income source is required',
      severity: 'error',
    });
  }

  // Validate income sources
  for (const income of profile.income) {
    if (income.amount <= 0) {
      errors.push({
        field: `income.${income.id}.amount`,
        message: `Income "${income.name}" must have a positive amount`,
        severity: 'error',
      });
    }

    if (income.type === 'hourly' && income.hoursPerWeek <= 0) {
      errors.push({
        field: `income.${income.id}.hoursPerWeek`,
        message: `Hourly income "${income.name}" must have positive hours`,
        severity: 'error',
      });
    }

    if (income.expectedGrowth < -0.5 || income.expectedGrowth > 0.5) {
      errors.push({
        field: `income.${income.id}.expectedGrowth`,
        message: `Income growth rate for "${income.name}" seems unusual (${(income.expectedGrowth * 100).toFixed(1)}%)`,
        severity: 'warning',
      });
    }
  }

  // Validate debts
  for (const debt of profile.debts) {
    if (debt.principal < 0) {
      errors.push({
        field: `debts.${debt.id}.principal`,
        message: `Debt "${debt.name}" cannot have negative principal`,
        severity: 'error',
      });
    }

    if (debt.interestRate < 0 || debt.interestRate > 1) {
      errors.push({
        field: `debts.${debt.id}.interestRate`,
        message: `Interest rate for "${debt.name}" must be between 0% and 100%`,
        severity: 'error',
      });
    }

    if (debt.actualPayment < debt.minimumPayment) {
      errors.push({
        field: `debts.${debt.id}.actualPayment`,
        message: `Payment for "${debt.name}" is below minimum required`,
        severity: 'warning',
      });
    }

    if (debt.type === 'mortgage') {
      if (debt.propertyValue !== null && debt.propertyValue <= 0) {
        errors.push({
          field: `debts.${debt.id}.propertyValue`,
          message: `Property value for "${debt.name}" must be positive`,
          severity: 'error',
        });
      }
    }
  }

  // Validate assets
  for (const asset of profile.assets) {
    if (asset.balance < 0) {
      errors.push({
        field: `assets.${asset.id}.balance`,
        message: `Asset "${asset.name}" cannot have negative balance`,
        severity: 'error',
      });
    }

    if (asset.expectedReturn < -0.5 || asset.expectedReturn > 0.5) {
      errors.push({
        field: `assets.${asset.id}.expectedReturn`,
        message: `Expected return for "${asset.name}" seems unusual (${(asset.expectedReturn * 100).toFixed(1)}%)`,
        severity: 'warning',
      });
    }

    if (asset.employerMatch !== null && (asset.employerMatch < 0 || asset.employerMatch > 2)) {
      errors.push({
        field: `assets.${asset.id}.employerMatch`,
        message: `Employer match for "${asset.name}" seems unusual`,
        severity: 'warning',
      });
    }
  }

  // Validate obligations
  for (const obligation of profile.obligations) {
    if (obligation.amount < 0) {
      errors.push({
        field: `obligations.${obligation.id}.amount`,
        message: `Obligation "${obligation.name}" cannot have negative amount`,
        severity: 'error',
      });
    }
  }

  // Validate goals
  for (const goal of profile.goals) {
    if (goal.targetAmount !== null && goal.targetAmount < 0) {
      errors.push({
        field: `goals.${goal.id}.targetAmount`,
        message: `Goal "${goal.name}" cannot have negative target`,
        severity: 'error',
      });
    }
  }

  // Validate assumptions
  if (profile.assumptions.currentAge < 16 || profile.assumptions.currentAge > 100) {
    errors.push({
      field: 'assumptions.currentAge',
      message: 'Current age must be between 16 and 100',
      severity: 'error',
    });
  }

  if (profile.assumptions.lifeExpectancy < profile.assumptions.currentAge) {
    errors.push({
      field: 'assumptions.lifeExpectancy',
      message: 'Life expectancy must be greater than current age',
      severity: 'error',
    });
  }

  if (profile.assumptions.inflationRate < 0 || profile.assumptions.inflationRate > 0.2) {
    errors.push({
      field: 'assumptions.inflationRate',
      message: 'Inflation rate seems unusual',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Check if profile has critical errors that prevent projection.
 */
export function hasBlockingErrors(errors: ValidationError[]): boolean {
  return errors.some((e) => e.severity === 'error');
}

/**
 * Get error summary for display.
 */
export function getErrorSummary(errors: ValidationError[]): string {
  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  const parts: string[] = [];
  if (errorCount > 0) {
    parts.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
  }

  return parts.join(' and ') || 'No issues';
}

/**
 * Recovery options for different error types.
 */
export interface RecoveryOption {
  label: string;
  action: () => void | Promise<void>;
}

export function getRecoveryOptions(
  error: AppError,
  callbacks: {
    onRetry?: () => void;
    onReset?: () => void;
    onReloadLastSave?: () => void;
  }
): RecoveryOption[] {
  const options: RecoveryOption[] = [];

  if (error.recoverable && callbacks.onRetry) {
    options.push({
      label: 'Try Again',
      action: callbacks.onRetry,
    });
  }

  if (error.type === 'storage' && callbacks.onReloadLastSave) {
    options.push({
      label: 'Reload Last Save',
      action: callbacks.onReloadLastSave,
    });
  }

  if (callbacks.onReset) {
    options.push({
      label: 'Start Fresh',
      action: callbacks.onReset,
    });
  }

  return options;
}
