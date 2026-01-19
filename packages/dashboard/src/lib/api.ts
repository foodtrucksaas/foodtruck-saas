import { createApi, type Api } from '@foodtruck/shared/api';
import { supabase, getSupabase } from './supabase';

// Create API instance with the dashboard's supabase connection
// Uses the proxy that handles test mode automatically
export const api = createApi(supabase);

// Function to get a fresh API instance (useful if test mode changed)
export function getApi(): Api {
  return createApi(getSupabase());
}

// Re-export types for convenience
export type { Api } from '@foodtruck/shared/api';
