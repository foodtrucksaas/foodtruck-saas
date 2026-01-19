import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse } from '../_shared/responses.ts';
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
  validateOrderTotal,
  calculateOrder,
  createOrder,
  sendConfirmationEmail,
  creditLoyaltyPoints,
  sendPushNotification,
} from '../_shared/orders.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json();

    const validationError = validateOrderRequest(body);
    if (validationError) return validationError;

    const { foodtruck, error: ftError } = await getFoodtruck(body.foodtruck_id);
    if (ftError) return ftError;

    // Skip slot check if force_slot is true (manual order from dashboard)
    if (!body.force_slot) {
      const slotError = await checkSlotAvailability(body.foodtruck_id, body.pickup_time, foodtruck.max_orders_per_slot);
      if (slotError) return slotError;
    }

    const { menuItems, error: menuError } = await getMenuItems(body.foodtruck_id, body.items.map((i: any) => i.menu_item_id));
    if (menuError) return menuError;

    // === SERVER-SIDE VALIDATIONS ===

    // 1. Validate pickup time is not in the past (skip for manual dashboard orders)
    if (!body.force_slot) {
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
    const { total, orderItems, itemOptions, error: calcError } = calculateOrder(body.items, menuItems);
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

    // 4b. Validate deal if used
    const dealError = await validateDeal(
      body.foodtruck_id,
      body.deal_id,
      body.deal_discount,
      body.items,
      menuItems
    );
    if (dealError) return dealError;

    // 5. Validate total matches server calculation
    // Get loyalty discount if applicable
    const loyaltyDiscount = body.use_loyalty_reward && body.loyalty_reward_count
      ? (foodtruck.loyalty_reward || 0) * body.loyalty_reward_count
      : 0;
    const dealDiscount = body.deal_discount || 0;

    // Calculate expected total after all discounts
    const expectedTotal = Math.max(0, total - discountAmount - dealDiscount - loyaltyDiscount);

    // If client sent a total, validate it
    if (body.expected_total !== undefined) {
      const { error: totalError } = validateOrderTotal(
        body.items,
        menuItems,
        body.expected_total,
        discountAmount,
        dealDiscount,
        loyaltyDiscount
      );
      if (totalError) return totalError;
    }

    // Auto-accept if auto_accept_orders is true OR if it's a manual order from dashboard (force_slot)
    const status = (foodtruck.auto_accept_orders || body.force_slot) ? 'confirmed' : 'pending';
    const { order, error: orderError } = await createOrder(body, orderItems, total, status, itemOptions);
    if (orderError) return orderError;

    // Send confirmation email and credit loyalty for confirmed orders
    if (status === 'confirmed') {
      // Don't send email for manual dashboard orders (surplace@local)
      if (body.customer_email !== 'surplace@local') {
        await sendConfirmationEmail(order.id);
      }

      // Credit loyalty points for confirmed orders (except manual dashboard orders)
      if (foodtruck.loyalty_enabled && foodtruck.loyalty_points_per_euro > 0 && body.customer_email !== 'surplace@local') {
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
        timeZone: 'Europe/Paris'
      });

      // Build items list for notification
      const itemsList = orderItems.map((item: any) => {
        const menuItem = menuItems.find((m: any) => m.id === item.menu_item_id);
        return item.quantity > 1 ? `${item.quantity}x ${menuItem?.name}` : menuItem?.name;
      }).join(', ');

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

    return successResponse({ order_id: order.id, order });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
