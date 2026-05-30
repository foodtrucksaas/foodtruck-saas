/**
 * Order helpers — validation, creation, notifications.
 *
 * Pricing is now handled exclusively by the pricing engine
 * (supabase/functions/_shared/pricing-engine/). The old
 * validatePrices, validatePromoCode, validateDeal,
 * validateAppliedOffers, validateOrderTotal, calculateOrder
 * functions have been removed as of Step D.
 */

import { createSupabaseAdmin } from './supabase.ts';
import { errorResponse } from './responses.ts';

// Option request type (kept for OrderRequest and createOrder compatibility)
interface SelectedOptionRequest {
  option_id: string;
  option_group_id?: string;
  name: string;
  group_name: string;
  price_modifier: number;
  price_mode?: 'absolute' | 'modifier';
  is_size_option?: boolean;
}

// Applied offer from optimized combination (used by createOrder for tracking)
interface AppliedOfferRequest {
  offer_id: string;
  times_applied: number;
  discount_amount: number;
  items_consumed: Array<{ menu_item_id: string; quantity: number }>;
  free_item_name?: string;
}

interface OrderRequest {
  foodtruck_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  pickup_time: string;
  is_asap?: boolean;
  notes?: string;
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  loyalty_opt_in?: boolean;
  promo_code_id?: string;
  discount_amount?: number;
  use_loyalty_reward?: boolean;
  loyalty_customer_id?: string;
  loyalty_reward_count?: number;
  // Legacy single offer (backward compatibility)
  deal_id?: string;
  deal_discount?: number;
  deal_free_item_name?: string;
  // NEW: Multiple applied offers (optimized combination)
  applied_offers?: AppliedOfferRequest[];
  items: {
    menu_item_id: string;
    quantity: number;
    notes?: string;
    selected_options?: SelectedOptionRequest[];
    // Bundle info (for items that are part of a bundle offer)
    bundle_id?: string;
    bundle_name?: string;
    bundle_fixed_price?: number; // Set only on first item of bundle
    bundle_supplement?: number;
    bundle_free_options?: boolean;
  }[];
  // Bundles used in this order (for tracking)
  bundles_used?: { bundle_id: string; quantity: number }[];
}

// Validation patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrderRequest(body: OrderRequest): Response | null {
  const { foodtruck_id, customer_email, customer_name, pickup_time, items } = body;

  // Check required fields
  if (!foodtruck_id || !customer_email || !customer_name || !pickup_time || !items?.length) {
    return errorResponse('Missing required fields');
  }

  // Validate UUID format
  if (!UUID_REGEX.test(foodtruck_id)) {
    return errorResponse('Invalid foodtruck_id format', 400);
  }

  // Validate email format (skip for manual dashboard orders)
  if (customer_email !== 'surplace@local' && !EMAIL_REGEX.test(customer_email)) {
    return errorResponse('Invalid email format', 400);
  }

  // Validate pickup_time is a valid ISO date
  const pickupDate = new Date(pickup_time);
  if (isNaN(pickupDate.getTime())) {
    return errorResponse('Invalid pickup_time format', 400);
  }

  // Validate item count (prevent oversized payloads)
  if (items.length > 100) {
    return errorResponse('Too many items in order', 400);
  }

  // Validate field lengths (prevent DoS via oversized payloads)
  if (customer_name.length > 200) {
    return errorResponse('Customer name too long', 400);
  }
  if (body.notes && body.notes.length > 2000) {
    return errorResponse('Notes too long', 400);
  }
  if (body.customer_phone && body.customer_phone.length > 30) {
    return errorResponse('Phone number too long', 400);
  }

  // Validate items have required fields
  for (const item of items) {
    if (!item.menu_item_id || !UUID_REGEX.test(item.menu_item_id)) {
      return errorResponse('Invalid menu_item_id in items', 400);
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1) {
      return errorResponse('Invalid quantity in items', 400);
    }
  }

  return null;
}

export async function getFoodtruck(foodtruckId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('foodtrucks')
    .select('*')
    .eq('id', foodtruckId)
    .eq('is_active', true)
    .single();

  if (error || !data) return { error: errorResponse('Foodtruck not found', 404) };
  return { foodtruck: data };
}

