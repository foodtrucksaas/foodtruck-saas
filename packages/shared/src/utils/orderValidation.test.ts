import { describe, it, expect } from 'vitest';

/**
 * Order Validation Tests
 *
 * These tests validate the order creation logic to prevent issues like:
 * - Invalid foreign key references (deal_id, promo_code_id, offer_id)
 * - Price manipulation
 * - Discount validation
 * - Bundle/offer integration
 */

// ============================================
// MOCK DATA STRUCTURES
// ============================================

interface OrderItem {
  menu_item_id: string;
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

interface OrderRequest {
  foodtruck_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  pickup_time: string;
  is_asap?: boolean;
  notes?: string;
  promo_code_id?: string;
  discount_amount?: number;
  deal_id?: string;
  deal_discount?: number;
  deal_free_item_name?: string;
  items: OrderItem[];
  bundles_used?: { bundle_id: string; quantity: number }[];
  expected_total?: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  is_available: boolean;
}

interface Offer {
  id: string;
  foodtruck_id: string;
  name: string;
  offer_type: 'bundle' | 'buy_x_get_y' | 'promo_code' | 'threshold_discount';
  is_active: boolean;
  config: Record<string, unknown>;
}

interface Deal {
  id: string;
  foodtruck_id: string;
  name: string;
  trigger_category_id: string;
  trigger_quantity: number;
  reward_type: 'free_item' | 'percentage' | 'fixed';
  reward_value?: number;
  reward_item_id?: string;
  is_active: boolean;
}

// ============================================
// VALIDATION FUNCTIONS (mirroring orders.ts)
// ============================================

function validateOrderRequest(body: OrderRequest): string | null {
  const { foodtruck_id, customer_email, customer_name, pickup_time, items } = body;
  if (!foodtruck_id || !customer_email || !customer_name || !pickup_time || !items?.length) {
    return 'Missing required fields';
  }
  return null;
}

function validateMenuItemsAvailability(
  requestedItemIds: string[],
  menuItems: MenuItem[]
): string | null {
  const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

  for (const itemId of requestedItemIds) {
    const menuItem = menuItemMap.get(itemId);
    if (!menuItem) {
      return `L'article avec l'id ${itemId} n'existe pas`;
    }
    if (!menuItem.is_available) {
      return `L'article "${menuItem.name}" n'est plus disponible`;
    }
  }

  return null;
}

function calculateOrder(items: OrderItem[], menuItems: MenuItem[]) {
  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  let total = 0;
  const orderItems: { menu_item_id: string; quantity: number; unit_price: number; notes: string | null }[] = [];

  for (const item of items) {
    const menuItem = menuMap.get(item.menu_item_id);
    if (!menuItem) return { error: `Menu item ${item.menu_item_id} not found` };

    let unitPriceCentimes: number;

    if (item.bundle_id !== undefined) {
      unitPriceCentimes = (item.bundle_fixed_price || 0) + (item.bundle_supplement || 0);
      if (!item.bundle_free_options && item.selected_options?.length) {
        const optionsTotal = item.selected_options
          .filter(opt => !opt.is_size_option)
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPriceCentimes += optionsTotal;
      }
    } else if (item.selected_options?.length) {
      const sizeOption = item.selected_options.find(opt => opt.is_size_option);
      if (sizeOption) {
        unitPriceCentimes = sizeOption.price_modifier;
        const supplementsTotal = item.selected_options
          .filter(opt => !opt.is_size_option)
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPriceCentimes += supplementsTotal;
      } else {
        unitPriceCentimes = menuItem.price;
        const optionsTotal = item.selected_options.reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPriceCentimes += optionsTotal;
      }
    } else {
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

  return { total, orderItems };
}

function validateOrderTotal(
  items: OrderItem[],
  menuItems: MenuItem[],
  clientTotal: number,
  discountAmount: number = 0,
  dealDiscount: number = 0,
  loyaltyDiscount: number = 0
): { serverTotal: number; error: string | null } {
  const menuMap = new Map(menuItems.map(m => [m.id, m]));
  let serverSubtotal = 0;

  for (const item of items) {
    const menuItem = menuMap.get(item.menu_item_id);
    if (!menuItem) {
      return { serverTotal: 0, error: `Article ${item.menu_item_id} non trouvé` };
    }

    let unitPrice: number;

    if (item.bundle_id !== undefined) {
      unitPrice = (item.bundle_fixed_price || 0) + (item.bundle_supplement || 0);
      if (!item.bundle_free_options && item.selected_options?.length) {
        const optionsTotal = item.selected_options
          .filter(opt => !opt.is_size_option)
          .reduce((sum, opt) => sum + opt.price_modifier, 0);
        unitPrice += optionsTotal;
      }
    } else {
      unitPrice = menuItem.price;
      if (item.selected_options?.length) {
        for (const opt of item.selected_options) {
          unitPrice += opt.price_modifier;
        }
      }
    }

    serverSubtotal += unitPrice * item.quantity;
  }

  const totalDiscount = discountAmount + dealDiscount + loyaltyDiscount;
  const serverTotal = Math.max(0, serverSubtotal - totalDiscount);

  const difference = Math.abs(serverTotal - clientTotal);
  if (difference > 1) {
    return {
      serverTotal,
      error: `Le total calculé (${(serverTotal / 100).toFixed(2)}€) ne correspond pas au total envoyé (${(clientTotal / 100).toFixed(2)}€)`,
    };
  }

  return { serverTotal, error: null };
}

// Validate deal reference - checks both legacy deals and new offers
function validateDealReference(
  dealId: string | undefined,
  deals: Deal[],
  offers: Offer[],
  foodtruckId: string
): { valid: boolean; source: 'deal' | 'offer' | null; error: string | null } {
  if (!dealId) {
    return { valid: true, source: null, error: null };
  }

  // Check legacy deals table
  const deal = deals.find(d => d.id === dealId && d.foodtruck_id === foodtruckId);
  if (deal) {
    if (!deal.is_active) {
      return { valid: false, source: 'deal', error: "Cette formule n'est plus active" };
    }
    return { valid: true, source: 'deal', error: null };
  }

  // Check offers table (new unified system)
  const offer = offers.find(o => o.id === dealId && o.foodtruck_id === foodtruckId);
  if (offer) {
    if (!offer.is_active) {
      return { valid: false, source: 'offer', error: "Cette offre n'est plus active" };
    }
    return { valid: true, source: 'offer', error: null };
  }

  // Not found in either table - THIS IS THE FK VIOLATION CASE
  return { valid: false, source: null, error: 'Formule/offre invalide - référence inexistante' };
}

// Simulate database foreign key validation
function simulateForeignKeyCheck(
  _orderId: string,
  dealId: string | undefined,
  existingOfferIds: string[],
  existingDealIds: string[]
): { valid: boolean; constraintError: string | null } {
  if (!dealId) {
    return { valid: true, constraintError: null };
  }

  // Check if deal_id exists in either offers or deals table
  const existsInOffers = existingOfferIds.includes(dealId);
  const existsInDeals = existingDealIds.includes(dealId);

  // After migration, deal_id should reference offers table
  // This test catches the original bug where deal_id referenced deals but the offer was in offers
  if (!existsInOffers && !existsInDeals) {
    return {
      valid: false,
      constraintError: `violates foreign key constraint "orders_deal_id_fkey" - Key (deal_id)=(${dealId}) is not present in table "offers"`,
    };
  }

  // After FK migration, deal_id MUST exist in offers table
  if (!existsInOffers) {
    return {
      valid: false,
      constraintError: `violates foreign key constraint "orders_deal_id_fkey" - Key (deal_id)=(${dealId}) is not present in table "offers"`,
    };
  }

  return { valid: true, constraintError: null };
}

// ============================================
// TESTS
// ============================================

describe('Order Validation', () => {
  describe('validateOrderRequest', () => {
    it('should accept valid order request', () => {
      const order: OrderRequest = {
        foodtruck_id: 'ft-123',
        customer_email: 'test@example.com',
        customer_name: 'John Doe',
        pickup_time: new Date(Date.now() + 3600000).toISOString(),
        items: [{ menu_item_id: 'item-1', quantity: 2 }],
      };
      expect(validateOrderRequest(order)).toBeNull();
    });

    it('should reject order without foodtruck_id', () => {
      const order: OrderRequest = {
        foodtruck_id: '',
        customer_email: 'test@example.com',
        customer_name: 'John Doe',
        pickup_time: new Date().toISOString(),
        items: [{ menu_item_id: 'item-1', quantity: 2 }],
      };
      expect(validateOrderRequest(order)).toBe('Missing required fields');
    });

    it('should reject order without items', () => {
      const order: OrderRequest = {
        foodtruck_id: 'ft-123',
        customer_email: 'test@example.com',
        customer_name: 'John Doe',
        pickup_time: new Date().toISOString(),
        items: [],
      };
      expect(validateOrderRequest(order)).toBe('Missing required fields');
    });
  });

  describe('validateMenuItemsAvailability', () => {
    const menuItems: MenuItem[] = [
      { id: 'item-1', name: 'Pizza Margherita', price: 1200, category_id: 'cat-1', is_available: true },
      { id: 'item-2', name: 'Pizza 4 Fromages', price: 1400, category_id: 'cat-1', is_available: true },
      { id: 'item-3', name: 'Pizza Calzone', price: 1500, category_id: 'cat-1', is_available: false },
    ];

    it('should accept available items', () => {
      expect(validateMenuItemsAvailability(['item-1', 'item-2'], menuItems)).toBeNull();
    });

    it('should reject non-existent items', () => {
      const error = validateMenuItemsAvailability(['item-1', 'item-999'], menuItems);
      expect(error).toContain("n'existe pas");
    });

    it('should reject unavailable items', () => {
      const error = validateMenuItemsAvailability(['item-1', 'item-3'], menuItems);
      expect(error).toContain("n'est plus disponible");
    });
  });

  describe('calculateOrder', () => {
    const menuItems: MenuItem[] = [
      { id: 'item-1', name: 'Pizza Margherita', price: 1200, category_id: 'cat-1', is_available: true },
      { id: 'item-2', name: 'Pizza 4 Fromages', price: 1400, category_id: 'cat-1', is_available: true },
    ];

    it('should calculate correct total for simple order', () => {
      const items: OrderItem[] = [
        { menu_item_id: 'item-1', quantity: 2 },
        { menu_item_id: 'item-2', quantity: 1 },
      ];
      const result = calculateOrder(items, menuItems);
      expect(result.error).toBeUndefined();
      expect(result.total).toBe(2 * 1200 + 1 * 1400); // 3800 centimes
    });

    it('should calculate correct total with options', () => {
      const items: OrderItem[] = [
        {
          menu_item_id: 'item-1',
          quantity: 1,
          selected_options: [
            { option_id: 'opt-1', option_group_id: 'grp-1', name: 'Extra fromage', group_name: 'Suppléments', price_modifier: 200 },
          ],
        },
      ];
      const result = calculateOrder(items, menuItems);
      expect(result.total).toBe(1200 + 200); // 1400 centimes
    });

    it('should calculate correct total for bundle items', () => {
      const items: OrderItem[] = [
        {
          menu_item_id: 'item-1',
          quantity: 1,
          bundle_id: 'bundle-1',
          bundle_name: 'Menu Duo',
          bundle_fixed_price: 2000,
          bundle_supplement: 0,
        },
        {
          menu_item_id: 'item-2',
          quantity: 1,
          bundle_id: 'bundle-1',
          bundle_name: 'Menu Duo',
          bundle_fixed_price: 0, // Only first item has the bundle price
          bundle_supplement: 0,
        },
      ];
      const result = calculateOrder(items, menuItems);
      expect(result.total).toBe(2000); // Bundle price only on first item
    });
  });

  describe('validateOrderTotal', () => {
    const menuItems: MenuItem[] = [
      { id: 'item-1', name: 'Pizza Margherita', price: 1200, category_id: 'cat-1', is_available: true },
    ];

    it('should accept matching total', () => {
      const items: OrderItem[] = [{ menu_item_id: 'item-1', quantity: 2 }];
      const result = validateOrderTotal(items, menuItems, 2400);
      expect(result.error).toBeNull();
      expect(result.serverTotal).toBe(2400);
    });

    it('should accept total with discount', () => {
      const items: OrderItem[] = [{ menu_item_id: 'item-1', quantity: 2 }];
      // Subtotal: 2400, discount: 500, expected total: 1900
      const result = validateOrderTotal(items, menuItems, 1900, 500);
      expect(result.error).toBeNull();
      expect(result.serverTotal).toBe(1900);
    });

    it('should reject manipulated total', () => {
      const items: OrderItem[] = [{ menu_item_id: 'item-1', quantity: 2 }];
      // Client tries to pay less than calculated
      const result = validateOrderTotal(items, menuItems, 1000);
      expect(result.error).not.toBeNull();
      expect(result.error).toContain('ne correspond pas');
    });

    it('should accept total with multiple discount types', () => {
      const items: OrderItem[] = [{ menu_item_id: 'item-1', quantity: 3 }];
      // Subtotal: 3600, promo: 200, deal: 300, loyalty: 500, expected: 2600
      const result = validateOrderTotal(items, menuItems, 2600, 200, 300, 500);
      expect(result.error).toBeNull();
      expect(result.serverTotal).toBe(2600);
    });

    it('should not allow total below zero', () => {
      const items: OrderItem[] = [{ menu_item_id: 'item-1', quantity: 1 }];
      // Subtotal: 1200, discount: 5000, expected: 0 (not negative)
      const result = validateOrderTotal(items, menuItems, 0, 5000);
      expect(result.error).toBeNull();
      expect(result.serverTotal).toBe(0);
    });
  });
});

describe('Deal/Offer Reference Validation', () => {
  const deals: Deal[] = [
    {
      id: 'deal-123',
      foodtruck_id: 'ft-1',
      name: '3 pizzas = 1 boisson',
      trigger_category_id: 'cat-pizza',
      trigger_quantity: 3,
      reward_type: 'free_item',
      reward_item_id: 'item-boisson',
      is_active: true,
    },
    {
      id: 'deal-456',
      foodtruck_id: 'ft-1',
      name: 'Inactive deal',
      trigger_category_id: 'cat-pizza',
      trigger_quantity: 2,
      reward_type: 'percentage',
      reward_value: 10,
      is_active: false,
    },
  ];

  const offers: Offer[] = [
    {
      id: 'offer-789',
      foodtruck_id: 'ft-1',
      name: 'Menu Duo',
      offer_type: 'bundle',
      is_active: true,
      config: { fixed_price: 2000 },
    },
    {
      id: 'offer-101',
      foodtruck_id: 'ft-1',
      name: 'Code BIENVENUE',
      offer_type: 'promo_code',
      is_active: true,
      config: { code: 'BIENVENUE', discount_type: 'percentage', discount_value: 10 },
    },
    {
      id: 'offer-inactive',
      foodtruck_id: 'ft-1',
      name: 'Inactive Offer',
      offer_type: 'bundle',
      is_active: false,
      config: {},
    },
  ];

  describe('validateDealReference', () => {
    it('should accept no deal_id', () => {
      const result = validateDealReference(undefined, deals, offers, 'ft-1');
      expect(result.valid).toBe(true);
      expect(result.source).toBeNull();
    });

    it('should accept valid legacy deal', () => {
      const result = validateDealReference('deal-123', deals, offers, 'ft-1');
      expect(result.valid).toBe(true);
      expect(result.source).toBe('deal');
    });

    it('should accept valid offer', () => {
      const result = validateDealReference('offer-789', deals, offers, 'ft-1');
      expect(result.valid).toBe(true);
      expect(result.source).toBe('offer');
    });

    it('should reject inactive deal', () => {
      const result = validateDealReference('deal-456', deals, offers, 'ft-1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain("n'est plus active");
    });

    it('should reject inactive offer', () => {
      const result = validateDealReference('offer-inactive', deals, offers, 'ft-1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain("n'est plus active");
    });

    it('should reject non-existent reference (FK VIOLATION CASE)', () => {
      // This is the bug that occurred: deal_id referencing an ID that doesn't exist
      const result = validateDealReference('non-existent-id', deals, offers, 'ft-1');
      expect(result.valid).toBe(false);
      expect(result.source).toBeNull();
      expect(result.error).toContain('référence inexistante');
    });

    it('should reject deal from different foodtruck', () => {
      const result = validateDealReference('deal-123', deals, offers, 'ft-different');
      expect(result.valid).toBe(false);
    });
  });

  describe('simulateForeignKeyCheck', () => {
    const existingOfferIds = ['offer-789', 'offer-101', 'offer-inactive'];
    const existingDealIds = ['deal-123', 'deal-456'];

    it('should accept null deal_id', () => {
      const result = simulateForeignKeyCheck('order-1', undefined, existingOfferIds, existingDealIds);
      expect(result.valid).toBe(true);
    });

    it('should accept valid offer reference', () => {
      const result = simulateForeignKeyCheck('order-1', 'offer-789', existingOfferIds, existingDealIds);
      expect(result.valid).toBe(true);
    });

    it('should REJECT deal_id that only exists in deals table (after migration)', () => {
      // This is the exact bug scenario: deal_id='deal-123' exists in deals but not in offers
      // After migration, the FK points to offers, so this should fail
      const result = simulateForeignKeyCheck('order-1', 'deal-123', existingOfferIds, existingDealIds);
      expect(result.valid).toBe(false);
      expect(result.constraintError).toContain('orders_deal_id_fkey');
    });

    it('should reject completely non-existent ID', () => {
      const result = simulateForeignKeyCheck('order-1', 'fake-id-999', existingOfferIds, existingDealIds);
      expect(result.valid).toBe(false);
      expect(result.constraintError).toContain('orders_deal_id_fkey');
    });
  });
});

describe('Order Creation with Offers Integration', () => {
  const menuItems: MenuItem[] = [
    { id: 'pizza-1', name: 'Pizza Margherita', price: 1200, category_id: 'cat-pizza', is_available: true },
    { id: 'pizza-2', name: 'Pizza 4 Fromages', price: 1400, category_id: 'cat-pizza', is_available: true },
    { id: 'boisson-1', name: 'Coca-Cola', price: 300, category_id: 'cat-boisson', is_available: true },
  ];

  const offers: Offer[] = [
    {
      id: 'bundle-menu',
      foodtruck_id: 'ft-1',
      name: 'Menu Pizza + Boisson',
      offer_type: 'bundle',
      is_active: true,
      config: { fixed_price: 1400 },
    },
  ];

  it('should create order with bundle offer correctly', () => {
    const orderRequest: OrderRequest = {
      foodtruck_id: 'ft-1',
      customer_email: 'test@example.com',
      customer_name: 'John Doe',
      pickup_time: new Date(Date.now() + 3600000).toISOString(),
      deal_id: 'bundle-menu',
      deal_discount: 100, // 1€ savings
      items: [
        {
          menu_item_id: 'pizza-1',
          quantity: 1,
          bundle_id: 'bundle-menu',
          bundle_name: 'Menu Pizza + Boisson',
          bundle_fixed_price: 1400,
        },
        {
          menu_item_id: 'boisson-1',
          quantity: 1,
          bundle_id: 'bundle-menu',
          bundle_name: 'Menu Pizza + Boisson',
          bundle_fixed_price: 0,
        },
      ],
      bundles_used: [{ bundle_id: 'bundle-menu', quantity: 1 }],
    };

    // Validate request
    expect(validateOrderRequest(orderRequest)).toBeNull();

    // Validate deal reference exists in offers
    const dealRef = validateDealReference(orderRequest.deal_id, [], offers, 'ft-1');
    expect(dealRef.valid).toBe(true);
    expect(dealRef.source).toBe('offer');

    // Calculate order
    const calculation = calculateOrder(orderRequest.items, menuItems);
    expect(calculation.error).toBeUndefined();
    expect(calculation.total).toBe(1400); // Bundle price
  });

  it('should reject order with invalid offer reference', () => {
    const orderRequest: OrderRequest = {
      foodtruck_id: 'ft-1',
      customer_email: 'test@example.com',
      customer_name: 'John Doe',
      pickup_time: new Date(Date.now() + 3600000).toISOString(),
      deal_id: 'invalid-offer-id',
      deal_discount: 500,
      items: [{ menu_item_id: 'pizza-1', quantity: 2 }],
    };

    // This should fail - mimics the FK violation
    const dealRef = validateDealReference(orderRequest.deal_id, [], offers, 'ft-1');
    expect(dealRef.valid).toBe(false);
    expect(dealRef.error).toContain('inexistante');
  });
});

describe('Promo Code Validation', () => {
  interface PromoCode {
    id: string;
    foodtruck_id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    max_discount: number | null;
    is_active: boolean;
    current_uses: number;
    max_uses: number | null;
  }

  const promoCodes: PromoCode[] = [
    {
      id: 'promo-1',
      foodtruck_id: 'ft-1',
      code: 'BIENVENUE',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 1000,
      max_discount: 500,
      is_active: true,
      current_uses: 0,
      max_uses: 100,
    },
    {
      id: 'promo-2',
      foodtruck_id: 'ft-1',
      code: 'FIXED5',
      discount_type: 'fixed',
      discount_value: 500,
      min_order_amount: 0,
      max_discount: null,
      is_active: true,
      current_uses: 99,
      max_uses: 100,
    },
  ];

  function validatePromoCode(
    promoCodeId: string | undefined,
    promoCodes: PromoCode[],
    orderSubtotal: number,
    foodtruckId: string
  ): { valid: boolean; expectedDiscount: number; error: string | null } {
    if (!promoCodeId) {
      return { valid: true, expectedDiscount: 0, error: null };
    }

    const promo = promoCodes.find(p => p.id === promoCodeId && p.foodtruck_id === foodtruckId);
    if (!promo) {
      return { valid: false, expectedDiscount: 0, error: 'Code promo invalide' };
    }

    if (!promo.is_active) {
      return { valid: false, expectedDiscount: 0, error: "Ce code promo n'est plus actif" };
    }

    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return { valid: false, expectedDiscount: 0, error: "Ce code promo a atteint sa limite d'utilisation" };
    }

    if (orderSubtotal < promo.min_order_amount) {
      return {
        valid: false,
        expectedDiscount: 0,
        error: `Commande minimum de ${(promo.min_order_amount / 100).toFixed(2)}€ requise`,
      };
    }

    let discount: number;
    if (promo.discount_type === 'percentage') {
      discount = Math.floor((orderSubtotal * promo.discount_value) / 100);
      if (promo.max_discount && discount > promo.max_discount) {
        discount = promo.max_discount;
      }
    } else {
      discount = Math.min(promo.discount_value, orderSubtotal);
    }

    return { valid: true, expectedDiscount: discount, error: null };
  }

  it('should validate percentage promo code', () => {
    const result = validatePromoCode('promo-1', promoCodes, 3000, 'ft-1');
    expect(result.valid).toBe(true);
    expect(result.expectedDiscount).toBe(300); // 10% of 3000
  });

  it('should cap percentage discount at max_discount', () => {
    const result = validatePromoCode('promo-1', promoCodes, 10000, 'ft-1');
    expect(result.valid).toBe(true);
    expect(result.expectedDiscount).toBe(500); // Max cap
  });

  it('should validate fixed amount promo code', () => {
    const result = validatePromoCode('promo-2', promoCodes, 2000, 'ft-1');
    expect(result.valid).toBe(true);
    expect(result.expectedDiscount).toBe(500);
  });

  it('should reject if below minimum order amount', () => {
    const result = validatePromoCode('promo-1', promoCodes, 500, 'ft-1');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('minimum');
  });

  it('should reject invalid promo code id', () => {
    const result = validatePromoCode('invalid-promo', promoCodes, 2000, 'ft-1');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Code promo invalide');
  });
});

describe('Complete Order Flow Validation', () => {
  const menuItems: MenuItem[] = [
    { id: 'item-1', name: 'Pizza', price: 1200, category_id: 'cat-1', is_available: true },
    { id: 'item-2', name: 'Boisson', price: 300, category_id: 'cat-2', is_available: true },
  ];

  const offers: Offer[] = [
    {
      id: 'offer-1',
      foodtruck_id: 'ft-1',
      name: 'Menu',
      offer_type: 'bundle',
      is_active: true,
      config: { fixed_price: 1400 },
    },
  ];

  it('should validate complete order with promo + offer + loyalty', () => {
    const orderRequest: OrderRequest = {
      foodtruck_id: 'ft-1',
      customer_email: 'loyal@example.com',
      customer_name: 'Loyal Customer',
      pickup_time: new Date(Date.now() + 3600000).toISOString(),
      promo_code_id: undefined,
      discount_amount: 0,
      deal_id: 'offer-1',
      deal_discount: 100, // Bundle savings
      items: [
        { menu_item_id: 'item-1', quantity: 1, bundle_id: 'offer-1', bundle_fixed_price: 1400 },
        { menu_item_id: 'item-2', quantity: 1, bundle_id: 'offer-1', bundle_fixed_price: 0 },
      ],
      expected_total: 1300, // 1400 - 100 deal discount
    };

    // Step 1: Validate request structure
    expect(validateOrderRequest(orderRequest)).toBeNull();

    // Step 2: Validate items availability
    const itemIds = orderRequest.items.map(i => i.menu_item_id);
    expect(validateMenuItemsAvailability(itemIds, menuItems)).toBeNull();

    // Step 3: Validate deal reference
    const dealValidation = validateDealReference(orderRequest.deal_id, [], offers, 'ft-1');
    expect(dealValidation.valid).toBe(true);

    // Step 4: Calculate and validate total
    const calculation = calculateOrder(orderRequest.items, menuItems);
    expect(calculation.error).toBeUndefined();

    const totalValidation = validateOrderTotal(
      orderRequest.items,
      menuItems,
      orderRequest.expected_total!,
      0, // promo discount
      orderRequest.deal_discount || 0,
      0 // loyalty discount
    );
    expect(totalValidation.error).toBeNull();
  });

  it('should catch price manipulation attempt', () => {
    const orderRequest: OrderRequest = {
      foodtruck_id: 'ft-1',
      customer_email: 'hacker@example.com',
      customer_name: 'Hacker',
      pickup_time: new Date(Date.now() + 3600000).toISOString(),
      items: [{ menu_item_id: 'item-1', quantity: 5 }],
      expected_total: 100, // Manipulated - should be 6000
    };

    const totalValidation = validateOrderTotal(
      orderRequest.items,
      menuItems,
      orderRequest.expected_total!
    );

    expect(totalValidation.error).not.toBeNull();
    expect(totalValidation.serverTotal).toBe(6000);
  });

  it('should catch fake discount manipulation', () => {
    const orderRequest: OrderRequest = {
      foodtruck_id: 'ft-1',
      customer_email: 'hacker@example.com',
      customer_name: 'Hacker',
      pickup_time: new Date(Date.now() + 3600000).toISOString(),
      deal_id: 'fake-offer',
      deal_discount: 5000, // Fake 50€ discount
      items: [{ menu_item_id: 'item-1', quantity: 2 }],
    };

    // Validation should catch invalid deal reference
    const dealValidation = validateDealReference(orderRequest.deal_id, [], offers, 'ft-1');
    expect(dealValidation.valid).toBe(false);
  });
});
