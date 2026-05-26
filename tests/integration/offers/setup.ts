import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. Run pnpm test:integration:check'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- Helpers ----------

export async function createTestFoodtruck(): Promise<{
  foodtruckId: string;
  userId: string;
}> {
  // Create a fake auth user via admin API
  const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`;
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  });
  if (authError) throw authError;
  const userId = authData.user.id;

  // Create foodtruck
  const { data: ft, error: ftError } = await supabase
    .from('foodtrucks')
    .insert({
      user_id: userId,
      name: `Test Truck ${Date.now()}`,
      cuisine_types: ['test'],
      slug: `test-truck-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })
    .select('id')
    .single();
  if (ftError) throw ftError;

  return { foodtruckId: ft.id, userId };
}

export async function createCategory(foodtruckId: string, opts: { name: string }): Promise<string> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ foodtruck_id: foodtruckId, name: opts.name })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function createMenuItem(
  foodtruckId: string,
  opts: { name: string; price: number; categoryId: string }
): Promise<string> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      foodtruck_id: foodtruckId,
      name: opts.name,
      price: opts.price,
      category_id: opts.categoryId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

interface CreateOfferOpts {
  name: string;
  offer_type: 'bundle' | 'buy_x_get_y' | 'promo_code' | 'threshold_discount';
  config: Record<string, unknown>;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  days_of_week?: number[] | null;
  max_uses?: number | null;
  max_uses_per_customer?: number | null;
}

export async function createOffer(foodtruckId: string, opts: CreateOfferOpts): Promise<string> {
  const { data, error } = await supabase
    .from('offers')
    .insert({
      foodtruck_id: foodtruckId,
      name: opts.name,
      offer_type: opts.offer_type,
      config: opts.config,
      is_active: opts.is_active ?? true,
      start_date: opts.start_date ?? null,
      end_date: opts.end_date ?? null,
      days_of_week: opts.days_of_week ?? null,
      max_uses: opts.max_uses ?? null,
      max_uses_per_customer: opts.max_uses_per_customer ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export interface CartItem {
  menu_item_id: string;
  category_id: string;
  name: string;
  price: number; // cents
  quantity: number;
}

export interface OptimizedResult {
  offer_id: string;
  offer_name: string;
  offer_type: string;
  times_applied: number;
  discount_per_application: number;
  calculated_discount: number;
  items_consumed: unknown;
  free_item_name: string | null;
}

export async function callGetOptimizedOffers(
  foodtruckId: string,
  cartItems: CartItem[],
  totalAmount: number,
  promoCode?: string
): Promise<OptimizedResult[]> {
  const { data, error } = await supabase.rpc('get_optimized_offers', {
    p_foodtruck_id: foodtruckId,
    p_cart_items: cartItems,
    p_order_amount: totalAmount,
    p_promo_code: promoCode || null,
  });
  if (error) throw error;
  return (data as OptimizedResult[]) || [];
}

// ---------- Assertion helpers ----------

export function getTotalDiscount(results: OptimizedResult[]): number {
  return results.reduce((sum, r) => sum + r.calculated_discount, 0);
}

export function expectDiscount(
  results: OptimizedResult[],
  expectedDiscount: number,
  tolerance = 0
): void {
  const actual = getTotalDiscount(results);
  if (tolerance === 0) {
    if (actual !== expectedDiscount) {
      throw new Error(
        `Expected total discount ${expectedDiscount} but got ${actual}. Results: ${JSON.stringify(results, null, 2)}`
      );
    }
  } else {
    if (Math.abs(actual - expectedDiscount) > tolerance) {
      throw new Error(
        `Expected total discount ~${expectedDiscount} (±${tolerance}) but got ${actual}`
      );
    }
  }
}

export function expectAppliedOffers(results: OptimizedResult[], expectedOfferIds: string[]): void {
  const actualIds = results.map((r) => r.offer_id).sort();
  const expectedSorted = [...expectedOfferIds].sort();
  const actualStr = JSON.stringify(actualIds);
  const expectedStr = JSON.stringify(expectedSorted);
  if (actualStr !== expectedStr) {
    throw new Error(`Expected offers ${expectedStr} but got ${actualStr}`);
  }
}

// ---------- Cleanup ----------

export async function cleanup(foodtruckId: string, userId: string): Promise<void> {
  if (!foodtruckId || !userId) return;
  try {
    // Delete in order to respect FK constraints (cascade handles most)
    await supabase.from('offers').delete().eq('foodtruck_id', foodtruckId);
    await supabase.from('menu_items').delete().eq('foodtruck_id', foodtruckId);
    await supabase.from('categories').delete().eq('foodtruck_id', foodtruckId);
    await supabase.from('foodtrucks').delete().eq('id', foodtruckId);
    await supabase.auth.admin.deleteUser(userId);
  } catch {
    // Best-effort cleanup
  }
}