export async function checkSlotAvailability(
  foodtruckId: string,
  pickupTime: string,
  maxOrders: number | null
) {
  if (!maxOrders) return null;

  const supabase = createSupabaseAdmin();
  const [date, time] = pickupTime.split('T');
  const hour = time?.substring(0, 5);

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('foodtruck_id', foodtruckId)
    .gte('pickup_time', `${date}T${hour}:00`)
    .lt('pickup_time', `${date}T${hour}:59`)
    .neq('status', 'cancelled');

  if (count !== null && count >= maxOrders) {
    return errorResponse('Ce créneau horaire est complet. Veuillez choisir un autre horaire.');
  }
  return null;
}

export async function getMenuItems(foodtruckId: string, itemIds: string[]) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .in('id', itemIds)
    .eq('foodtruck_id', foodtruckId);

  if (error || !data?.length) return { error: errorResponse('Invalid menu items') };
  return { menuItems: data };
}

/**
 * Validate that all menu items exist and are available
 */
export function validateMenuItemsAvailability(
  requestedItemIds: string[],
  menuItems: any[]
): Response | null {
  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const itemId of requestedItemIds) {
    const menuItem = menuItemMap.get(itemId);
    if (!menuItem) {
      return errorResponse(`L'article avec l'id ${itemId} n'existe pas`);
    }
    if (!menuItem.is_available) {
      return errorResponse(`L'article "${menuItem.name}" n'est plus disponible`);
    }
  }

  return null;
}

/**
 * Validate that the pickup time is not in the past
 */
export function validatePickupTime(pickupTime: string): Response | null {
  const pickupDate = new Date(pickupTime);
  const now = new Date();

  // Allow a 1-minute tolerance to account for clock differences
  const tolerance = 60 * 1000; // 1 minute in milliseconds

  if (pickupDate.getTime() < now.getTime() - tolerance) {
    return errorResponse("L'heure de retrait ne peut pas être dans le passé");
  }

  return null;
}

// validatePrices — REMOVED in Step D (pricing engine resolves from DB)

// validatePromoCode — REMOVED in Step D (PromoCodeEngine handles validation)
// validateDeal — REMOVED in Step D (legacy, engines handle all offer types)
// validateAppliedOffers — REMOVED in Step D (engines handle all offer types)

// validateOrderTotal — REMOVED in Step D (calculateOrderTotal is the single authority)
// calculateOrder — REMOVED in Step D (replaced by calculateOrderTotal + resolveLineItems)

