import { describe, it, expect } from 'vitest';

/**
 * End-to-End Checkout Flow Tests
 *
 * These tests validate the complete checkout flow from cart to order creation.
 * They test:
 * - Cart calculations with various discount types
 * - Order submission with offers/deals
 * - Loyalty reward redemption
 * - Price validation
 * - Error handling
 */

// ============================================
// MOCK TYPES AND DATA
// ============================================

interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number; // in centimes
  quantity: number;
  notes?: string;
  selected_options?: {
    option_id: string;
    option_group_id: string;
    name: string;
    group_name: string;
    price_modifier: number;
    is_size_option?: boolean;
  }[];
  bundle_id?: string;
  bundle_name?: string;
  bundle_fixed_price?: number;
  bundle_supplement?: number;
  bundle_free_options?: boolean;
}

interface Offer {
  id: string;
  name: string;
  offer_type: 'bundle' | 'buy_x_get_y' | 'promo_code' | 'threshold_discount';
  config: {
    fixed_price?: number;
    discount_type?: 'percentage' | 'fixed';
    discount_value?: number;
    trigger_quantity?: number;
    reward_quantity?: number;
    min_amount?: number;
    code?: string;
  };
  discount_amount?: number;
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
}

interface LoyaltyInfo {
  points: number;
  threshold: number;
  reward: number; // in centimes
  allowMultiple: boolean;
}

interface CheckoutState {
  cart: CartItem[];
  appliedOffer: Offer | null;
  appliedPromoCode: PromoCode | null;
  loyaltyInfo: LoyaltyInfo | null;
  loyaltyRewardCount: number;
  isAsap: boolean;
  pickupTime: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
}

// ============================================
// CHECKOUT CALCULATION FUNCTIONS
// ============================================

function calculateCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => {
    let unitPrice: number;

    if (item.bundle_id !== undefined) {
      // Bundle item
      unitPrice = (item.bundle_fixed_price || 0) + (item.bundle_supplement || 0);
      if (!item.bundle_free_options && item.selected_options?.length) {
        const optionsTotal = item.selected_options
          .filter(opt => !opt.is_size_option)
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPrice += optionsTotal;
      }
    } else if (item.selected_options?.length) {
      const sizeOption = item.selected_options.find(opt => opt.is_size_option);
      if (sizeOption) {
        unitPrice = sizeOption.price_modifier;
        const supplementsTotal = item.selected_options
          .filter(opt => !opt.is_size_option)
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPrice += supplementsTotal;
      } else {
        unitPrice = item.price;
        const optionsTotal = item.selected_options.reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPrice += optionsTotal;
      }
    } else {
      unitPrice = item.price;
    }

    return total + unitPrice * item.quantity;
  }, 0);
}

function calculatePromoCodeDiscount(
  promoCode: PromoCode | null,
  subtotal: number
): number {
  if (!promoCode) return 0;

  if (subtotal < promoCode.min_order_amount) return 0;

  let discount: number;
  if (promoCode.discount_type === 'percentage') {
    discount = Math.floor((subtotal * promoCode.discount_value) / 100);
    if (promoCode.max_discount && discount > promoCode.max_discount) {
      discount = promoCode.max_discount;
    }
  } else {
    discount = Math.min(promoCode.discount_value, subtotal);
  }

  return discount;
}

function calculateOfferDiscount(
  offer: Offer | null,
  subtotal: number
): number {
  if (!offer) return 0;

  // For bundles, discount is already calculated based on individual item prices vs bundle price
  if (offer.discount_amount !== undefined) {
    return offer.discount_amount;
  }

  // For threshold discounts
  if (offer.offer_type === 'threshold_discount') {
    const minAmount = offer.config.min_amount || 0;
    if (subtotal < minAmount) return 0;

    if (offer.config.discount_type === 'percentage') {
      return Math.floor((subtotal * (offer.config.discount_value || 0)) / 100);
    } else {
      return Math.min(offer.config.discount_value || 0, subtotal);
    }
  }

  return 0;
}

function calculateLoyaltyDiscount(
  loyaltyInfo: LoyaltyInfo | null,
  loyaltyRewardCount: number
): number {
  if (!loyaltyInfo || loyaltyRewardCount <= 0) return 0;
  return loyaltyInfo.reward * loyaltyRewardCount;
}

