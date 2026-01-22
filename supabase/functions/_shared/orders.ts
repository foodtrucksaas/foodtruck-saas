import { createSupabaseAdmin } from './supabase.ts';
import { errorResponse } from './responses.ts';

interface SelectedOptionRequest {
  option_id: string;
  option_group_id: string;
  name: string;
  group_name: string;
  price_modifier: number;
  is_size_option?: boolean;
}

// NEW: Applied offer from optimized combination
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

export function validateOrderRequest(body: OrderRequest): Response | null {
  const { foodtruck_id, customer_email, customer_name, pickup_time, items } = body;
  if (!foodtruck_id || !customer_email || !customer_name || !pickup_time || !items?.length) {
    return errorResponse('Missing required fields');
  }
  return null;
}

export async function getFoodtruck(foodtruckId: string, requireStripe = false) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('foodtrucks')
    .select('*')
    .eq('id', foodtruckId)
    .eq('is_active', true)
    .single();

  if (error || !data) return { error: errorResponse('Foodtruck not found', 404) };
  if (requireStripe && (!data.stripe_account_id || !data.stripe_onboarding_complete)) {
    return { error: errorResponse('Foodtruck cannot accept payments yet') };
  }
  return { foodtruck: data };
}

export async function checkSlotAvailability(foodtruckId: string, pickupTime: string, maxOrders: number | null) {
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
  const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

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
    return errorResponse('L\'heure de retrait ne peut pas être dans le passé');
  }

  return null;
}

/**
 * Validate prices sent by the client against database prices
 * Validates category options only (item-specific options not used)
 */
export async function validatePrices(
  items: OrderRequest['items'],
  menuItems: any[]
): Promise<Response | null> {
  const supabase = createSupabaseAdmin();

  // Collect all option IDs to validate
  const allOptionIds: string[] = [];
  for (const item of items) {
    if (item.selected_options) {
      for (const opt of item.selected_options) {
        if (opt.option_id) {
          allOptionIds.push(opt.option_id);
        }
      }
    }
  }

  if (allOptionIds.length === 0) {
    return null; // No options to validate
  }

  // Fetch category options only
  const { data: categoryOptions, error } = await supabase
    .from('category_options')
    .select('id, name, price_modifier, is_available')
    .in('id', allOptionIds);

  if (error) {
    console.error('Error fetching category_options:', error);
    return errorResponse('Erreur lors de la validation des options');
  }

  const optionsMap = new Map<string, any>();
  if (categoryOptions) {
    for (const opt of categoryOptions) {
      optionsMap.set(opt.id, opt);
    }
  }

  // Validate each item's options
  for (const item of items) {
    if (item.selected_options && item.selected_options.length > 0) {
      for (const selectedOpt of item.selected_options) {
        const dbOption = optionsMap.get(selectedOpt.option_id);

        if (!dbOption) {
          console.warn(`Option ${selectedOpt.option_id} (${selectedOpt.name}) not found, skipping validation`);
          continue;
        }

        if (!dbOption.is_available) {
          return errorResponse(`L'option "${dbOption.name}" n'est plus disponible`);
        }

        // Skip price validation for size options (they contain full price, not modifier)
        if (selectedOpt.is_size_option) {
          continue;
        }

        // For supplements, the price may be customized per menu item (per-size pricing)
        // So we only validate that the price is reasonable (non-negative and not excessively high)
        // The total validation in validateOrderTotal will catch any calculation errors
        if (selectedOpt.price_modifier < 0) {
          return errorResponse(
            `Le prix de l'option "${dbOption.name}" est invalide.`
          );
        }

        // Check if price is wildly different from expected (more than 10x the default, if default > 0)
        // This catches obvious tampering while allowing legitimate per-size pricing
        if (dbOption.price_modifier > 0 && selectedOpt.price_modifier > dbOption.price_modifier * 10) {
          return errorResponse(
            `Le prix de l'option "${dbOption.name}" est anormalement élevé. Veuillez rafraîchir la page.`
          );
        }
      }
    }
  }

  return null;
}

/**
 * Validate promo code if used
 */
