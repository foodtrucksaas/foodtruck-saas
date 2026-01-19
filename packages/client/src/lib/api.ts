import { createApi } from '@foodtruck/shared/api';
import { supabase } from './supabase';

// Create API instance with the client's supabase connection
export const api = createApi(supabase);

// Re-export types for convenience
export type { Api } from '@foodtruck/shared/api';