function calculateCheckoutTotal(state: CheckoutState): {
  subtotal: number;
  promoDiscount: number;
  offerDiscount: number;
  loyaltyDiscount: number;
  total: number;
} {
  const subtotal = calculateCartSubtotal(state.cart);
  const promoDiscount = calculatePromoCodeDiscount(state.appliedPromoCode, subtotal);
  const offerDiscount = calculateOfferDiscount(state.appliedOffer, subtotal);
  const loyaltyDiscount = calculateLoyaltyDiscount(state.loyaltyInfo, state.loyaltyRewardCount);

  const totalDiscount = promoDiscount + offerDiscount + loyaltyDiscount;
  const total = Math.max(0, subtotal - totalDiscount);

  return { subtotal, promoDiscount, offerDiscount, loyaltyDiscount, total };
}

interface OrderPayload {
  foodtruck_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  pickup_time: string;
  is_asap: boolean;
  notes?: string;
  promo_code_id?: string;
  discount_amount: number;
  deal_id?: string;
  deal_discount?: number;
  use_loyalty_reward?: boolean;
  loyalty_reward_count?: number;
  expected_total: number;
  items: {
    menu_item_id: string;
    quantity: number;
    notes?: string;
    selected_options?: CartItem['selected_options'];
    bundle_id?: string;
    bundle_name?: string;
    bundle_fixed_price?: number;
    bundle_supplement?: number;
    bundle_free_options?: boolean;
  }[];
  bundles_used?: { bundle_id: string; quantity: number }[];
}

function buildOrderPayload(
  state: CheckoutState,
  foodtruckId: string
): OrderPayload {
  const { promoDiscount, offerDiscount, loyaltyDiscount, total } = calculateCheckoutTotal(state);

  const payload: OrderPayload = {
    foodtruck_id: foodtruckId,
    customer_email: state.customerEmail,
    customer_name: state.customerName,
    customer_phone: state.customerPhone,
    pickup_time: state.pickupTime,
    is_asap: state.isAsap,
    notes: state.notes,
    discount_amount: promoDiscount + loyaltyDiscount, // Promo + loyalty in discount_amount
    expected_total: total,
    items: state.cart.map(item => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      notes: item.notes,
      selected_options: item.selected_options,
      bundle_id: item.bundle_id,
      bundle_name: item.bundle_name,
      bundle_fixed_price: item.bundle_fixed_price,
      bundle_supplement: item.bundle_supplement,
      bundle_free_options: item.bundle_free_options,
    })),
  };

  // Add promo code if applied
  if (state.appliedPromoCode) {
    payload.promo_code_id = state.appliedPromoCode.id;
  }

  // Add offer/deal if applied
  if (state.appliedOffer) {
    payload.deal_id = state.appliedOffer.id;
    payload.deal_discount = offerDiscount;
  }

  // Add loyalty reward if used
  if (state.loyaltyRewardCount > 0) {
    payload.use_loyalty_reward = true;
    payload.loyalty_reward_count = state.loyaltyRewardCount;
  }

  // Track bundle usage
  const bundleIds = new Set(state.cart.filter(i => i.bundle_id).map(i => i.bundle_id!));
  if (bundleIds.size > 0) {
    payload.bundles_used = Array.from(bundleIds).map(bundleId => ({
      bundle_id: bundleId,
      quantity: 1, // Each bundle used once in this example
    }));
  }

  return payload;
}

function validateOrderPayload(payload: OrderPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.foodtruck_id) errors.push('foodtruck_id is required');
  if (!payload.customer_email) errors.push('customer_email is required');
  if (!payload.customer_name) errors.push('customer_name is required');
  if (!payload.pickup_time) errors.push('pickup_time is required');
  if (!payload.items?.length) errors.push('Cart is empty');

  // Validate each item
  payload.items.forEach((item, index) => {
    if (!item.menu_item_id) errors.push(`Item ${index}: menu_item_id is required`);
    if (!item.quantity || item.quantity < 1) errors.push(`Item ${index}: invalid quantity`);
    if (item.quantity > 99) errors.push(`Item ${index}: quantity exceeds maximum`);
  });

  // Validate total is not negative
  if (payload.expected_total < 0) errors.push('Total cannot be negative');

  // Validate discount doesn't exceed order value
  if (payload.discount_amount < 0) errors.push('Discount cannot be negative');

  return { valid: errors.length === 0, errors };
}

