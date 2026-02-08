import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { removeDeviceToken } from '../hooks/usePushNotifications';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePasswordWithOld: (
    oldPassword: string,
    newPassword: string
  ) => Promise<{ error: AuthError | Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Reset isMounted on each effect run
    isMountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (isMountedRef.current) {
            setError(sessionError);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (isMountedRef.current) {
          setUser(session?.user ?? null);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Unexpected error during auth initialization:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to initialize auth'));
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMountedRef.current) {
        setUser(session?.user ?? null);
        setError(null);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      const authError = {
        message: err instanceof Error ? err.message : 'Network error during sign in',
        name: 'AuthError',
        status: 500,
      } as AuthError;
      return { error: authError };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      const authError = {
        message: err instanceof Error ? err.message : 'Network error during sign up',
        name: 'AuthError',
        status: 500,
      } as AuthError;
      return { error: authError };
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err) {
      console.error('Unexpected error during magic link sign in:', err);
      const authError = {
        message: err instanceof Error ? err.message : 'Network error during magic link sign in',
        name: 'AuthError',
        status: 500,
      } as AuthError;
      return { error: authError };
    }
  };

  const signOut = async (): Promise<{ error: Error | null }> => {
    try {
      // Remove device token so this device no longer receives notifications
      // Wrap in try/catch to not block sign out if this fails
      try {
        await removeDeviceToken();
      } catch (tokenError) {
        console.warn('Failed to remove device token during sign out:', tokenError);
        // Continue with sign out even if token removal fails
      }

      // Clear user state immediately for better UX
      if (isMountedRef.current) {
        setUser(null);
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error during sign out:', error);
        return { error };
      }
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      // Even if there's an error, ensure user state is cleared
      if (isMountedRef.current) {
        setUser(null);
      }
      return { error: err instanceof Error ? err : new Error('Failed to sign out') };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    } catch (err) {
      console.error('Unexpected error during password update:', err);
      const authError = {
        message: err instanceof Error ? err.message : 'Network error during password update',
        name: 'AuthError',
        status: 500,
      } as AuthError;
      return { error: authError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (err) {
      console.error('Unexpected error during password reset:', err);
      const authError = {
        message: err instanceof Error ? err.message : 'Network error during password reset',
        name: 'AuthError',
        status: 500,
      } as AuthError;
      return { error: authError };
    }
  };

  const updatePasswordWithOld = async (oldPassword: string, newPassword: string) => {
    try {
      // First verify the old password by attempting to sign in
      const {
        data: { user: currentUser },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        console.error('Error getting current user:', getUserError);
        return { error: getUserError };
      }

      if (!currentUser?.email) {
        return { error: new Error('Utilisateur non connecté') };
      }

      // Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: oldPassword,
      });

      if (signInError) {
        return { error: new Error('Ancien mot de passe incorrect') };
      }

      // Now update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    } catch (err) {
      console.error('Unexpected error during password update with old:', err);
      return { error: err instanceof Error ? err : new Error('Failed to update password') };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        signInWithMagicLink,
        signOut,
        updatePassword,
        resetPassword,
        updatePasswordWithOld,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
