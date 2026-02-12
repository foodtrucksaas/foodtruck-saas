import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import type { ReactNode } from 'react';
import React from 'react';

// Wrapper component for testing
const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(OnboardingProvider, null, children);

describe('OnboardingContext', () => {
  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      expect(result.current.state.currentStep).toBe(1);
      expect(result.current.state.currentSubStep).toBe(0);
      expect(result.current.state.completedSteps).toEqual([]);
      expect(result.current.state.foodtruck).toBeNull();
      expect(result.current.state.locations).toEqual([]);
      expect(result.current.state.selectedDays).toEqual([]);
      expect(result.current.state.schedules).toEqual([]);
      expect(result.current.state.categories).toEqual([]);
      expect(result.current.state.offers).toEqual([]);
      expect(result.current.state.settings.payment_methods).toEqual(['cash', 'card']);
      expect(result.current.state.settings.pickup_slot_interval).toBe(15);
    });

    it('should have correct initial location state', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      expect(result.current.state.currentLocation).toEqual({
        name: '',
        address: '',
        latitude: null,
        longitude: null,
        google_place_id: '',
      });
      expect(result.current.state.showAddAnother).toBe(false);
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to next step', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe(2);
      expect(result.current.state.completedSteps).toContain(1);
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.nextStep();
        result.current.nextStep();
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe(2);
    });

    it('should not go below step 1', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe(1);
    });

    it('should go to specific step', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.state.currentStep).toBe(3);
    });

    it('should track completed steps', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.nextStep();
      });
      act(() => {
        result.current.nextStep();
      });
      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.completedSteps).toEqual([1, 2, 3]);
    });

    it('should not duplicate completed steps', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'COMPLETE_STEP', step: 1 });
        result.current.dispatch({ type: 'COMPLETE_STEP', step: 1 });
      });

      expect(result.current.state.completedSteps).toEqual([1]);
    });
  });

  describe('Foodtruck State', () => {
    it('should set foodtruck', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const foodtruck = { id: 'ft-1', name: 'Test Truck', slug: 'test-truck' };

      act(() => {
        result.current.dispatch({ type: 'SET_FOODTRUCK', foodtruck });
      });

      expect(result.current.state.foodtruck).toEqual(foodtruck);
    });
  });

  describe('Locations', () => {
    it('should add location', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const location = {
        name: 'Marche Central',
        address: '1 Place du Marche',
        latitude: 48.8566,
        longitude: 2.3522,
        google_place_id: 'place-123',
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_LOCATION', location });
      });

      expect(result.current.state.locations).toHaveLength(1);
      expect(result.current.state.locations[0]).toEqual(location);
      expect(result.current.state.showAddAnother).toBe(true);
      expect(result.current.state.currentLocation.name).toBe('');
    });

    it('should update current location', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_CURRENT_LOCATION',
          location: { name: 'New Name', address: '123 Street' },
        });
      });

      expect(result.current.state.currentLocation.name).toBe('New Name');
      expect(result.current.state.currentLocation.address).toBe('123 Street');
    });

    it('should reset current location', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_CURRENT_LOCATION',
          location: { name: 'Test', address: 'Test Address' },
        });
        result.current.dispatch({ type: 'SET_SHOW_ADD_ANOTHER', show: true });
        result.current.dispatch({ type: 'RESET_CURRENT_LOCATION' });
      });

      expect(result.current.state.currentLocation.name).toBe('');
      expect(result.current.state.currentLocation.address).toBe('');
      expect(result.current.state.showAddAnother).toBe(false);
    });

    it('should set locations', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const locations = [
        {
          id: 'loc-1',
          name: 'Location 1',
          address: 'Addr 1',
          latitude: 48.8,
          longitude: 2.3,
          google_place_id: 'p1',
        },
        {
          id: 'loc-2',
          name: 'Location 2',
          address: 'Addr 2',
          latitude: 48.9,
          longitude: 2.4,
          google_place_id: 'p2',
        },
      ];

      act(() => {
        result.current.dispatch({ type: 'SET_LOCATIONS', locations });
      });

      expect(result.current.state.locations).toHaveLength(2);
      expect(result.current.state.locations).toEqual(locations);
    });
  });

  describe('Schedule', () => {
    it('should set selected days', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'SET_SELECTED_DAYS', days: [1, 3, 5] });
      });

      expect(result.current.state.selectedDays).toEqual([1, 3, 5]);
    });

    it('should add schedule', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const schedule = {
        day_of_week: 1,
        location_id: 'loc-1',
        start_time: '11:00',
        end_time: '14:00',
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_SCHEDULE', schedule });
      });

      expect(result.current.state.schedules).toHaveLength(1);
      expect(result.current.state.schedules[0]).toEqual(schedule);
    });

    it('should set schedules', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const schedules = [
        { day_of_week: 1, location_id: 'loc-1', start_time: '11:00', end_time: '14:00' },
        { day_of_week: 3, location_id: 'loc-1', start_time: '18:00', end_time: '22:00' },
      ];

      act(() => {
        result.current.dispatch({ type: 'SET_SCHEDULES', schedules });
      });

      expect(result.current.state.schedules).toEqual(schedules);
    });

    it('should set current day index', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'SET_CURRENT_DAY_INDEX', index: 2 });
      });

      expect(result.current.state.currentDayIndex).toBe(2);
    });
  });

  describe('Menu Categories', () => {
    it('should add category', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
      });

      expect(result.current.state.categories).toHaveLength(1);
      expect(result.current.state.categories[0]).toEqual(category);
      expect(result.current.state.currentCategory).toEqual(category);
    });

    it('should update current category', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'UPDATE_CURRENT_CATEGORY',
          category: { name: 'Burgers' },
        });
      });

      expect(result.current.state.currentCategory?.name).toBe('Burgers');
    });

    it('should add item to category', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [],
      };
      const item = {
        id: 'item-1',
        name: 'Margherita',
        prices: { base: 1200 },
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'ADD_ITEM_TO_CATEGORY',
          categoryId: 'cat-1',
          item,
        });
      });

      expect(result.current.state.categories[0].items).toHaveLength(1);
      expect(result.current.state.categories[0].items[0]).toEqual(item);
      expect(result.current.state.currentCategory?.items).toHaveLength(1);
    });

    it('should add option group to category', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [],
      };
      const optionGroup = {
        id: 'og-1',
        name: 'Taille',
        type: 'size' as const,
        options: [{ name: 'S' }, { name: 'M' }, { name: 'L' }],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'ADD_OPTION_GROUP_TO_CATEGORY',
          categoryId: 'cat-1',
          optionGroup,
        });
      });

      expect(result.current.state.categories[0].optionGroups).toHaveLength(1);
      expect(result.current.state.categories[0].optionGroups[0]).toEqual(optionGroup);
    });

    it('should finalize category', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [{ id: 'item-1', name: 'Margherita', prices: { base: 1200 } }],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
      });

      expect(result.current.state.currentCategory).toBeNull();
      expect(result.current.state.menuSubStep).toBe('done');
    });

    it('should set menu sub step', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'SET_MENU_SUB_STEP', subStep: 'options' });
      });

      expect(result.current.state.menuSubStep).toBe('options');
    });
  });

  describe('Offers', () => {
    it('should set wants offers', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'SET_WANTS_OFFERS', wants: true });
      });

      expect(result.current.state.wantsOffers).toBe(true);
    });

    it('should add offer', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const offer = {
        type: 'promo_code' as const,
        name: 'BIENVENUE',
        config: { code: 'BIENVENUE', discount_type: 'percentage', discount_value: 10 },
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_OFFER', offer });
      });

      expect(result.current.state.offers).toHaveLength(1);
      expect(result.current.state.offers[0]).toEqual(offer);
    });

    it('should set offers', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const offers = [
        { type: 'promo_code' as const, name: 'CODE1', config: {} },
        { type: 'bundle' as const, name: 'Menu Midi', config: { fixed_price: 1200 } },
      ];

      act(() => {
        result.current.dispatch({ type: 'SET_OFFERS', offers });
      });

      expect(result.current.state.offers).toEqual(offers);
    });
  });

  describe('Settings', () => {
    it('should update settings', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_SETTINGS',
          settings: {
            payment_methods: ['cash', 'card', 'contactless'],
            pickup_slot_interval: 20,
          },
        });
      });

      expect(result.current.state.settings.payment_methods).toEqual([
        'cash',
        'card',
        'contactless',
      ]);
      expect(result.current.state.settings.pickup_slot_interval).toBe(20);
    });

    it('should partially update settings', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'UPDATE_SETTINGS',
          settings: { pickup_slot_interval: 30 },
        });
      });

      expect(result.current.state.settings.payment_methods).toEqual(['cash', 'card']);
      expect(result.current.state.settings.pickup_slot_interval).toBe(30);
    });
  });

  describe('Reset State', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Modify state
      act(() => {
        result.current.dispatch({
          type: 'SET_FOODTRUCK',
          foodtruck: { id: '1', name: 'Test', slug: 'test' },
        });
        result.current.dispatch({ type: 'SET_SELECTED_DAYS', days: [1, 2, 3] });
        result.current.nextStep();
      });

      // Reset
      act(() => {
        result.current.dispatch({ type: 'RESET_STATE' });
      });

      expect(result.current.state.currentStep).toBe(1);
      expect(result.current.state.foodtruck).toBeNull();
      expect(result.current.state.selectedDays).toEqual([]);
      expect(result.current.state.completedSteps).toEqual([]);
    });
  });

  describe('Load State', () => {
    it('should load partial state', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'LOAD_STATE',
          state: {
            currentStep: 3,
            selectedDays: [1, 3, 5],
          },
        });
      });

      expect(result.current.state.currentStep).toBe(3);
      expect(result.current.state.selectedDays).toEqual([1, 3, 5]);
      // Other state should remain as initial
      expect(result.current.state.locations).toEqual([]);
    });
  });

  describe('Replace Option Group in Category', () => {
    it('should replace existing option group by id', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [
          {
            id: 'og-1',
            name: 'Taille',
            type: 'size' as const,
            options: [{ name: 'S' }, { name: 'M' }],
          },
        ],
        items: [],
      };
      const updatedGroup = {
        id: 'og-1-new',
        name: 'Taille',
        type: 'size' as const,
        options: [{ name: 'S' }, { name: 'M' }, { name: 'L' }],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'REPLACE_OPTION_GROUP_IN_CATEGORY',
          categoryId: 'cat-1',
          oldGroupId: 'og-1',
          optionGroup: updatedGroup,
        });
      });

      expect(result.current.state.categories[0].optionGroups).toHaveLength(1);
      expect(result.current.state.categories[0].optionGroups[0]).toEqual(updatedGroup);
      expect(result.current.state.currentCategory?.optionGroups[0]).toEqual(updatedGroup);
    });

    it('should not affect other option groups', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [
          { id: 'og-1', name: 'Taille', type: 'size' as const, options: [{ name: 'S' }] },
          {
            id: 'og-2',
            name: 'Supplements',
            type: 'supplement' as const,
            options: [{ name: 'Fromage' }],
          },
        ],
        items: [],
      };
      const updatedGroup = {
        id: 'og-1-new',
        name: 'Taille',
        type: 'size' as const,
        options: [{ name: 'S' }, { name: 'M' }, { name: 'L' }],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'REPLACE_OPTION_GROUP_IN_CATEGORY',
          categoryId: 'cat-1',
          oldGroupId: 'og-1',
          optionGroup: updatedGroup,
        });
      });

      expect(result.current.state.categories[0].optionGroups).toHaveLength(2);
      expect(result.current.state.categories[0].optionGroups[0]).toEqual(updatedGroup);
      expect(result.current.state.categories[0].optionGroups[1].id).toBe('og-2');
    });

    it('should not affect other categories', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const cat1 = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [
          { id: 'og-1', name: 'Taille', type: 'size' as const, options: [{ name: 'S' }] },
        ],
        items: [],
      };
      const cat2 = {
        id: 'cat-2',
        name: 'Boissons',
        optionGroups: [
          { id: 'og-2', name: 'Taille', type: 'size' as const, options: [{ name: '33cl' }] },
        ],
        items: [],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category: cat1 });
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
        result.current.dispatch({ type: 'ADD_CATEGORY', category: cat2 });
        result.current.dispatch({
          type: 'REPLACE_OPTION_GROUP_IN_CATEGORY',
          categoryId: 'cat-1',
          oldGroupId: 'og-1',
          optionGroup: {
            id: 'og-1-new',
            name: 'Taille',
            type: 'size' as const,
            options: [{ name: 'S' }, { name: 'M' }],
          },
        });
      });

      // cat-2 should be untouched
      expect(result.current.state.categories[1].optionGroups[0].options).toHaveLength(1);
      expect(result.current.state.categories[1].optionGroups[0].options[0].name).toBe('33cl');
    });
  });

  describe('Update Item in Category', () => {
    it('should update item by id in categories and currentCategory', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [
          { id: 'item-1', name: 'Margherita', prices: { base: 1000 } },
          { id: 'item-2', name: 'Napoli', prices: { base: 1200 } },
        ],
      };
      const updatedItem = {
        id: 'item-1',
        name: 'Margherita XL',
        prices: { S: 1000, M: 1200, L: 1500 },
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'UPDATE_ITEM_IN_CATEGORY',
          categoryId: 'cat-1',
          item: updatedItem,
        });
      });

      expect(result.current.state.categories[0].items[0]).toEqual(updatedItem);
      expect(result.current.state.categories[0].items[1].name).toBe('Napoli');
      expect(result.current.state.currentCategory?.items[0]).toEqual(updatedItem);
    });

    it('should not update items in other categories', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const cat1 = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [{ id: 'item-1', name: 'Margherita', prices: { base: 1000 } }],
      };
      const cat2 = {
        id: 'cat-2',
        name: 'Desserts',
        optionGroups: [],
        items: [{ id: 'item-2', name: 'Tiramisu', prices: { base: 600 } }],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category: cat1 });
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
        result.current.dispatch({ type: 'ADD_CATEGORY', category: cat2 });
        result.current.dispatch({
          type: 'UPDATE_ITEM_IN_CATEGORY',
          categoryId: 'cat-1',
          item: { id: 'item-1', name: 'Margherita XXL', prices: { base: 2000 } },
        });
      });

      expect(result.current.state.categories[0].items[0].name).toBe('Margherita XXL');
      expect(result.current.state.categories[1].items[0].name).toBe('Tiramisu');
    });
  });

  describe('Remove Item from Category', () => {
    it('should remove item by id from categories and currentCategory', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [
          { id: 'item-1', name: 'Margherita', prices: { base: 1000 } },
          { id: 'item-2', name: 'Napoli', prices: { base: 1200 } },
        ],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'REMOVE_ITEM_FROM_CATEGORY',
          categoryId: 'cat-1',
          itemId: 'item-1',
        });
      });

      expect(result.current.state.categories[0].items).toHaveLength(1);
      expect(result.current.state.categories[0].items[0].id).toBe('item-2');
      expect(result.current.state.currentCategory?.items).toHaveLength(1);
    });

    it('should handle removing last item', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [{ id: 'item-1', name: 'Margherita', prices: { base: 1000 } }],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'REMOVE_ITEM_FROM_CATEGORY',
          categoryId: 'cat-1',
          itemId: 'item-1',
        });
      });

      expect(result.current.state.categories[0].items).toHaveLength(0);
    });
  });

  describe('Remove Category', () => {
    it('should remove category by id', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        });
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-2', name: 'Desserts', optionGroups: [], items: [] },
        });
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
        result.current.dispatch({ type: 'REMOVE_CATEGORY', categoryId: 'cat-1' });
      });

      expect(result.current.state.categories).toHaveLength(1);
      expect(result.current.state.categories[0].id).toBe('cat-2');
    });

    it('should clear currentCategory if removed category is current', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        });
        result.current.dispatch({ type: 'REMOVE_CATEGORY', categoryId: 'cat-1' });
      });

      expect(result.current.state.currentCategory).toBeNull();
      expect(result.current.state.categories).toHaveLength(0);
    });

    it('should not affect currentCategory if different category is removed', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        });
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-2', name: 'Desserts', optionGroups: [], items: [] },
        });
        result.current.dispatch({ type: 'REMOVE_CATEGORY', categoryId: 'cat-1' });
      });

      expect(result.current.state.currentCategory?.id).toBe('cat-2');
    });
  });

  describe('Set Current Category', () => {
    it('should set current category', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] };

      act(() => {
        result.current.dispatch({ type: 'SET_CURRENT_CATEGORY', category });
      });

      expect(result.current.state.currentCategory).toEqual(category);
    });

    it('should set current category to null', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        });
        result.current.dispatch({ type: 'SET_CURRENT_CATEGORY', category: null });
      });

      expect(result.current.state.currentCategory).toBeNull();
    });
  });

  describe('Option Groups with Price Modifiers', () => {
    it('should preserve priceModifier on options', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [],
        items: [],
      };
      const optionGroup = {
        id: 'og-1',
        name: 'Supplements',
        type: 'supplement' as const,
        options: [
          { name: 'Fromage', priceModifier: 150 },
          { name: 'Jambon', priceModifier: 200 },
          { name: 'Olives', priceModifier: 100 },
        ],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'ADD_OPTION_GROUP_TO_CATEGORY',
          categoryId: 'cat-1',
          optionGroup,
        });
      });

      const options = result.current.state.categories[0].optionGroups[0].options;
      expect(options[0].priceModifier).toBe(150);
      expect(options[1].priceModifier).toBe(200);
      expect(options[2].priceModifier).toBe(100);
    });

    it('should preserve priceModifier when replacing option group', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const category = {
        id: 'cat-1',
        name: 'Pizzas',
        optionGroups: [
          {
            id: 'og-1',
            name: 'Supplements',
            type: 'supplement' as const,
            options: [{ name: 'Fromage', priceModifier: 150 }],
          },
        ],
        items: [],
      };
      const updatedGroup = {
        id: 'og-1-new',
        name: 'Supplements',
        type: 'supplement' as const,
        options: [
          { name: 'Fromage', priceModifier: 150 },
          { name: 'Jambon', priceModifier: 200 },
        ],
      };

      act(() => {
        result.current.dispatch({ type: 'ADD_CATEGORY', category });
        result.current.dispatch({
          type: 'REPLACE_OPTION_GROUP_IN_CATEGORY',
          categoryId: 'cat-1',
          oldGroupId: 'og-1',
          optionGroup: updatedGroup,
        });
      });

      const options = result.current.state.categories[0].optionGroups[0].options;
      expect(options).toHaveLength(2);
      expect(options[0].priceModifier).toBe(150);
      expect(options[1].priceModifier).toBe(200);
    });
  });

  describe('Finalize Category - Update Path', () => {
    it('should update existing category when finalizing', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        });
      });

      // Modify current category
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM_TO_CATEGORY',
          categoryId: 'cat-1',
          item: { id: 'item-1', name: 'Margherita', prices: { base: 1000 } },
        });
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
      });

      expect(result.current.state.categories).toHaveLength(1);
      expect(result.current.state.categories[0].items).toHaveLength(1);
      expect(result.current.state.currentCategory).toBeNull();
      expect(result.current.state.menuSubStep).toBe('done');
    });

    it('should do nothing when no currentCategory', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
      });

      expect(result.current.state.categories).toHaveLength(0);
      expect(result.current.state.currentCategory).toBeNull();
    });
  });

  describe('Update Current Category with null', () => {
    it('should set currentCategory to null when category is null', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        });
        result.current.dispatch({ type: 'UPDATE_CURRENT_CATEGORY', category: null });
      });

      expect(result.current.state.currentCategory).toBeNull();
    });

    it('should set currentCategory to null when no current category exists', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({ type: 'UPDATE_CURRENT_CATEGORY', category: { name: 'Test' } });
      });

      // When currentCategory is null and action.category is not null, it should remain null
      expect(result.current.state.currentCategory).toBeNull();
    });
  });

  describe('Set Categories', () => {
    it('should replace all categories', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });
      const categories = [
        { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        { id: 'cat-2', name: 'Desserts', optionGroups: [], items: [] },
        { id: 'cat-3', name: 'Boissons', optionGroups: [], items: [] },
      ];

      act(() => {
        // Add some initial categories
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'old', name: 'Old', optionGroups: [], items: [] },
        });
        // Then replace all
        result.current.dispatch({ type: 'SET_CATEGORIES', categories });
      });

      expect(result.current.state.categories).toHaveLength(3);
      expect(result.current.state.categories).toEqual(categories);
    });
  });

  describe('Multiple Locations', () => {
    it('should add multiple locations sequentially', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        result.current.dispatch({
          type: 'ADD_LOCATION',
          location: {
            name: 'Marche 1',
            address: 'Addr 1',
            latitude: 48.8,
            longitude: 2.3,
            google_place_id: 'p1',
          },
        });
        result.current.dispatch({
          type: 'ADD_LOCATION',
          location: {
            name: 'Marche 2',
            address: 'Addr 2',
            latitude: 48.9,
            longitude: 2.4,
            google_place_id: 'p2',
          },
        });
      });

      expect(result.current.state.locations).toHaveLength(2);
      expect(result.current.state.locations[0].name).toBe('Marche 1');
      expect(result.current.state.locations[1].name).toBe('Marche 2');
    });
  });

  describe('Complex Workflows', () => {
    it('should handle full menu creation workflow', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      act(() => {
        // Create category
        result.current.dispatch({
          type: 'ADD_CATEGORY',
          category: { id: 'cat-1', name: 'Pizzas', optionGroups: [], items: [] },
        });

        // Add size option group
        result.current.dispatch({
          type: 'ADD_OPTION_GROUP_TO_CATEGORY',
          categoryId: 'cat-1',
          optionGroup: {
            id: 'og-1',
            name: 'Taille',
            type: 'size',
            options: [{ name: 'S' }, { name: 'M' }, { name: 'L' }],
          },
        });

        // Add supplement option group
        result.current.dispatch({
          type: 'ADD_OPTION_GROUP_TO_CATEGORY',
          categoryId: 'cat-1',
          optionGroup: {
            id: 'og-2',
            name: 'Supplements',
            type: 'supplement',
            options: [
              { name: 'Fromage', priceModifier: 150 },
              { name: 'Jambon', priceModifier: 200 },
            ],
          },
        });

        // Add items
        result.current.dispatch({
          type: 'ADD_ITEM_TO_CATEGORY',
          categoryId: 'cat-1',
          item: { id: 'item-1', name: 'Margherita', prices: { S: 800, M: 1000, L: 1200 } },
        });
        result.current.dispatch({
          type: 'ADD_ITEM_TO_CATEGORY',
          categoryId: 'cat-1',
          item: { id: 'item-2', name: 'Napoli', prices: { S: 900, M: 1100, L: 1300 } },
        });

        // Finalize
        result.current.dispatch({ type: 'FINALIZE_CATEGORY' });
      });

      expect(result.current.state.categories).toHaveLength(1);
      expect(result.current.state.categories[0].optionGroups).toHaveLength(2);
      expect(result.current.state.categories[0].items).toHaveLength(2);
      expect(result.current.state.currentCategory).toBeNull();
      expect(result.current.state.menuSubStep).toBe('done');
    });

    it('should handle full step navigation workflow', () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      // Navigate through all 5 steps
      act(() => {
        result.current.nextStep();
      }); // 1 → 2
      act(() => {
        result.current.nextStep();
      }); // 2 → 3
      act(() => {
        result.current.nextStep();
      }); // 3 → 4
      act(() => {
        result.current.nextStep();
      }); // 4 → 5
      act(() => {
        result.current.nextStep();
      }); // 5 → 6 (complete)

      expect(result.current.state.currentStep).toBe(6);
      expect(result.current.state.completedSteps).toEqual([1, 2, 3, 4, 5]);

      // Go back to step 3
      act(() => {
        result.current.goToStep(3);
      });

      expect(result.current.state.currentStep).toBe(3);
      // Completed steps should still include all previously completed
      expect(result.current.state.completedSteps).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

describe('useOnboarding without provider', () => {
  it('should throw error when used outside provider', () => {
    expect(() => {
      renderHook(() => useOnboarding());
    }).toThrow('useOnboarding must be used within an OnboardingProvider');
  });
});
