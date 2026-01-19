import type { TypedSupabaseClient } from './client';
import { handleResponse } from './client';
import type { ApplicableDeal, Deal, DealInsert } from '../types';
import type { Json } from '../types/database.types';

export interface CartItemForDeals {
  menu_item_id: string;
  category_id: string | null;
  quantity: number;
  price: number;
  name: string;
  selected_option_ids: string[];
}

export function createDealsApi(supabase: TypedSupabaseClient) {
  return {
    // Get applicable deals for a cart
    async getApplicable(
      foodtruckId: string,
      cartItems: CartItemForDeals[]
    ): Promise<ApplicableDeal[]> {
      const { data, error } = await supabase.rpc('get_applicable_deals', {
        p_foodtruck_id: foodtruckId,
        p_cart_items: cartItems as unknown as Json,
      });

      if (error) throw error;
      return (data as ApplicableDeal[]) || [];
    },

    // Get all deals for a foodtruck
    async getByFoodtruck(foodtruckId: string): Promise<Deal[]> {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .order('created_at', { ascending: false });

      return handleResponse(data, error);
    },

    // Get active deals for a foodtruck
    async getActiveByFoodtruck(foodtruckId: string): Promise<Deal[]> {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return handleResponse(data, error);
    },

    // Create a deal
    async create(deal: DealInsert): Promise<Deal> {
      const { data, error } = await supabase
        .from('deals')
        .insert(deal)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Update a deal
    async update(id: string, updates: Partial<Deal>): Promise<Deal> {
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Delete a deal
    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
  };
}

export type DealsApi = ReturnType<typeof createDealsApi>;
