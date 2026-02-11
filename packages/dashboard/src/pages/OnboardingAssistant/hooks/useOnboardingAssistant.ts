import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFoodtruck } from '../../../contexts/FoodtruckContext';
import {
  useOnboarding,
  OnboardingCategory,
  OnboardingLocation,
  OnboardingSchedule,
} from '../OnboardingContext';
import type { Json } from '@foodtruck/shared';

export function useOnboardingAssistant() {
  const { foodtruck, refresh } = useFoodtruck();
  const { state, dispatch } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize foodtruck in state when available
  useEffect(() => {
    if (foodtruck && !state.foodtruck) {
      dispatch({
        type: 'SET_FOODTRUCK',
        foodtruck: {
          id: foodtruck.id,
          name: foodtruck.name,
          slug: foodtruck.slug,
        },
      });
    }
  }, [foodtruck, state.foodtruck, dispatch]);

  // Load existing data from database
  useEffect(() => {
    const loadExistingData = async () => {
      if (!foodtruck) return;

      try {
        // Load locations
        const { data: locationsData } = await supabase
          .from('locations')
          .select('*')
          .eq('foodtruck_id', foodtruck.id);

        if (locationsData && locationsData.length > 0) {
          const locations: OnboardingLocation[] = locationsData.map((loc) => ({
            id: loc.id,
            name: loc.name,
            address: loc.address || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            google_place_id: loc.google_place_id || '',
          }));
          dispatch({ type: 'SET_LOCATIONS', locations });
        }

        // Load schedules
        const { data: schedulesData } = await supabase
          .from('schedules')
          .select('*')
          .eq('foodtruck_id', foodtruck.id)
          .eq('is_active', true);

        if (schedulesData && schedulesData.length > 0) {
          const schedules: OnboardingSchedule[] = schedulesData.map((s) => ({
            day_of_week: s.day_of_week,
            location_id: s.location_id,
            start_time: s.start_time,
            end_time: s.end_time,
          }));
          const selectedDays = [...new Set(schedulesData.map((s) => s.day_of_week))];
          dispatch({ type: 'SET_SCHEDULES', schedules });
          dispatch({ type: 'SET_SELECTED_DAYS', days: selectedDays });
        }

        // Load categories and menu items
        const { data: categoriesData } = await supabase
          .from('categories')
          .select(
            `
            *,
            category_option_groups (
              *,
              category_options (*)
            ),
            menu_items (*)
          `
          )
          .eq('foodtruck_id', foodtruck.id)
          .order('display_order');

        if (categoriesData && categoriesData.length > 0) {
          const categories: OnboardingCategory[] = categoriesData.map((cat) => ({
            id: cat.id,
            name: cat.name,
            optionGroups: (cat.category_option_groups || []).map((og: any) => ({
              id: og.id,
              name: og.name,
              type: og.is_required ? 'size' : 'supplement',
              options: (og.category_options || []).map((opt: any) => ({
                name: opt.name,
                priceModifier: opt.price_modifier,
              })),
            })),
            items: (cat.menu_items || []).map((item: any) => ({
              id: item.id,
              name: item.name,
              prices: { base: item.price },
            })),
          }));
          dispatch({ type: 'SET_CATEGORIES', categories });
        }
      } catch (err) {
        console.error('Error loading existing data:', err);
      }
    };

    loadExistingData();
  }, [foodtruck, dispatch]);

  // Save locations to database
  // Uses upsert because Step 1 generates temp UUIDs via crypto.randomUUID()
  // that don't exist in the DB yet — a plain update would silently affect 0 rows
  const saveLocations = useCallback(async (): Promise<string[]> => {
    if (!foodtruck || state.locations.length === 0) return [];

    const locationIds: string[] = [];

    for (const loc of state.locations) {
      const payload = {
        foodtruck_id: foodtruck.id,
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        google_place_id: loc.google_place_id,
      };

      const { data, error } = await supabase
        .from('locations')
        .upsert({ ...(loc.id ? { id: loc.id } : {}), ...payload })
        .select('id')
        .single();

      if (error) throw error;
      if (data) locationIds.push(data.id);
    }

    return locationIds;
  }, [foodtruck, state.locations]);

  // Save schedules to database
  const saveSchedules = useCallback(
    async (locationIds: string[]) => {
      if (!foodtruck || state.schedules.length === 0) return;

      // Build mapping: temp/old ID or name → real DB ID
      const locationIdMap: Record<string, string> = {};
      state.locations.forEach((loc, index) => {
        const dbId = locationIds[index] || loc.id;
        if (dbId) {
          // Map by name (for schedules that reference by name)
          locationIdMap[loc.name] = dbId;
          // Map by original ID (temp UUID or real UUID)
          if (loc.id) locationIdMap[loc.id] = dbId;
        }
      });

      // Resolve location_id for each schedule
      const resolveLocationId = (scheduleLocationId: string): string => {
        return locationIdMap[scheduleLocationId] || scheduleLocationId || locationIds[0];
      };

      // Delete existing schedules
      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('foodtruck_id', foodtruck.id);
      if (deleteError) throw deleteError;

      // Insert new schedules
      const schedulesToInsert = state.schedules.map((s) => ({
        foodtruck_id: foodtruck.id,
        day_of_week: s.day_of_week,
        location_id: resolveLocationId(s.location_id),
        start_time: s.start_time,
        end_time: s.end_time,
        is_active: true,
      }));

      const { error } = await supabase.from('schedules').insert(schedulesToInsert);
      if (error) throw error;
    },
    [foodtruck, state.schedules, state.locations]
  );

  // Save menu (categories, option groups, items) to database
  // Uses upsert logic to prevent duplicates on retry
  const saveMenu = useCallback(async () => {
    if (!foodtruck || state.categories.length === 0) return;

    for (let catIndex = 0; catIndex < state.categories.length; catIndex++) {
      const cat = state.categories[catIndex];

      // Check if category exists (by name) and update or create
      let categoryId = cat.id;

      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('foodtruck_id', foodtruck.id)
        .eq('name', cat.name)
        .maybeSingle();

      if (existingCat) {
        categoryId = existingCat.id;

        // Delete existing option groups and their options for this category
        // This ensures clean slate on retry
        await supabase.from('category_option_groups').delete().eq('category_id', categoryId);

        // Delete existing menu items for this category
        await supabase
          .from('menu_items')
          .delete()
          .eq('category_id', categoryId)
          .eq('foodtruck_id', foodtruck.id);
      } else {
        const { data: newCat, error } = await supabase
          .from('categories')
          .insert({
            foodtruck_id: foodtruck.id,
            name: cat.name,
            display_order: catIndex,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (newCat) categoryId = newCat.id;
      }

      // Save option groups (category-level)
      for (let ogIndex = 0; ogIndex < cat.optionGroups.length; ogIndex++) {
        const og = cat.optionGroups[ogIndex];
        const { data: newOg, error: ogError } = await supabase
          .from('category_option_groups')
          .insert({
            category_id: categoryId,
            name: og.name,
            is_required: og.type === 'size',
            is_multiple: og.type === 'supplement',
            display_order: ogIndex,
          })
          .select('id')
          .single();

        if (ogError) throw ogError;

        // Save options
        if (newOg && og.options.length > 0) {
          const optionsToInsert = og.options.map((opt, optIndex) => ({
            option_group_id: newOg.id,
            name: opt.name,
            price_modifier: opt.priceModifier || 0,
            display_order: optIndex,
          }));

          const { error: optError } = await supabase
            .from('category_options')
            .insert(optionsToInsert);
          if (optError) throw optError;
        }
      }

      // Save menu items
      for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
        const item = cat.items[itemIndex];
        const basePrice = item.prices['base'] || Object.values(item.prices)[0] || 0;

        const { error: itemError } = await supabase.from('menu_items').insert({
          foodtruck_id: foodtruck.id,
          category_id: categoryId,
          name: item.name,
          price: basePrice,
          display_order: itemIndex,
          is_available: true,
        });

        if (itemError) throw itemError;
      }
    }
  }, [foodtruck, state.categories]);

  // Save offers to database
  const saveOffers = useCallback(async () => {
    if (!foodtruck || state.offers.length === 0) return;

    for (const offer of state.offers) {
      let config: Json = {};

      switch (offer.type) {
        case 'bundle':
          config = {
            fixed_price: Math.round(Number(offer.config.fixed_price) * 100),
          };
          break;
        case 'buy_x_get_y':
          config = {
            trigger_quantity: Number(offer.config.trigger_quantity),
            reward_quantity: Number(offer.config.reward_quantity),
            reward_type: 'free',
          };
          break;
        case 'promo_code':
          config = {
            code: String(offer.config.code).toUpperCase(),
            discount_type: String(offer.config.discount_type),
            discount_value:
              offer.config.discount_type === 'fixed'
                ? Math.round(Number(offer.config.discount_value) * 100)
                : Number(offer.config.discount_value),
          };
          break;
        case 'threshold_discount':
          config = {
            min_amount: Math.round(Number(offer.config.min_amount) * 100),
            discount_type: String(offer.config.discount_type),
            discount_value:
              offer.config.discount_type === 'fixed'
                ? Math.round(Number(offer.config.discount_value) * 100)
                : Number(offer.config.discount_value),
          };
          break;
      }

      const { error } = await supabase.from('offers').insert({
        foodtruck_id: foodtruck.id,
        name: offer.name,
        offer_type: offer.type,
        config: config,
        is_active: true,
      });

      if (error) throw error;
    }
  }, [foodtruck, state.offers]);

  // Save settings to database
  const saveSettings = useCallback(async () => {
    if (!foodtruck) return;

    const { error } = await supabase
      .from('foodtrucks')
      .update({
        payment_methods: state.settings.payment_methods,
        pickup_slot_interval: state.settings.pickup_slot_interval,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 6, // Completed
      })
      .eq('id', foodtruck.id);

    if (error) throw error;
  }, [foodtruck, state.settings]);

  // Save all data (called when completing onboarding)
  const saveAllData = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      // Save in order with dependencies
      const locationIds = await saveLocations();
      await saveSchedules(locationIds);
      await saveMenu();
      await saveOffers();
      await saveSettings();

      // Refresh foodtruck context
      await refresh();

      return true;
    } catch (err) {
      console.error('Error saving onboarding data:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return false;
    } finally {
      setSaving(false);
    }
  }, [saveLocations, saveSchedules, saveMenu, saveOffers, saveSettings, refresh]);

  // Update onboarding progress in database
  const updateProgress = useCallback(
    async (step: number) => {
      if (!foodtruck) return;

      await supabase.from('foodtrucks').update({ onboarding_step: step }).eq('id', foodtruck.id);
    },
    [foodtruck]
  );

  return {
    saving,
    error,
    saveAllData,
    updateProgress,
    saveLocations,
    saveSchedules,
    saveMenu,
    saveOffers,
    saveSettings,
  };
}
