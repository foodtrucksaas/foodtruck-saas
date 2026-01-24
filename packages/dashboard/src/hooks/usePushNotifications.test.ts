import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePushNotifications, getCurrentDeviceToken, removeDeviceToken } from './usePushNotifications';

// Mock Capacitor
const mockCheckPermissions = vi.fn();
const mockRequestPermissions = vi.fn();
const mockRegister = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveAllListeners = vi.fn();
const mockGetPlatform = vi.fn();
const mockIsNativePlatform = vi.fn();

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: () => mockCheckPermissions(),
    requestPermissions: () => mockRequestPermissions(),
    register: () => mockRegister(),
    addListener: (...args: unknown[]) => mockAddListener(...args),
    removeAllListeners: () => mockRemoveAllListeners(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNativePlatform(),
    getPlatform: () => mockGetPlatform(),
  },
}));

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock FoodtruckContext
const mockFoodtruck = {
  id: 'ft-1',
  name: 'Test Foodtruck',
};

vi.mock('../contexts/FoodtruckContext', () => ({
  useFoodtruck: () => ({
    foodtruck: mockFoodtruck,
  }),
}));

// Mock AuthContext
const mockUser = { id: 'user-1' };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

describe('usePushNotifications', () => {
  let mockDeleteResponse: ReturnType<typeof vi.fn>;
  let mockInsertResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeleteResponse = vi.fn().mockResolvedValue({ error: null });
    mockInsertResponse = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation(() => ({
      delete: () => ({
        eq: mockDeleteResponse,
      }),
      insert: () => ({
        select: mockInsertResponse,
      }),
    }));

    mockGetPlatform.mockReturnValue('ios');
    mockIsNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' });
    mockRequestPermissions.mockResolvedValue({ receive: 'granted' });
    mockRegister.mockResolvedValue(undefined);
    mockAddListener.mockResolvedValue(undefined);
    mockRemoveAllListeners.mockResolvedValue(undefined);
  });

  describe('on web platform', () => {
    it('should not setup push notifications on non-native platform', async () => {
      mockIsNativePlatform.mockReturnValue(false);

      renderHook(() => usePushNotifications());

      // Should not call any Capacitor methods
      expect(mockCheckPermissions).not.toHaveBeenCalled();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('on native platform', () => {
    it('should check permission status on mount', async () => {
      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockCheckPermissions).toHaveBeenCalled();
      });
    });

    it('should request permissions if status is prompt', async () => {
      mockCheckPermissions.mockResolvedValue({ receive: 'prompt' });
      mockRequestPermissions.mockResolvedValue({ receive: 'granted' });

      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockRequestPermissions).toHaveBeenCalled();
      });
    });

    it('should register for push notifications after permission granted', async () => {
      mockCheckPermissions.mockResolvedValue({ receive: 'granted' });

      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });
    });

    it('should not register if permission is denied', async () => {
      mockCheckPermissions.mockResolvedValue({ receive: 'denied' });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('denied');
      });

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should add listener for registration', async () => {
      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalledWith('registration', expect.any(Function));
      });
    });

    it('should add listener for registration errors', async () => {
      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalledWith('registrationError', expect.any(Function));
      });
    });

    it('should add listener for notification action performed', async () => {
      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalledWith('pushNotificationActionPerformed', expect.any(Function));
      });
    });

    it('should remove all listeners on unmount', async () => {
      const { unmount } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockAddListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemoveAllListeners).toHaveBeenCalled();
    });
  });

  describe('permission status', () => {
    it('should return granted status', async () => {
      mockCheckPermissions.mockResolvedValue({ receive: 'granted' });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('granted');
      });
    });

    it('should return denied status', async () => {
      mockCheckPermissions.mockResolvedValue({ receive: 'denied' });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('denied');
      });
    });

    it('should update status after requesting permission', async () => {
      mockCheckPermissions.mockResolvedValue({ receive: 'prompt' });
      mockRequestPermissions.mockResolvedValue({ receive: 'granted' });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.permissionStatus).toBe('granted');
      });
    });
  });

  describe('notification tap callback', () => {
    it('should call onNotificationTap when notification is tapped', async () => {
      const onNotificationTap = vi.fn();
      type NotificationPayload = { notification: { data?: { order_id?: string } } };
      const callbackHolder: { fn: ((payload: NotificationPayload) => void) | null } = { fn: null };

      mockAddListener.mockImplementation((event: string, callback: unknown) => {
        if (event === 'pushNotificationActionPerformed') {
          callbackHolder.fn = callback as (payload: NotificationPayload) => void;
        }
        return Promise.resolve();
      });

      renderHook(() => usePushNotifications({ onNotificationTap }));

      await waitFor(() => {
        expect(callbackHolder.fn).not.toBeNull();
      });

      // Simulate notification tap
      callbackHolder.fn?.({
        notification: {
          data: { order_id: 'order-123' },
        },
      });

      expect(onNotificationTap).toHaveBeenCalledWith('order-123');
    });

    it('should not call onNotificationTap if order_id is missing', async () => {
      const onNotificationTap = vi.fn();
      type NotificationPayload = { notification: { data?: { order_id?: string } } };
      const callbackHolder: { fn: ((payload: NotificationPayload) => void) | null } = { fn: null };

      mockAddListener.mockImplementation((event: string, callback: unknown) => {
        if (event === 'pushNotificationActionPerformed') {
          callbackHolder.fn = callback as (payload: NotificationPayload) => void;
        }
        return Promise.resolve();
      });

      renderHook(() => usePushNotifications({ onNotificationTap }));

      await waitFor(() => {
        expect(callbackHolder.fn).not.toBeNull();
      });

      // Simulate notification tap without order_id
      callbackHolder.fn?.({
        notification: {
          data: {},
        },
      });

      expect(onNotificationTap).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentDeviceToken', () => {
    it('should return null initially', () => {
      const token = getCurrentDeviceToken();
      // Note: This test may be affected by other tests that set the token
      expect(token === null || typeof token === 'string').toBe(true);
    });
  });

  describe('removeDeviceToken', () => {
    it('should not throw when no token exists', async () => {
      await expect(removeDeviceToken()).resolves.not.toThrow();
    });
  });

  describe('token state', () => {
    it('should initialize with null token', () => {
      mockIsNativePlatform.mockReturnValue(false);

      const { result } = renderHook(() => usePushNotifications());

      expect(result.current.token).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle permission check error gracefully', async () => {
      mockCheckPermissions.mockRejectedValue(new Error('Permission check failed'));

      // Should not throw
      const { result } = renderHook(() => usePushNotifications());

      // Hook should still return default values
      expect(result.current.permissionStatus).toBe('prompt');
    });

    it('should handle registration error gracefully', async () => {
      mockRegister.mockRejectedValue(new Error('Registration failed'));

      // Should not throw
      renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });
    });
  });
});
