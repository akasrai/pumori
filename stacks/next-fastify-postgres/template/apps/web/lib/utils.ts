import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names and lets later Tailwind classes win over earlier ones (shadcn/ui's `cn`). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
