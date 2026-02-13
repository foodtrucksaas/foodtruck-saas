import type { Database } from './database.types';

type DbTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Foodtruck = DbTables<'foodtrucks'>;
export type FoodtruckInsert = InsertTables<'foodtrucks'>;
export type FoodtruckUpdate = UpdateTables<'foodtrucks'>;

export type Category = DbTables<'categories'>;
export type CategoryInsert = InsertTables<'categories'>;
export type CategoryUpdate = UpdateTables<'categories'>;

export type MenuItem = DbTables<'menu_items'>;
export type MenuItemInsert = InsertTables<'menu_items'>;
export type MenuItemUpdate = UpdateTables<'menu_items'>;

export type Location = DbTables<'locations'>;
export type LocationInsert = InsertTables<'locations'>;
export type LocationUpdate = UpdateTables<'locations'>;

export type Schedule = DbTables<'schedules'>;
export type ScheduleInsert = InsertTables<'schedules'>;
export type ScheduleUpdate = UpdateTables<'schedules'>;

export type ScheduleException = DbTables<'schedule_exceptions'>;
export type ScheduleExceptionInsert = InsertTables<'schedule_exceptions'>;
export type ScheduleExceptionUpdate = UpdateTables<'schedule_exceptions'>;

export type Order = DbTables<'orders'>;
export type OrderInsert = InsertTables<'orders'>;
export type OrderUpdate = UpdateTables<'orders'>;

export type OrderItem = DbTables<'order_items'>;
export type OrderItemInsert = InsertTables<'order_items'>;
export type OrderItemUpdate = UpdateTables<'order_items'>;

export type OptionGroup = DbTables<'option_groups'>;
export type OptionGroupInsert = InsertTables<'option_groups'>;
export type OptionGroupUpdate = UpdateTables<'option_groups'>;

export type Option = DbTables<'options'>;
export type OptionInsert = InsertTables<'options'>;
export type OptionUpdate = UpdateTables<'options'>;

// Category-level options (using database types)
export type CategoryOptionGroup = DbTables<'category_option_groups'>;
export type CategoryOptionGroupInsert = InsertTables<'category_option_groups'>;
export type CategoryOptionGroupUpdate = UpdateTables<'category_option_groups'>;

export type CategoryOption = DbTables<'category_options'>;
export type CategoryOptionInsert = InsertTables<'category_options'>;
export type CategoryOptionUpdate = UpdateTables<'category_options'>;

export interface CategoryOptionGroupWithOptions extends CategoryOptionGroup {
  options: CategoryOption[];
}

// Type with category_options property (matches Supabase select query)
export interface CategoryOptionGroupWithCategoryOptions extends CategoryOptionGroup {
  category_options: CategoryOption[];
}

export interface CategoryWithOptions extends Category {
  option_groups: CategoryOptionGroupWithOptions[];
}

export type OrderItemOption = DbTables<'order_item_options'>;
export type OrderItemOptionInsert = InsertTables<'order_item_options'>;

export type OrderStatus = Database['public']['Enums']['order_status'];

export interface MenuItemWithCategory extends MenuItem {
  category: Category | null;
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_item: MenuItem })[];
}

export interface ScheduleWithLocation extends Schedule {
  location: Location;
}

export interface FoodtruckWithMenu extends Foodtruck {
  categories: Category[];
  menu_items: MenuItem[];
}

export interface OptionGroupWithOptions extends OptionGroup {
  options: Option[];
}

export interface MenuItemWithOptions extends MenuItem {
  option_groups: OptionGroupWithOptions[];
}

export interface SelectedOption {
  optionId: string;
  optionGroupId: string;
  name: string;
  groupName: string;
  priceModifier: number;
  isSizeOption?: boolean; // If true, priceModifier is the total price (replaces base price)
}

// Bundle selection for cart items
export interface BundleCartSelection {
  categoryId: string;
  categoryName: string;
  menuItem: MenuItem;
  selectedOptions?: SelectedOption[];
  supplement: number; // Bundle supplement in cents
}

