import type { Order, MenuItem, Foodtruck } from './models';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SelectedOptionRequest {
  option_id: string;
  option_group_id: string;
  name: string;
  group_name: string;
  price_modifier: number;
}

export interface CreateOrderRequest {
  foodtruck_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  pickup_time: string;
  notes?: string;
  items: {
    menu_item_id: string;
    quantity: number;
    notes?: string;
    selected_options?: SelectedOptionRequest[];
  }[];
}

export interface CreateOrderResponse {
  order: Order;
}

export interface UpdateOrderStatusRequest {
  status: Order['status'];
}

export interface StripeConnectResponse {
  url: string;
}

export interface AnalyticsData {
  startDate: string;
  endDate: string;
  dayCount: number;

  // Main metrics (NF525 compliant - "amount" not "revenue")
  orderAmount: number;
  previousOrderAmount: number;
  orderCount: number;
  previousOrderCount: number;
  averageOrderValue: number;
  previousAverageOrderValue: number;

  // Top items
  topItems: {
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    amount: number;
    orderCount: number;
  }[];

  // Charts data
  amountByDay: {
    date: string;
    amount: number;
    order_count: number;
  }[];

  ordersByHour: {
    hour: number;
    order_count: number;
    amount: number;
  }[];

  ordersByDayOfWeek: {
    day_of_week: number;
    order_count: number;
    amount: number;
  }[];

  // Location stats
  amountByLocation: {
    locationId: string;
    locationName: string;
    orderCount: number;
    amount: number;
  }[];

  // Category stats
  categoryStats: {
    categoryId: string | null;
    categoryName: string | null;
    itemCount: number;
    quantity: number;
    amount: number;
  }[];

  // Customer stats
  uniqueCustomers: number;
  returningCustomers: number;

  // Offer usage stats
  offerStats?: {
    offerName: string;
    offerType: string;
    useCount: number;
    totalDiscount: number;
  }[];
}

export interface DashboardStats {
  todayOrderAmount: number;
  todayOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  pickedUpOrders: number;
  // Legacy fields (mapped to new statuses for backward compat)
  preparingOrders: number; // Same as confirmedOrders
  readyOrders: number; // Always 0 (status removed)
}

export interface TimeSlot {
  time: string;
  available: boolean;
  orderCount: number;
  maxOrders: number;
}

export interface FoodtruckPublicProfile {
  foodtruck: Foodtruck;
  menu: {
    category: { id: string; name: string } | null;
    items: MenuItem[];
  }[];
  todaySchedule: {
    location: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    };
    start_time: string;
    end_time: string;
  } | null;
  weekSchedule: {
    day: number;
    dayName: string;
    location: {
      name: string;
      address: string;
    };
    start_time: string;
    end_time: string;
  }[];
}
