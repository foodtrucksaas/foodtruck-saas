import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOffersApi,
  createBundleConfig,
  createBuyXGetYConfig,
  createPromoCodeOfferConfig,
  createThresholdDiscountConfig,
} from './offers';

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockOrder = vi.fn();
const mockRpc = vi.fn();

const createMockSupabase = () => ({
  from: vi.fn((_table: string) => ({
    select: (query?: string, options?: unknown) => {
      mockSelect(query, options);
      return {
        eq: (col: string, val: unknown) => {
          mockEq(col, val);
          return {
            eq: (col2: string, val2: unknown) => {
              mockEq(col2, val2);
              return {
                order: (orderCol: string, opts?: unknown) => {
                  mockOrder(orderCol, opts);
                  return Promise.resolve({ data: [], error: null });
                },
              };
            },
            single: () => {
              mockSingle();
              return Promise.resolve({ data: null, error: null });
            },
            order: (orderCol: string, opts?: unknown) => {
              mockOrder(orderCol, opts);
              return Promise.resolve({ data: [], error: null });
            },
          };
        },
        order: (orderCol: string, opts?: unknown) => {
          mockOrder(orderCol, opts);
          return Promise.resolve({ data: [], error: null });
        },
      };
    },
    insert: (data: unknown) => {
      mockInsert(data);
      return {
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'new-offer' }, error: null }),
        }),
      };
    },
    update: (data: unknown) => {
      mockUpdate(data);
      return {
        eq: (col: string, val: unknown) => {
          mockEq(col, val);
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'updated' }, error: null }),
            }),
          };
        },
      };
    },
    delete: () => {
      mockDelete();
      return {
        eq: (col: string, val: unknown) => {
          mockEq(col, val);
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  })),
  rpc: (funcName: string, params: unknown) => {
    mockRpc(funcName, params);
    return Promise.resolve({ data: [], error: null });
  },
});

