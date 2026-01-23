import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';

export interface CustomerLoyalty {
  id: string;
  email: string;
  name: string | null;
  loyalty_points: number;
  loyalty_opt_in: boolean;
  total_orders: number;
  total_spent: number;
}

export interface LoyaltySettings {
  loyalty_enabled: boolean;
  loyalty_points_per_euro: number;
  loyalty_threshold: number;
  loyalty_reward: number;
  loyalty_allow_multiple: boolean;
}

export function useLoyalty() {
  const { foodtruck, updateFoodtruck } = useFoodtruck();
  const [customers, setCustomers] = useState<CustomerLoyalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settings, setSettings] = useState<LoyaltySettings>({
    loyalty_enabled: false,
    loyalty_points_per_euro: 1,
    loyalty_threshold: 50,
    loyalty_reward: 500,
    loyalty_allow_multiple: true,
  });

  useEffect(() => {
    if (foodtruck) {
      setSettings({
        loyalty_enabled: foodtruck.loyalty_enabled ?? false,
        loyalty_points_per_euro: foodtruck.loyalty_points_per_euro ?? 1,
        loyalty_threshold: foodtruck.loyalty_threshold ?? 50,
        loyalty_reward: foodtruck.loyalty_reward ?? 500,
        loyalty_allow_multiple: foodtruck.loyalty_allow_multiple ?? true,
      });
      if (foodtruck.loyalty_enabled) setSettingsOpen(true);
    }
  }, [foodtruck]);

  useEffect(() => {
    if (!foodtruck) return;
    setLoading(true);
    supabase.from('customers').select('id, email, name, loyalty_points, total_orders, total_spent')
      .eq('foodtruck_id', foodtruck.id).gt('loyalty_points', 0).order('loyalty_points', { ascending: false })
      .then(({ data }) => {
        if (data) setCustomers(data as unknown as CustomerLoyalty[]);
        setLoading(false);
      });
  }, [foodtruck]);

  const stats = useMemo(() => {
    const activeCustomers = customers.length;
    const totalPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
    const customersNearThreshold = customers.filter(
      (c) => c.loyalty_points >= settings.loyalty_threshold * 0.7 && c.loyalty_points < settings.loyalty_threshold
    ).length;
    return { activeCustomers, totalPoints, customersNearThreshold };
  }, [customers, settings.loyalty_threshold]);

  const toggleEnabled = useCallback(async () => {
    const newValue = !settings.loyalty_enabled;
    setSettings((s) => ({ ...s, loyalty_enabled: newValue }));
    try {
      await updateFoodtruck({ loyalty_enabled: newValue });
    } catch (error) {
      setSettings((s) => ({ ...s, loyalty_enabled: !newValue }));
      console.error('Erreur lors de la mise à jour de la fidélité', error);
    }
  }, [settings.loyalty_enabled, updateFoodtruck]);

  const toggleAllowMultiple = useCallback(async () => {
    const newValue = !settings.loyalty_allow_multiple;
    setSettings((s) => ({ ...s, loyalty_allow_multiple: newValue }));
    try {
      await updateFoodtruck({ loyalty_allow_multiple: newValue });
    } catch (error) {
      setSettings((s) => ({ ...s, loyalty_allow_multiple: !newValue }));
      console.error('Erreur lors de la mise à jour du paramètre', error);
    }
  }, [settings.loyalty_allow_multiple, updateFoodtruck]);

  const saveValues = useCallback(async () => {
    setSettingsLoading(true);
    try {
      await updateFoodtruck({
        loyalty_points_per_euro: settings.loyalty_points_per_euro,
        loyalty_threshold: settings.loyalty_threshold,
        loyalty_reward: settings.loyalty_reward,
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des valeurs', error);
    }
    setSettingsLoading(false);
  }, [settings, updateFoodtruck]);

  return {
    customers, loading, stats, settings, setSettings,
    settingsOpen, setSettingsOpen, settingsLoading,
    toggleEnabled, toggleAllowMultiple, saveValues,
  };
}