export async function validatePromoCode(
  foodtruckId: string,
  promoCodeId: string | undefined,
  customerEmail: string,
  orderSubtotal: number, // in centimes
  _clientDiscountAmount: number // unused - discount includes deals/loyalty, not just promo
): Promise<Response | null> {
  // No promo code used - nothing to validate
  if (!promoCodeId) {
    return null;
  }

  const supabase = createSupabaseAdmin();

  // Fetch the promo code
  const { data: promoCode, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('id', promoCodeId)
    .eq('foodtruck_id', foodtruckId)
    .single();

  if (error || !promoCode) {
    return errorResponse('Code promo invalide');
  }

  // Check if active
  if (!promoCode.is_active) {
    return errorResponse('Ce code promo n\'est plus actif');
  }

  // Check validity dates
  const now = new Date();
  if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
    return errorResponse('Ce code promo n\'est pas encore actif');
  }
  if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
    return errorResponse('Ce code promo a expiré');
  }

  // Check minimum order amount
  if (promoCode.min_order_amount && orderSubtotal < promoCode.min_order_amount) {
    const minAmount = (promoCode.min_order_amount / 100).toFixed(2);
    return errorResponse(`Commande minimum de ${minAmount}€ requise pour ce code`);
  }

  // Check max uses
  if (promoCode.max_uses !== null && promoCode.current_uses >= promoCode.max_uses) {
    return errorResponse('Ce code promo a atteint sa limite d\'utilisation');
  }

  // Check max uses per customer
  if (promoCode.max_uses_per_customer !== null) {
    const { count } = await supabase
      .from('promo_code_uses')
      .select('*', { count: 'exact', head: true })
      .eq('promo_code_id', promoCodeId)
      .ilike('customer_email', customerEmail);

    if (count !== null && count >= promoCode.max_uses_per_customer) {
      return errorResponse('Vous avez déjà utilisé ce code promo');
    }
  }

  // Calculate expected discount
  let expectedDiscount: number;
  if (promoCode.discount_type === 'percentage') {
    expectedDiscount = Math.floor((orderSubtotal * promoCode.discount_value) / 100);
    // Apply max discount cap if set
    if (promoCode.max_discount && expectedDiscount > promoCode.max_discount) {
      expectedDiscount = promoCode.max_discount;
    }
  } else {
    // Fixed amount
    expectedDiscount = promoCode.discount_value;
    // Don't exceed order total
    if (expectedDiscount > orderSubtotal) {
      expectedDiscount = orderSubtotal;
    }
  }

  // Validate client discount matches server calculation (allow small tolerance for rounding)
  const discountDifference = Math.abs(expectedDiscount - clientDiscountAmount);
  if (discountDifference > 1) { // 1 centime tolerance
    return errorResponse(
      `La réduction calculée (${(expectedDiscount / 100).toFixed(2)}€) ne correspond pas. Veuillez rafraîchir la page.`
    );
  }

  return null;
}

/**
 * Validate deal or offer if used
 */