describe('Offers API', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let offersApi: ReturnType<typeof createOffersApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    offersApi = createOffersApi(mockSupabase as any);
  });

  describe('CRUD Operations', () => {
    describe('getByFoodtruck', () => {
      it('should fetch all offers for a foodtruck', async () => {
        const mockOffers = [
          { id: 'offer-1', name: 'Promo', offer_type: 'promo_code' },
          { id: 'offer-2', name: 'Bundle', offer_type: 'bundle' },
        ];
        mockSupabase.from = vi.fn(() => ({
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockOffers, error: null }),
            }),
          }),
        }));

        const result = await offersApi.getByFoodtruck('ft-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('offers');
        expect(result).toEqual(mockOffers);
      });
    });

    describe('getActiveByFoodtruck', () => {
      it('should fetch only active offers', async () => {
        const mockActiveOffers = [{ id: 'offer-1', name: 'Active Promo', is_active: true }];
        mockSupabase.from = vi.fn(() => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockActiveOffers, error: null }),
              }),
            }),
          }),
        }));

        const result = await offersApi.getActiveByFoodtruck('ft-1');

        expect(result).toEqual(mockActiveOffers);
      });
    });

    describe('getById', () => {
      it('should fetch a single offer with items', async () => {
        const mockOffer = {
          id: 'offer-1',
          name: 'Test Offer',
          offer_items: [{ id: 'item-1', menu_item: { name: 'Pizza' } }],
        };
        mockSupabase.from = vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockOffer, error: null }),
            }),
          }),
        }));

        const result = await offersApi.getById('offer-1');

        expect(result).toEqual(mockOffer);
      });

      it('should return null when offer not found', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
            }),
          }),
        }));

        const result = await offersApi.getById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('create', () => {
      it('should create a new offer', async () => {
        const newOffer = {
          foodtruck_id: 'ft-1',
          name: 'New Bundle',
          offer_type: 'bundle' as const,
          config: { fixed_price: 1500 },
        };
        const createdOffer = { id: 'new-offer', ...newOffer };
        mockSupabase.from = vi.fn(() => ({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: createdOffer, error: null }),
            }),
          }),
        }));

        const result = await offersApi.create(newOffer);

        expect(result).toEqual(createdOffer);
      });
    });

    describe('update', () => {
      it('should update an existing offer', async () => {
        const updatedOffer = { id: 'offer-1', name: 'Updated Name' };
        mockSupabase.from = vi.fn(() => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: updatedOffer, error: null }),
              }),
            }),
          }),
        }));

        const result = await offersApi.update('offer-1', { name: 'Updated Name' });

        expect(result).toEqual(updatedOffer);
      });
    });

    describe('delete', () => {
      it('should delete an offer', async () => {
        mockSupabase.from = vi.fn(() => ({
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }));

        await expect(offersApi.delete('offer-1')).resolves.toBeUndefined();
      });

      it('should throw error on delete failure', async () => {
        mockSupabase.from = vi.fn(() => ({
          delete: () => ({
            eq: () => Promise.resolve({ error: new Error('Delete failed') }),
          }),
        }));

        await expect(offersApi.delete('offer-1')).rejects.toThrow('Delete failed');
      });
    });

    describe('toggleActive', () => {
      it('should toggle offer active status', async () => {
        const updatedOffer = { id: 'offer-1', is_active: false };
        mockSupabase.from = vi.fn(() => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: updatedOffer, error: null }),
              }),
            }),
          }),
        }));

        const result = await offersApi.toggleActive('offer-1', false);

        expect(result.is_active).toBe(false);
      });
    });
  });

  describe('Offer Items Operations', () => {
    describe('addItems', () => {
      it('should add items to an offer', async () => {
        const items = [
          { offer_id: 'offer-1', menu_item_id: 'item-1', role: 'bundle_item', quantity: 1 },
        ];
        const createdItems = [{ id: 'oi-1', ...items[0] }];
        mockSupabase.from = vi.fn(() => ({
          insert: () => ({
            select: () => Promise.resolve({ data: createdItems, error: null }),
          }),
        }));

        const result = await offersApi.addItems(items as any);

        expect(result).toEqual(createdItems);
      });
    });

    describe('removeItem', () => {
      it('should remove an item from an offer', async () => {
        mockSupabase.from = vi.fn(() => ({
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }));

        await expect(offersApi.removeItem('oi-1')).resolves.toBeUndefined();
      });
    });

    describe('removeAllItems', () => {
      it('should remove all items from an offer', async () => {
        mockSupabase.from = vi.fn(() => ({
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }));

        await expect(offersApi.removeAllItems('offer-1')).resolves.toBeUndefined();
      });
    });
  });

  describe('Validation & Application', () => {
    describe('validatePromoCode', () => {
      it('should validate a promo code', async () => {
        const validationResult = {
          is_valid: true,
          offer_id: 'offer-1',
          discount_amount: 500,
        };
        mockSupabase.rpc = vi.fn(() => Promise.resolve({ data: [validationResult], error: null }));

        const result = await offersApi.validatePromoCode('ft-1', 'PROMO10', 'test@test.com', 2000);

        expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_offer_promo_code', {
          p_foodtruck_id: 'ft-1',
          p_code: 'PROMO10',
          p_customer_email: 'test@test.com',
          p_order_amount: 2000,
        });
        expect(result).toEqual(validationResult);
      });
    });

    describe('getApplicable', () => {
      it('should get applicable offers for a cart', async () => {
        const cartItems = [
          { menu_item_id: 'item-1', category_id: 'cat-1', quantity: 2, price: 1200 },
        ];
        const applicableOffers = [
          { offer_id: 'offer-1', offer_name: 'Bundle', discount_amount: 300 },
        ];
        mockSupabase.rpc = vi.fn(() => Promise.resolve({ data: applicableOffers, error: null }));

        const result = await offersApi.getApplicable('ft-1', cartItems, 2400);

        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_applicable_offers', {
          p_foodtruck_id: 'ft-1',
          p_cart_items: cartItems,
          p_order_amount: 2400,
          p_promo_code: null,
        });
        expect(result).toEqual(applicableOffers);
      });

      it('should pass promo code when provided', async () => {
        mockSupabase.rpc = vi.fn(() => Promise.resolve({ data: [], error: null }));

        await offersApi.getApplicable('ft-1', [], 2000, 'CODE10');

        expect(mockSupabase.rpc).toHaveBeenCalledWith(
          'get_applicable_offers',
          expect.objectContaining({
            p_promo_code: 'CODE10',
          })
        );
      });
    });

    describe('getOptimized', () => {
      it('should get optimized offers combination', async () => {
        const cartItems = [
          { menu_item_id: 'item-1', category_id: 'cat-1', quantity: 3, price: 1200 },
        ];
        const optimizedResult = [
          {
            offer_id: 'offer-1',
            offer_name: 'Buy 2 Get 1',
            offer_type: 'buy_x_get_y',
            times_applied: 1,
            discount_per_application: 1200,
            calculated_discount: 1200,
            items_consumed: [{ menu_item_id: 'item-1', quantity: 3 }],
            free_item_name: 'Pizza',
          },
        ];
        mockSupabase.rpc = vi.fn(() => Promise.resolve({ data: optimizedResult, error: null }));

        const result = await offersApi.getOptimized('ft-1', cartItems, 3600);

        expect(result.applied_offers).toHaveLength(1);
        expect(result.applied_offers[0].offer_id).toBe('offer-1');
        expect(result.applied_offers[0].discount_amount).toBe(1200);
        expect(result.total_discount).toBe(1200);
      });
    });

    describe('apply', () => {
      it('should apply an offer to an order', async () => {
        mockSupabase.rpc = vi.fn(() => Promise.resolve({ error: null }));

        await offersApi.apply('offer-1', 'order-1', 'test@test.com', 500, 'Free Pizza');

        expect(mockSupabase.rpc).toHaveBeenCalledWith('apply_offer', {
          p_offer_id: 'offer-1',
          p_order_id: 'order-1',
          p_customer_email: 'test@test.com',
          p_discount_amount: 500,
          p_free_item_name: 'Free Pizza',
        });
      });
    });
  });

  describe('Statistics', () => {
    describe('countActivePromoCodes', () => {
      it('should count active promo codes', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ count: 5, error: null }),
              }),
            }),
          }),
        }));

        const result = await offersApi.countActivePromoCodes('ft-1');

        expect(result).toBe(5);
      });

      it('should return 0 when no promo codes', async () => {
        mockSupabase.from = vi.fn(() => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ count: null, error: null }),
              }),
            }),
          }),
        }));

        const result = await offersApi.countActivePromoCodes('ft-1');

        expect(result).toBe(0);
      });
    });

    describe('getStats', () => {
      it('should calculate offer statistics', async () => {
        const uses = [
          { customer_email: 'user1@test.com', discount_amount: 500 },
          { customer_email: 'user2@test.com', discount_amount: 300 },
          { customer_email: 'user1@test.com', discount_amount: 200 },
        ];
        mockSupabase.from = vi.fn(() => ({
          select: () => ({
            eq: () => Promise.resolve({ data: uses, error: null }),
          }),
        }));

        const result = await offersApi.getStats('offer-1');

        expect(result.total_uses).toBe(3);
        expect(result.total_discount).toBe(1000);
        expect(result.unique_customers).toBe(2);
      });
    });
  });
});

