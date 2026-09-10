import { AppError } from '../types';

/**
 * Centralised error-handling utilities.
 *
 * The application should NEVER silently swallow errors.
 * All errors flow through these helpers so they can be logged,
 * reported, or surfaced to the user consistently.
 */

/**
 * Log an error to the console with context.
 * In production this could be extended to send errors to a monitoring service.
 */
export function logError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}]` : '[App]';

  if (error instanceof AppError) {
    console.error(`${prefix} ${error.name} (${error.code}): ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`${prefix} ${error.name}: ${error.message}`);
  } else {
    console.error(`${prefix} Unknown error:`, error);
  }
}

/**
 * Normalise any thrown value into an AppError instance.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(error.message, {
      code: 'UNHANDLED_ERROR',
      userMessage: 'An unexpected error occurred. Please try again.',
    });
  }
  return new AppError(String(error), {
    code: 'UNKNOWN_ERROR',
    userMessage: 'An unexpected error occurred. Please try again.',
  });
}

/**
 * Extract a user-friendly message from any error.
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return 'An unexpected error occurred. Please try again.';
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Supabase-specific error normaliser.
 * Converts Supabase error objects into AppError instances.
 */
export function fromSupabaseError(error: { message: string; code?: string; details?: string }): AppError {
  return new AppError(error.message, {
    code: error.code ?? 'SUPABASE_ERROR',
    userMessage: mapSupabaseCodeToMessage(error.code),
  });
}

function mapSupabaseCodeToMessage(code?: string): string {
  switch (code) {
    case 'PGRST301':
    case 'PGRST302':
      return 'You do not have permission to perform this action.';
    case '23505':
      return 'A record with this value already exists.';
    case '23503':
      return 'This record is linked to other data and cannot be deleted.';
    case 'PGRST116':
      return 'The requested record was not found.';
    default:
      return 'A database error occurred. Please try again.';
  }
}