export async function validateDeal(
  foodtruckId: string,
  dealId: string | undefined,
  dealDiscount: number | undefined,
  items: OrderRequest['items'],
  menuItems: any[]
): Promise<Response | null> {
  if (!dealId) {
    // No deal, but client sent a deal discount - that's suspicious
    if (dealDiscount && dealDiscount > 0) {
      return errorResponse('Réduction de formule invalide: aucune formule appliquée');
    }
    return null;
  }

  if (!dealDiscount || dealDiscount <= 0) {
    return errorResponse('Réduction de formule invalide');
  }

  const supabase = createSupabaseAdmin();

  // First try to fetch from deals table (legacy)
  const { data: deal, error } = await supabase
    .from('deals')
    .select('*, categories(name)')
    .eq('id', dealId)
    .eq('foodtruck_id', foodtruckId)
    .single();

  // If not found in deals, try offers table
  if (error || !deal) {
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', dealId)
      .eq('foodtruck_id', foodtruckId)
      .single();

    if (offerError || !offer) {
      return errorResponse('Formule/offre invalide');
    }

    // Validate offer is active
    if (!offer.is_active) {
      return errorResponse('Cette offre n\'est plus active');
    }

    // For offers, we trust the client-side calculation from get_applicable_offers
    // The SQL function already validated the cart items
    // Just do a basic sanity check that the discount is reasonable
    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    let cartTotal = 0;
    for (const item of items) {
      const menuItem = menuMap.get(item.menu_item_id);
      if (!menuItem) continue;
      let unitPrice = menuItem.price;
      if (item.selected_options) {
        for (const opt of item.selected_options) {
          unitPrice += opt.price_modifier;
        }
      }
      cartTotal += unitPrice * item.quantity;
    }

    // Discount should never exceed cart total
    if (dealDiscount > cartTotal) {
      return errorResponse('La réduction ne peut pas dépasser le total du panier');
    }

    return null; // Offer is valid
  }

  // Check if active
  if (!deal.is_active) {
    return errorResponse('Cette formule n\'est plus active');
  }

  // Build cart items with category info for deal validation
  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  let categoryCount = 0;
  let cartTotal = 0;

  for (const item of items) {
    const menuItem = menuMap.get(item.menu_item_id);
    if (!menuItem) continue;

    // Count items from trigger category
    if (menuItem.category_id === deal.trigger_category_id) {
      categoryCount += item.quantity;
    }

    // Calculate cart total for percentage discounts (price is already in centimes)
    let unitPrice = menuItem.price;
    if (item.selected_options) {
      for (const opt of item.selected_options) {
        unitPrice += opt.price_modifier;
      }
    }
    cartTotal += unitPrice * item.quantity;
  }

  // Check if deal condition is met
  if (categoryCount < deal.trigger_quantity) {
    const categoryName = deal.categories?.name || 'la catégorie requise';
    return errorResponse(
      `La formule "${deal.name}" nécessite ${deal.trigger_quantity} article(s) de ${categoryName}. Vous en avez ${categoryCount}.`
    );
  }

  // Calculate expected discount based on reward type
  let expectedDiscount = 0;
  if (deal.reward_type === 'free_item' && deal.reward_item_id) {
    // Fetch the reward item price
    const { data: rewardItem } = await supabase
      .from('menu_items')
      .select('price')
      .eq('id', deal.reward_item_id)
      .single();

    if (rewardItem) {
      // rewardItem.price is already in centimes
      expectedDiscount = rewardItem.price;
    }
  } else if (deal.reward_type === 'percentage') {
    expectedDiscount = Math.floor((cartTotal * deal.reward_value) / 100);
  } else if (deal.reward_type === 'fixed') {
    expectedDiscount = Math.min(deal.reward_value, cartTotal);
  }

  // Validate client deal discount matches server calculation
  const discountDifference = Math.abs(expectedDiscount - dealDiscount);
  if (discountDifference > 1) { // 1 centime tolerance
    return errorResponse(
      `La réduction de formule calculée (${(expectedDiscount / 100).toFixed(2)}€) ne correspond pas. Veuillez rafraîchir la page.`
    );
  }

  return null;
}

/**
 * Validate multiple applied offers (new optimized combination system)
 */
export async function validateAppliedOffers(
  foodtruckId: string,
  appliedOffers: AppliedOfferRequest[] | undefined,
  items: OrderRequest['items'],
  menuItems: any[]
): Promise<{ totalDiscount: number; error: Response | null }> {
  // No offers applied - nothing to validate
  if (!appliedOffers || appliedOffers.length === 0) {
    return { totalDiscount: 0, error: null };
  }

  const supabase = createSupabaseAdmin();

  // Collect all offer IDs
  const offerIds = appliedOffers.map(o => o.offer_id);

  // Fetch all offers in one query
  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select('*')
    .in('id', offerIds)
    .eq('foodtruck_id', foodtruckId);

  if (offersError || !offers || offers.length !== offerIds.length) {
    return { totalDiscount: 0, error: errorResponse('Une ou plusieurs offres sont invalides') };
  }

  // Create offer map for quick lookup
  const offerMap = new Map(offers.map(o => [o.id, o]));

  // 1. Validate each offer is active
  for (const appliedOffer of appliedOffers) {
    const offer = offerMap.get(appliedOffer.offer_id);
    if (!offer) {
      return { totalDiscount: 0, error: errorResponse('Offre non trouvée') };
    }

    if (!offer.is_active) {
      return { totalDiscount: 0, error: errorResponse(`L'offre "${offer.name}" n'est plus active`) };
    }

    // Check date validity
    const now = new Date();
    if (offer.start_date && new Date(offer.start_date) > now) {
      return { totalDiscount: 0, error: errorResponse(`L'offre "${offer.name}" n'est pas encore active`) };
    }
    if (offer.end_date && new Date(offer.end_date) < now) {
      return { totalDiscount: 0, error: errorResponse(`L'offre "${offer.name}" a expiré`) };
    }
  }

  // 2. Build consumed items map to check no item is consumed more than available
  const consumedItems = new Map<string, number>();

  for (const appliedOffer of appliedOffers) {
    for (const consumed of appliedOffer.items_consumed) {
      const currentCount = consumedItems.get(consumed.menu_item_id) || 0;
      consumedItems.set(consumed.menu_item_id, currentCount + consumed.quantity);
    }
  }

  // 3. Verify no item is consumed more than available in cart
  const menuMap = new Map(menuItems.map(m => [m.id, m]));

  for (const [itemId, consumedCount] of consumedItems) {
    // Find cart item
    const cartItem = items.find(i => i.menu_item_id === itemId);
    if (!cartItem) {
      const menuItem = menuMap.get(itemId);
      const itemName = menuItem?.name || itemId;
      return { totalDiscount: 0, error: errorResponse(`L'article "${itemName}" est requis pour une offre mais n'est pas dans le panier`) };
    }

    if (consumedCount > cartItem.quantity) {
      const menuItem = menuMap.get(itemId);
      const itemName = menuItem?.name || 'Article';
      return {
        totalDiscount: 0,
        error: errorResponse(`${itemName}: utilisé ${consumedCount} fois dans les offres mais seulement ${cartItem.quantity} dans le panier`)
      };
    }
  }

  // 4. Validate discount amounts (sanity check)
  let totalOffersDiscount = 0;
  let cartTotal = 0;

  // Calculate cart total
  for (const item of items) {
    const menuItem = menuMap.get(item.menu_item_id);
    if (!menuItem) continue;

    let unitPrice = menuItem.price;
    if (item.selected_options) {
      for (const opt of item.selected_options) {
        unitPrice += opt.price_modifier;
      }
    }
    cartTotal += unitPrice * item.quantity;
  }

  // Sum all offer discounts
  for (const appliedOffer of appliedOffers) {
    totalOffersDiscount += appliedOffer.discount_amount;
  }

  // Discount should never exceed cart total
  if (totalOffersDiscount > cartTotal) {
    return { totalDiscount: 0, error: errorResponse('Le total des réductions ne peut pas dépasser le montant du panier') };
  }

  return { totalDiscount: totalOffersDiscount, error: null };
}

