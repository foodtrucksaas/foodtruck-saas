import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with Tailwind CSS merge support
 * Handles conditional classes, arrays, and objects
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
