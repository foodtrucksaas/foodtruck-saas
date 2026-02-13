import { useEffect, useState, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { useFoodtruck } from '../contexts/FoodtruckContext';
import { useAuth } from '../contexts/AuthContext';

interface UsePushNotificationsOptions {
  onNotificationTap?: (orderId: string) => void;
}

// Store the current device token at module level
let currentDeviceToken: string | null = null;

// Function to get the current device token (for logout cleanup)
export function getCurrentDeviceToken(): string | null {
  return currentDeviceToken;
}

// Function to remove device token from database (called on logout)
export async function removeDeviceToken(): Promise<void> {
  if (!currentDeviceToken) return;

  try {
    const { error } = await supabase.from('device_tokens').delete().eq('token', currentDeviceToken);

    if (error) {
      console.error('Error removing device token:', error);
    }
  } catch (error) {
    console.error('Error removing device token:', error);
  }
}

export function usePushNotifications(options?: UsePushNotificationsOptions) {
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>(
    'prompt'
  );
  const [token, setToken] = useState<string | null>(null);
  const { foodtruck } = useFoodtruck();
  const { user } = useAuth();

  // Use refs to always have latest values in callbacks
  const userRef = useRef(user);
  const foodtruckRef = useRef(foodtruck);
  const onNotificationTapRef = useRef(options?.onNotificationTap);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    foodtruckRef.current = foodtruck;
  }, [foodtruck]);

  useEffect(() => {
    onNotificationTapRef.current = options?.onNotificationTap;
  }, [options?.onNotificationTap]);

  // Setup push notifications once
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let isSetup = false;

    const setupPushNotifications = async () => {
      if (isSetup) return;
      isSetup = true;

      try {
        // Listen for registration success BEFORE registering
        await PushNotifications.addListener('registration', async (tokenData) => {
          currentDeviceToken = tokenData.value; // Store at module level
          setToken(tokenData.value);
        });

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', () => {
          // Push notification registration failed
        });

        // Listen for notification tap (when user clicks on the notification)
        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          const orderId = notification.notification.data?.order_id;
          if (orderId && onNotificationTapRef.current) {
            onNotificationTapRef.current(orderId);
          }
        });

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          // Request permission
          const result = await PushNotifications.requestPermissions();
          if (result.receive === 'granted' || result.receive === 'denied') {
            setPermissionStatus(result.receive);
          }

          if (result.receive !== 'granted') {
            return;
          }
        } else if (permStatus.receive === 'denied') {
          setPermissionStatus('denied');
          return;
        } else {
          setPermissionStatus('granted');
        }

        // Register for push notifications
        await PushNotifications.register();
      } catch {
        // Push notification setup failed
      }
    };

    setupPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  // Save token when we have all required data
  // This will also update the token when the user switches accounts
  useEffect(() => {
    if (token && user && foodtruck) {
      saveTokenToDatabase(token, user.id, foodtruck.id);
    }
  }, [token, user, foodtruck]);

  return { permissionStatus, token };
}

async function saveTokenToDatabase(token: string, userId: string, foodtruckId: string) {
  try {
    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

    // First, delete any existing row with this token (regardless of owner)
    // This handles the case where a different user logs in on the same device
    await supabase.from('device_tokens').delete().eq('token', token);

    // Insert the new token with current user/foodtruck
    const { error } = await supabase
      .from('device_tokens')
      .insert({
        token,
        user_id: userId,
        foodtruck_id: foodtruckId,
        platform,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Error saving device token:', error);
    }
  } catch (error) {
    console.error('Error saving device token:', error);
  }
}
