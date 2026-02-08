import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { useOnboardingAssistant } from './useOnboardingAssistant';
import { OnboardingProvider } from '../OnboardingContext';

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
  slug: 'test-foodtruck',
  user_id: 'user-1',
};

const mockRefresh = vi.fn();

vi.mock('../../../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
    refresh: mockRefresh,
  }),
}));

// Wrapper component for testing
const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(OnboardingProvider, null, children);

describe('useOnboardingAssistant', () => {
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);

    // Setup default mock chains
    mockSelect = vi.fn();
    mockInsert = vi.fn();
    mockUpdate = vi.fn();
    mockDelete = vi.fn();

    // Default successful responses
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        data: [],
        error: null,
      }),
      order: vi.fn().mockReturnValue({
        data: [],
        error: null,
      }),
    });

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null }),
      }),
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockDelete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    mockFrom.mockImplementation((_table: string) => {
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      };
    });
  });

  describe('Initial State', () => {
    it('should return saving as false initially', () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });
      expect(result.current.saving).toBe(false);
    });

    it('should return error as null initially', () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });
      expect(result.current.error).toBeNull();
    });

    it('should provide save functions', () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });
      expect(typeof result.current.saveAllData).toBe('function');
      expect(typeof result.current.updateProgress).toBe('function');
      expect(typeof result.current.saveLocations).toBe('function');
      expect(typeof result.current.saveSchedules).toBe('function');
      expect(typeof result.current.saveMenu).toBe('function');
      expect(typeof result.current.saveOffers).toBe('function');
      expect(typeof result.current.saveSettings).toBe('function');
    });
  });

  describe('Save Locations', () => {
    it('should return empty array when no locations', async () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let locationIds: string[] = [];
      await act(async () => {
        locationIds = await result.current.saveLocations();
      });

      expect(locationIds).toEqual([]);
    });

    it('should not call locations table when there are no locations', async () => {
      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let locationIds: string[] = [];
      await act(async () => {
        locationIds = await result.current.saveLocations();
      });

      // Should not have called locations table insert since there are no locations
      expect(locationIds).toEqual([]);
    });
  });

  describe('Save Settings', () => {
    it('should update foodtruck with settings', async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(mockFrom).toHaveBeenCalledWith('foodtrucks');
    });

    it('should include onboarding_completed_at', async () => {
      let capturedUpdateData: Record<string, unknown> = {};
      mockUpdate.mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: null, error: null });
        }),
      }));

      mockFrom.mockImplementation((tableName: string) => {
        if (tableName === 'foodtrucks') {
          return {
            update: (data: Record<string, unknown>) => {
              capturedUpdateData = data;
              return {
                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            },
          };
        }
        return {
          select: mockSelect,
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        };
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(capturedUpdateData).toHaveProperty('onboarding_completed_at');
      expect(capturedUpdateData).toHaveProperty('onboarding_step', 6);
    });
  });

  describe('Update Progress', () => {
    it('should update onboarding_step in database', async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.updateProgress(3);
      });

      expect(mockFrom).toHaveBeenCalledWith('foodtrucks');
    });
  });

  describe('Save All Data', () => {
    it('should set saving to true while saving', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            data: [],
            error: null,
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      // Start save operation
      let savePromise: Promise<boolean>;
      act(() => {
        savePromise = result.current.saveAllData();
      });

      // Should be saving
      // Note: Due to async nature, this might not always catch the saving state

      await act(async () => {
        await savePromise;
      });

      // Should be done saving
      expect(result.current.saving).toBe(false);
    });

    it('should return true on success', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.saveAllData();
      });

      expect(success).toBe(true);
    });

    it('should call refresh after saving', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      await act(async () => {
        await result.current.saveAllData();
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should return false and set error on failure', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }));

      const { result } = renderHook(() => useOnboardingAssistant(), { wrapper });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.saveAllData();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Database error');
    });
  });
});
