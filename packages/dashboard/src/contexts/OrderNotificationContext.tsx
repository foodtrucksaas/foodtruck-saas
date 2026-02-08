import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { formatLocalDate } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useFoodtruck } from './FoodtruckContext';

// ============================================
// BULLETPROOF ORDER NOTIFICATION SYSTEM
// Uses: Realtime + Polling + Visibility detection
// ============================================

// Module-level storage to survive React StrictMode remounts
let knownOrderIdsSet = new Set<string>();
let pendingPopupsStore: OrderWithItemsAndOptions[] = [];
let hasShownInitialPopup = false;

// Shared AudioContext - must be created/resumed after user interaction on iOS
let sharedAudioContext: AudioContext | null = null;
let audioUnlocked = false;

// Initialize audio context on first user interaction (required for iOS)
function getAudioContext(): AudioContext | null {
  if (!audioUnlocked) return null;

  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

// Unlock audio on first user interaction
export function unlockAudio() {
  if (audioUnlocked) return;

  try {
    audioUnlocked = true;
    if (!sharedAudioContext) {
      sharedAudioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
  } catch {
    // Silently fail if audio not supported
  }
}

// Play notification sound using Web Audio API
function playNotificationSound() {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);

    // Second beep
    setTimeout(() => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.2);
    }, 150);
  } catch {
    // Fallback: do nothing if Web Audio API not available
  }
}

interface OrderNotificationContextType {
  pendingPopupOrders: OrderWithItemsAndOptions[];
  pendingCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  acceptOrder: (id: string, pickupTime?: string) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  dismissPopup: (id: string) => void;
  refreshOrders: () => void;
  refreshTrigger: number;
  showAllPendingOrders: () => Promise<void>;
  showOrderById: (orderId: string) => Promise<void>;
  isAutoAccept: boolean;
  minPrepTime: number;
}

const OrderNotificationContext = createContext<OrderNotificationContextType | null>(null);

