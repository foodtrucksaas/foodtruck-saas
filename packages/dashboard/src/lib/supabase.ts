import { createSupabaseClient } from '@foodtruck/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Normal client with RLS
export const supabaseAnon = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Service role client that bypasses RLS (for test mode)
export const supabaseAdmin = supabaseServiceRoleKey
  ? createSupabaseClient(supabaseUrl, supabaseServiceRoleKey)
  : supabaseAnon;

// Function to get the right client based on test mode
export const getSupabase = () => {
  const isTestMode = localStorage.getItem('testMode') === 'true';
  return isTestMode ? supabaseAdmin : supabaseAnon;
};

// Default export for backward compatibility (checks test mode on each call)
type SupabaseClientType = ReturnType<typeof createSupabaseClient>;
export const supabase = new Proxy({} as SupabaseClientType, {
  get(_target, prop) {
    const client = getSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop as string];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