export interface BundleCartInfo {
  bundleId: string;
  bundleName: string;
  fixedPrice: number; // Bundle base price in cents
  freeOptions: boolean;
  selections: BundleCartSelection[];
  timeStart?: string | null;
  timeEnd?: string | null;
  daysOfWeek?: number[] | null;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  selectedOptions?: SelectedOption[];
  // Bundle info (if this item is part of a bundle)
  bundleInfo?: BundleCartInfo;
}

export interface Cart {
  foodtruckId: string;
  items: CartItem[];
}

export interface OrderItemWithOptions extends OrderItem {
  menu_item: MenuItem;
  order_item_options?: OrderItemOption[];
}

export interface OrderWithItemsAndOptions extends Order {
  order_items: OrderItemWithOptions[];
}

// ============================================
// Order Modifications (History)
// ============================================

export interface OrderModification {
  id: string;
  order_id: string;
  modified_at: string;
  modified_by: 'merchant' | 'customer' | 'system' | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
}

// ============================================
// CRM & Marketing Types
// ============================================

export interface Customer {
  id: string;
  foodtruck_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  opted_in_at: string | null;
  first_order_at: string | null;
  last_order_at: string | null;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerLocation {
  id: string;
  customer_id: string;
  location_id: string;
  order_count: number;
  total_spent: number;
  last_order_at: string;
}

export interface CustomerWithLocations extends Customer {
  customer_locations: (CustomerLocation & { location: Location })[];
}

export type CampaignType = 'manual' | 'automated';
export type CampaignTrigger =
  | 'manual'
  | 'location_day'
  | 'inactive'
  | 'welcome'
  | 'milestone'
  | 'birthday';
export type CampaignChannel = 'email' | 'sms' | 'both';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type SendStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

export interface CampaignTargeting {
  segment: 'all' | 'location' | 'inactive' | 'loyal' | 'new';
  location_id?: string;
  days?: number;
  min_orders?: number;
}

export interface CampaignSchedule {
  day_of_week?: number;
  send_time?: string;
  days?: number;
}

export interface Campaign {
  id: string;
  foodtruck_id: string;
  name: string;
  type: CampaignType;
  trigger_type: CampaignTrigger;
  channel: CampaignChannel;
  status: CampaignStatus;
  targeting: CampaignTargeting;
  email_subject: string | null;
  email_body: string | null;
  sms_body: string | null;
  schedule: CampaignSchedule | null;
  recipients_count: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignSend {
  id: string;
  campaign_id: string;
  customer_id: string;
  channel: CampaignChannel;
  status: SendStatus;
  resend_id: string | null;
  twilio_sid: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CampaignWithStats extends Campaign {
  open_rate: number;
  click_rate: number;
}

// ============================================
// Promo Codes Types
// ============================================

export type DiscountType = 'percentage' | 'fixed';

export interface PromoCode {
  id: string;
  foodtruck_id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  current_uses: number;
  total_discount_given: number;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeInsert {
  foodtruck_id: string;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount?: number;
  max_discount?: number;
  max_uses?: number;
  max_uses_per_customer?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}

export interface PromoCodeUse {
  id: string;
  promo_code_id: string;
  order_id: string;
  customer_email: string;
  discount_applied: number;
  created_at: string;
}

export interface ValidatePromoCodeResult {
  is_valid: boolean;
  promo_code_id: string | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  max_discount: number | null;
  calculated_discount: number | null;
  error_message: string | null;
}

// ============================================
// Loyalty Types
// ============================================

export type LoyaltyTransactionType = 'earn' | 'redeem';

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id: string | null;
  type: LoyaltyTransactionType;
  points: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface CustomerLoyaltyInfo {
  customer_id: string | null;
  loyalty_points: number;
  loyalty_threshold: number;
  loyalty_reward: number;
  loyalty_allow_multiple: boolean;
  loyalty_points_per_euro: number;
  loyalty_opt_in: boolean | null; // true = déjà accepté, false = a refusé, null = nouveau
  can_redeem: boolean;
  redeemable_count: number;
  max_discount: number;
  progress_percent: number;
}

// ============================================
// Deals / Formules Types
// ============================================

export type DealRewardType = 'free_item' | 'percentage' | 'fixed' | 'cheapest_in_cart';

export interface Deal {
  id: string;
  foodtruck_id: string;
  name: string;
  description: string | null;
  trigger_category_id: string | null;
  trigger_quantity: number;
  reward_type: DealRewardType;
  reward_item_id: string | null;
  reward_value: number | null;
  /** @deprecated Plus utilisé. Les offres s'appliquent automatiquement sur des articles différents. */
  stackable: boolean | null;
  is_active: boolean | null;
  times_used: number | null;
  total_discount_given: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DealInsert {
  foodtruck_id: string;
  name: string;
  description?: string;
  trigger_category_id?: string;
  trigger_quantity: number;
  reward_type: DealRewardType;
  reward_item_id?: string;
  reward_value?: number;
  /** @deprecated Plus utilisé. Les offres s'appliquent automatiquement sur des articles différents. */
  stackable?: boolean;
  is_active?: boolean;
}

export interface DealUse {
  id: string;
  deal_id: string;
  order_id: string;
  customer_email: string | null;
  discount_applied: number;
  free_item_name: string | null;
  created_at: string;
}

export interface ApplicableDeal {
  deal_id: string;
  deal_name: string;
  reward_type: DealRewardType;
  reward_item_id: string | null;
  reward_item_name: string | null;
  reward_item_price: number | null;
  reward_value: number | null;
  calculated_discount: number;
  trigger_category_name: string | null;
  trigger_quantity: number;
  is_applicable: boolean;
  items_in_cart: number;
  items_needed: number;
  cheapest_item_name: string | null;
}

export interface DealWithCategory extends Deal {
  category?: Category | null;
  reward_item?: MenuItem | null;
}

// ============================================
// Unified Offers System Types
// ============================================

export type OfferType = 'bundle' | 'buy_x_get_y' | 'promo_code' | 'threshold_discount';

// Configuration types per offer type

// Bundle category for "choose from category" bundles
export interface BundleCategoryConfig {
  category_ids: string[]; // One or more categories (OR logic - customer picks from any)
  category_id?: string; // @deprecated - kept for backwards compatibility with old data
  quantity: number;
  label?: string; // Custom label like "Entrée au choix" or "Boisson"
  excluded_items?: string[]; // Items NOT eligible for this bundle
  supplements?: Record<string, number>; // itemId or itemId:sizeId -> supplement price in cents
  excluded_sizes?: Record<string, string[]>; // itemId -> list of excluded sizeIds
}

export interface BundleConfig {
  type?: 'specific_items' | 'category_choice'; // Default: specific_items for backwards compat
  fixed_price: number; // Prix fixe en centimes
  bundle_categories?: BundleCategoryConfig[]; // For category_choice mode
  free_options?: boolean; // If true, item supplements are free in bundle
}

export interface BuyXGetYConfig {
  trigger_quantity: number;
  reward_quantity: number;
  reward_type: 'free' | 'discount';
  reward_value?: number; // Centimes si discount
  // Category-based mode (OR logic - customer picks from any of these categories)
  type?: 'specific_items' | 'category_choice'; // Default: specific_items for backwards compat
  trigger_category_ids?: string[]; // Categories whose items trigger the offer
  trigger_excluded_items?: string[]; // Items NOT eligible as triggers
  trigger_excluded_sizes?: Record<string, string[]>; // itemId -> list of excluded sizeIds
  reward_category_ids?: string[]; // Categories from which reward can be chosen
  reward_excluded_items?: string[]; // Items NOT eligible as rewards
  reward_excluded_sizes?: Record<string, string[]>; // itemId -> list of excluded sizeIds
}

export interface PromoCodeConfig {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount?: number;
  max_discount?: number;
}

export interface ThresholdDiscountConfig {
  min_amount: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export type OfferConfig = BundleConfig | BuyXGetYConfig | PromoCodeConfig | ThresholdDiscountConfig;

export interface Offer {
  id: string;
  foodtruck_id: string;
  name: string;
  description: string | null;
  offer_type: OfferType;
  config: OfferConfig;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  time_start: string | null;
  time_end: string | null;
  days_of_week: number[] | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  current_uses: number;
  total_discount_given: number;
  /** @deprecated Plus utilisé. Les offres s'appliquent automatiquement sur des articles différents. */
  stackable: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface OfferInsert {
  foodtruck_id: string;
  name: string;
  description?: string;
  offer_type: OfferType;
  config: OfferConfig;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  time_start?: string;
  time_end?: string;
  days_of_week?: number[];
  max_uses?: number;
  max_uses_per_customer?: number;
  /** @deprecated Plus utilisé. Les offres s'appliquent automatiquement sur des articles différents. */
  stackable?: boolean;
  display_order?: number;
}

export interface OfferUpdate {
  name?: string;
  description?: string;
  config?: OfferConfig;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  time_start?: string | null;
  time_end?: string | null;
  days_of_week?: number[] | null;
  max_uses?: number | null;
  max_uses_per_customer?: number | null;
  /** @deprecated Plus utilisé. Les offres s'appliquent automatiquement sur des articles différents. */
  stackable?: boolean;
  display_order?: number | null;
}

export type OfferItemRole = 'trigger' | 'reward' | 'bundle_item';

export interface OfferItem {
  id: string;
  offer_id: string;
  menu_item_id: string;
  role: OfferItemRole;
  quantity: number;
  created_at: string;
}

export interface OfferItemInsert {
  offer_id: string;
  menu_item_id: string;
  role: OfferItemRole;
  quantity?: number;
}

export interface OfferItemWithMenuItem extends OfferItem {
  menu_item: MenuItem;
}

export interface OfferUse {
  id: string;
  offer_id: string;
  order_id: string;
  customer_email: string | null;
  discount_amount: number;
  free_item_name: string | null;
  used_at: string;
}

export interface OfferWithItems extends Offer {
  offer_items: OfferItemWithMenuItem[];
}

export interface ApplicableOffer {
  offer_id: string;
  offer_name: string;
  offer_type: OfferType;
  calculated_discount: number;
  free_item_name: string | null;
  is_applicable: boolean;
  progress_current: number;
  progress_required: number;
  description: string | null;
}

/**
 * Represents a single applied offer in the optimized combination
 * Used when multiple offers can apply to different cart items
 */
export interface AppliedOfferDetail {
  offer_id: string;
  offer_name: string;
  offer_type: OfferType;
  times_applied: number; // How many times this offer was applied (e.g., 2x for 6 pizzas with "3rd free")
  discount_amount: number; // Total discount from this offer (in centimes)
  items_consumed: Array<{
    // Array of items consumed by this offer
    menu_item_id: string;
    quantity: number;
  }>;
  free_item_name?: string | null;
}

/**
 * Result of the optimized offer combination algorithm
 */
export interface OptimizedOffersResult {
  applied_offers: AppliedOfferDetail[];
  total_discount: number;
}

export interface ValidateOfferPromoCodeResult {
  is_valid: boolean;
  offer_id: string | null;
  discount_type: string | null;
  discount_value: number | null;
  max_discount: number | null;
  calculated_discount: number | null;
  error_message: string | null;
}

// Helper type guards
export function isBundleConfig(config: OfferConfig): config is BundleConfig {
  return 'fixed_price' in config;
}

export function isBuyXGetYConfig(config: OfferConfig): config is BuyXGetYConfig {
  return 'trigger_quantity' in config && 'reward_type' in config;
}

export function isPromoCodeConfig(config: OfferConfig): config is PromoCodeConfig {
  return 'code' in config;
}

export function isThresholdDiscountConfig(config: OfferConfig): config is ThresholdDiscountConfig {
  return 'min_amount' in config;
}

// Offer type labels in French
export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  bundle: 'Menu / Formule',
  buy_x_get_y: 'X achetés = Y offert',
  promo_code: 'Code Promo',
  threshold_discount: 'Remise au palier',
};

export const OFFER_TYPE_DESCRIPTIONS: Record<OfferType, string> = {
  bundle: 'Créez une formule avec plusieurs plats à prix fixe. Idéal pour les menus du midi.',
  buy_x_get_y: 'Récompensez la fidélité ! Ex: 3 achetés = 1 offert',
  promo_code: 'Créez un code à partager pour attirer de nouveaux clients',
  threshold_discount:
    "Encouragez les commandes plus importantes avec une remise à partir d'un montant",
};

export const OFFER_TYPE_ICONS: Record<OfferType, string> = {
  bundle: 'Package',
  buy_x_get_y: 'Gift',
  promo_code: 'Tag',
  threshold_discount: 'TrendingUp',
};
