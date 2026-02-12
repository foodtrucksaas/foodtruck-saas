import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';

const SESSION_KEY = 'onboarding-state';

export function clearOnboardingSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

// Types for onboarding state
export interface OnboardingLocation {
  id?: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string;
}

export interface OnboardingSchedule {
  day_of_week: number;
  location_id: string;
  start_time: string;
  end_time: string;
}

export interface OnboardingOptionGroup {
  id: string;
  name: string;
  type: 'size' | 'supplement' | 'other';
  options: { name: string; priceModifier?: number }[];
}

export interface OnboardingItem {
  id: string;
  name: string;
  prices: Record<string, number>; // optionName -> price (for size options) OR 'base' -> basePrice
}

export interface OnboardingCategory {
  id: string;
  name: string;
  optionGroups: OnboardingOptionGroup[];
  items: OnboardingItem[];
}

export interface OnboardingOffer {
  type: 'bundle' | 'buy_x_get_y' | 'promo_code' | 'threshold_discount';
  name: string;
  config: Record<string, unknown>;
}

export interface OnboardingSettings {
  payment_methods: string[];
  pickup_slot_interval: number;
}

export interface OnboardingState {
  // Progress tracking
  currentStep: number;
  currentSubStep: number;
  completedSteps: number[];

  // Step 0: Foodtruck (created before this flow starts)
  foodtruck: {
    id: string;
    name: string;
    slug: string;
  } | null;

  // Step 1: Locations
  locations: OnboardingLocation[];
  currentLocation: OnboardingLocation;
  showAddAnother: boolean;

  // Step 2: Schedule
  selectedDays: number[];
  schedules: OnboardingSchedule[];
  currentDayIndex: number;

  // Step 3: Menu
  categories: OnboardingCategory[];
  currentCategory: OnboardingCategory | null;
  menuSubStep: 'category' | 'options' | 'items' | 'done';

  // Step 4: Offers
  offers: OnboardingOffer[];
  wantsOffers: boolean | null;

  // Step 5: Settings
  settings: OnboardingSettings;
}

type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_SUB_STEP'; subStep: number }
  | { type: 'COMPLETE_STEP'; step: number }
  | { type: 'SET_FOODTRUCK'; foodtruck: OnboardingState['foodtruck'] }
  // Locations
  | { type: 'ADD_LOCATION'; location: OnboardingLocation }
  | { type: 'UPDATE_CURRENT_LOCATION'; location: Partial<OnboardingLocation> }
  | { type: 'SET_SHOW_ADD_ANOTHER'; show: boolean }
  | { type: 'RESET_CURRENT_LOCATION' }
  | { type: 'SET_LOCATIONS'; locations: OnboardingLocation[] }
  // Schedule
  | { type: 'SET_SELECTED_DAYS'; days: number[] }
  | { type: 'ADD_SCHEDULE'; schedule: OnboardingSchedule }
  | { type: 'SET_SCHEDULES'; schedules: OnboardingSchedule[] }
  | { type: 'SET_CURRENT_DAY_INDEX'; index: number }
  // Menu
  | { type: 'SET_MENU_SUB_STEP'; subStep: OnboardingState['menuSubStep'] }
  | { type: 'ADD_CATEGORY'; category: OnboardingCategory }
  | { type: 'UPDATE_CURRENT_CATEGORY'; category: Partial<OnboardingCategory> | null }
  | { type: 'SET_CURRENT_CATEGORY'; category: OnboardingCategory | null }
  | { type: 'ADD_ITEM_TO_CATEGORY'; categoryId: string; item: OnboardingItem }
  | { type: 'UPDATE_ITEM_IN_CATEGORY'; categoryId: string; item: OnboardingItem }
  | { type: 'REMOVE_ITEM_FROM_CATEGORY'; categoryId: string; itemId: string }
  | { type: 'ADD_OPTION_GROUP_TO_CATEGORY'; categoryId: string; optionGroup: OnboardingOptionGroup }
  | {
      type: 'REPLACE_OPTION_GROUP_IN_CATEGORY';
      categoryId: string;
      oldGroupId: string;
      optionGroup: OnboardingOptionGroup;
    }
  | { type: 'REMOVE_CATEGORY'; categoryId: string }
  | { type: 'FINALIZE_CATEGORY' }
  | { type: 'SET_CATEGORIES'; categories: OnboardingCategory[] }
  // Offers
  | { type: 'SET_WANTS_OFFERS'; wants: boolean | null }
  | { type: 'ADD_OFFER'; offer: OnboardingOffer }
  | { type: 'SET_OFFERS'; offers: OnboardingOffer[] }
  // Settings
  | { type: 'UPDATE_SETTINGS'; settings: Partial<OnboardingSettings> }
  // Reset
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_STATE'; state: Partial<OnboardingState> };

