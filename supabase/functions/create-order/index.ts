import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse, setCurrentRequest } from '../_shared/responses.ts';
import { createLogger, generateRequestId } from '../_shared/logger.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import {
  validateOrderRequest,
  getFoodtruck,
  checkSlotAvailability,
  getMenuItems,
  validateMenuItemsAvailability,
  validatePickupTime,
  createOrder,
  sendConfirmationEmail,
  creditLoyaltyPoints,
  sendPushNotification,
} from '../_shared/orders.ts';
import { calculateOrderTotal } from '../_shared/pricing-engine/calculate-order-total.ts';
import type {
  ClientLineItem,
  DiscountResult,
  ResolvedLineItem,
} from '../_shared/pricing-engine/types.ts';

// ============================================
// RATE LIMITING (persistent via PostgreSQL)
// ============================================
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
    });
    if (error) {
      console.error('Rate limit check failed:', error.message);
      return true;
    }
    return data as boolean;
  } catch {
    return true;
  }
}

// ============================================
// SERVICE ROLE KEY VALIDATION
// ============================================
function isServiceRoleRequest(req: Request): boolean {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) return false;

  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token === serviceRoleKey) return true;
  }

  // Also check apikey header (used by Supabase client SDK)
  const apiKey = req.headers.get('apikey');
  if (apiKey === serviceRoleKey) return true;

  return false;
}

// ============================================
// PAYLOAD FORMAT DETECTION & CONVERSION
// ============================================

/**
 * Detect whether the payload uses the legacy format (client-calculated prices)
 * or the new format (IDs only, server-authoritative).
 *
 * Legacy: items have selected_options objects with price details
 * New:    items have selected_option_ids (string array of UUIDs)
 */
function isLegacyPayload(body: any): boolean {
  if (body.applied_offers?.length > 0) return true;
  if (body.deal_id || body.deal_discount) return true;
  if (body.items?.some((i: any) => i.selected_options?.length > 0)) return true;
  if (body.items?.some((i: any) => i.bundle_name || i.bundle_fixed_price !== undefined))
    return true;
  return false;
}

/** Convert any payload format to engine-compatible ClientLineItem[]. */
function toEngineItems(body: any): ClientLineItem[] {
  return body.items.map((item: any) => ({
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    selected_option_ids:
      item.selected_option_ids ?? item.selected_options?.map((o: any) => o.option_id) ?? [],
    notes: item.notes,
    bundle_id: item.bundle_id,
  }));
}

/** Look up the promo code string from its UUID (legacy payloads send the ID). */
async function lookupPromoCodeString(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  promoCodeId: string
): Promise<string | undefined> {
  // First try the offers table (promo_code type, config.code)
  const { data: offer } = await supabase
    .from('offers')
    .select('config')
    .eq('id', promoCodeId)
    .eq('offer_type', 'promo_code')
    .maybeSingle();

  if (offer?.config?.code) return offer.config.code as string;

  // Fallback: try the legacy promo_codes table
  const { data: promo } = await supabase
    .from('promo_codes')
    .select('code')
    .eq('id', promoCodeId)
    .maybeSingle();

  return promo?.code;
}

// ============================================
// ORDER ITEMS BUILDING from engine result
// ============================================

interface EngineOrderItem {
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
}

interface EngineItemOption {
  itemIndex: number;
  options: Array<{
    option_id: string;
    name: string;
    group_name: string;
    price_modifier: number;
  }>;
}

/**
 * Build order items and item options from engine line items.
 * Handles bundle annotation for manual bundles (items with bundle_id).
 */
