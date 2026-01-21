import type { TypedSupabaseClient } from './client';
import { createSchedulesApi } from './schedules';
import { createLocationsApi } from './locations';
import { createOrdersApi } from './orders';
import { createMenuApi } from './menu';
import { createFoodtrucksApi } from './foodtrucks';
import { createLoyaltyApi } from './loyalty';
import { createOffersApi } from './offers';

export { ApiError, handleResponse, handleOptionalResponse } from './client';
export type { TypedSupabaseClient } from './client';

export type { SchedulesApi } from './schedules';
export type { LocationsApi } from './locations';
export type { OrdersApi, OrderFilters } from './orders';
export type { MenuApi } from './menu';
export type { FoodtrucksApi } from './foodtrucks';
export type { LoyaltyApi } from './loyalty';
export type { OffersApi, CartItemForOffers } from './offers';

// Create a complete API client from a Supabase client
export function createApi(supabase: TypedSupabaseClient) {
  return {
    schedules: createSchedulesApi(supabase),
    locations: createLocationsApi(supabase),
    orders: createOrdersApi(supabase),
    menu: createMenuApi(supabase),
    foodtrucks: createFoodtrucksApi(supabase),
    loyalty: createLoyaltyApi(supabase),
    offers: createOffersApi(supabase),
  };
}

export type Api = ReturnType<typeof createApi>;

// Re-export individual creators for selective use
export { createSchedulesApi } from './schedules';
export { createLocationsApi } from './locations';
export { createOrdersApi } from './orders';
export { createMenuApi } from './menu';
export { createFoodtrucksApi } from './foodtrucks';
export { createLoyaltyApi } from './loyalty';
export { createOffersApi } from './offers';
export {
  createBundleConfig,
  createBuyXGetYConfig,
  createPromoCodeOfferConfig,
  createThresholdDiscountConfig,
} from './offers';
