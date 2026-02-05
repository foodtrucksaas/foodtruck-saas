import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFoodtrucksApi } from './foodtrucks';

describe('Foodtrucks API', () => {
  let mockSupabase: any;
  let foodtrucksApi: ReturnType<typeof createFoodtrucksApi>;

  // Helper to create a chainable query mock
  const createChainableQuery = (resolveValue: any = { data: [], error: null }) => {
    const query: any = {};
    ['select', 'eq', 'order', 'update'].forEach((method) => {
      query[method] = vi.fn(() => query);
    });
    query.then = (resolve: any) => resolve(resolveValue);
    query.maybeSingle = vi.fn(() => Promise.resolve(resolveValue));
    query.single = vi.fn(() => Promise.resolve(resolveValue));
    return query;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn(),
    };
    foodtrucksApi = createFoodtrucksApi(mockSupabase);
  });

  describe('getAll', () => {
    it('should fetch all active foodtrucks sorted by name', async () => {
      const mockFoodtrucks = [
        { id: 'ft-1', name: 'Alpha Truck', is_active: true },
        { id: 'ft-2', name: 'Beta Truck', is_active: true },
      ];
      const query = createChainableQuery({ data: mockFoodtrucks, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.getAll();

      expect(mockSupabase.from).toHaveBeenCalledWith('foodtrucks');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.eq).toHaveBeenCalledWith('is_active', true);
      expect(query.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockFoodtrucks);
    });

    it('should throw error on failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'DB Error' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(foodtrucksApi.getAll()).rejects.toThrow('DB Error');
    });
  });

  describe('getById', () => {
    it('should fetch a foodtruck by ID', async () => {
      const mockFoodtruck = { id: 'ft-1', name: 'Test Truck', slug: 'test-truck' };
      const query = createChainableQuery({ data: mockFoodtruck, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.getById('ft-1');

      expect(query.eq).toHaveBeenCalledWith('id', 'ft-1');
      expect(query.maybeSingle).toHaveBeenCalled();
      expect(result).toEqual(mockFoodtruck);
    });

    it('should return null when foodtruck not found', async () => {
      const query = createChainableQuery({ data: null, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.getById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'Not found' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(foodtrucksApi.getById('ft-1')).rejects.toThrow('Not found');
    });
  });

  describe('getByUserId', () => {
    it('should fetch foodtruck by user ID', async () => {
      const mockFoodtruck = { id: 'ft-1', user_id: 'user-123', name: 'My Truck' };
      const query = createChainableQuery({ data: mockFoodtruck, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.getByUserId('user-123');

      expect(query.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(query.maybeSingle).toHaveBeenCalled();
      expect(result).toEqual(mockFoodtruck);
    });

    it('should return null when user has no foodtruck', async () => {
      const query = createChainableQuery({ data: null, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.getByUserId('user-without-truck');

      expect(result).toBeNull();
    });

    it('should throw error on failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'DB Error' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(foodtrucksApi.getByUserId('user-123')).rejects.toThrow('DB Error');
    });
  });

  describe('update', () => {
    it('should update foodtruck and return updated data', async () => {
      const updates = { name: 'Updated Truck', description: 'New description' };
      const updatedFoodtruck = { id: 'ft-1', ...updates };
      const query = createChainableQuery({ data: updatedFoodtruck, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.update('ft-1', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('foodtrucks');
      expect(query.update).toHaveBeenCalledWith(updates);
      expect(query.eq).toHaveBeenCalledWith('id', 'ft-1');
      expect(query.select).toHaveBeenCalled();
      expect(result).toEqual(updatedFoodtruck);
    });

    it('should update loyalty settings', async () => {
      const updates = {
        loyalty_enabled: true,
        loyalty_points_per_euro: 2,
        loyalty_threshold: 100,
        loyalty_reward: 1000,
      };
      const updatedFoodtruck = { id: 'ft-1', ...updates };
      const query = createChainableQuery({ data: updatedFoodtruck, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.update('ft-1', updates);

      expect(query.update).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedFoodtruck);
    });

    it('should throw error on failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(foodtrucksApi.update('ft-1', { name: 'Test' })).rejects.toThrow('Update failed');
    });
  });

  describe('getSettings', () => {
    it('should fetch foodtruck settings subset', async () => {
      const mockSettings = {
        order_slot_interval: 15,
        max_orders_per_slot: 5,
        show_promo_section: true,
        allow_advance_orders: true,
        advance_order_days: 7,
        allow_asap_orders: true,
        min_preparation_time: 15,
        show_menu_photos: true,
        loyalty_enabled: true,
        loyalty_points_per_euro: 1,
        loyalty_threshold: 50,
        loyalty_reward: 500,
        loyalty_allow_multiple: false,
        offers_stackable: true,
        promo_codes_stackable: false,
      };
      const query = createChainableQuery({ data: mockSettings, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.getSettings('ft-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('foodtrucks');
      expect(query.select).toHaveBeenCalledWith(expect.stringContaining('order_slot_interval'));
      expect(query.select).toHaveBeenCalledWith(expect.stringContaining('loyalty_enabled'));
      expect(query.eq).toHaveBeenCalledWith('id', 'ft-1');
      expect(result).toEqual(mockSettings);
    });

    it('should return null when foodtruck not found', async () => {
      const query = createChainableQuery({ data: null, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await foodtrucksApi.getSettings('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'DB Error' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(foodtrucksApi.getSettings('ft-1')).rejects.toThrow('DB Error');
    });
  });
});
