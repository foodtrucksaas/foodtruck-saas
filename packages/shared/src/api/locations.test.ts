import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLocationsApi } from './locations';

describe('Locations API', () => {
  let mockSupabase: any;
  let locationsApi: ReturnType<typeof createLocationsApi>;

  // Helper to create a chainable query mock
  const createChainableQuery = (resolveValue: any = { data: [], error: null }) => {
    const query: any = {};
    ['select', 'eq', 'order', 'insert', 'update', 'delete'].forEach((method) => {
      query[method] = vi.fn(() => query);
    });
    query.then = (resolve: any) => resolve(resolveValue);
    query.single = vi.fn(() => Promise.resolve(resolveValue));
    return query;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn(),
    };
    locationsApi = createLocationsApi(mockSupabase);
  });

  describe('getByFoodtruck', () => {
    it('should fetch all locations for a foodtruck sorted by name', async () => {
      const mockLocations = [
        { id: 'loc-1', name: 'Centre-ville', address: '1 Rue Principale', foodtruck_id: 'ft-1' },
        { id: 'loc-2', name: 'Marché', address: 'Place du Marché', foodtruck_id: 'ft-1' },
      ];
      const query = createChainableQuery({ data: mockLocations, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await locationsApi.getByFoodtruck('ft-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('locations');
      expect(query.select).toHaveBeenCalledWith('*');
      expect(query.eq).toHaveBeenCalledWith('foodtruck_id', 'ft-1');
      expect(query.order).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockLocations);
    });

    it('should return empty array when no locations', async () => {
      const query = createChainableQuery({ data: [], error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await locationsApi.getByFoodtruck('ft-1');

      expect(result).toEqual([]);
    });

    it('should throw error on failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'DB Error' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(locationsApi.getByFoodtruck('ft-1')).rejects.toThrow('DB Error');
    });
  });

  describe('getById', () => {
    it('should fetch a single location by ID', async () => {
      const mockLocation = {
        id: 'loc-1',
        name: 'Centre-ville',
        address: '1 Rue Principale',
        latitude: 47.4712,
        longitude: -0.5518,
        foodtruck_id: 'ft-1',
      };
      const query = createChainableQuery({ data: mockLocation, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await locationsApi.getById('loc-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('locations');
      expect(query.eq).toHaveBeenCalledWith('id', 'loc-1');
      expect(query.single).toHaveBeenCalled();
      expect(result).toEqual(mockLocation);
    });

    it('should throw error when location not found', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'Not found' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(locationsApi.getById('nonexistent')).rejects.toThrow('Not found');
    });
  });

  describe('create', () => {
    it('should create a new location', async () => {
      const newLocation = {
        foodtruck_id: 'ft-1',
        name: 'Nouveau Spot',
        address: '10 Avenue de la Liberté',
        latitude: 47.48,
        longitude: -0.56,
      };
      const createdLocation = { id: 'loc-new', ...newLocation };
      const query = createChainableQuery({ data: createdLocation, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await locationsApi.create(newLocation);

      expect(mockSupabase.from).toHaveBeenCalledWith('locations');
      expect(query.insert).toHaveBeenCalledWith(newLocation);
      expect(query.select).toHaveBeenCalled();
      expect(result).toEqual(createdLocation);
    });

    it('should create location with Google Place ID', async () => {
      const newLocation = {
        foodtruck_id: 'ft-1',
        name: 'Google Spot',
        address: 'Parsed from Google',
        latitude: 47.48,
        longitude: -0.56,
        google_place_id: 'ChIJ1234567890',
      };
      const createdLocation = { id: 'loc-new', ...newLocation };
      const query = createChainableQuery({ data: createdLocation, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await locationsApi.create(newLocation);

      expect(query.insert).toHaveBeenCalledWith(newLocation);
      expect(result).toEqual(createdLocation);
    });

    it('should throw error on creation failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'Duplicate name' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(
        locationsApi.create({
          foodtruck_id: 'ft-1',
          name: 'Test',
          address: 'Test Address',
        })
      ).rejects.toThrow('Duplicate name');
    });
  });

  describe('update', () => {
    it('should update a location', async () => {
      const updates = { name: 'Updated Name', address: 'New Address' };
      const updatedLocation = { id: 'loc-1', foodtruck_id: 'ft-1', ...updates };
      const query = createChainableQuery({ data: updatedLocation, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await locationsApi.update('loc-1', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('locations');
      expect(query.update).toHaveBeenCalledWith(updates);
      expect(query.eq).toHaveBeenCalledWith('id', 'loc-1');
      expect(query.select).toHaveBeenCalled();
      expect(result).toEqual(updatedLocation);
    });

    it('should update coordinates', async () => {
      const updates = { latitude: 48.8566, longitude: 2.3522 };
      const updatedLocation = { id: 'loc-1', ...updates };
      const query = createChainableQuery({ data: updatedLocation, error: null });
      mockSupabase.from.mockReturnValue(query);

      const result = await locationsApi.update('loc-1', updates);

      expect(query.update).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedLocation);
    });

    it('should throw error on update failure', async () => {
      const query = createChainableQuery({ data: null, error: { message: 'Update failed' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(locationsApi.update('loc-1', { name: 'Test' })).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    it('should delete a location', async () => {
      const query = createChainableQuery({ error: null });
      mockSupabase.from.mockReturnValue(query);

      await expect(locationsApi.delete('loc-1')).resolves.toBeUndefined();

      expect(mockSupabase.from).toHaveBeenCalledWith('locations');
      expect(query.delete).toHaveBeenCalled();
      expect(query.eq).toHaveBeenCalledWith('id', 'loc-1');
    });

    it('should throw error on delete failure', async () => {
      const query = createChainableQuery({ error: { message: 'Delete failed' } });
      mockSupabase.from.mockReturnValue(query);

      await expect(locationsApi.delete('loc-1')).rejects.toThrow('Delete failed');
    });

    it('should throw error when location has schedules', async () => {
      const query = createChainableQuery({
        error: { message: 'Cannot delete location with active schedules', code: '23503' },
      });
      mockSupabase.from.mockReturnValue(query);

      await expect(locationsApi.delete('loc-with-schedules')).rejects.toThrow(
        'Cannot delete location with active schedules'
      );
    });
  });
});
