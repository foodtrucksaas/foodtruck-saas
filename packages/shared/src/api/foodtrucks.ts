import type { TypedSupabaseClient } from './client';
import { handleResponse, handleOptionalResponse } from './client';
import type { Foodtruck, FoodtruckUpdate } from '../types';

export function createFoodtrucksApi(supabase: TypedSupabaseClient) {
  return {
    // Get all active foodtrucks
    async getAll(): Promise<Foodtruck[]> {
      const { data, error } = await supabase
        .from('foodtrucks')
        .select('*')
        .eq('is_active', true)
        .order('name');

      return handleResponse(data, error);
    },

    // Get foodtruck by ID
    async getById(id: string): Promise<Foodtruck | null> {
      const { data, error } = await supabase
        .from('foodtrucks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      return handleOptionalResponse(data, error);
    },

    // Get foodtruck by user ID (for dashboard)
    async getByUserId(userId: string): Promise<Foodtruck | null> {
      const { data, error } = await supabase
        .from('foodtrucks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      return handleOptionalResponse(data, error);
    },

    // Update foodtruck
    async update(id: string, updates: FoodtruckUpdate): Promise<Foodtruck> {
      const { data, error } = await supabase
        .from('foodtrucks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Get foodtruck settings (subset of fields)
    async getSettings(id: string): Promise<{
      order_slot_interval: number | null;
      max_orders_per_slot: number | null;
      show_promo_section: boolean | null;
      allow_advance_orders: boolean | null;
      advance_order_days: number | null;
      allow_asap_orders: boolean | null;
      min_preparation_time: number | null;
      show_menu_photos: boolean | null;
      loyalty_enabled: boolean | null;
      loyalty_points_per_euro: number | null;
      loyalty_threshold: number | null;
      loyalty_reward: number | null;
      loyalty_allow_multiple: boolean | null;
      offers_stackable: boolean | null;
      promo_codes_stackable: boolean | null;
    } | null> {
      const { data, error } = await supabase
        .from('foodtrucks')
        .select(`
          order_slot_interval,
          max_orders_per_slot,
          show_promo_section,
          allow_advance_orders,
          advance_order_days,
          allow_asap_orders,
          min_preparation_time,
          show_menu_photos,
          loyalty_enabled,
          loyalty_points_per_euro,
          loyalty_threshold,
          loyalty_reward,
          loyalty_allow_multiple,
          offers_stackable,
          promo_codes_stackable
        `)
        .eq('id', id)
        .maybeSingle();

      return handleOptionalResponse(data, error);
    },
  };
}

export type FoodtrucksApi = ReturnType<typeof createFoodtrucksApi>;
