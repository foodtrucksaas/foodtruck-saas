/**
 * Server-side Authoritative Pricing Engine — Types
 *
 * All monetary values are in CENTIMES (integer).
 */

import { createSupabaseAdmin } from '../supabase.ts';

export type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

// ============================================
// Input types (what the client sends)
// ============================================

/** Minimal line item from client — IDs and quantities only, no prices. */
export interface ClientLineItem {
  menu_item_id: string;
  quantity: number;
  selected_option_ids: string[];
  notes?: string;
  /** If this item is part of a manual bundle from the BundleBuilder. */
  bundle_id?: string;
}

// ============================================
// Resolved types (after DB lookup)
// ============================================

export interface ResolvedOption {
  id: string;
  name: string;
  group_id: string;
  group_name: string;
  price_modifier: number; // cents
  price_mode: 'absolute' | 'modifier';
}

export interface ResolvedLineItem {
  menu_item_id: string;
  name: string;
  category_id: string | null;
  base_price: number; // cents — from absolute option or menu_item.price
  options: ResolvedOption[];
  unit_price: number; // cents — base_price + modifier options
  quantity: number;
  line_total: number; // unit_price * quantity
  notes?: string;
  bundle_id?: string;
}

// ============================================
// Discount engine interface
// ============================================

export type DiscountType =
  | 'bundle'
  | 'buy_x_get_y'
  | 'happy_hour'
  | 'threshold_discount'
  | 'promo_code'
  | 'loyalty_reward';

export interface DiscountResult {
  type: DiscountType;
  label: string; // e.g. "3 pizzas achetees = 1 offerte"
  amount: number; // positive, in cents (will be subtracted)
  offer_id?: string;
  line_item_ids?: string[]; // menu_item_ids affected
  metadata?: Record<string, unknown>;
}

export interface DiscountContext {
  foodtruckId: string;
  lineItems: ResolvedLineItem[];
  subtotal: number; // sum of all line_total
  /** Running total that decreases as discounts apply (cascade). */
  runningTotal: number;
  /**
   * Expanded items JSONB for SQL RPCs (bundle/buy_x_get_y).
   * Each unit is a separate entry with used=false/true.
   */
  expandedItems: ExpandedItem[];
  customer?: { email: string; phone?: string };
  promoCode?: string;
  useLoyaltyReward?: boolean;
  loyaltyRewardCount?: number;
  supabase: SupabaseAdmin;
}

/** Flat item for SQL RPC interop (one per unit, not per quantity). */
export interface ExpandedItem {
  menu_item_id: string;
  category_id: string | null;
  price: number;
  name: string;
  size_id: string | null;
  used: boolean;
}

export interface DiscountEngine {
  type: DiscountType;
  /** Lower = runs first. */
  priority: number;
  evaluate(ctx: DiscountContext): Promise<DiscountResult[]>;
}

// ============================================
// Final output
// ============================================

export interface OrderCalculation {
  line_items: ResolvedLineItem[];
  subtotal: number;
  discounts: DiscountResult[];
  total: number;
  loyalty_points_earned: number;
}
