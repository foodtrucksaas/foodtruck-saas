import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import toast from 'react-hot-toast';
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
      sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
      sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
  acceptOrder: (id: string) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  dismissPopup: (id: string) => void;
  refreshOrders: () => void;
  refreshTrigger: number;
  showAllPendingOrders: () => Promise<void>;
  showOrderById: (orderId: string) => Promise<void>;
  isAutoAccept: boolean;
}

const OrderNotificationContext = createContext<OrderNotificationContextType | null>(null);

export function OrderNotificationProvider({ children }: { children: ReactNode }) {
  const { foodtruck } = useFoodtruck();
  const [pendingPopupOrders, setPendingPopupOrders] = useState<OrderWithItemsAndOptions[]>(() => pendingPopupsStore);
  const [pendingCount, setPendingCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refs to access latest values in callbacks without re-subscribing
  const foodtruckRef = useRef(foodtruck);
  const soundEnabledRef = useRef(soundEnabled);
  const pendingPopupOrdersRef = useRef(pendingPopupOrders);

  // Keep refs in sync
  useEffect(() => { foodtruckRef.current = foodtruck; }, [foodtruck]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { pendingPopupOrdersRef.current = pendingPopupOrders; }, [pendingPopupOrders]);

  // Helper to update both store and state
  const updatePendingPopups = useCallback((updater: (prev: OrderWithItemsAndOptions[]) => OrderWithItemsAndOptions[]) => {
    setPendingPopupOrders(prev => {
      const updated = updater(prev);
      pendingPopupsStore = updated;
      return updated;
    });
  }, []);

  const refreshOrders = useCallback(() => {
    setRefreshTrigger(t => t + 1);
  }, []);

  // Fetch all pending orders with full details
  const fetchPendingOrders = useCallback(async (foodtruckId: string): Promise<OrderWithItemsAndOptions[]> => {
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
  }, []);

  // Show popup for new orders - THE CORE FUNCTION
  const showPopupForOrders = useCallback((orders: OrderWithItemsAndOptions[], playSound: boolean) => {
    const ft = foodtruckRef.current;
    if (!ft?.show_order_popup) {
      // Popup disabled - show toast instead
      if (orders.length > 0) {
        toast.success(`${orders.length} nouvelle${orders.length > 1 ? 's' : ''} commande${orders.length > 1 ? 's' : ''} !`);
      }
      return;
    }

    if (orders.length === 0) return;

    console.log('[OrderNotification] Showing popup for', orders.length, 'orders');

    if (playSound && soundEnabledRef.current) {
      playNotificationSound();
    }

    // Always show ALL pending orders in popup (newest first for stack)
    updatePendingPopups(() => [...orders].reverse());
  }, [updatePendingPopups]);

  // Check for new orders - called by polling and realtime
  const checkForNewOrders = useCallback(async (_isInitialCheck = false) => {
    const ft = foodtruckRef.current;
    if (!ft?.id) return;

    const pendingOrders = await fetchPendingOrders(ft.id);
    setPendingCount(pendingOrders.length);

    // Find genuinely new orders
    const newOrders = pendingOrders.filter(order => !knownOrderIdsSet.has(order.id));
    const isFirstLoad = knownOrderIdsSet.size === 0;

    // Mark all as known
    pendingOrders.forEach(order => knownOrderIdsSet.add(order.id));

    // NEW ORDERS DETECTED
    if (newOrders.length > 0 && !isFirstLoad) {
      console.log('[OrderNotification] NEW ORDERS DETECTED:', newOrders.length);
      showPopupForOrders(pendingOrders, true);
    }

    // INITIAL LOAD - show pending orders after small delay (so user knows it's from before)
    if (isFirstLoad && pendingOrders.length > 0 && ft.show_order_popup && !hasShownInitialPopup) {
      hasShownInitialPopup = true;
      console.log('[OrderNotification] Initial load - showing', pendingOrders.length, 'pending orders');
      // Small delay so it doesn't feel like a bug
      setTimeout(() => {
        if (pendingOrders.length > 0) {
          showPopupForOrders(pendingOrders, true);
        }
      }, 1000);
    }
  }, [fetchPendingOrders, showPopupForOrders]);

  // Reset known orders when foodtruck changes
  useEffect(() => {
    if (foodtruck?.id) {
      console.log('[OrderNotification] Foodtruck changed, resetting state');
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
    console.log('[OrderNotification] Setting up Realtime subscription for', foodtruckId);

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
          console.log('[OrderNotification] REALTIME INSERT:', payload.new);
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
        (payload) => {
          console.log('[OrderNotification] REALTIME UPDATE:', payload.new);
          // Refresh to update counts and popup state
          checkForNewOrders();
        }
      )
      .subscribe((status) => {
        console.log('[OrderNotification] Realtime status:', status);
      });

    return () => {
      console.log('[OrderNotification] Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [foodtruck?.id, checkForNewOrders]);

  // ============================================
  // 2. POLLING - Backup mechanism (every 5s)
  // ============================================
  useEffect(() => {
    if (!foodtruck?.id) return;

    console.log('[OrderNotification] Starting polling');

    // Initial check
    checkForNewOrders(true);

    // Poll every 5 seconds as backup
    const interval = setInterval(() => {
      checkForNewOrders();
    }, 5000);

    return () => {
      console.log('[OrderNotification] Stopping polling');
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
        console.log('[OrderNotification] Tab became visible, checking for orders');
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
      console.log('[OrderNotification] Window focused, checking for orders');
      checkForNewOrders();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [foodtruck?.id, checkForNewOrders]);

  // Accept order
  const acceptOrder = useCallback(async (id: string) => {
    const { error } = await supabase.from('orders').update({ status: 'confirmed' }).eq('id', id);

    if (error) {
      console.error('[OrderNotification] Error accepting order:', error);
      toast.error('Erreur lors de l\'acceptation');
      return;
    }

    toast.success('Commande acceptée');

    // Send confirmation email if enabled (non-blocking)
    if (foodtruckRef.current?.send_confirmation_email !== false) {
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-order-confirmation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ order_id: id }),
        }
      ).catch(console.error);
    }

    // Update state
    setPendingCount(prev => Math.max(0, prev - 1));
    updatePendingPopups(prev => prev.filter(o => o.id !== id));
  }, [updatePendingPopups]);

  // Cancel order
  const cancelOrder = useCallback(async (id: string, reason?: string) => {
    const { error } = await supabase.from('orders').update({
      status: 'cancelled',
      cancellation_reason: reason || 'Refusée par le commerçant'
    }).eq('id', id);

    if (error) {
      console.error('[OrderNotification] Error cancelling order:', error);
      toast.error('Erreur lors du refus');
      return;
    }

    toast.success('Commande refusée');
    setPendingCount(prev => Math.max(0, prev - 1));
    updatePendingPopups(prev => prev.filter(o => o.id !== id));
  }, [updatePendingPopups]);

  // Dismiss popup without action
  const dismissPopup = useCallback((id: string) => {
    updatePendingPopups(prev => prev.filter(o => o.id !== id));
  }, [updatePendingPopups]);

  // Show all pending orders (bell button)
  const showAllPendingOrders = useCallback(async () => {
    const ft = foodtruckRef.current;
    if (!ft?.id) return;

    const pendingOrders = await fetchPendingOrders(ft.id);

    if (pendingOrders.length > 0) {
      updatePendingPopups(() => [...pendingOrders].reverse());
    } else {
      toast('Aucune commande en attente');
    }
  }, [fetchPendingOrders, updatePendingPopups]);

  // Show specific order by ID (from push notification)
  const showOrderById = useCallback(async (orderId: string) => {
    const ft = foodtruckRef.current;
    if (!ft?.id) return;

    // Fetch the specific order
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items (*, menu_item:menu_items (*), order_item_options (*))')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // Fetch all other pending orders
    const pendingOrders = await fetchPendingOrders(ft.id);

    // Put the clicked order first
    const allOrders = [
      order as unknown as OrderWithItemsAndOptions,
      ...pendingOrders.filter(o => o.id !== orderId)
    ];

    updatePendingPopups(() => allOrders);
  }, [fetchPendingOrders, updatePendingPopups]);

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
