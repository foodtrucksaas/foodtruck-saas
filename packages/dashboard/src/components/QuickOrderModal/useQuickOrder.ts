import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { MenuItem, Category, SelectedOption, OptionGroup, Option } from '@foodtruck/shared';
import { formatLocalDate } from '@foodtruck/shared';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
  uniqueId: string;
}

export interface OptionGroupWithOptions extends OptionGroup {
  options: Option[];
}

export interface MenuItemWithOptions extends MenuItem {
  option_groups: OptionGroupWithOptions[];
}

export type Step = 'products' | 'options' | 'checkout';

export function useQuickOrder(isOpen: boolean, onClose: () => void, onOrderCreated: () => void) {
  const { foodtruck } = useFoodtruck();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithOptions[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState<Step>('products');
  const [pendingItem, setPendingItem] = useState<MenuItemWithOptions | null>(null);
  const [pendingOptions, setPendingOptions] = useState<Record<string, string[]>>({});
  const [customerName, setCustomerName] = useState('');
  const [pickupTime, setPickupTime] = useState('now');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState<Record<string, { available: boolean; orderCount: number }>>({});

  // Fetch menu data and slot availability
  useEffect(() => {
    if (!isOpen || !foodtruck) return;

    async function fetchData() {
      // foodtruck is guaranteed to be defined here due to the guard at the start of useEffect
      if (!foodtruck) return;

      setLoading(true);

      const todayDate = formatLocalDate(new Date());
      const slotInterval = foodtruck.order_slot_interval ?? 15;
      const maxOrdersPerSlot = foodtruck.max_orders_per_slot ?? 999;

      const [categoriesRes, itemsRes, slotsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('foodtruck_id', foodtruck.id)
          .order('sort_order'),
        supabase
          .from('menu_items')
          .select('*, option_groups (*, options (*))')
          .eq('foodtruck_id', foodtruck.id)
          .eq('is_available', true)
          .order('name'),
        supabase.rpc('get_available_slots', {
          p_foodtruck_id: foodtruck.id,
          p_date: todayDate,
          p_interval_minutes: slotInterval,
          p_max_orders_per_slot: maxOrdersPerSlot,
        }),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data as unknown as MenuItemWithOptions[]);

      if (slotsRes.data) {
        const availabilityMap: Record<string, { available: boolean; orderCount: number }> = {};
        for (const slot of slotsRes.data) {
          const timeStr = slot.slot_time.substring(0, 5);
          availabilityMap[timeStr] = {
            available: slot.available,
            orderCount: slot.order_count,
          };
        }
        setSlotAvailability(availabilityMap);
      }

      setLoading(false);
    }

    fetchData();
  }, [isOpen, foodtruck]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setStep('products');
      setCustomerName('');
      setPickupTime('now');
      setNotes('');
      setSearchQuery('');
      setSelectedCategory(null);
      setPendingItem(null);
      setPendingOptions({});
      setShowMobileCart(false);
      setSlotAvailability({});
    }
  }, [isOpen]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (selectedCategory) {
      items = items.filter((item) => item.category_id === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const optionsTotal = item.selectedOptions.reduce((s, o) => s + o.priceModifier, 0);
      return sum + (item.menuItem.price + optionsTotal) * item.quantity;
    }, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Add to cart
  const addToCart = useCallback((menuItem: MenuItem, selectedOptions: SelectedOption[]) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.menuItem.id === menuItem.id &&
          JSON.stringify(item.selectedOptions) === JSON.stringify(selectedOptions)
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      const uniqueId = `${menuItem.id}-${selectedOptions.map((o) => o.optionId).join('-')}-${Date.now()}`;
      return [...prev, { menuItem, quantity: 1, selectedOptions, uniqueId }];
    });
  }, []);

  // Handle item click
  const handleItemClick = useCallback((item: MenuItemWithOptions) => {
    if (item.option_groups && item.option_groups.length > 0) {
      setPendingItem(item);
      setPendingOptions({});
      setStep('options');
    } else {
      addToCart(item, []);
    }
  }, [addToCart]);

  // Toggle option
  const toggleOption = useCallback((groupId: string, optionId: string, isMultiple: boolean) => {
    setPendingOptions((prev) => {
      const current = prev[groupId] || [];
      if (isMultiple) {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        }
        return { ...prev, [groupId]: [...current, optionId] };
      }
      return { ...prev, [groupId]: [optionId] };
    });
  }, []);

  // Confirm options selection
  const confirmOptions = useCallback(() => {
    if (!pendingItem) return;

    for (const group of pendingItem.option_groups) {
      if (group.is_required && !pendingOptions[group.id]?.length) {
        toast.error(`Veuillez sélectionner une option pour "${group.name}"`);
        return;
      }
    }

    const selectedOptions: SelectedOption[] = [];
    for (const [groupId, optionIds] of Object.entries(pendingOptions)) {
      const group = pendingItem.option_groups.find((g) => g.id === groupId);
      if (!group) continue;

      for (const optionId of optionIds) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          selectedOptions.push({
            optionId: option.id,
            optionGroupId: group.id,
            name: option.name,
            groupName: group.name,
            priceModifier: option.price_modifier ?? 0,
          });
        }
      }
    }

    addToCart(pendingItem, selectedOptions);
    setPendingItem(null);
    setPendingOptions({});
    setStep('products');
  }, [pendingItem, pendingOptions, addToCart]);

  // Cancel options
  const cancelOptions = useCallback(() => {
    setPendingItem(null);
    setPendingOptions({});
    setStep('products');
  }, []);

  // Update cart item quantity
  const updateQuantity = useCallback((uniqueId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.uniqueId === uniqueId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((uniqueId: string) => {
    setCart((prev) => prev.filter((item) => item.uniqueId !== uniqueId));
  }, []);

  // Generate available time slots
  const availableTimeSlots = useMemo(() => {
    const slots: string[] = [];
    const now = new Date();
    const interval = foodtruck?.order_slot_interval ?? 15;

    const startMinutes = Math.ceil(now.getMinutes() / interval) * interval;
    const startTime = new Date(now);
    startTime.setMinutes(startMinutes, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 0, 0);

    let slotTime = new Date(startTime);
    while (slotTime <= endOfDay) {
      const hours = slotTime.getHours().toString().padStart(2, '0');
      const mins = slotTime.getMinutes().toString().padStart(2, '0');
      slots.push(`${hours}:${mins}`);
      slotTime = new Date(slotTime.getTime() + interval * 60000);
    }

    return slots;
  }, [foodtruck?.order_slot_interval]);

  // Get pickup time as ISO string
  const getPickupTimeString = useCallback(() => {
    const now = new Date();
    if (pickupTime === 'now') {
      const interval = foodtruck?.order_slot_interval ?? 15;
      const minutes = Math.ceil(now.getMinutes() / interval) * interval;
      now.setMinutes(minutes, 0, 0);
      return now.toISOString();
    }
    const [hours, mins] = pickupTime.split(':').map(Number);
    const pickupDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
    return pickupDate.toISOString();
  }, [pickupTime, foodtruck?.order_slot_interval]);

  // Submit order
  const handleSubmit = useCallback(async () => {
    if (!foodtruck || cart.length === 0) return;

    if (!customerName.trim()) {
      toast.error('Veuillez entrer le nom du client');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        foodtruck_id: foodtruck.id,
        customer_email: 'surplace@local',
        customer_name: customerName.trim(),
        pickup_time: getPickupTimeString(),
        notes: notes.trim() || 'Commande sur place',
        force_slot: true,
        items: cart.map((item) => ({
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          selected_options: item.selectedOptions.map((opt) => ({
            option_id: opt.optionId,
            option_group_id: opt.optionGroupId,
            name: opt.name,
            group_name: opt.groupName,
            price_modifier: opt.priceModifier,
          })),
        })),
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(orderData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création');
      }

      toast.success(`Commande créée pour ${customerName}`);
      onOrderCreated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  }, [foodtruck, cart, customerName, notes, getPickupTimeString, onOrderCreated, onClose]);

  return {
    // Data
    categories,
    filteredItems,
    cart,
    cartTotal,
    cartItemsCount,
    loading,
    step,
    pendingItem,
    pendingOptions,
    customerName,
    pickupTime,
    notes,
    isSubmitting,
    showMobileCart,
    slotAvailability,
    availableTimeSlots,
    searchQuery,
    selectedCategory,

    // Setters
    setSearchQuery,
    setSelectedCategory,
    setStep,
    setCustomerName,
    setPickupTime,
    setNotes,
    setShowMobileCart,

    // Actions
    handleItemClick,
    toggleOption,
    confirmOptions,
    cancelOptions,
    updateQuantity,
    removeFromCart,
    handleSubmit,
  };
}
