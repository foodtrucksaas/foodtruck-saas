import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type TypedSupabaseClient = SupabaseClient<Database>;

// API Error type for consistent error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to handle Supabase responses
export function handleResponse<T>(
  data: T | null,
  error: { message: string; code?: string; details?: unknown } | null
): T {
  if (error) {
    throw new ApiError(error.message, error.code, error.details);
  }
  if (data === null) {
    throw new ApiError('No data returned');
  }
  return data;
}

// Helper for optional responses (can return null)
export function handleOptionalResponse<T>(
  data: T | null,
  error: { message: string; code?: string; details?: unknown } | null
): T | null {
  if (error) {
    throw new ApiError(error.message, error.code, error.details);
  }
  return data;
}
