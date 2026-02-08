import type { TypedSupabaseClient } from './client';
import { handleResponse, handleOptionalResponse } from './client';
import type { Order, OrderUpdate, OrderWithItemsAndOptions, OrderStatus } from '../types';
import { formatLocalDate } from '../utils/time';

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  fromDate?: string;
  toDate?: string;
  customerEmail?: string;
  limit?: number;
}

export function createOrdersApi(supabase: TypedSupabaseClient) {
  return {
    // Get orders for a foodtruck with filters
    async getByFoodtruck(
      foodtruckId: string,
      filters?: OrderFilters
    ): Promise<OrderWithItemsAndOptions[]> {
      let query = supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            *,
            menu_item:menu_items (*),
            order_item_options (*)
          )
        `
        )
        .eq('foodtruck_id', foodtruckId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }

      if (filters?.toDate) {
        query = query.lte('created_at', filters.toDate);
      }

      if (filters?.customerEmail) {
        query = query.eq('customer_email', filters.customerEmail);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      return handleResponse(data, error) as OrderWithItemsAndOptions[];
    },

    // Get a single order with items
    async getById(orderId: string): Promise<OrderWithItemsAndOptions | null> {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          order_items (
            *,
            menu_item:menu_items (*),
            order_item_options (*)
          )
        `
        )
        .eq('id', orderId)
        .maybeSingle();

      return handleOptionalResponse(data, error) as OrderWithItemsAndOptions | null;
    },

    // Get orders by customer email
    async getByCustomerEmail(email: string, limit = 20): Promise<Order[]> {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(limit);

      return handleResponse(data, error);
    },

    // Update order status
    async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Update order
    async update(orderId: string, updates: OrderUpdate): Promise<Order> {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      return handleResponse(data, error);
    },

    // Get pending orders count
    async getPendingCount(foodtruckId: string): Promise<number> {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('foodtruck_id', foodtruckId)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },

    // Get today's orders
    async getToday(foodtruckId: string): Promise<OrderWithItemsAndOptions[]> {
      // Use formatLocalDate to avoid timezone bugs with toISOString()
      // toISOString() returns UTC which can shift dates in positive UTC offset zones
      const todayStr = formatLocalDate(new Date());

      return this.getByFoodtruck(foodtruckId, {
        fromDate: `${todayStr}T00:00:00`,
      });
    },

    // Subscribe to order changes (realtime)
    subscribeToChanges(
      foodtruckId: string,
      callback: (payload: { eventType: string; new: Order | null; old: Order | null }) => void
    ) {
      return supabase
        .channel(`orders:${foodtruckId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `foodtruck_id=eq.${foodtruckId}`,
          },
          (payload) => {
            callback({
              eventType: payload.eventType,
              new: payload.new as Order | null,
              old: payload.old as Order | null,
            });
          }
        )
        .subscribe();
    },
  };
}

export type OrdersApi = ReturnType<typeof createOrdersApi>;
