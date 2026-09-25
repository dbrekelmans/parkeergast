import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Er ging iets mis. Probeer het opnieuw.'
