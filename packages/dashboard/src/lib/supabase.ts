import { createSupabaseClient } from '@foodtruck/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Supabase client with RLS - NEVER expose service role key to frontend
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Legacy exports for backward compatibility
export const supabaseAnon = supabase;
export const getSupabase = () => supabase;