async function buildOrderData(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  lineItems: ResolvedLineItem[],
  bundleDiscounts: DiscountResult[]
): Promise<{ orderItems: EngineOrderItem[]; itemOptions: EngineItemOption[] }> {
  const orderItems: EngineOrderItem[] = [];
  const itemOptions: EngineItemOption[] = [];

  // Look up bundle offer names for manual bundles
  const bundleIds = [...new Set(lineItems.filter((li) => li.bundle_id).map((li) => li.bundle_id!))];
  const bundleNameMap = new Map<string, string>();

  if (bundleIds.length > 0) {
    const { data: offers } = await supabase.from('offers').select('id, name').in('id', bundleIds);
    if (offers) {
      for (const o of offers) bundleNameMap.set(o.id, o.name);
    }
  }

  // Track bundle instance counters (for [BundleName#N] notes)
  const bundleInstanceCounters = new Map<string, number>();

  for (let i = 0; i < lineItems.length; i++) {
    const li = lineItems[i];
    let notes: string | null = li.notes || null;

    // Annotate manual bundle items with [BundleName#N]
    if (li.bundle_id) {
      const bundleName = bundleNameMap.get(li.bundle_id) || li.bundle_id;
      if (!bundleInstanceCounters.has(li.bundle_id)) {
        bundleInstanceCounters.set(li.bundle_id, 1);
      }
      const instance = bundleInstanceCounters.get(li.bundle_id)!;
      notes = `[${bundleName}#${instance}]`;
    }

    orderItems.push({
      menu_item_id: li.menu_item_id,
      quantity: li.quantity,
      unit_price: li.unit_price,
      notes,
    });

    if (li.options.length > 0) {
      itemOptions.push({
        itemIndex: i,
        options: li.options.map((o) => ({
          option_id: o.id,
          name: o.name,
          group_name: o.group_name,
          price_modifier: o.price_modifier,
        })),
      });
    }
  }

  // For auto-detected bundle discounts, annotate the consumed items
  for (const bd of bundleDiscounts) {
    if (!bd.metadata?.items_consumed || !bd.offer_id) continue;
    // Skip if this is a manual bundle (already annotated above)
    const isManualBundle = lineItems.some((li) => li.bundle_id === bd.offer_id);
    if (isManualBundle) continue;

    const offerName = bd.label.replace(/ x\d+$/, ''); // Strip " x2" suffix
    const itemsConsumed = bd.metadata.items_consumed as Array<{
      menu_item_id: string;
      quantity: number;
    }>;

    // Find next available instance number
    let maxInstance = 0;
    for (const oi of orderItems) {
      const m = oi.notes?.match(/^\[(.+)#(\d+)\]$/);
      if (m && m[1] === offerName) {
        maxInstance = Math.max(maxInstance, parseInt(m[2]));
      }
    }
    const instanceNum = maxInstance + 1;
    const bundleTag = `[${offerName}#${instanceNum}]`;

    for (const consumed of itemsConsumed) {
      const idx = orderItems.findIndex(
        (oi) =>
          oi.menu_item_id === consumed.menu_item_id && (!oi.notes || !oi.notes.match(/^\[.+\]$/))
      );
      if (idx === -1) continue;

      const orderItem = orderItems[idx];

      if (orderItem.quantity > consumed.quantity) {
        // Split: consumed portion gets the bundle tag
        const newItem: EngineOrderItem = {
          ...orderItem,
          quantity: consumed.quantity,
          notes: bundleTag,
        };
        orderItem.quantity -= consumed.quantity;

        // Duplicate options for the split item
        const existingOpts = itemOptions.find((o) => o.itemIndex === idx);
        orderItems.push(newItem);
        if (existingOpts) {
          itemOptions.push({
            itemIndex: orderItems.length - 1,
            options: existingOpts.options,
          });
        }
      } else {
        orderItem.notes = bundleTag;
      }
    }
  }

  return { orderItems, itemOptions };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  const logger = createLogger('create-order');
  const requestId = generateRequestId();
  logger.setRequestId(requestId);

  setCurrentRequest(req);

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!isServiceRoleRequest(req) && !(await checkRateLimit(clientIP))) {
      logger.warn('Rate limit exceeded', { clientIP });
      return errorResponse('Trop de requêtes. Veuillez réessayer dans une minute.', 429);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Données de commande invalides', 400);
    }
    logger.setContext({ foodtruckId: body.foodtruck_id });

    // ============================================
    // VALIDATIONS (kept unchanged)
    // ============================================

    const validationError = validateOrderRequest(body);
    if (validationError) return validationError;

    const { foodtruck, error: ftError } = await getFoodtruck(body.foodtruck_id);
    if (ftError) return ftError;

    // Check subscription status
    const supabaseAdmin = createSupabaseAdmin();
    {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('status')
        .eq('foodtruck_id', body.foodtruck_id)
        .maybeSingle();
      const status = sub?.status;
      const isActive = status === 'trialing' || status === 'active' || status === 'past_due';
      if (!isActive) {
        return errorResponse(
          JSON.stringify({
            code: 'FOODTRUCK_NOT_ACTIVE',
            message: 'Ce food truck ne prend pas de commandes pour le moment',
          }),
          403
        );
      }
    }

    const forceSlotAllowed = body.force_slot && isServiceRoleRequest(req);
    const isAsapOrder = body.is_asap === true;

    if (!forceSlotAllowed && !isAsapOrder) {
      const slotError = await checkSlotAvailability(
        body.foodtruck_id,
        body.pickup_time,
        foodtruck.max_orders_per_slot
      );
      if (slotError) return slotError;
    }

    const { menuItems, error: menuError } = await getMenuItems(
      body.foodtruck_id,
      body.items.map((i: any) => i.menu_item_id)
    );
    if (menuError) return menuError;

    if (!forceSlotAllowed && !isAsapOrder) {
      const pickupTimeError = validatePickupTime(body.pickup_time);
      if (pickupTimeError) return pickupTimeError;
    }

    const availabilityError = validateMenuItemsAvailability(
      body.items.map((i: any) => i.menu_item_id),
      menuItems
    );
    if (availabilityError) return availabilityError;

    // ============================================
    // ENGINE-BASED AUTHORITATIVE CALCULATION
    // ============================================

    const legacy = isLegacyPayload(body);

    // Convert items to engine format
    const engineItems = toEngineItems(body);

    // Resolve promo code string
    let promoCode: string | undefined;
    if (body.promo_code) {
      // New format: code string directly
      promoCode = body.promo_code;
    } else if (body.promo_code_id) {
      // Legacy format: look up code from ID
      promoCode = await lookupPromoCodeString(supabaseAdmin, body.promo_code_id);
    }

    // === SINGLE SOURCE OF TRUTH ===
    const calc = await calculateOrderTotal(supabaseAdmin, {
      foodtruckId: body.foodtruck_id,
      items: engineItems,
      customer: body.customer_email
        ? { email: body.customer_email, phone: body.customer_phone }
        : body.customer,
      promoCode,
      useLoyaltyReward: body.use_loyalty_reward,
      loyaltyRewardCount: body.loyalty_reward_count,
    });

    logger.info('Engine calculation complete', {
      subtotal: String(calc.subtotal),
      total: String(calc.total),
      discounts: String(calc.discounts.length),
      legacy: String(legacy),
    });

    // ============================================
    // MAP ENGINE RESULT TO DB FORMAT
    // ============================================

    const totalDiscount = calc.subtotal - calc.total;

    // Extract discount types
    const promoDiscount = calc.discounts.find((d) => d.type === 'promo_code');
    const loyaltyDiscount = calc.discounts.find((d) => d.type === 'loyalty_reward');
    const offerDiscounts = calc.discounts.filter((d) =>
      ['bundle', 'buy_x_get_y', 'happy_hour', 'threshold_discount'].includes(d.type)
    );
    const offerDiscountTotal = offerDiscounts.reduce((s, d) => s + d.amount, 0);
    const bundleDiscounts = calc.discounts.filter((d) => d.type === 'bundle');

    // Build order items from engine line items
    const { orderItems, itemOptions } = await buildOrderData(
      supabaseAdmin,
      calc.line_items,
      bundleDiscounts
    );

    // Synthesize body for createOrder (preserves side effects like opt-in, tracking)
    const engineBody = {
      ...body,
      // Engine-calculated values override client values
      discount_amount: totalDiscount,
      // Promo code: keep legacy promo_code_id for FK, or null for new format
      promo_code_id: legacy ? body.promo_code_id : promoDiscount?.offer_id || null,
      // Offer discount for orders.offer_discount column
      offer_discount: offerDiscountTotal,
      // Clear legacy deal fields (now handled by engines)
      deal_id: undefined,
      deal_discount: undefined,
      // Loyalty from engine metadata
      use_loyalty_reward: !!loyaltyDiscount,
      loyalty_customer_id:
        (loyaltyDiscount?.metadata?.loyalty_customer_id as string) ||
        body.loyalty_customer_id ||
        undefined,
      loyalty_reward_count:
        (loyaltyDiscount?.metadata?.reward_count as number) || body.loyalty_reward_count,
      // Applied offers from engine (for tracking via offer_uses)
      applied_offers: offerDiscounts
        .filter((d) => d.offer_id)
        .map((d) => ({
          offer_id: d.offer_id!,
          times_applied: (d.metadata?.times_applied as number) || 1,
          discount_amount: d.amount,
          items_consumed:
            (d.metadata?.items_consumed as Array<{ menu_item_id: string; quantity: number }>) || [],
        })),
      // Clear bundles_used — now tracked via applied_offers
      bundles_used: undefined,
    };

    // Auto-accept if auto_accept_orders or manual dashboard order
    const status = foodtruck.auto_accept_orders || forceSlotAllowed ? 'confirmed' : 'pending';
    const { order, error: orderError } = await createOrder(
      engineBody,
      orderItems,
      calc.subtotal, // createOrder subtracts discount_amount to get final total
      status,
      itemOptions
    );
    if (orderError) return orderError;

    // ============================================
    // POST-ORDER: notifications, loyalty, push
    // ============================================

    if (status === 'confirmed') {
      if (body.customer_email !== 'surplace@local') {
        await sendConfirmationEmail(order.id);
      }

      if (
        foodtruck.loyalty_enabled &&
        foodtruck.loyalty_points_per_euro > 0 &&
        body.customer_email !== 'surplace@local'
      ) {
        await creditLoyaltyPoints(
          body.foodtruck_id,
          order.id,
          body.customer_email,
          order.total_amount,
          foodtruck.loyalty_points_per_euro
        );
      }
    }

    if (body.customer_email !== 'surplace@local') {
      const pickupTime = new Date(body.pickup_time).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      });

      const itemsList = calc.line_items
        .map((li) => (li.quantity > 1 ? `${li.quantity}x ${li.name}` : li.name))
        .join(', ');

      const notifTitle = foodtruck.auto_accept_orders
        ? 'Nouvelle commande !'
        : 'Nouvelle commande ! A accepter';

      await sendPushNotification(
        body.foodtruck_id,
        notifTitle,
        `${pickupTime} - ${(order.total_amount / 100).toFixed(2)}€ - ${itemsList}`,
        { order_id: order.id }
      );
    }

    logger.info('Order created successfully', { orderId: order.id, status });
    return successResponse({ order_id: order.id, order });
  } catch (error) {
    console.error('[create-order] Error:', error);
    logger.error('Order creation failed', error as Error);

    // Return user-friendly message for known engine errors
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not found') || message.includes('no longer available')) {
      return errorResponse(`Un article n'est plus disponible. Veuillez rafraîchir la page.`, 400);
    }

    return errorResponse('Une erreur est survenue. Veuillez réessayer.', 500);
  }
});