export async function createOrder(
  data: Omit<OrderRequest, 'items'>,
  orderItems: any[],
  total: number,
  status: 'pending' | 'confirmed',
  itemOptions: { itemIndex: number; options: SelectedOptionRequest[] }[] = []
) {
  const supabase = createSupabaseAdmin();

  // Calculate final amount after discount
  const discountAmount = data.discount_amount || 0;
  const finalAmount = Math.max(1, total - discountAmount); // Minimum 1 centime (DB constraint: total_amount > 0)

  // Calculate offer discount from applied_offers
  const offerDiscount = data.applied_offers
    ? data.applied_offers.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
    : 0;

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      foodtruck_id: data.foodtruck_id,
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone || null,
      pickup_time: data.pickup_time,
      is_asap: data.is_asap || false,
      total_amount: finalAmount,
      discount_amount: discountAmount,
      promo_code_id: data.promo_code_id || null,
      deal_id: data.deal_id || null,
      deal_discount: data.deal_discount || null,
      offer_discount: offerDiscount > 0 ? offerDiscount : 0,
      status,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error || !order) {
    console.error('[createOrder] Database error:', error);
    return { error: errorResponse('Failed to create order', 500) };
  }

  // Update customer opt-in preferences if provided
  if (data.email_opt_in || data.sms_opt_in || data.loyalty_opt_in !== undefined) {
    const email = data.customer_email.toLowerCase().trim();
    if (email && email !== 'surplace@local') {
      const updateData: Record<string, unknown> = {
        phone: data.customer_phone || null,
      };

      // Email/SMS opt-in
      if (data.email_opt_in !== undefined) updateData.email_opt_in = data.email_opt_in;
      if (data.sms_opt_in !== undefined) updateData.sms_opt_in = data.sms_opt_in;
      if (data.email_opt_in || data.sms_opt_in) {
        updateData.opted_in_at = new Date().toISOString();
      }

      // Loyalty opt-in
      if (data.loyalty_opt_in !== undefined) {
        updateData.loyalty_opt_in = data.loyalty_opt_in;
        if (data.loyalty_opt_in) {
          updateData.loyalty_opted_in_at = new Date().toISOString();
        }
      }

      await supabase
        .from('customers')
        .update(updateData)
        .eq('foodtruck_id', data.foodtruck_id)
        .eq('email', email);
    }
  }

  // Insert order items
  const { data: insertedItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })))
    .select();

  if (itemsError || !insertedItems) {
    console.error('[createOrder] Order items error:', itemsError);
    await supabase.from('orders').delete().eq('id', order.id);
    return { error: errorResponse('Failed to create order items', 500) };
  }

  // Insert order item options
  if (itemOptions.length > 0) {
    const optionsToInsert: any[] = [];

    for (const { itemIndex, options } of itemOptions) {
      const orderItem = insertedItems[itemIndex];
      for (const opt of options) {
        optionsToInsert.push({
          order_item_id: orderItem.id,
          option_id: opt.option_id,
          option_name: opt.name,
          option_group_name: opt.group_name,
          price_modifier: opt.price_modifier,
        });
      }
    }

    const { error: optionsError } = await supabase
      .from('order_item_options')
      .insert(optionsToInsert);

    if (optionsError) {
      console.error('Failed to save order item options:', optionsError);
      // Don't fail the order for this, just log
    }
  }

  // Apply promo code if provided
  if (data.promo_code_id && discountAmount > 0) {
    try {
      await supabase.rpc('apply_promo_code', {
        p_promo_code_id: data.promo_code_id,
        p_order_id: order.id,
        p_customer_email: data.customer_email,
        p_discount_applied: discountAmount,
      });
    } catch (e) {
      console.error('Failed to apply promo code:', e);
      // Don't fail the order for this, just log
    }
  }

  // Apply deal if provided (legacy single offer)
  if (data.deal_id && data.deal_discount && data.deal_discount > 0) {
    try {
      await supabase.rpc('apply_deal', {
        p_deal_id: data.deal_id,
        p_order_id: order.id,
        p_customer_email: data.customer_email,
        p_discount_applied: data.deal_discount,
        p_free_item_name: data.deal_free_item_name || null,
      });
    } catch (e) {
      console.error('Failed to apply deal:', e);
      // Don't fail the order for this, just log
    }
  }

  // Track applied offers if provided (new optimized combination system)
  if (data.applied_offers && data.applied_offers.length > 0) {
    for (const appliedOffer of data.applied_offers) {
      // Skip offers with invalid times_applied to prevent division by zero
      if (!appliedOffer.times_applied || appliedOffer.times_applied <= 0) {
        console.warn(
          `Skipping offer ${appliedOffer.offer_id}: invalid times_applied (${appliedOffer.times_applied})`
        );
        continue;
      }

      try {
        // Calculate per-application discount (safe division)
        const discountPerApplication = Math.floor(
          appliedOffer.discount_amount / appliedOffer.times_applied
        );

        // Insert into offer_uses for each time applied
        for (let i = 0; i < appliedOffer.times_applied; i++) {
          await supabase.from('offer_uses').insert({
            offer_id: appliedOffer.offer_id,
            order_id: order.id,
            customer_email: data.customer_email,
            discount_amount: discountPerApplication,
            free_item_name: appliedOffer.free_item_name || null,
          });
        }

        // Update offer stats atomically (increment current_uses and total_discount_given)
        // Uses atomic UPDATE to prevent race conditions
        await supabase.rpc('increment_offer_uses', {
          p_offer_id: appliedOffer.offer_id,
          p_count: appliedOffer.times_applied,
          p_discount_amount: appliedOffer.discount_amount,
        });

        console.log(
          `Tracked offer usage: ${appliedOffer.offer_id} x${appliedOffer.times_applied}, discount: ${appliedOffer.discount_amount}`
        );
      } catch (e) {
        console.error('Failed to track applied offer:', e);
        // Don't fail the order for this, just log
      }
    }
  }

  // Redeem loyalty reward if used
  if (data.use_loyalty_reward && data.loyalty_customer_id) {
    try {
      // Get the foodtruck's loyalty threshold
      const { data: foodtruck } = await supabase
        .from('foodtrucks')
        .select('loyalty_threshold')
        .eq('id', data.foodtruck_id)
        .single();

      if (foodtruck?.loyalty_threshold) {
        const rewardCount = data.loyalty_reward_count || 1;
        await supabase.rpc('redeem_loyalty_reward', {
          p_customer_id: data.loyalty_customer_id,
          p_order_id: order.id,
          p_threshold: foodtruck.loyalty_threshold,
          p_count: rewardCount,
        });
        console.log(
          `Redeemed ${rewardCount} loyalty reward(s) for customer ${data.loyalty_customer_id}`
        );
      }
    } catch (e) {
      console.error('Failed to redeem loyalty reward:', e);
      // Don't fail the order for this, just log
    }
  }

  // Track bundle usage if bundles were used
  if (data.bundles_used && data.bundles_used.length > 0) {
    for (const bundle of data.bundles_used) {
      try {
        // Insert into offer_uses
        await supabase.from('offer_uses').insert({
          offer_id: bundle.bundle_id,
          order_id: order.id,
          customer_email: data.customer_email,
          discount_amount: 0, // Bundles don't have a "discount" per se, they have a fixed price
        });

        // Update offer stats atomically (increment current_uses)
        await supabase.rpc('increment_offer_uses', {
          p_offer_id: bundle.bundle_id,
          p_count: bundle.quantity,
          p_discount_amount: 0, // Bundles use fixed price, not discount
        });

        console.log(`Tracked bundle usage: ${bundle.bundle_id} x${bundle.quantity}`);
      } catch (e) {
        console.error('Failed to track bundle usage:', e);
        // Don't fail the order for this, just log
      }
    }
  }

  return { order };
}

