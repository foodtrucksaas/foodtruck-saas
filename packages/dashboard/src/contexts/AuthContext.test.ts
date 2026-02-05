import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock removeDeviceToken
vi.mock('../hooks/usePushNotifications', () => ({
  removeDeviceToken: vi.fn().mockResolvedValue(undefined),
}));

// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateUser = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange(callback);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
      signInWithPassword: (params: { email: string; password: string }) =>
        mockSignInWithPassword(params),
      signUp: (params: { email: string; password: string }) => mockSignUp(params),
      signInWithOtp: (params: { email: string; options: unknown }) => mockSignInWithOtp(params),
      signOut: () => mockSignOut(),
      updateUser: (params: { password: string }) => mockUpdateUser(params),
      resetPasswordForEmail: (email: string, options: unknown) =>
        mockResetPasswordForEmail(email, options),
      getUser: () => mockGetUser(),
    },
  },
}));

// Create wrapper
const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default session mock
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially loading
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should have null user when no session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should have user when session exists', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('signIn', () => {
    it('should call signInWithPassword with email and password', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(response!.error).toBeNull();
    });

    it('should return error when sign in fails', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const authError = { message: 'Invalid credentials', status: 401 };
      mockSignInWithPassword.mockResolvedValue({ error: authError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(response!.error).toEqual(authError);
    });
  });

  describe('signUp', () => {
    it('should call signUp with email and password', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.signUp('new@example.com', 'newpass123');
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpass123',
      });
      expect(response!.error).toBeNull();
    });

    it('should return error when signup fails', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const authError = { message: 'Email already exists', status: 400 };
      mockSignUp.mockResolvedValue({ error: authError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.signUp('existing@example.com', 'pass');
      });

      expect(response!.error).toEqual(authError);
    });
  });

  describe('signInWithMagicLink', () => {
    it('should call signInWithOtp with email and redirect options', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.signInWithMagicLink('magic@example.com');
      });

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'magic@example.com',
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      expect(response!.error).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should call signOut and clear user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
      });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('should remove device token on sign out', async () => {
      const { removeDeviceToken } = await import('../hooks/usePushNotifications');
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(removeDeviceToken).toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should call updateUser with new password', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockUpdateUser.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.updatePassword('newSecurePass123');
      });

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecurePass123' });
      expect(response!.error).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should call resetPasswordForEmail with email and redirect', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.resetPassword('reset@example.com');
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('reset@example.com', {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      expect(response!.error).toBeNull();
    });
  });

  describe('updatePasswordWithOld', () => {
    it('should verify old password before updating', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });
      mockSignInWithPassword.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.updatePasswordWithOld('oldPass', 'newPass');
      });

      // Should verify old password first
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'oldPass',
      });
      // Then update to new password
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newPass' });
      expect(response!.error).toBeNull();
    });

    it('should return error when old password is wrong', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockGetUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
      });
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid password' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.updatePasswordWithOld('wrongOld', 'newPass');
      });

      expect(response!.error).toEqual(new Error('Ancien mot de passe incorrect'));
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('should return error when user is not logged in', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response: { error: unknown };
      await act(async () => {
        response = await result.current.updatePasswordWithOld('old', 'new');
      });

      expect(response!.error).toEqual(new Error('Utilisateur non connecté'));
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should provide all auth methods', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signInWithMagicLink).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.updatePassword).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
      expect(typeof result.current.updatePasswordWithOld).toBe('function');
    });
  });

  describe('Auth state change subscription', () => {
    it('should update user when auth state changes', async () => {
      let authChangeCallback: ((event: string, session: unknown) => void) | null = null;
      mockOnAuthStateChange.mockImplementation((callback) => {
        authChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate auth state change
      const newUser = { id: 'new-user', email: 'new@example.com' };
      await act(async () => {
        if (authChangeCallback) {
          authChangeCallback('SIGNED_IN', { user: newUser });
        }
      });

      expect(result.current.user).toEqual(newUser);
    });
  });
});
