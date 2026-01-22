import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type SupabaseClient = ReturnType<typeof createClient<Database>>;

export function createSupabaseClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}
