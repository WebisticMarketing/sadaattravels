/**
 * Shared TypeScript types for the Sadaat Travels Management System.
 *
 * Business-specific types will be added when their respective modules
 * are implemented. This file holds only cross-cutting / foundation types.
 */

/* ------------------------------------------------------------------ */
/*  Generic API / data types                                          */
/* ------------------------------------------------------------------ */

/** Standard paginated response envelope. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Standard API error shape returned by Supabase edge functions. */
export interface ApiError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

/* ------------------------------------------------------------------ */
/*  UI / component types                                              */
/* ------------------------------------------------------------------ */

/** Size variants shared across UI primitives. */
export type Size = 'sm' | 'md' | 'lg';

/** Visual intent variants. */
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';

/** Generic async state used by data-fetching hooks. */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
}

/* ------------------------------------------------------------------ */
/*  Error types                                                       */
/* ------------------------------------------------------------------ */

/** Application-level error with a user-facing message. */
export class AppError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      userMessage?: string;
      isOperational?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.userMessage = options.userMessage ?? message;
    this.isOperational = options.isOperational ?? true;
  }
}

/** Error thrown when a required environment variable is missing. */
export class ConfigError extends AppError {
  constructor(variable: string) {
    super(`Missing environment variable: ${variable}`, {
      code: 'CONFIG_ERROR',
      userMessage: 'Application configuration is incomplete. Please contact support.',
      isOperational: false,
    });
    this.name = 'ConfigError';
  }
}

/** Error thrown when an API call fails. */
export class ApiRequestError extends AppError {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, details?: string) {
    super(message, {
      code: 'API_ERROR',
      userMessage: 'A network error occurred. Please check your connection and try again.',
      isOperational: true,
    });
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    if (details) {
      (this as any).details = details;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Route / navigation types                                          */
/* ------------------------------------------------------------------ */

/** Describes a navigation item in the sidebar. */
export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  children?: NavItem[];
  /** If true, this item is visible but disabled (module not yet built). */
  disabled?: boolean;
}

// Re-export database types
export * from './database';