export function OrderNotificationProvider({ children }: { children: ReactNode }) {
  const { foodtruck } = useFoodtruck();
  const [pendingPopupOrders, setPendingPopupOrders] = useState<OrderWithItemsAndOptions[]>(
    () => pendingPopupsStore
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refs to access latest values in callbacks without re-subscribing
  const foodtruckRef = useRef(foodtruck);
  const soundEnabledRef = useRef(soundEnabled);
  const pendingPopupOrdersRef = useRef(pendingPopupOrders);

  // isMounted ref to prevent setState on unmounted component
  const isMountedRef = useRef(true);

  // Track pending timeouts for cleanup
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    foodtruckRef.current = foodtruck;
  }, [foodtruck]);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  useEffect(() => {
    pendingPopupOrdersRef.current = pendingPopupOrders;
  }, [pendingPopupOrders]);

  // Set isMounted on mount and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    // Capture the ref value for cleanup
    const timeoutsSet = pendingTimeoutsRef.current;
    return () => {
      isMountedRef.current = false;
      // Clear all pending timeouts on unmount
      timeoutsSet.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsSet.clear();
    };
  }, []);

  // Helper to update both store and state (with isMounted check)
  const updatePendingPopups = useCallback(
    (updater: (prev: OrderWithItemsAndOptions[]) => OrderWithItemsAndOptions[]) => {
      if (!isMountedRef.current) return;
      setPendingPopupOrders((prev) => {
        const updated = updater(prev);
        pendingPopupsStore = updated;
        return updated;
      });
    },
    []
  );

  const refreshOrders = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
  }, []);

  // Fetch all pending orders with full details
  const fetchPendingOrders = useCallback(
    async (foodtruckId: string): Promise<OrderWithItemsAndOptions[]> => {
      const today = formatLocalDate(new Date());

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items (*, menu_item:menu_items (*), order_item_options (*))')
        .eq('foodtruck_id', foodtruckId)
        .eq('status', 'pending')
        .neq('customer_email', 'surplace@local')
        .gte('pickup_time', `${today}T00:00:00`)
        .order('pickup_time', { ascending: true });

      if (error) {
        console.error('[OrderNotification] Error fetching orders:', error);
        return [];
      }

      return (data || []) as unknown as OrderWithItemsAndOptions[];
    },
    []
  );

  // Show popup for new orders - THE CORE FUNCTION
  const showPopupForOrders = useCallback(
    (orders: OrderWithItemsAndOptions[], playSound: boolean) => {
      const ft = foodtruckRef.current;
      if (!ft?.show_order_popup) {
        // Popup disabled - sound only
        return;
      }

      if (orders.length === 0) return;

      // Don't play sound if popup is already open (e.g., user switching tabs)
      const popupAlreadyOpen = pendingPopupOrdersRef.current.length > 0;

      if (playSound && soundEnabledRef.current && !popupAlreadyOpen) {
        playNotificationSound();
      }

      // Always show ALL pending orders in popup (newest first for stack)
      updatePendingPopups(() => [...orders].reverse());
    },
    [updatePendingPopups]
  );

  // Check for new orders - called by polling and realtime
  const checkForNewOrders = useCallback(
    async (_isInitialCheck = false) => {
      const ft = foodtruckRef.current;
      if (!ft?.id || !isMountedRef.current) return;

      const pendingOrders = await fetchPendingOrders(ft.id);

      // Check if still mounted after async operation
      if (!isMountedRef.current) return;

      setPendingCount(pendingOrders.length);

      // Find genuinely new orders
      const newOrders = pendingOrders.filter((order) => !knownOrderIdsSet.has(order.id));
      const isFirstLoad = knownOrderIdsSet.size === 0;

      // Mark all as known
      pendingOrders.forEach((order) => knownOrderIdsSet.add(order.id));

      // NEW ORDERS DETECTED
      if (newOrders.length > 0 && !isFirstLoad) {
        showPopupForOrders(pendingOrders, true);
      }

      // INITIAL LOAD - show pending orders after small delay (so user knows it's from before)
      if (isFirstLoad && pendingOrders.length > 0 && ft.show_order_popup && !hasShownInitialPopup) {
        hasShownInitialPopup = true;
        // Small delay so it doesn't feel like a bug - track timeout for cleanup
        const timeoutId = setTimeout(() => {
          pendingTimeoutsRef.current.delete(timeoutId);
          if (isMountedRef.current && pendingOrders.length > 0) {
            showPopupForOrders(pendingOrders, true);
          }
        }, 1000);
        pendingTimeoutsRef.current.add(timeoutId);
      }
    },
    [fetchPendingOrders, showPopupForOrders]
  );

  // Reset known orders when foodtruck changes
  useEffect(() => {
    if (foodtruck?.id) {
      knownOrderIdsSet = new Set<string>();
      hasShownInitialPopup = false;
    }
  }, [foodtruck?.id]);

  // ============================================
  // 1. SUPABASE REALTIME - Primary notification
  // ============================================
  useEffect(() => {
    if (!foodtruck?.id) return;

    const foodtruckId = foodtruck.id;
    let isCleaningUp = false;

    const channel = supabase
      .channel(`orders-${foodtruckId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `foodtruck_id=eq.${foodtruckId}`,
        },
        (payload) => {
          // Guard against callbacks during cleanup
          if (isCleaningUp || !isMountedRef.current) return;

          const newOrder = payload.new;

          // Skip manual dashboard orders
          if (newOrder.customer_email === 'surplace@local') return;

          // Immediately check for all pending orders (to get full details)
          checkForNewOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `foodtruck_id=eq.${foodtruckId}`,
        },
        () => {
          // Guard against callbacks during cleanup
          if (isCleaningUp || !isMountedRef.current) return;

          // Refresh to update counts and popup state
          checkForNewOrders();
        }
      )
      .subscribe((status, error) => {
        // Handle subscription errors gracefully
        if (error) {
          console.error('[OrderNotification] Realtime subscription error:', error);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[OrderNotification] Channel error, subscription may not be active');
        }
        if (status === 'TIMED_OUT') {
          console.warn('[OrderNotification] Subscription timed out, relying on polling');
        }
      });

    return () => {
      // Set cleanup flag to prevent callbacks during unsubscribe
      isCleaningUp = true;

      // Unsubscribe and remove channel
      channel
        .unsubscribe()
        .then(() => {
          supabase.removeChannel(channel);
        })
        .catch((error) => {
          console.error('[OrderNotification] Error during channel cleanup:', error);
          // Still try to remove channel even if unsubscribe fails
          supabase.removeChannel(channel);
        });
    };
  }, [foodtruck?.id, checkForNewOrders]);

  // ============================================
  // 2. POLLING - Backup mechanism (every 30s - realtime is primary)
  // ============================================
  useEffect(() => {
    if (!foodtruck?.id) return;

    // Initial check
    checkForNewOrders(true);

    // Poll every 30 seconds as backup (realtime handles immediate updates)
    const interval = setInterval(() => {
      checkForNewOrders();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [foodtruck?.id, refreshTrigger, checkForNewOrders]);

  // ============================================
  // 3. VISIBILITY CHANGE - Check when tab becomes visible
  // ============================================
  useEffect(() => {
    if (!foodtruck?.id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForNewOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [foodtruck?.id, checkForNewOrders]);

  // ============================================
  // 4. WINDOW FOCUS - Additional check on focus
  // ============================================
  useEffect(() => {
    if (!foodtruck?.id) return;

    const handleFocus = () => {
      checkForNewOrders();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [foodtruck?.id, checkForNewOrders]);

  // Accept order
  const acceptOrder = useCallback(
    async (id: string, pickupTime?: string) => {
      const updateData: { status: 'confirmed'; pickup_time?: string } = { status: 'confirmed' };
      if (pickupTime) {
        updateData.pickup_time = pickupTime;
      }
      const { error } = await supabase.from('orders').update(updateData).eq('id', id);

      if (error) {
        console.error('[OrderNotification] Error accepting order:', error);
        return;
      }

      // Check if still mounted after async operation
      if (!isMountedRef.current) return;

      // Send confirmation email if enabled (non-blocking)
      if (foodtruckRef.current?.send_confirmation_email !== false) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ order_id: id }),
        }).catch(console.error);
      }

      // Update state (updatePendingPopups already has isMounted check)
      setPendingCount((prev) => Math.max(0, prev - 1));
      updatePendingPopups((prev) => prev.filter((o) => o.id !== id));
    },
    [updatePendingPopups]
  );

  // Cancel order
  const cancelOrder = useCallback(
    async (id: string, reason?: string) => {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason || 'Refusée par le commerçant',
        })
        .eq('id', id);

      if (error) {
        console.error('[OrderNotification] Error cancelling order:', error);
        return;
      }

      // Check if still mounted after async operation
      if (!isMountedRef.current) return;

      setPendingCount((prev) => Math.max(0, prev - 1));
      updatePendingPopups((prev) => prev.filter((o) => o.id !== id));
    },
    [updatePendingPopups]
  );

  // Dismiss popup without action
  const dismissPopup = useCallback(
    (id: string) => {
      updatePendingPopups((prev) => prev.filter((o) => o.id !== id));
    },
    [updatePendingPopups]
  );

  // Show all pending orders (bell button)
  const showAllPendingOrders = useCallback(async () => {
    const ft = foodtruckRef.current;
    if (!ft?.id) return;

    const pendingOrders = await fetchPendingOrders(ft.id);

    // Check if still mounted after async operation
    if (!isMountedRef.current) return;

    if (pendingOrders.length > 0) {
      updatePendingPopups(() => [...pendingOrders].reverse());
    }
  }, [fetchPendingOrders, updatePendingPopups]);

  // Show specific order by ID (from push notification)
  const showOrderById = useCallback(
    async (orderId: string) => {
      const ft = foodtruckRef.current;
      if (!ft?.id) return;

      // Fetch the specific order
      const { data: order } = await supabase
        .from('orders')
        .select('*, order_items (*, menu_item:menu_items (*), order_item_options (*))')
        .eq('id', orderId)
        .single();

      // Check if still mounted after async operation
      if (!isMountedRef.current) return;

      if (!order) return;

      // Fetch all other pending orders
      const pendingOrders = await fetchPendingOrders(ft.id);

      // Check if still mounted after second async operation
      if (!isMountedRef.current) return;

      // Put the clicked order first
      const allOrders = [
        order as unknown as OrderWithItemsAndOptions,
        ...pendingOrders.filter((o) => o.id !== orderId),
      ];

      updatePendingPopups(() => allOrders);
    },
    [fetchPendingOrders, updatePendingPopups]
  );

  return (
    <OrderNotificationContext.Provider
      value={{
        pendingPopupOrders,
        pendingCount,
        soundEnabled,
        setSoundEnabled,
        acceptOrder,
        cancelOrder,
        dismissPopup,
        refreshOrders,
        refreshTrigger,
        showAllPendingOrders,
        showOrderById,
        isAutoAccept: foodtruck?.auto_accept_orders ?? false,
        minPrepTime: foodtruck?.min_preparation_time ?? 15,
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
}

export function useOrderNotification() {
  const context = useContext(OrderNotificationContext);
  if (!context) {
    throw new Error('useOrderNotification must be used within OrderNotificationProvider');
  }
  return context;
}