const initialLocation: OnboardingLocation = {
  name: '',
  address: '',
  latitude: null,
  longitude: null,
  google_place_id: '',
};

const initialState: OnboardingState = {
  currentStep: 1,
  currentSubStep: 0,
  completedSteps: [],
  foodtruck: null,
  locations: [],
  currentLocation: { ...initialLocation },
  showAddAnother: false,
  selectedDays: [],
  schedules: [],
  currentDayIndex: 0,
  categories: [],
  currentCategory: null,
  menuSubStep: 'category',
  offers: [],
  wantsOffers: null,
  settings: {
    payment_methods: ['cash', 'card'],
    pickup_slot_interval: 15,
  },
};

function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };

    case 'SET_SUB_STEP':
      return { ...state, currentSubStep: action.subStep };

    case 'COMPLETE_STEP':
      if (state.completedSteps.includes(action.step)) {
        return state;
      }
      return { ...state, completedSteps: [...state.completedSteps, action.step] };

    case 'SET_FOODTRUCK':
      return { ...state, foodtruck: action.foodtruck };

    // Locations
    case 'ADD_LOCATION':
      return {
        ...state,
        locations: [...state.locations, action.location],
        currentLocation: { ...initialLocation },
        showAddAnother: true,
      };

    case 'UPDATE_CURRENT_LOCATION':
      return {
        ...state,
        currentLocation: { ...state.currentLocation, ...action.location },
      };

    case 'SET_SHOW_ADD_ANOTHER':
      return { ...state, showAddAnother: action.show };

    case 'RESET_CURRENT_LOCATION':
      return { ...state, currentLocation: { ...initialLocation }, showAddAnother: false };

    case 'SET_LOCATIONS':
      return { ...state, locations: action.locations };

    // Schedule
    case 'SET_SELECTED_DAYS':
      return { ...state, selectedDays: action.days };

    case 'ADD_SCHEDULE':
      return { ...state, schedules: [...state.schedules, action.schedule] };

    case 'SET_SCHEDULES':
      return { ...state, schedules: action.schedules };

    case 'SET_CURRENT_DAY_INDEX':
      return { ...state, currentDayIndex: action.index };

    // Menu
    case 'SET_MENU_SUB_STEP':
      return { ...state, menuSubStep: action.subStep };

    case 'ADD_CATEGORY':
      return {
        ...state,
        categories: [...state.categories, action.category],
        currentCategory: action.category,
      };

    case 'UPDATE_CURRENT_CATEGORY':
      if (!state.currentCategory || !action.category) {
        return { ...state, currentCategory: null };
      }
      return {
        ...state,
        currentCategory: { ...state.currentCategory, ...action.category },
      };

    case 'SET_CURRENT_CATEGORY':
      return { ...state, currentCategory: action.category };

    case 'ADD_ITEM_TO_CATEGORY': {
      const updatedCategories = state.categories.map((cat) => {
        if (cat.id === action.categoryId) {
          return { ...cat, items: [...cat.items, action.item] };
        }
        return cat;
      });
      const updatedCurrentCategory =
        state.currentCategory?.id === action.categoryId
          ? { ...state.currentCategory, items: [...state.currentCategory.items, action.item] }
          : state.currentCategory;
      return {
        ...state,
        categories: updatedCategories,
        currentCategory: updatedCurrentCategory,
      };
    }

    case 'UPDATE_ITEM_IN_CATEGORY': {
      const updatedCategories = state.categories.map((cat) => {
        if (cat.id === action.categoryId) {
          return {
            ...cat,
            items: cat.items.map((item) => (item.id === action.item.id ? action.item : item)),
          };
        }
        return cat;
      });
      const updatedCurrentCategory =
        state.currentCategory?.id === action.categoryId
          ? {
              ...state.currentCategory,
              items: state.currentCategory.items.map((item) =>
                item.id === action.item.id ? action.item : item
              ),
            }
          : state.currentCategory;
      return {
        ...state,
        categories: updatedCategories,
        currentCategory: updatedCurrentCategory,
      };
    }

    case 'REMOVE_ITEM_FROM_CATEGORY': {
      const updatedCategories = state.categories.map((cat) => {
        if (cat.id === action.categoryId) {
          return { ...cat, items: cat.items.filter((item) => item.id !== action.itemId) };
        }
        return cat;
      });
      const updatedCurrentCategory =
        state.currentCategory?.id === action.categoryId
          ? {
              ...state.currentCategory,
              items: state.currentCategory.items.filter((item) => item.id !== action.itemId),
            }
          : state.currentCategory;
      return {
        ...state,
        categories: updatedCategories,
        currentCategory: updatedCurrentCategory,
      };
    }

    case 'ADD_OPTION_GROUP_TO_CATEGORY': {
      const updatedCategories = state.categories.map((cat) => {
        if (cat.id === action.categoryId) {
          return { ...cat, optionGroups: [...cat.optionGroups, action.optionGroup] };
        }
        return cat;
      });
      const updatedCurrentCategory =
        state.currentCategory?.id === action.categoryId
          ? {
              ...state.currentCategory,
              optionGroups: [...state.currentCategory.optionGroups, action.optionGroup],
            }
          : state.currentCategory;
      return {
        ...state,
        categories: updatedCategories,
        currentCategory: updatedCurrentCategory,
      };
    }

    case 'REPLACE_OPTION_GROUP_IN_CATEGORY': {
      const replaceGroup = (cat: OnboardingCategory) => ({
        ...cat,
        optionGroups: cat.optionGroups.map((og) =>
          og.id === action.oldGroupId ? action.optionGroup : og
        ),
      });
      const updatedCategories = state.categories.map((cat) =>
        cat.id === action.categoryId ? replaceGroup(cat) : cat
      );
      const updatedCurrentCategory =
        state.currentCategory?.id === action.categoryId
          ? replaceGroup(state.currentCategory)
          : state.currentCategory;
      return {
        ...state,
        categories: updatedCategories,
        currentCategory: updatedCurrentCategory,
      };
    }

    case 'REMOVE_CATEGORY': {
      const filtered = state.categories.filter((cat) => cat.id !== action.categoryId);
      const updatedCurrentCategory =
        state.currentCategory?.id === action.categoryId ? null : state.currentCategory;
      return {
        ...state,
        categories: filtered,
        currentCategory: updatedCurrentCategory,
      };
    }

    case 'FINALIZE_CATEGORY': {
      if (!state.currentCategory) return state;
      const existingIndex = state.categories.findIndex(
        (cat) => cat.id === state.currentCategory!.id
      );
      let updatedCategories;
      if (existingIndex >= 0) {
        updatedCategories = [...state.categories];
        updatedCategories[existingIndex] = state.currentCategory;
      } else {
        updatedCategories = [...state.categories, state.currentCategory];
      }
      return {
        ...state,
        categories: updatedCategories,
        currentCategory: null,
        menuSubStep: 'done',
      };
    }

    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories };

    // Offers
    case 'SET_WANTS_OFFERS':
      return { ...state, wantsOffers: action.wants };

    case 'ADD_OFFER':
      return { ...state, offers: [...state.offers, action.offer] };

    case 'SET_OFFERS':
      return { ...state, offers: action.offers };

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'RESET_STATE':
      return { ...initialState };

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

interface OnboardingContextType {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  // Convenience methods
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Clear sessionStorage when leaving the assistant so next visit loads fresh from DB
  useEffect(() => {
    return () => {
      clearOnboardingSession();
    };
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'COMPLETE_STEP', step: state.currentStep });
    dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
  }, [state.currentStep]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 });
    }
  }, [state.currentStep]);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  return (
    <OnboardingContext.Provider value={{ state, dispatch, nextStep, prevStep, goToStep }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
