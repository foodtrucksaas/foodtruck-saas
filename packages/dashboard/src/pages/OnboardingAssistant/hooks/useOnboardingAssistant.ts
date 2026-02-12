import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFoodtruck } from '../../../contexts/FoodtruckContext';
import {
  useOnboarding,
  OnboardingCategory,
  OnboardingLocation,
  OnboardingOffer,
  OnboardingSchedule,
} from '../OnboardingContext';
import type { Json } from '@foodtruck/shared';

export function useOnboardingAssistant() {
  const { foodtruck } = useFoodtruck();
  const { state, dispatch } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const initialLoadDone = useRef(false);

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

  // Load existing data from DB — only once per mount
  useEffect(() => {
    if (!foodtruck || initialLoadDone.current) return;
    initialLoadDone.current = true;

    const loadExistingData = async () => {
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
          // Deduplicate by day_of_week (keep last entry per day)
          const scheduleMap = new Map<number, OnboardingSchedule>();
          for (const s of schedulesData) {
            scheduleMap.set(s.day_of_week, {
              day_of_week: s.day_of_week,
              location_id: s.location_id,
              start_time: s.start_time,
              end_time: s.end_time,
            });
          }
          const schedules = Array.from(scheduleMap.values());
          const selectedDays = [...scheduleMap.keys()];
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
              type: og.is_required ? 'size' : og.is_multiple ? 'supplement' : 'other',
              options: (og.category_options || []).map((opt: any) => ({
                name: opt.name,
                priceModifier: opt.price_modifier,
              })),
            })),
            items: (cat.menu_items || []).map((item: any) => {
              // DB stores price in cents (INTEGER). Onboarding state also uses cents.
              const optionPrices = (item.option_prices || {}) as Record<string, number>;
              // If item has option_prices, map option UUIDs back to option names
              const sizeGroup = (cat.category_option_groups || []).find(
                (og: any) => og.is_required
              );
              const prices: Record<string, number> = {};
              if (sizeGroup && Object.keys(optionPrices).length > 0) {
                const sizeOptions = sizeGroup.category_options || [];
                for (const opt of sizeOptions) {
                  const optPrice = optionPrices[opt.id];
                  if (optPrice !== undefined) {
                    prices[opt.name] = optPrice; // Already in cents
                  }
                }
              }
              // Fallback to base price if no size-specific prices found
              if (Object.keys(prices).length === 0) {
                prices.base = item.price || 0; // Already in cents
              }
              return {
                id: item.id,
                name: item.name,
                description: item.description || undefined,
                prices,
              };
            }),
          }));
          dispatch({ type: 'SET_CATEGORIES', categories });
          dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'done' });
        }

        // Load offers
        const { data: offersData } = await supabase
          .from('offers')
          .select('*')
          .eq('foodtruck_id', foodtruck.id)
          .eq('is_active', true);

        if (offersData && offersData.length > 0) {
          // Also load categories for reverse-mapping bundle/buyX data
          const loadedCategories = categoriesData || [];

          const offers: OnboardingOffer[] = offersData.map((o: any) => {
            const cfg = (o.config || {}) as Record<string, any>;
            // Shared fields from DB columns
            const sharedConfig: Record<string, unknown> = {
              description: o.description || '',
              start_date: o.start_date ? new Date(o.start_date).toISOString().split('T')[0] : '',
              end_date: o.end_date ? new Date(o.end_date).toISOString().split('T')[0] : '',
              time_start: o.time_start ? String(o.time_start).slice(0, 5) : '',
              time_end: o.time_end ? String(o.time_end).slice(0, 5) : '',
            };
            let config: Record<string, unknown> = {};

            switch (o.offer_type) {
              case 'bundle': {
                config = { fixed_price: (cfg.fixed_price || 0) / 100, ...sharedConfig };
                // Reverse-map bundle_categories back to category names and selection
                if (cfg.bundle_categories && Array.isArray(cfg.bundle_categories)) {
                  const catNames: string[] = [];
                  const catIdMap: Record<string, string> = {};
                  const bundleSelection: Record<string, any> = {};

                  for (const bc of cfg.bundle_categories) {
                    const catId = bc.category_ids?.[0];
                    const dbCat = loadedCategories.find((c) => c.id === catId);
                    const catName = bc.label || dbCat?.name || '';
                    if (!catName) continue;
                    catNames.push(catName);
                    if (catId) catIdMap[catName] = catId;

                    // Reverse-map excluded items (IDs → names)
                    const catItems = dbCat?.menu_items || [];
                    const excludedItemNames = (bc.excluded_items || [])
                      .map((id: string) => catItems.find((i: any) => i.id === id)?.name)
                      .filter(Boolean) as string[];

                    // Reverse-map excluded_sizes (itemId → optionUUIDs → optionNames)
                    const excludedOptions: Record<string, string[]> = {};
                    if (bc.excluded_sizes) {
                      const sizeGroup = (dbCat?.category_option_groups || []).find(
                        (og: any) => og.is_required
                      );
                      const idToName: Record<string, string> = {};
                      if (sizeGroup) {
                        for (const opt of sizeGroup.category_options || []) {
                          idToName[opt.id] = opt.name;
                        }
                      }
                      for (const [itemId, optIds] of Object.entries(
                        bc.excluded_sizes as Record<string, string[]>
                      )) {
                        const item = catItems.find((i: any) => i.id === itemId);
                        if (item) {
                          const names = optIds.map((id) => idToName[id]).filter(Boolean);
                          if (names.length > 0) excludedOptions[item.name] = names;
                        }
                      }
                    }

                    // Reverse-map supplements (itemId or itemId:optionId → names)
                    const itemDeltas: Record<string, number> = {};
                    if (bc.supplements) {
                      const sizeGroup = (dbCat?.category_option_groups || []).find(
                        (og: any) => og.is_required
                      );
                      const optIdToName: Record<string, string> = {};
                      if (sizeGroup) {
                        for (const opt of sizeGroup.category_options || []) {
                          optIdToName[opt.id] = opt.name;
                        }
                      }
                      for (const [key, delta] of Object.entries(
                        bc.supplements as Record<string, number>
                      )) {
                        const colonIdx = key.indexOf(':');
                        if (colonIdx > 0) {
                          const itemId = key.substring(0, colonIdx);
                          const optId = key.substring(colonIdx + 1);
                          const item = catItems.find((i: any) => i.id === itemId);
                          const optName = optIdToName[optId];
                          if (item && optName) itemDeltas[`${item.name}:${optName}`] = delta;
                        } else {
                          const item = catItems.find((i: any) => i.id === key);
                          if (item) itemDeltas[item.name] = delta;
                        }
                      }
                    }

                    bundleSelection[catName] = {
                      excluded_items: excludedItemNames,
                      excluded_options: excludedOptions,
                      item_deltas: itemDeltas,
                    };
                  }
                  config.bundle_category_names = catNames;
                  config.bundle_category_ids = catIdMap;
                  config.bundle_selection = bundleSelection;
                }
                break;
              }
              case 'buy_x_get_y': {
                config = {
                  trigger_quantity: cfg.trigger_quantity || 0,
                  reward_quantity: cfg.reward_quantity || 0,
                  ...sharedConfig,
                };
                // Reverse-map trigger/reward category IDs to names
                if (cfg.trigger_category_ids) {
                  const triggerNames = (cfg.trigger_category_ids as string[])
                    .map((id) => loadedCategories.find((c) => c.id === id)?.name)
                    .filter(Boolean) as string[];
                  config.trigger_category_names = triggerNames;

                  // Reverse-map excluded items
                  if (cfg.trigger_excluded_items) {
                    const triggerExcluded: Record<string, string[]> = {};
                    for (const catName of triggerNames) {
                      const dbCat = loadedCategories.find((c) => c.name === catName);
                      if (!dbCat) continue;
                      const catItems = dbCat.menu_items || [];
                      const excludedNames = (cfg.trigger_excluded_items as string[])
                        .map((id) => catItems.find((i: any) => i.id === id)?.name)
                        .filter(Boolean) as string[];
                      if (excludedNames.length > 0) triggerExcluded[catName] = excludedNames;
                    }
                    if (Object.keys(triggerExcluded).length > 0)
                      config.trigger_excluded = triggerExcluded;
                  }
                }
                if (cfg.reward_category_ids) {
                  const rewardNames = (cfg.reward_category_ids as string[])
                    .map((id) => loadedCategories.find((c) => c.id === id)?.name)
                    .filter(Boolean) as string[];
                  config.reward_category_names = rewardNames;

                  if (cfg.reward_excluded_items) {
                    const rewardExcluded: Record<string, string[]> = {};
                    for (const catName of rewardNames) {
                      const dbCat = loadedCategories.find((c) => c.name === catName);
                      if (!dbCat) continue;
                      const catItems = dbCat.menu_items || [];
                      const excludedNames = (cfg.reward_excluded_items as string[])
                        .map((id) => catItems.find((i: any) => i.id === id)?.name)
                        .filter(Boolean) as string[];
                      if (excludedNames.length > 0) rewardExcluded[catName] = excludedNames;
                    }
                    if (Object.keys(rewardExcluded).length > 0)
                      config.reward_excluded = rewardExcluded;
                  }
                }
                break;
              }
              case 'promo_code':
                config = {
                  code: cfg.code || '',
                  discount_type: cfg.discount_type || 'percentage',
                  discount_value:
                    cfg.discount_type === 'fixed'
                      ? (cfg.discount_value || 0) / 100
                      : cfg.discount_value || 0,
                  ...sharedConfig,
                };
                break;
              case 'threshold_discount':
                config = {
                  min_amount: (cfg.min_amount || 0) / 100,
                  discount_type: cfg.discount_type || 'fixed',
                  discount_value:
                    cfg.discount_type === 'fixed'
                      ? (cfg.discount_value || 0) / 100
                      : cfg.discount_value || 0,
                  ...sharedConfig,
                };
                break;
            }

            return {
              type: o.offer_type as OnboardingOffer['type'],
              name: o.name,
              config,
            };
          });
          dispatch({ type: 'SET_OFFERS', offers });
          dispatch({ type: 'SET_WANTS_OFFERS', wants: true });
          dispatch({ type: 'SET_OFFER_SUB_STEP', subStep: 'done' });
        }

        // Restore step progress from database
        const { data: ftData } = await supabase
          .from('foodtrucks')
          .select('onboarding_step')
          .eq('id', foodtruck.id)
          .single();

        const savedStep = ftData?.onboarding_step;
        if (savedStep && savedStep > 1 && savedStep <= 5) {
          for (let i = 1; i < savedStep; i++) {
            dispatch({ type: 'COMPLETE_STEP', step: i });
          }
          dispatch({ type: 'SET_STEP', step: savedStep });
        } else if (savedStep === 6) {
          // Onboarding already completed — start at step 1 for reconfiguration
          for (let i = 1; i <= 5; i++) {
            dispatch({ type: 'COMPLETE_STEP', step: i });
          }
        }
      } catch (err) {
        console.error('Error loading existing data:', err);
      } finally {
        setLoaded(true);
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
    async (locationIds: string[], schedulesOverride?: OnboardingSchedule[]) => {
      if (!foodtruck) return;
      const schedulesToSave = schedulesOverride !== undefined ? schedulesOverride : state.schedules;
      if (schedulesToSave.length === 0) return;

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

      // Insert new schedules (deduplicate by day_of_week, keep last)
      const deduped = new Map<number, OnboardingSchedule>();
      for (const s of schedulesToSave) {
        deduped.set(s.day_of_week, s);
      }
      const schedulesToInsert = Array.from(deduped.values()).map((s) => ({
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
      // Build name→UUID mapping for size options so we can populate option_prices on items
      const optionNameToId: Record<string, string> = {};

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

        // Save options and capture returned IDs
        if (newOg && og.options.length > 0) {
          const optionsToInsert = og.options.map((opt, optIndex) => ({
            option_group_id: newOg.id,
            name: opt.name,
            price_modifier: opt.priceModifier || 0,
            display_order: optIndex,
          }));

          const { data: insertedOptions, error: optError } = await supabase
            .from('category_options')
            .insert(optionsToInsert)
            .select('id, name');
          if (optError) throw optError;

          // For size groups, map option name → UUID for building option_prices
          if (og.type === 'size' && insertedOptions) {
            for (const opt of insertedOptions) {
              optionNameToId[opt.name] = opt.id;
            }
          }
        }
      }

      // Save menu items
      for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
        const item = cat.items[itemIndex];
        const hasBase = 'base' in item.prices;
        const basePriceCents = item.prices['base'] || Object.values(item.prices)[0] || 0;

        // Build option_prices JSONB for items with size-specific prices
        let optionPrices: Record<string, number> | null = null;
        if (!hasBase && Object.keys(optionNameToId).length > 0) {
          optionPrices = {};
          for (const [optName, price] of Object.entries(item.prices)) {
            const optId = optionNameToId[optName];
            if (optId) {
              optionPrices[optId] = price; // Already in cents
            }
          }
        }

        const { error: itemError } = await supabase.from('menu_items').insert({
          foodtruck_id: foodtruck.id,
          category_id: categoryId,
          name: item.name,
          description: item.description || null,
          price: basePriceCents, // DB stores cents (INTEGER), no conversion needed
          display_order: itemIndex,
          is_available: true,
          ...(optionPrices && Object.keys(optionPrices).length > 0
            ? { option_prices: optionPrices }
            : {}),
        });

        if (itemError) throw itemError;
      }
    }
  }, [foodtruck, state.categories]);

  // Save offers to database (delete-then-insert to avoid duplicates on retry)
  const saveOffers = useCallback(
    async (offersOverride?: OnboardingOffer[]) => {
      if (!foodtruck) return;
      const offersToSave = offersOverride !== undefined ? offersOverride : state.offers;

      // When called without override and no offers, skip entirely
      if (offersOverride === undefined && offersToSave.length === 0) return;

      // Remove existing offers created during onboarding
      const { error: deleteError } = await supabase
        .from('offers')
        .delete()
        .eq('foodtruck_id', foodtruck.id);
      if (deleteError) throw deleteError;

      // Nothing to insert (all offers were deleted)
      if (offersToSave.length === 0) return;

      // Pre-fetch categories (with option groups) and items from DB for bundle offers
      const { data: dbCategories } = await supabase
        .from('categories')
        .select(
          'id, name, category_option_groups(id, name, is_required, category_options(id, name))'
        )
        .eq('foodtruck_id', foodtruck.id);
      const { data: dbItems } = await supabase
        .from('menu_items')
        .select('id, name, category_id')
        .eq('foodtruck_id', foodtruck.id);

      for (const offer of offersToSave) {
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

        // Build bundle category_choice config with real IDs
        if (offer.type === 'bundle' && offer.config.bundle_category_names) {
          const catNames = offer.config.bundle_category_names as string[];
          const catIdMap = (offer.config.bundle_category_ids || {}) as Record<string, string>;
          const selection = (offer.config.bundle_selection || {}) as Record<
            string,
            {
              excluded_items?: string[];
              excluded_options?: Record<string, string[]>;
              item_deltas?: Record<string, number>;
            }
          >;
          const bundleCats: Json[] = [];

          for (const catName of catNames) {
            // Try by name first, then fall back to snapshotted ID
            const dbCat =
              dbCategories?.find((c) => c.name === catName) ||
              (catIdMap[catName]
                ? dbCategories?.find((c) => c.id === catIdMap[catName])
                : undefined);
            if (!dbCat) continue;
            const catItems = dbItems?.filter((i) => i.category_id === dbCat.id) || [];
            const sel = selection[catName] || {};
            const excludedItemIds = (sel.excluded_items || [])
              .map((name) => catItems.find((i) => i.name === name)?.id)
              .filter(Boolean) as string[];

            // Build a sizeName→categoryOptionId lookup for this category
            const sizeNameToId: Record<string, string> = {};
            const dbCatFull = dbCat as any;
            if (dbCatFull.category_option_groups) {
              for (const og of dbCatFull.category_option_groups) {
                if (og.is_required && og.category_options) {
                  for (const opt of og.category_options) {
                    sizeNameToId[opt.name] = opt.id;
                  }
                }
              }
            }

            // Map excluded_options (per item name → option names) to excluded_sizes (per item ID → option UUIDs)
            const excludedSizes: Record<string, string[]> = {};
            if (sel.excluded_options) {
              for (const [itemName, optNames] of Object.entries(sel.excluded_options)) {
                const dbItem = catItems.find((i) => i.name === itemName);
                if (dbItem && optNames.length > 0) {
                  // Map option names to category_option UUIDs
                  const optIds = optNames
                    .map((name) => sizeNameToId[name])
                    .filter(Boolean) as string[];
                  if (optIds.length > 0) {
                    excludedSizes[dbItem.id] = optIds;
                  }
                }
              }
            }

            // Map item_deltas (name-based keys) to supplements (itemId or itemId:categoryOptionId keys)
            const supplements: Record<string, number> = {};
            if (sel.item_deltas) {
              for (const [key, delta] of Object.entries(sel.item_deltas)) {
                const colonIdx = key.indexOf(':');
                if (colonIdx > 0) {
                  // Per-size delta: "itemName:sizeName" → "itemId:categoryOptionId"
                  const itemName = key.substring(0, colonIdx);
                  const sizeName = key.substring(colonIdx + 1);
                  const dbItem = catItems.find((i) => i.name === itemName);
                  const optionId = sizeNameToId[sizeName];
                  if (dbItem && optionId && delta > 0) {
                    supplements[`${dbItem.id}:${optionId}`] = delta;
                  }
                } else {
                  // Flat delta: "itemName" → "itemId"
                  const dbItem = catItems.find((i) => i.name === key);
                  if (dbItem && delta > 0) {
                    supplements[dbItem.id] = delta;
                  }
                }
              }
            }

            bundleCats.push({
              category_ids: [dbCat.id],
              quantity: 1,
              label: catName,
              excluded_items: excludedItemIds.length > 0 ? excludedItemIds : undefined,
              excluded_sizes: Object.keys(excludedSizes).length > 0 ? excludedSizes : undefined,
              supplements: Object.keys(supplements).length > 0 ? supplements : undefined,
            });
          }

          config = {
            ...(config as Record<string, unknown>),
            type: 'category_choice',
            bundle_categories: bundleCats,
          };
        }

        // Build buy_x_get_y config with real category IDs (must be BEFORE insert)
        let triggerCatIds: string[] = [];
        let rewardCatIds: string[] = [];
        const triggerExcludedIds: string[] = [];
        const rewardExcludedIds: string[] = [];
        if (offer.type === 'buy_x_get_y' && offer.config.trigger_category_names) {
          const triggerCatNames = offer.config.trigger_category_names as string[];
          const rewardCatNames = (offer.config.reward_category_names || []) as string[];
          triggerCatIds = triggerCatNames
            .map((name) => dbCategories?.find((c) => c.name === name)?.id)
            .filter(Boolean) as string[];
          rewardCatIds = rewardCatNames
            .map((name) => dbCategories?.find((c) => c.name === name)?.id)
            .filter(Boolean) as string[];

          // Map excluded items (names → IDs)
          const triggerExcluded = (offer.config.trigger_excluded || {}) as Record<string, string[]>;
          for (const [catName, itemNames] of Object.entries(triggerExcluded)) {
            const dbCat = dbCategories?.find((c) => c.name === catName);
            if (!dbCat) continue;
            const catItems = dbItems?.filter((i) => i.category_id === dbCat.id) || [];
            for (const name of itemNames) {
              const item = catItems.find((i) => i.name === name);
              if (item) triggerExcludedIds.push(item.id);
            }
          }
          const rewardExcluded = (offer.config.reward_excluded || {}) as Record<string, string[]>;
          for (const [catName, itemNames] of Object.entries(rewardExcluded)) {
            const dbCat = dbCategories?.find((c) => c.name === catName);
            if (!dbCat) continue;
            const catItems = dbItems?.filter((i) => i.category_id === dbCat.id) || [];
            for (const name of itemNames) {
              const item = catItems.find((i) => i.name === name);
              if (item) rewardExcludedIds.push(item.id);
            }
          }

          config = {
            ...(config as Record<string, unknown>),
            trigger_category_ids: triggerCatIds,
            trigger_excluded_items: triggerExcludedIds.length > 0 ? triggerExcludedIds : undefined,
            reward_category_ids: rewardCatIds,
            reward_excluded_items: rewardExcludedIds.length > 0 ? rewardExcludedIds : undefined,
          };
        }

        const { data: offerData, error } = await supabase
          .from('offers')
          .insert({
            foodtruck_id: foodtruck.id,
            name: offer.name,
            description: offer.config.description ? String(offer.config.description) : null,
            offer_type: offer.type,
            config: config,
            is_active: true,
            start_date: offer.config.start_date
              ? new Date(String(offer.config.start_date)).toISOString()
              : null,
            end_date: offer.config.end_date
              ? new Date(String(offer.config.end_date)).toISOString()
              : null,
            time_start: offer.config.time_start ? String(offer.config.time_start) : null,
            time_end: offer.config.time_end ? String(offer.config.time_end) : null,
          })
          .select('id')
          .single();

        if (error) throw error;

        // Insert offer_items for buy_x_get_y (needs offerData.id, so must be after insert)
        if (offer.type === 'buy_x_get_y' && offerData && triggerCatIds.length > 0) {
          const offerItems: {
            offer_id: string;
            menu_item_id: string;
            role: string;
            quantity: number;
          }[] = [];
          for (const catId of triggerCatIds) {
            const catItems = dbItems?.filter((i) => i.category_id === catId) || [];
            for (const item of catItems) {
              if (!triggerExcludedIds.includes(item.id)) {
                offerItems.push({
                  offer_id: offerData.id,
                  menu_item_id: item.id,
                  role: 'trigger',
                  quantity: 1,
                });
              }
            }
          }
          for (const catId of rewardCatIds) {
            const catItems = dbItems?.filter((i) => i.category_id === catId) || [];
            for (const item of catItems) {
              if (!rewardExcludedIds.includes(item.id)) {
                offerItems.push({
                  offer_id: offerData.id,
                  menu_item_id: item.id,
                  role: 'reward',
                  quantity: 1,
                });
              }
            }
          }
          if (offerItems.length > 0) {
            const { error: itemsError } = await (supabase.from('offer_items') as any).insert(
              offerItems
            );
            if (itemsError) throw itemsError;
          }
        }

        // Insert offer_items for bundles (all non-excluded items)
        if (offer.type === 'bundle' && offerData && offer.config.bundle_category_names) {
          const catNames = offer.config.bundle_category_names as string[];
          const catIdMap2 = (offer.config.bundle_category_ids || {}) as Record<string, string>;
          const selection = (offer.config.bundle_selection || {}) as Record<
            string,
            { excluded_items?: string[] }
          >;
          const offerItems: {
            offer_id: string;
            menu_item_id: string;
            role: string;
            quantity: number;
          }[] = [];

          for (const catName of catNames) {
            const dbCat =
              dbCategories?.find((c) => c.name === catName) ||
              (catIdMap2[catName]
                ? dbCategories?.find((c) => c.id === catIdMap2[catName])
                : undefined);
            if (!dbCat) continue;
            const catItems = dbItems?.filter((i) => i.category_id === dbCat.id) || [];
            const excludedNames = selection[catName]?.excluded_items || [];

            for (const item of catItems) {
              if (!excludedNames.includes(item.name)) {
                offerItems.push({
                  offer_id: offerData.id,
                  menu_item_id: item.id,
                  role: 'bundle_item',
                  quantity: 1,
                });
              }
            }
          }

          if (offerItems.length > 0) {
            const { error: itemsError } = await (supabase.from('offer_items') as any).insert(
              offerItems
            );
            if (itemsError) throw itemsError;
          }
        }
      }
    },
    [foodtruck, state.offers, state.categories]
  );

  // Save settings to database
  const saveSettings = useCallback(async () => {
    if (!foodtruck) return;

    const { error } = await supabase
      .from('foodtrucks')
      .update({
        payment_methods: state.settings.payment_methods,
        pickup_slot_interval: state.settings.pickup_slot_interval,
        description: state.settings.description || null,
        loyalty_enabled: state.settings.loyalty_enabled,
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

      return true;
    } catch (err) {
      console.error('Error saving onboarding data:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      return false;
    } finally {
      setSaving(false);
    }
  }, [saveLocations, saveSchedules, saveMenu, saveOffers, saveSettings]);

  // Save data for a specific completed step
  const saveStepData = useCallback(
    async (completedStep: number) => {
      try {
        switch (completedStep) {
          case 1:
            // Locations are already saved immediately in Step1
            break;
          case 2:
            if (state.schedules.length > 0 && state.locations.length > 0) {
              const locationIds = state.locations.map((l) => l.id).filter(Boolean) as string[];
              if (locationIds.length > 0) {
                await saveSchedules(locationIds);
              }
            }
            break;
          case 3:
            if (state.categories.length > 0) {
              await saveMenu();
            }
            break;
          case 4:
            if (state.offers.length > 0) {
              await saveOffers();
            }
            break;
          case 5:
            await saveSettings();
            break;
        }
      } catch (err) {
        console.error(`Error saving step ${completedStep} data:`, err);
      }
    },
    [
      state.schedules,
      state.locations,
      state.categories,
      state.offers,
      saveSchedules,
      saveMenu,
      saveOffers,
      saveSettings,
    ]
  );

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
    loaded,
    saveAllData,
    updateProgress,
    saveStepData,
    saveLocations,
    saveSchedules,
    saveMenu,
    saveOffers,
    saveSettings,
  };
}
