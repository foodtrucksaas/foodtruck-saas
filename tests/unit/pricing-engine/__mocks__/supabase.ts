/**
 * Mock for supabase.ts used by the pricing engine in tests.
 * The actual supabase client is injected via DiscountContext,
 * so this file only exists to satisfy the import in types.ts.
 */
export function createSupabaseAdmin() {
  throw new Error('createSupabaseAdmin should not be called in tests — use the mock from context');
}
