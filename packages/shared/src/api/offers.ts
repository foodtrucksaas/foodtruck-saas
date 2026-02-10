/* eslint-disable @typescript-eslint/no-explicit-any */
// Disabled due to Supabase typed client requiring type casts for insert/update operations
// The generated types don't perfectly match what Supabase accepts

import type { TypedSupabaseClient } from './client';
import { handleResponse } from './client';
import type {
  Offer,
  OfferInsert,
  OfferUpdate,
  OfferItem,
  OfferItemInsert,
  OfferWithItems,
  ApplicableOffer,
  AppliedOfferDetail,
  OptimizedOffersResult,
  ValidateOfferPromoCodeResult,
  OfferConfig,
} from '../types';
import type { Json } from '../types/database.types';

export interface CartItemForOffers {
  menu_item_id: string;
  category_id: string | null;
  quantity: number;
  price: number;
  size_id?: string | null;
}

export function createOffersApi(supabase: TypedSupabaseClient) {
  return {
    // ============================================
    // CRUD Operations
    // ============================================

    // Get all offers for a foodtruck
    async getByFoodtruck(foodtruckId: string): Promise<Offer[]> {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .order('created_at', { ascending: false });

      return handleResponse(data, error) as unknown as Offer[];
    },

    // Get active offers for a foodtruck
    async getActiveByFoodtruck(foodtruckId: string): Promise<Offer[]> {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return handleResponse(data, error) as unknown as Offer[];
    },

    // Get a single offer by ID with its items
    async getById(offerId: string): Promise<OfferWithItems | null> {
      const { data, error } = await supabase
        .from('offers')
        .select(
          `
          *,
          offer_items (
            *,
            menu_item:menu_items (*)
          )
        `
        )
        .eq('id', offerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as OfferWithItems;
    },

    // Get offers with items for a foodtruck
    async getWithItemsByFoodtruck(foodtruckId: string): Promise<OfferWithItems[]> {
      const { data, error } = await supabase
        .from('offers')
        .select(
          `
          *,
          offer_items (
            *,
            menu_item:menu_items (*)
          )
        `
        )
        .eq('foodtruck_id', foodtruckId)
        .order('created_at', { ascending: false });

      return handleResponse(data, error) as unknown as OfferWithItems[];
    },

    // Create an offer
    async create(offer: OfferInsert): Promise<Offer> {
      const { data, error } = await supabase
        .from('offers')
        .insert({
          ...offer,
          config: offer.config as unknown as Json,
        } as any)
        .select()
        .single();

      return handleResponse(data, error) as unknown as Offer;
    },

    // Update an offer
    async update(id: string, updates: OfferUpdate): Promise<Offer> {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.config) {
        updateData.config = updates.config as unknown as Json;
      }

      const { data, error } = await supabase
        .from('offers')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error) as unknown as Offer;
    },

    // Delete an offer
    async delete(id: string): Promise<void> {
      const { error } = await supabase.from('offers').delete().eq('id', id);

      if (error) throw error;
    },

    // Toggle offer active status
    async toggleActive(id: string, isActive: boolean): Promise<Offer> {
      const { data, error } = await supabase
        .from('offers')
        .update({ is_active: isActive } as any)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error) as unknown as Offer;
    },

    // ============================================
    // Offer Items Operations
    // ============================================

    // Add items to an offer
    async addItems(items: OfferItemInsert[]): Promise<OfferItem[]> {
      const { data, error } = await supabase
        .from('offer_items')
        .insert(items as any)
        .select();

      return handleResponse(data, error) as unknown as OfferItem[];
    },

    // Remove item from an offer
    async removeItem(itemId: string): Promise<void> {
      const { error } = await (supabase.from('offer_items') as any).delete().eq('id', itemId);

      if (error) throw error;
    },

    // Remove all items from an offer
    async removeAllItems(offerId: string): Promise<void> {
      const { error } = await (supabase.from('offer_items') as any)
        .delete()
        .eq('offer_id', offerId);

      if (error) throw error;
    },

    // ============================================
    // Validation & Application
    // ============================================

    // Validate a promo code
    async validatePromoCode(
      foodtruckId: string,
      code: string,
      customerEmail: string,
      orderAmount: number
    ): Promise<ValidateOfferPromoCodeResult> {
      const { data, error } = await supabase.rpc('validate_offer_promo_code', {
        p_foodtruck_id: foodtruckId,
        p_code: code,
        p_customer_email: customerEmail,
        p_order_amount: orderAmount,
      });

      if (error) throw error;

      // RPC returns an array, get first element
      const result = Array.isArray(data) ? data[0] : data;
      return result as ValidateOfferPromoCodeResult;
    },

    // Get applicable offers for a cart
    async getApplicable(
      foodtruckId: string,
      cartItems: CartItemForOffers[],
      orderAmount: number,
      promoCode?: string
    ): Promise<ApplicableOffer[]> {
      const { data, error } = await supabase.rpc('get_applicable_offers', {
        p_foodtruck_id: foodtruckId,
        p_cart_items: cartItems as unknown as Json,
        p_order_amount: orderAmount,
        p_promo_code: promoCode || null,
      });

      if (error) throw error;
      return (data as ApplicableOffer[]) || [];
    },

    // Get optimized combination of offers (multiple offers on different items)
    async getOptimized(
      foodtruckId: string,
      cartItems: CartItemForOffers[],
      orderAmount: number,
      promoCode?: string
    ): Promise<OptimizedOffersResult> {
      const { data, error } = await supabase.rpc('get_optimized_offers', {
        p_foodtruck_id: foodtruckId,
        p_cart_items: cartItems as unknown as Json,
        p_order_amount: orderAmount,
        p_promo_code: promoCode || null,
      });

      if (error) throw error;

      // Transform database result to typed result
      const offers = (data || []) as Array<{
        offer_id: string;
        offer_name: string;
        offer_type: string;
        times_applied: number;
        discount_per_application: number;
        calculated_discount: number;
        items_consumed: Array<{ menu_item_id: string; quantity: number }> | null;
        free_item_name: string | null;
      }>;

      const appliedOffers: AppliedOfferDetail[] = offers.map((o) => {
        // SQL returns expanded individual items (one per unit) without a quantity field.
        // Aggregate by menu_item_id to create the expected {menu_item_id, quantity} format.
        const rawConsumed = (o.items_consumed || []) as Array<{
          menu_item_id: string;
          quantity?: number;
        }>;
        const consumedMap = new Map<string, number>();
        for (const item of rawConsumed) {
          const qty = item.quantity ?? 1;
          consumedMap.set(item.menu_item_id, (consumedMap.get(item.menu_item_id) || 0) + qty);
        }

        return {
          offer_id: o.offer_id,
          offer_name: o.offer_name,
          offer_type: o.offer_type as AppliedOfferDetail['offer_type'],
          times_applied: o.times_applied,
          discount_amount: o.calculated_discount,
          items_consumed: Array.from(consumedMap.entries()).map(([menu_item_id, quantity]) => ({
            menu_item_id,
            quantity,
          })),
          free_item_name: o.free_item_name,
        };
      });

      return {
        applied_offers: appliedOffers,
        total_discount: appliedOffers.reduce((sum, o) => sum + o.discount_amount, 0),
      };
    },

    // Apply an offer to an order
    async apply(
      offerId: string,
      orderId: string,
      customerEmail: string,
      discountAmount: number,
      freeItemName?: string
    ): Promise<void> {
      const { error } = await supabase.rpc('apply_offer', {
        p_offer_id: offerId,
        p_order_id: orderId,
        p_customer_email: customerEmail,
        p_discount_amount: discountAmount,
        p_free_item_name: freeItemName || null,
      });

      if (error) throw error;
    },

    // ============================================
    // Statistics
    // ============================================

    // Count active promo codes for a foodtruck
    async countActivePromoCodes(foodtruckId: string): Promise<number> {
      const { count, error } = await supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruckId)
        .eq('offer_type', 'promo_code')
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    },

    // Get offer statistics
    async getStats(offerId: string): Promise<{
      total_uses: number;
      total_discount: number;
      unique_customers: number;
    }> {
      const { data, error } = await (supabase.from('offer_uses') as any)
        .select('customer_email, discount_amount')
        .eq('offer_id', offerId);

      if (error) throw error;

      const uses = (data || []) as Array<{
        customer_email: string | null;
        discount_amount: number;
      }>;
      const uniqueEmails = new Set(
        uses.map((u: { customer_email: string | null }) => u.customer_email?.toLowerCase())
      );

      return {
        total_uses: uses.length,
        total_discount: uses.reduce(
          (sum: number, u: { discount_amount: number }) => sum + (u.discount_amount || 0),
          0
        ),
        unique_customers: uniqueEmails.size,
      };
    },
  };
}

export type OffersApi = ReturnType<typeof createOffersApi>;

// ============================================
// Helper functions for offer configuration
// ============================================

export function createBundleConfig(fixedPrice: number): OfferConfig {
  return { fixed_price: fixedPrice };
}

export function createBuyXGetYConfig(
  triggerQuantity: number,
  rewardQuantity: number,
  rewardType: 'free' | 'discount',
  rewardValue?: number
): OfferConfig {
  return {
    trigger_quantity: triggerQuantity,
    reward_quantity: rewardQuantity,
    reward_type: rewardType,
    reward_value: rewardValue,
  };
}

export function createPromoCodeOfferConfig(
  code: string,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  minOrderAmount?: number,
  maxDiscount?: number
): OfferConfig {
  return {
    code,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_amount: minOrderAmount,
    max_discount: maxDiscount,
  };
}

export function createThresholdDiscountConfig(
  minAmount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): OfferConfig {
  return {
    min_amount: minAmount,
    discount_type: discountType,
    discount_value: discountValue,
  };
}
