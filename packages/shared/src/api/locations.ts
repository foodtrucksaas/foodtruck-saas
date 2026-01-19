import type { TypedSupabaseClient } from './client';
import { handleResponse } from './client';
import type { Location, LocationInsert, LocationUpdate } from '../types';

export function createLocationsApi(supabase: TypedSupabaseClient) {
  return {
    // Get all locations for a foodtruck
    async getByFoodtruck(foodtruckId: string): Promise<Location[]> {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('foodtruck_id', foodtruckId)
        .order('name');

      return handleResponse(data, error);
    },

    // Get a single location
    async getById(id: string): Promise<Location> {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      return handleResponse(data, error);
    },

    // Create a new location
    async create(location: LocationInsert): Promise<Location> {
      const { data, error } = await supabase
        .from('locations')
        .insert(location)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Update a location
    async update(id: string, updates: LocationUpdate): Promise<Location> {
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Delete a location
    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
  };
}

export type LocationsApi = ReturnType<typeof createLocationsApi>;
