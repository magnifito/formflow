import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Similar to Shadcn's cn() utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