describe('Offer Config Helper Functions', () => {
  describe('createBundleConfig', () => {
    it('should create bundle config', () => {
      const config = createBundleConfig(1500);

      expect(config).toEqual({ fixed_price: 1500 });
    });
  });

  describe('createBuyXGetYConfig', () => {
    it('should create buy X get Y free config', () => {
      const config = createBuyXGetYConfig(3, 1, 'free');

      expect(config).toEqual({
        trigger_quantity: 3,
        reward_quantity: 1,
        reward_type: 'free',
        reward_value: undefined,
      });
    });

    it('should create buy X get Y discount config', () => {
      const config = createBuyXGetYConfig(2, 1, 'discount', 500);

      expect(config).toEqual({
        trigger_quantity: 2,
        reward_quantity: 1,
        reward_type: 'discount',
        reward_value: 500,
      });
    });
  });

  describe('createPromoCodeOfferConfig', () => {
    it('should create percentage promo code config', () => {
      const config = createPromoCodeOfferConfig('SUMMER10', 'percentage', 10);

      expect(config).toEqual({
        code: 'SUMMER10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: undefined,
        max_discount: undefined,
      });
    });

    it('should create fixed promo code config with limits', () => {
      const config = createPromoCodeOfferConfig('SAVE5', 'fixed', 500, 2000, 500);

      expect(config).toEqual({
        code: 'SAVE5',
        discount_type: 'fixed',
        discount_value: 500,
        min_order_amount: 2000,
        max_discount: 500,
      });
    });
  });

  describe('createThresholdDiscountConfig', () => {
    it('should create threshold discount config', () => {
      const config = createThresholdDiscountConfig(2500, 'percentage', 10);

      expect(config).toEqual({
        min_amount: 2500,
        discount_type: 'percentage',
        discount_value: 10,
      });
    });

    it('should create fixed threshold discount config', () => {
      const config = createThresholdDiscountConfig(3000, 'fixed', 500);

      expect(config).toEqual({
        min_amount: 3000,
        discount_type: 'fixed',
        discount_value: 500,
      });
    });
  });
});
