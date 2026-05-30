/**
 * Types for the server-side authoritative pricing engine.
 * Mirrors the Deno types in supabase/functions/_shared/pricing-engine/types.ts
 * for client-side consumption.
 *
 * All monetary values are in CENTIMES (integer).
 */

export interface PreviewOrderPayload {
  foodtruck_id: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    selected_option_ids?: string[];
    notes?: string;
    bundle_id?: string;
  }>;
  customer?: { email?: string; phone?: string };
  promo_code?: string;
  use_loyalty_reward?: boolean;
  loyalty_reward_count?: number;
}

export type DiscountType =
  | 'bundle'
  | 'buy_x_get_y'
  | 'happy_hour'
  | 'threshold_discount'
  | 'promo_code'
  | 'loyalty_reward';

export interface DiscountResult {
  type: DiscountType;
  label: string;
  amount: number;
  offer_id?: string;
  line_item_ids?: string[];
  metadata?: Record<string, unknown>;
}

export interface ResolvedOption {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  price_modifier: number;
  price_mode: 'absolute' | 'modifier';
}

export interface ResolvedLineItem {
  menu_item_id: string;
  name: string;
  category_id: string | null;
  base_price: number;
  options: ResolvedOption[];
  unit_price: number;
  quantity: number;
  line_total: number;
  notes?: string;
  bundle_id?: string;
}

export interface OrderCalculation {
  line_items: ResolvedLineItem[];
  subtotal: number;
  discounts: DiscountResult[];
  total: number;
  loyalty_points_earned: number;
  warnings: string[];
}
