import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { formatLocalDate } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useFoodtruck } from './FoodtruckContext';

// Module-level storage to survive React StrictMode remounts
let knownOrderIdsSet = new Set<string>();
let pendingPopupsStore: OrderWithItemsAndOptions[] = [];

// Shared AudioContext - must be created/resumed after user interaction on iOS
let sharedAudioContext: AudioContext | null = null;
let audioUnlocked = false;

// Initialize audio context on first user interaction (required for iOS)
function getAudioContext(): AudioContext | null {
  // Only create/use audio context after user has interacted
  if (!audioUnlocked) return null;

  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // Resume if suspended (iOS requires this after user gesture)
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

// Unlock audio on first user interaction (call this on any tap/click)
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

    // Create oscillator for the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Pleasant notification sound - two quick beeps
    oscillator.frequency.value = 880; // A5 note
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
      osc2.frequency.value = 1100; // C#6 note
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
  // Initialize from module-level store to survive StrictMode remounts
  const [pendingPopupOrders, setPendingPopupOrders] = useState<OrderWithItemsAndOptions[]>(() => pendingPopupsStore);
  const [pendingCount, setPendingCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Helper to update both store and state
  const updatePendingPopups = useCallback((updater: (prev: OrderWithItemsAndOptions[]) => OrderWithItemsAndOptions[]) => {
    setPendingPopupOrders(prev => {
      const updated = updater(prev);
      pendingPopupsStore = updated;
      return updated;
    });
  }, []);

  // Refresh function for Orders page
  const refreshOrders = useCallback(() => {
    setRefreshTrigger(t => t + 1);
  }, []);

  // Reset known orders when foodtruck changes
  useEffect(() => {
    if (foodtruck?.id) {
      knownOrderIdsSet = new Set<string>();
    }
  }, [foodtruck?.id]);

  // Polling for new orders
  useEffect(() => {
    if (!foodtruck?.id) return;

    const foodtruckId = foodtruck.id;
    const autoAccept = foodtruck.auto_accept_orders;
    const showPopup = foodtruck.show_order_popup;

    const checkForNewOrders = async () => {
      const today = formatLocalDate(new Date());

      // Build query based on mode
      let query = supabase
        .from('orders')
        .select('*, order_items (*, menu_item:menu_items (*), order_item_options (*))')
        .eq('foodtruck_id', foodtruckId)
        .gte('pickup_time', `${today}T00:00:00`)
        .order('pickup_time', { ascending: true });

      if (autoAccept) {
        // In auto-accept mode: check for confirmed orders (cash orders + card orders after payment)
        // Also check pending for card orders during payment
        query = query.in('status', ['pending', 'confirmed']);
      } else {
        // In manual mode: only pending orders need notification
        query = query.eq('status', 'pending');
      }

      const { data } = await query;

      if (data) {
        // In auto-accept mode, we only care about confirmed orders for notifications
        // In manual mode, we care about pending orders
        // Always exclude manual dashboard orders (surplace@local)
        const ordersToNotify = (autoAccept
          ? data.filter(order => order.status === 'confirmed')
          : data
        ).filter(order => order.customer_email !== 'surplace@local');

        // Update pending count (only in manual mode, count pending orders)
        if (!autoAccept) {
          const pendingOrders = data.filter(order =>
            order.status === 'pending' && order.customer_email !== 'surplace@local'
          );
          setPendingCount(pendingOrders.length);
        } else {
          setPendingCount(0);
        }

        // Check for new orders using module-level Set
        const newOrders = ordersToNotify.filter(order => !knownOrderIdsSet.has(order.id));
        const wasFirstLoad = knownOrderIdsSet.size === 0;

        // Only add notifiable orders to known IDs (so we don't miss status transitions)
        ordersToNotify.forEach(order => knownOrderIdsSet.add(order.id));

        // Check if we have genuinely new orders (not first load)
        if (newOrders.length > 0 && !wasFirstLoad) {
          if (soundEnabledRef.current) {
            playNotificationSound();
          }

          // Show popup with ALL pending orders (not just new ones)
          if (showPopup) {
            const allPendingOrders = data
              .filter(order => order.status === 'pending' && order.customer_email !== 'surplace@local')
              .reverse() as unknown as OrderWithItemsAndOptions[];
            updatePendingPopups(() => allPendingOrders);
          } else {
            toast.success(`${newOrders.length} nouvelle${newOrders.length > 1 ? 's' : ''} commande${newOrders.length > 1 ? 's' : ''} !`);
          }
        }
      }
    };

    // Initial check
    checkForNewOrders();

    // Poll every 3 seconds
    const interval = setInterval(checkForNewOrders, 3000);

    return () => clearInterval(interval);
  }, [foodtruck?.id, foodtruck?.auto_accept_orders, foodtruck?.show_order_popup, refreshTrigger, updatePendingPopups]);

  const acceptOrder = useCallback(async (id: string) => {
    await supabase.from('orders').update({ status: 'confirmed' }).eq('id', id);
    toast.success('Commande acceptée');

    // Send confirmation email if enabled (non-blocking)
    if (foodtruck?.send_confirmation_email !== false) {
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

    // Update pending count
    setPendingCount(prev => Math.max(0, prev - 1));
    // Remove from popup list
    updatePendingPopups(prev => prev.filter(o => o.id !== id));
  }, [foodtruck?.send_confirmation_email, updatePendingPopups]);

  const cancelOrder = useCallback(async (id: string, reason?: string) => {
    await supabase.from('orders').update({
      status: 'cancelled',
      cancellation_reason: reason || 'Refusée par le commerçant'
    }).eq('id', id);
    toast.success('Commande refusée');
    // Update pending count
    setPendingCount(prev => Math.max(0, prev - 1));
    // Remove from popup list
    updatePendingPopups(prev => prev.filter(o => o.id !== id));
  }, [updatePendingPopups]);

  const dismissPopup = useCallback((id: string) => {
    updatePendingPopups(prev => prev.filter(o => o.id !== id));
  }, [updatePendingPopups]);

  const showAllPendingOrders = useCallback(async () => {
    if (!foodtruck?.id) return;

    const today = formatLocalDate(new Date());
    const { data } = await supabase
      .from('orders')
      .select('*, order_items (*, menu_item:menu_items (*), order_item_options (*))')
      .eq('foodtruck_id', foodtruck.id)
      .eq('status', 'pending')
      .neq('customer_email', 'surplace@local')
      .gte('pickup_time', `${today}T00:00:00`)
      .order('pickup_time', { ascending: true });

    if (data && data.length > 0) {
      // Add all pending orders to popup stack (newest first)
      updatePendingPopups(() => data.reverse() as unknown as OrderWithItemsAndOptions[]);
    } else {
      toast('Aucune commande en attente');
    }
  }, [foodtruck?.id, updatePendingPopups]);

  // Show a specific order by ID (from push notification tap)
  const showOrderById = useCallback(async (orderId: string) => {
    if (!foodtruck?.id) return;

    // Fetch the specific order
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items (*, menu_item:menu_items (*), order_item_options (*))')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // Fetch all other pending orders
    const today = formatLocalDate(new Date());
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('*, order_items (*, menu_item:menu_items (*), order_item_options (*))')
      .eq('foodtruck_id', foodtruck.id)
      .eq('status', 'pending')
      .neq('id', orderId)
      .gte('pickup_time', `${today}T00:00:00`)
      .order('pickup_time', { ascending: true });

    // Put the clicked order first, then other pending orders
    const allOrders = [
      order as unknown as OrderWithItemsAndOptions,
      ...((pendingOrders || []).reverse() as unknown as OrderWithItemsAndOptions[])
    ];

    updatePendingPopups(() => allOrders);
  }, [foodtruck?.id, updatePendingPopups]);

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