export async function creditLoyaltyPoints(
  foodtruckId: string,
  orderId: string,
  customerEmail: string,
  orderAmount: number, // in centimes
  loyaltyPointsPerEuro: number
) {
  const supabase = createSupabaseAdmin();

  const email = customerEmail.toLowerCase().trim();
  if (!email || email === 'surplace@local') {
    console.log('Skipping loyalty points: anonymous order');
    return; // Skip for anonymous orders
  }

  // Get the customer ID and check opt-in - retry a few times in case trigger is still running
  let customer = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await supabase
      .from('customers')
      .select('id, loyalty_opt_in')
      .eq('foodtruck_id', foodtruckId)
      .eq('email', email)
      .single();

    if (data) {
      customer = data;
      break;
    }

    // Wait 500ms before retry
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (!customer) {
    console.log(
      `Customer not found for email ${email}, foodtruck ${foodtruckId} - skipping loyalty points`
    );
    return;
  }

  // Check loyalty opt-in (RGPD compliance)
  if (!customer.loyalty_opt_in) {
    console.log(`Customer ${email} has not opted in to loyalty program - skipping points`);
    return;
  }

  try {
    const result = await supabase.rpc('credit_loyalty_points', {
      p_customer_id: customer.id,
      p_order_id: orderId,
      p_order_amount: orderAmount,
      p_points_per_euro: loyaltyPointsPerEuro,
    });

    if (result.error) {
      console.error('Failed to credit loyalty points:', result.error);
    } else {
      console.log(
        `Credited loyalty points for order ${orderId}, amount ${orderAmount}, rate ${loyaltyPointsPerEuro}, points earned: ${result.data}`
      );
    }
  } catch (e) {
    console.error('Failed to credit loyalty points:', e);
    // Don't fail the order for this, just log
  }
}

export async function sendConfirmationEmail(orderId: string) {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      await fetch(`${url}/functions/v1/send-order-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ order_id: orderId }),
      });
    }
  } catch (e) {
    console.error('Email error:', e);
  }
}

export async function sendPushNotification(
  foodtruckId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (url && key) {
      const response = await fetch(`${url}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          foodtruck_id: foodtruckId,
          title,
          body,
          data,
        }),
      });
      const result = await response.json();
      console.log('Push notification result:', result);
    }
  } catch (e) {
    console.error('Push notification error:', e);
    // Don't fail the order for this, just log
  }
}