/**
 * Recalculate and validate total amount
 */
export function validateOrderTotal(
  items: OrderRequest['items'],
  menuItems: any[],
  clientTotal: number, // total sent by client (after discount)
  discountAmount: number = 0,
  dealDiscount: number = 0,
  loyaltyDiscount: number = 0,
  appliedOffersDiscount: number = 0 // NEW: discount from multiple applied offers
): { serverTotal: number; error: Response | null } {
  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  let serverSubtotal = 0;

  for (const item of items) {
    const menuItem = menuMap.get(item.menu_item_id);
    if (!menuItem) {
      return { serverTotal: 0, error: errorResponse(`Article ${item.menu_item_id} non trouvé`) };
    }

    let unitPrice: number;

    // Handle bundle items specially
    if (item.bundle_id !== undefined) {
      // For bundle items: use bundle_fixed_price (only on first item) + bundle_supplement
      unitPrice = (item.bundle_fixed_price || 0) + (item.bundle_supplement || 0);

      // Add options price only if not free_options
      if (!item.bundle_free_options && item.selected_options && item.selected_options.length > 0) {
        const optionsTotal = item.selected_options
          .filter(opt => !opt.is_size_option)
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPrice += optionsTotal;
      }
    } else {
      // Regular item - base price (already in centimes)
      unitPrice = menuItem.price;

      // Add option prices
      if (item.selected_options && item.selected_options.length > 0) {
        for (const opt of item.selected_options) {
          unitPrice += opt.price_modifier; // price_modifier is already in centimes
        }
      }
    }

    serverSubtotal += unitPrice * item.quantity;
  }

  // Apply all discounts (including new appliedOffersDiscount)
  const totalDiscount = discountAmount + dealDiscount + loyaltyDiscount + appliedOffersDiscount;
  const serverTotal = Math.max(0, serverSubtotal - totalDiscount);

  // Compare with client total (allow 1 centime tolerance for rounding)
  const difference = Math.abs(serverTotal - clientTotal);
  if (difference > 1) {
    console.log('Total mismatch:', {
      serverSubtotal,
      discountAmount,
      dealDiscount,
      loyaltyDiscount,
      appliedOffersDiscount,
      totalDiscount,
      serverTotal,
      clientTotal,
      difference,
    });
    return {
      serverTotal,
      error: errorResponse(
        `Le total calculé (${(serverTotal / 100).toFixed(2)}€) ne correspond pas au total envoyé (${(clientTotal / 100).toFixed(2)}€). Veuillez rafraîchir la page.`
      ),
    };
  }

  return { serverTotal, error: null };
}

