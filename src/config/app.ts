/**
 * Static application configuration.
 * Values that do not change per environment live here.
 */

export const appConfig = {
  /** Application name */
  name: 'Sadaat Travels',

  /** Short code used in storage keys, CSS classes, etc. */
  code: 'sadaat',

  /** Default page size for tables / lists */
  defaultPageSize: 25,

  /** Supported date format for display */
  dateFormat: 'DD/MM/YYYY',

  /** Supported time format for display */
  timeFormat: 'HH:mm',

  /** Currency symbol */
  currency: 'PKR',

  /** Currency locale */
  currencyLocale: 'en-PK',

  /** Local storage key prefix */
  storagePrefix: 'sadaat_',

  /** API request timeout in ms */
  requestTimeout: 30_000,
} as const;

export type AppConfig = typeof appConfig;
