import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes safely.
 * Combines clsx (conditional classes) with tailwind-merge (conflict resolution).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as PKR currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a Date into DD/MM/YYYY.
 */
export function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Format a Date into HH:mm.
 */
export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Sleep for a given number of milliseconds (useful for testing loading states).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a short random ID (not cryptographically secure).
 */
export function shortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Get the first day of a given month/year as YYYY-MM-DD
 */
export function getMonthStart(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get the last day of a given month/year as YYYY-MM-DD
 */
export function getMonthEnd(year: number, month: number): string {
  const date = new Date(year, month, 0); // Day 0 of next month = last day of current month
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