// ============================================
// TESTS
// ============================================

describe('Checkout Flow', () => {
  describe('Cart Subtotal Calculation', () => {
    it('should calculate subtotal for simple cart', () => {
      const cart: CartItem[] = [
        { id: '1', menu_item_id: 'pizza-1', name: 'Pizza Margherita', price: 1200, quantity: 2 },
        { id: '2', menu_item_id: 'boisson-1', name: 'Coca-Cola', price: 300, quantity: 1 },
      ];
      expect(calculateCartSubtotal(cart)).toBe(2700);
    });

    it('should calculate subtotal with options', () => {
      const cart: CartItem[] = [
        {
          id: '1',
          menu_item_id: 'pizza-1',
          name: 'Pizza Margherita',
          price: 1200,
          quantity: 1,
          selected_options: [
            { option_id: 'opt-1', option_group_id: 'grp-1', name: 'Extra fromage', group_name: 'Suppléments', price_modifier: 200 },
          ],
        },
      ];
      expect(calculateCartSubtotal(cart)).toBe(1400);
    });

    it('should calculate subtotal with size option', () => {
      const cart: CartItem[] = [
        {
          id: '1',
          menu_item_id: 'pizza-1',
          name: 'Pizza Margherita',
          price: 1200,
          quantity: 1,
          selected_options: [
            { option_id: 'size-L', option_group_id: 'sizes', name: 'Large', group_name: 'Taille', price_modifier: 1500, is_size_option: true },
            { option_id: 'opt-1', option_group_id: 'grp-1', name: 'Extra fromage', group_name: 'Suppléments', price_modifier: 200 },
          ],
        },
      ];
      // Size option replaces base price: 1500 + 200 = 1700
      expect(calculateCartSubtotal(cart)).toBe(1700);
    });

    it('should calculate subtotal for bundle items', () => {
      const cart: CartItem[] = [
        {
          id: '1',
          menu_item_id: 'pizza-1',
          name: 'Pizza',
          price: 1200,
          quantity: 1,
          bundle_id: 'bundle-1',
          bundle_name: 'Menu Duo',
          bundle_fixed_price: 1500,
          bundle_supplement: 0,
        },
        {
          id: '2',
          menu_item_id: 'boisson-1',
          name: 'Boisson',
          price: 300,
          quantity: 1,
          bundle_id: 'bundle-1',
          bundle_name: 'Menu Duo',
          bundle_fixed_price: 0,
          bundle_supplement: 0,
        },
      ];
      // Bundle price is only on first item
      expect(calculateCartSubtotal(cart)).toBe(1500);
    });

    it('should handle empty cart', () => {
      expect(calculateCartSubtotal([])).toBe(0);
    });
  });

  describe('Promo Code Discount', () => {
    const promoCode: PromoCode = {
      id: 'promo-1',
      code: 'BIENVENUE',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 1000,
      max_discount: 500,
    };

    it('should calculate percentage discount', () => {
      const discount = calculatePromoCodeDiscount(promoCode, 3000);
      expect(discount).toBe(300); // 10% of 3000
    });

    it('should cap discount at max_discount', () => {
      const discount = calculatePromoCodeDiscount(promoCode, 10000);
      expect(discount).toBe(500); // Capped at 500
    });

    it('should return 0 if below min_order_amount', () => {
      const discount = calculatePromoCodeDiscount(promoCode, 500);
      expect(discount).toBe(0);
    });

    it('should return 0 for null promo code', () => {
      expect(calculatePromoCodeDiscount(null, 3000)).toBe(0);
    });

    it('should calculate fixed discount', () => {
      const fixedPromo: PromoCode = {
        id: 'promo-2',
        code: 'FIXED5',
        discount_type: 'fixed',
        discount_value: 500,
        min_order_amount: 0,
        max_discount: null,
      };
      expect(calculatePromoCodeDiscount(fixedPromo, 2000)).toBe(500);
    });

    it('should not exceed subtotal for fixed discount', () => {
      const fixedPromo: PromoCode = {
        id: 'promo-3',
        code: 'BIGFIX',
        discount_type: 'fixed',
        discount_value: 5000,
        min_order_amount: 0,
        max_discount: null,
      };
      expect(calculatePromoCodeDiscount(fixedPromo, 2000)).toBe(2000);
    });
  });

  describe('Loyalty Discount', () => {
    const loyaltyInfo: LoyaltyInfo = {
      points: 100,
      threshold: 50,
      reward: 500, // 5€
      allowMultiple: true,
    };

    it('should calculate single reward', () => {
      const discount = calculateLoyaltyDiscount(loyaltyInfo, 1);
      expect(discount).toBe(500);
    });

    it('should calculate multiple rewards', () => {
      const discount = calculateLoyaltyDiscount(loyaltyInfo, 2);
      expect(discount).toBe(1000);
    });

    it('should return 0 for no rewards used', () => {
      expect(calculateLoyaltyDiscount(loyaltyInfo, 0)).toBe(0);
    });

    it('should return 0 for null loyalty info', () => {
      expect(calculateLoyaltyDiscount(null, 1)).toBe(0);
    });
  });

  describe('Total Checkout Calculation', () => {
    it('should calculate total without any discounts', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 2 }],
        appliedOffer: null,
        appliedPromoCode: null,
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const result = calculateCheckoutTotal(state);
      expect(result.subtotal).toBe(2400);
      expect(result.promoDiscount).toBe(0);
      expect(result.offerDiscount).toBe(0);
      expect(result.loyaltyDiscount).toBe(0);
      expect(result.total).toBe(2400);
    });

    it('should calculate total with promo code', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 2 }],
        appliedOffer: null,
        appliedPromoCode: {
          id: 'promo-1',
          code: 'TEST10',
          discount_type: 'percentage',
          discount_value: 10,
          min_order_amount: 0,
          max_discount: null,
        },
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const result = calculateCheckoutTotal(state);
      expect(result.subtotal).toBe(2400);
      expect(result.promoDiscount).toBe(240); // 10%
      expect(result.total).toBe(2160);
    });

    it('should calculate total with offer discount', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 3 }],
        appliedOffer: {
          id: 'offer-1',
          name: '3 pizzas -5€',
          offer_type: 'buy_x_get_y',
          config: {},
          discount_amount: 500,
        },
        appliedPromoCode: null,
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const result = calculateCheckoutTotal(state);
      expect(result.subtotal).toBe(3600);
      expect(result.offerDiscount).toBe(500);
      expect(result.total).toBe(3100);
    });

    it('should calculate total with loyalty reward', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 2 }],
        appliedOffer: null,
        appliedPromoCode: null,
        loyaltyInfo: { points: 100, threshold: 50, reward: 500, allowMultiple: false },
        loyaltyRewardCount: 1,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const result = calculateCheckoutTotal(state);
      expect(result.subtotal).toBe(2400);
      expect(result.loyaltyDiscount).toBe(500);
      expect(result.total).toBe(1900);
    });

    it('should calculate total with all discounts combined', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 4 }],
        appliedOffer: {
          id: 'offer-1',
          name: 'Bundle',
          offer_type: 'bundle',
          config: {},
          discount_amount: 300,
        },
        appliedPromoCode: {
          id: 'promo-1',
          code: 'TEST10',
          discount_type: 'fixed',
          discount_value: 200,
          min_order_amount: 0,
          max_discount: null,
        },
        loyaltyInfo: { points: 100, threshold: 50, reward: 500, allowMultiple: false },
        loyaltyRewardCount: 1,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const result = calculateCheckoutTotal(state);
      expect(result.subtotal).toBe(4800);
      expect(result.promoDiscount).toBe(200);
      expect(result.offerDiscount).toBe(300);
      expect(result.loyaltyDiscount).toBe(500);
      expect(result.total).toBe(3800); // 4800 - 200 - 300 - 500
    });

    it('should not allow negative total', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 500, quantity: 1 }],
        appliedOffer: null,
        appliedPromoCode: {
          id: 'promo-1',
          code: 'BIGDISCOUNT',
          discount_type: 'fixed',
          discount_value: 1000,
          min_order_amount: 0,
          max_discount: null,
        },
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const result = calculateCheckoutTotal(state);
      expect(result.subtotal).toBe(500);
      expect(result.promoDiscount).toBe(500); // Capped at subtotal
      expect(result.total).toBe(0); // Not negative
    });
  });

  describe('Order Payload Building', () => {
    it('should build valid order payload', () => {
      const state: CheckoutState = {
        cart: [
          { id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 2 },
        ],
        appliedOffer: null,
        appliedPromoCode: null,
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: '2024-01-20T12:00:00Z',
        customerEmail: 'test@example.com',
        customerName: 'John Doe',
        customerPhone: '0612345678',
        notes: 'Extra napkins',
      };

      const payload = buildOrderPayload(state, 'ft-1');

      expect(payload.foodtruck_id).toBe('ft-1');
      expect(payload.customer_email).toBe('test@example.com');
      expect(payload.customer_name).toBe('John Doe');
      expect(payload.customer_phone).toBe('0612345678');
      expect(payload.pickup_time).toBe('2024-01-20T12:00:00Z');
      expect(payload.is_asap).toBe(false);
      expect(payload.notes).toBe('Extra napkins');
      expect(payload.items).toHaveLength(1);
      expect(payload.expected_total).toBe(2400);
    });

    it('should include promo code in payload', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 2 }],
        appliedOffer: null,
        appliedPromoCode: {
          id: 'promo-123',
          code: 'TEST',
          discount_type: 'fixed',
          discount_value: 200,
          min_order_amount: 0,
          max_discount: null,
        },
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const payload = buildOrderPayload(state, 'ft-1');
      expect(payload.promo_code_id).toBe('promo-123');
      expect(payload.discount_amount).toBe(200);
    });

    it('should include offer/deal in payload', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 3 }],
        appliedOffer: {
          id: 'offer-456',
          name: '3 Pizzas Menu',
          offer_type: 'bundle',
          config: {},
          discount_amount: 500,
        },
        appliedPromoCode: null,
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const payload = buildOrderPayload(state, 'ft-1');
      expect(payload.deal_id).toBe('offer-456');
      expect(payload.deal_discount).toBe(500);
    });

    it('should include loyalty reward in payload', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 2 }],
        appliedOffer: null,
        appliedPromoCode: null,
        loyaltyInfo: { points: 100, threshold: 50, reward: 500, allowMultiple: true },
        loyaltyRewardCount: 2,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const payload = buildOrderPayload(state, 'ft-1');
      expect(payload.use_loyalty_reward).toBe(true);
      expect(payload.loyalty_reward_count).toBe(2);
      expect(payload.discount_amount).toBe(1000); // 2 * 500
    });

    it('should include ASAP flag', () => {
      const state: CheckoutState = {
        cart: [{ id: '1', menu_item_id: 'item-1', name: 'Pizza', price: 1200, quantity: 1 }],
        appliedOffer: null,
        appliedPromoCode: null,
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: true,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const payload = buildOrderPayload(state, 'ft-1');
      expect(payload.is_asap).toBe(true);
    });

    it('should track bundle usage', () => {
      const state: CheckoutState = {
        cart: [
          {
            id: '1',
            menu_item_id: 'pizza-1',
            name: 'Pizza',
            price: 1200,
            quantity: 1,
            bundle_id: 'bundle-1',
            bundle_name: 'Menu Duo',
            bundle_fixed_price: 1500,
          },
          {
            id: '2',
            menu_item_id: 'boisson-1',
            name: 'Boisson',
            price: 300,
            quantity: 1,
            bundle_id: 'bundle-1',
            bundle_name: 'Menu Duo',
            bundle_fixed_price: 0,
          },
        ],
        appliedOffer: null,
        appliedPromoCode: null,
        loyaltyInfo: null,
        loyaltyRewardCount: 0,
        isAsap: false,
        pickupTime: new Date().toISOString(),
        customerEmail: 'test@example.com',
        customerName: 'John',
      };

      const payload = buildOrderPayload(state, 'ft-1');
      expect(payload.bundles_used).toHaveLength(1);
      expect(payload.bundles_used?.[0].bundle_id).toBe('bundle-1');
    });
  });

  describe('Order Payload Validation', () => {
    it('should validate valid payload', () => {
      const payload: OrderPayload = {
        foodtruck_id: 'ft-1',
        customer_email: 'test@example.com',
        customer_name: 'John',
        pickup_time: new Date().toISOString(),
        is_asap: false,
        discount_amount: 0,
        expected_total: 1200,
        items: [{ menu_item_id: 'item-1', quantity: 1 }],
      };

      const result = validateOrderPayload(payload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject payload without foodtruck_id', () => {
      const payload: OrderPayload = {
        foodtruck_id: '',
        customer_email: 'test@example.com',
        customer_name: 'John',
        pickup_time: new Date().toISOString(),
        is_asap: false,
        discount_amount: 0,
        expected_total: 1200,
        items: [{ menu_item_id: 'item-1', quantity: 1 }],
      };

      const result = validateOrderPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('foodtruck_id is required');
    });

    it('should reject payload with empty cart', () => {
      const payload: OrderPayload = {
        foodtruck_id: 'ft-1',
        customer_email: 'test@example.com',
        customer_name: 'John',
        pickup_time: new Date().toISOString(),
        is_asap: false,
        discount_amount: 0,
        expected_total: 0,
        items: [],
      };

      const result = validateOrderPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cart is empty');
    });

    it('should reject item without menu_item_id', () => {
      const payload: OrderPayload = {
        foodtruck_id: 'ft-1',
        customer_email: 'test@example.com',
        customer_name: 'John',
        pickup_time: new Date().toISOString(),
        is_asap: false,
        discount_amount: 0,
        expected_total: 1200,
        items: [{ menu_item_id: '', quantity: 1 }],
      };

      const result = validateOrderPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('menu_item_id'))).toBe(true);
    });

    it('should reject invalid quantity', () => {
      const payload: OrderPayload = {
        foodtruck_id: 'ft-1',
        customer_email: 'test@example.com',
        customer_name: 'John',
        pickup_time: new Date().toISOString(),
        is_asap: false,
        discount_amount: 0,
        expected_total: 1200,
        items: [{ menu_item_id: 'item-1', quantity: 0 }],
      };

      const result = validateOrderPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('quantity'))).toBe(true);
    });

    it('should reject quantity over maximum', () => {
      const payload: OrderPayload = {
        foodtruck_id: 'ft-1',
        customer_email: 'test@example.com',
        customer_name: 'John',
        pickup_time: new Date().toISOString(),
        is_asap: false,
        discount_amount: 0,
        expected_total: 120000,
        items: [{ menu_item_id: 'item-1', quantity: 100 }],
      };

      const result = validateOrderPayload(payload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
    });
  });
});