export function calculateOrder(items: OrderRequest['items'], menuItems: any[]) {
  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  let total = 0;
  const orderItems: any[] = [];
  const itemOptions: { itemIndex: number; options: SelectedOptionRequest[] }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const menuItem = menuMap.get(item.menu_item_id);
    if (!menuItem) return { error: errorResponse(`Menu item ${item.menu_item_id} not found`) };

    // menuItem.price is in CENTIMES (INTEGER), price_modifier is also in CENTIMES
    let unitPriceCentimes: number;

    // Handle bundle items specially
    if (item.bundle_id !== undefined) {
      // For bundle items: use bundle_fixed_price (only on first item) + bundle_supplement
      unitPriceCentimes = (item.bundle_fixed_price || 0) + (item.bundle_supplement || 0);

      // Add options price only if not free_options
      if (!item.bundle_free_options && item.selected_options && item.selected_options.length > 0) {
        const optionsTotal = item.selected_options
          .filter(opt => !opt.is_size_option) // Size options are not used in bundles this way
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPriceCentimes += optionsTotal;
      }

      if (item.selected_options && item.selected_options.length > 0) {
        itemOptions.push({ itemIndex: i, options: item.selected_options });
      }
    } else if (item.selected_options && item.selected_options.length > 0) {
      // Regular item with options
      // Check if there's a size option (contains full price in centimes)
      const sizeOption = item.selected_options.find(opt => opt.is_size_option);

      if (sizeOption) {
        // Size option contains the full price in centimes - use it as base
        unitPriceCentimes = sizeOption.price_modifier;
        // Add only non-size option modifiers (also in centimes)
        const supplementsTotal = item.selected_options
          .filter(opt => !opt.is_size_option)
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPriceCentimes += supplementsTotal;
      } else {
        // No size option - base price is already in centimes + add modifiers
        unitPriceCentimes = menuItem.price;
        const optionsTotal = item.selected_options.reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPriceCentimes += optionsTotal;
      }

      itemOptions.push({ itemIndex: i, options: item.selected_options });
    } else {
      // No options - base price is already in centimes
      unitPriceCentimes = menuItem.price;
    }

    total += unitPriceCentimes * item.quantity;
    orderItems.push({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: unitPriceCentimes,
      notes: item.bundle_name ? `[${item.bundle_name}]` : (item.notes || null),
    });
  }

  // Total is in centimes
  return { total, orderItems, itemOptions };
}

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
  const finalAmount = Math.max(0, total - discountAmount);

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
    .insert(orderItems.map(item => ({ ...item, order_id: order.id })))
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
      try {
        // Insert into offer_uses for each time applied
        for (let i = 0; i < appliedOffer.times_applied; i++) {
          await supabase.from('offer_uses').insert({
            offer_id: appliedOffer.offer_id,
            order_id: order.id,
            customer_email: data.customer_email,
            discount_amount: Math.floor(appliedOffer.discount_amount / appliedOffer.times_applied),
            free_item_name: appliedOffer.free_item_name || null,
          });
        }

        // Update offer stats (increment current_uses and total_discount_given)
        await supabase.rpc('increment_offer_uses', {
          p_offer_id: appliedOffer.offer_id,
          p_count: appliedOffer.times_applied,
        });

        // Update total_discount_given
        const { data: offer } = await supabase
          .from('offers')
          .select('total_discount_given')
          .eq('id', appliedOffer.offer_id)
          .single();

        if (offer) {
          await supabase
            .from('offers')
            .update({
              total_discount_given: (offer.total_discount_given || 0) + appliedOffer.discount_amount,
            })
            .eq('id', appliedOffer.offer_id);
        }

        console.log(`Tracked offer usage: ${appliedOffer.offer_id} x${appliedOffer.times_applied}, discount: ${appliedOffer.discount_amount}`);
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
        console.log(`Redeemed ${rewardCount} loyalty reward(s) for customer ${data.loyalty_customer_id}`);
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

        // Update offer stats (increment current_uses)
        await supabase.rpc('increment_offer_uses', {
          p_offer_id: bundle.bundle_id,
          p_count: bundle.quantity,
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
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (!customer) {
    console.log(`Customer not found for email ${email}, foodtruck ${foodtruckId} - skipping loyalty points`);
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
      console.log(`Credited loyalty points for order ${orderId}, amount ${orderAmount}, rate ${loyaltyPointsPerEuro}, points earned: ${result.data}`);
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
          Authorization: `Bearer ${key}`
        },
        body: JSON.stringify({
          foodtruck_id: foodtruckId,
          title,
          body,
          data
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
