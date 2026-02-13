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
  validatePrices,
  validatePromoCode,
  validateDeal,
  validateAppliedOffers,
  validateOrderTotal,
  calculateOrder,
  createOrder,
  sendConfirmationEmail,
  creditLoyaltyPoints,
  sendPushNotification,
} from '../_shared/orders.ts';

// ============================================
// RATE LIMITING (persistent via PostgreSQL)
// ============================================
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 10;

async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
    });
    if (error) {
      // If rate limit check fails, allow the request (fail open)
      console.error('Rate limit check failed:', error.message);
      return true;
    }
    return data as boolean;
  } catch {
    // Fail open on unexpected errors
    return true;
  }
}

// ============================================
// SERVICE ROLE KEY VALIDATION
// For privileged operations (force_slot)
// ============================================
function isServiceRoleRequest(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  return serviceRoleKey ? token === serviceRoleKey : false;
}

serve(async (req) => {
  const logger = createLogger('create-order');
  const requestId = generateRequestId();
  logger.setRequestId(requestId);

  setCurrentRequest(req);

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Rate limiting based on IP or forwarded IP
    const clientIP =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!(await checkRateLimit(clientIP))) {
      logger.warn('Rate limit exceeded', { clientIP });
      return errorResponse('Trop de requêtes. Veuillez réessayer dans une minute.', 429);
    }

    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('[create-order] JSON parse error:', jsonError);
      return errorResponse('Données de commande invalides', 400);
    }
    logger.setContext({ foodtruckId: body.foodtruck_id });

    const validationError = validateOrderRequest(body);
    if (validationError) return validationError;

    const { foodtruck, error: ftError } = await getFoodtruck(body.foodtruck_id);
    if (ftError) return ftError;

    // force_slot requires service role key (dashboard internal calls only)
    const forceSlotAllowed = body.force_slot && isServiceRoleRequest(req);

    // ASAP orders skip slot check - pickup time will be assigned by merchant (manual mode)
    // or is set to min prep time placeholder (auto mode)
    const isAsapOrder = body.is_asap === true;

    // Skip slot check only if force_slot is allowed or it's an ASAP order
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

    // === SERVER-SIDE VALIDATIONS ===

    // 1. Validate pickup time is not in the past (skip for manual dashboard orders and ASAP orders)
    if (!forceSlotAllowed && !isAsapOrder) {
      const pickupTimeError = validatePickupTime(body.pickup_time);
      if (pickupTimeError) return pickupTimeError;
    }

    // 2. Validate all menu items exist and are available
    const availabilityError = validateMenuItemsAvailability(
      body.items.map((i: any) => i.menu_item_id),
      menuItems
    );
    if (availabilityError) return availabilityError;

    // 3. Validate prices (menu items and options) match database
    const pricesError = await validatePrices(body.items, menuItems);
    if (pricesError) return pricesError;

    // Calculate order server-side
    const {
      total,
      orderItems,
      itemOptions,
      error: calcError,
    } = calculateOrder(body.items, menuItems);
    if (calcError) return calcError;

    // 4. Validate promo code if used
    const discountAmount = body.discount_amount || 0;
    const promoCodeError = await validatePromoCode(
      body.foodtruck_id,
      body.promo_code_id,
      body.customer_email,
      total, // subtotal in centimes
      discountAmount
    );
    if (promoCodeError) return promoCodeError;

    // 4b. Validate deal if used (legacy single deal)
    const dealError = await validateDeal(
      body.foodtruck_id,
      body.deal_id,
      body.deal_discount,
      body.items,
      menuItems
    );
    if (dealError) return dealError;

    // 4c. Validate applied offers (new multi-offer system)
    const {
      totalDiscount: appliedOffersDiscount,
      error: appliedOffersError,
      validatedOffers,
    } = await validateAppliedOffers(body.foodtruck_id, body.applied_offers, body.items, menuItems);
    if (appliedOffersError) return appliedOffersError;

    // 5. Validate total matches server calculation
    // Get loyalty discount if applicable
    const loyaltyDiscount =
      body.use_loyalty_reward && body.loyalty_reward_count
        ? (foodtruck.loyalty_reward || 0) * body.loyalty_reward_count
        : 0;
    const dealDiscount = body.deal_discount || 0;

    // Always validate total — use client-provided expected_total, or fall back to server-calculated total
    const expectedTotal = body.expected_total ?? total;
    const { error: totalError } = validateOrderTotal(
      body.items,
      menuItems,
      expectedTotal,
      discountAmount,
      dealDiscount,
      loyaltyDiscount,
      appliedOffersDiscount
    );
    if (totalError) return totalError;

    // Annotate auto-detected bundle items with [OfferName#N] notes and adjust pricing
    // so they display correctly grouped on the dashboard (same as manual BundleBuilder bundles)
    let adjustedTotal = total;
    if (body.applied_offers && body.applied_offers.length > 0 && validatedOffers) {
      for (const appliedOffer of body.applied_offers) {
        const offer = validatedOffers.get(appliedOffer.offer_id);
        if (!offer || offer.offer_type !== 'bundle') continue;

        const offerName = offer.name;
        const fixedPrice = offer.config?.fixed_price;
        if (!fixedPrice || !appliedOffer.items_consumed?.length) continue;

        // Find next available instance number for this bundle name
        let maxInstance = 0;
        for (const oi of orderItems) {
          const m = oi.notes?.match(/^\[(.+)#(\d+)\]$/);
          if (m && m[1] === offerName) {
            maxInstance = Math.max(maxInstance, parseInt(m[2]));
          }
        }
        const instanceNum = maxInstance + 1;
        const bundleTag = `[${offerName}#${instanceNum}]`;

        // Check if all consumed items have the same quantity (common case)
        const quantities = appliedOffer.items_consumed.map((c: { quantity: number }) => c.quantity);
        const allSameQty = quantities.every((q: number) => q === quantities[0]);

        // Track which orderItems we've annotated for this bundle
        let firstAnnotated = true;
        let originalPriceSum = 0;

        for (const consumed of appliedOffer.items_consumed) {
          // Find a matching orderItem that doesn't already have bundle notes
          const idx = orderItems.findIndex(
            (oi: any) =>
              oi.menu_item_id === consumed.menu_item_id &&
              (!oi.notes || !oi.notes.match(/^\[.+\]$/))
          );
          if (idx === -1) continue;

          const orderItem = orderItems[idx];

          if (orderItem.quantity > consumed.quantity) {
            // Split: create a new item for the consumed portion
            const newItem = {
              ...orderItem,
              quantity: consumed.quantity,
              notes: bundleTag,
            };
            orderItem.quantity -= consumed.quantity;

            // Duplicate options for the new item
            const existingOpts = itemOptions.find((o: any) => o.itemIndex === idx);
            orderItems.push(newItem);
            if (existingOpts) {
              itemOptions.push({
                itemIndex: orderItems.length - 1,
                options: existingOpts.options,
              });
            }

            originalPriceSum += newItem.unit_price * newItem.quantity;

            // Set pricing for the new (bundle) item
            if (allSameQty && firstAnnotated) {
              newItem.unit_price = fixedPrice;
              firstAnnotated = false;
            } else if (allSameQty) {
              newItem.unit_price = 0;
            }
          } else {
            // Full consumption: annotate in place
            originalPriceSum += orderItem.unit_price * orderItem.quantity;
            orderItem.notes = bundleTag;

            if (allSameQty && firstAnnotated) {
              orderItem.unit_price = fixedPrice;
              firstAnnotated = false;
            } else if (allSameQty) {
              orderItem.unit_price = 0;
            }
          }
        }

        // Adjust total and discount when prices were modified
        if (allSameQty) {
          const newPriceSum = fixedPrice * quantities[0]; // fixed_price * qty (one per application)
          const priceDiff = originalPriceSum - newPriceSum;
          if (priceDiff > 0) {
            adjustedTotal -= priceDiff;
            body.discount_amount = (body.discount_amount || 0) - priceDiff;
            appliedOffer.discount_amount = 0;
          }
        }
        // For non-uniform quantities (rare edge case), items keep individual prices
        // and the discount shows separately in the dashboard - still correct
      }
    }

    // Auto-accept if auto_accept_orders is true OR if it's a manual order from dashboard (force_slot with service key)
    const status = foodtruck.auto_accept_orders || forceSlotAllowed ? 'confirmed' : 'pending';
    const { order, error: orderError } = await createOrder(
      body,
      orderItems,
      adjustedTotal,
      status,
      itemOptions
    );
    if (orderError) return orderError;

    // Send confirmation email and credit loyalty for confirmed orders
    if (status === 'confirmed') {
      // Don't send email for manual dashboard orders (surplace@local)
      if (body.customer_email !== 'surplace@local') {
        await sendConfirmationEmail(order.id);
      }

      // Credit loyalty points for confirmed orders (except manual dashboard orders)
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
    // For manual accept (non-dashboard), points will be credited when order is confirmed

    // Send push notification to merchant (except for manual dashboard orders)
    if (body.customer_email !== 'surplace@local') {
      const pickupTime = new Date(body.pickup_time).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
      });

      // Build items list for notification
      const itemsList = orderItems
        .map((item: any) => {
          const menuItem = menuItems.find((m: any) => m.id === item.menu_item_id);
          return item.quantity > 1 ? `${item.quantity}x ${menuItem?.name}` : menuItem?.name;
        })
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
    // Log error details internally
    console.error('[create-order] Error:', error);
    logger.error('Order creation failed', error as Error);
    return errorResponse('Une erreur est survenue. Veuillez réessayer.', 500);
  }
});