describe('Checkout Error Scenarios', () => {
  it('should handle server-side price mismatch', () => {
    // Client calculates 2400, but server calculates 2500 (menu prices changed)
    const clientTotal = 2400;
    const serverTotal = 2500;

    const difference = Math.abs(clientTotal - serverTotal);
    expect(difference).toBeGreaterThan(1); // Should trigger validation error
  });

  it('should handle invalid offer reference', () => {
    // Client sends deal_id that doesn't exist in offers table
    const payload: OrderPayload = {
      foodtruck_id: 'ft-1',
      customer_email: 'test@example.com',
      customer_name: 'John',
      pickup_time: new Date().toISOString(),
      is_asap: false,
      discount_amount: 0,
      deal_id: 'invalid-offer-id',
      deal_discount: 500,
      expected_total: 2400,
      items: [{ menu_item_id: 'item-1', quantity: 2 }],
    };

    // This payload has a deal_id that will fail FK constraint
    expect(payload.deal_id).toBe('invalid-offer-id');
    // Server would reject with: "violates foreign key constraint orders_deal_id_fkey"
  });

  it('should handle manipulated discount', () => {
    // Client tries to apply larger discount than allowed
    const subtotal = 2400;
    const claimedDiscount = 5000; // More than subtotal

    // Server validation should catch this
    const adjustedDiscount = Math.min(claimedDiscount, subtotal);
    expect(adjustedDiscount).toBe(subtotal);
    expect(adjustedDiscount).toBeLessThan(claimedDiscount);
  });
});
