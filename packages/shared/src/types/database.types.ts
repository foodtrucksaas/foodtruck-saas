export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      campaign_sends: {
        Row: {
          campaign_id: string
          channel: Database["public"]["Enums"]["campaign_channel"]
          clicked_at: string | null
          created_at: string | null
          customer_id: string
          delivered_at: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          resend_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["send_status"]
          twilio_sid: string | null
        }
        Insert: {
          campaign_id: string
          channel: Database["public"]["Enums"]["campaign_channel"]
          clicked_at?: string | null
          created_at?: string | null
          customer_id: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
          twilio_sid?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: Database["public"]["Enums"]["campaign_channel"]
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["send_status"]
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: Database["public"]["Enums"]["campaign_channel"]
          clicked_count: number | null
          created_at: string | null
          delivered_count: number | null
          email_body: string | null
          email_subject: string | null
          foodtruck_id: string
          id: string
          last_sent_at: string | null
          name: string
          opened_count: number | null
          recipients_count: number | null
          schedule: Json | null
          sent_count: number | null
          sms_body: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          targeting: Json
          trigger_type: Database["public"]["Enums"]["campaign_trigger"]
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["campaign_channel"]
          clicked_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          email_body?: string | null
          email_subject?: string | null
          foodtruck_id: string
          id?: string
          last_sent_at?: string | null
          name: string
          opened_count?: number | null
          recipients_count?: number | null
          schedule?: Json | null
          sent_count?: number | null
          sms_body?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting?: Json
          trigger_type?: Database["public"]["Enums"]["campaign_trigger"]
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["campaign_channel"]
          clicked_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          email_body?: string | null
          email_subject?: string | null
          foodtruck_id?: string
          id?: string
          last_sent_at?: string | null
          name?: string
          opened_count?: number | null
          recipients_count?: number | null
          schedule?: Json | null
          sent_count?: number | null
          sms_body?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting?: Json
          trigger_type?: Database["public"]["Enums"]["campaign_trigger"]
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          foodtruck_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          foodtruck_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          foodtruck_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      category_option_groups: {
        Row: {
          category_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_multiple: boolean | null
          is_required: boolean | null
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_multiple?: boolean | null
          is_required?: boolean | null
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_multiple?: boolean | null
          is_required?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_option_groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_available: boolean | null
          is_default: boolean | null
          name: string
          option_group_id: string
          price_modifier: number | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          is_default?: boolean | null
          name: string
          option_group_id: string
          price_modifier?: number | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          is_default?: boolean | null
          name?: string
          option_group_id?: string
          price_modifier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "category_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_locations: {
        Row: {
          customer_id: string
          id: string
          last_order_at: string | null
          location_id: string
          order_count: number | null
          total_spent: number | null
        }
        Insert: {
          customer_id: string
          id?: string
          last_order_at?: string | null
          location_id: string
          order_count?: number | null
          total_spent?: number | null
        }
        Update: {
          customer_id?: string
          id?: string
          last_order_at?: string | null
          location_id?: string
          order_count?: number | null
          total_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_locations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          email_opt_in: boolean | null
          first_order_at: string | null
          foodtruck_id: string
          id: string
          last_order_at: string | null
          lifetime_points: number | null
          loyalty_opt_in: boolean | null
          loyalty_opted_in_at: string | null
          loyalty_points: number | null
          name: string | null
          opted_in_at: string | null
          phone: string | null
          sms_opt_in: boolean | null
          total_orders: number | null
          total_spent: number | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          email_opt_in?: boolean | null
          first_order_at?: string | null
          foodtruck_id: string
          id?: string
          last_order_at?: string | null
          lifetime_points?: number | null
          loyalty_opt_in?: boolean | null
          loyalty_opted_in_at?: string | null
          loyalty_points?: number | null
          name?: string | null
          opted_in_at?: string | null
          phone?: string | null
          sms_opt_in?: boolean | null
          total_orders?: number | null
          total_spent?: number | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          email_opt_in?: boolean | null
          first_order_at?: string | null
          foodtruck_id?: string
          id?: string
          last_order_at?: string | null
          lifetime_points?: number | null
          loyalty_opt_in?: boolean | null
          loyalty_opted_in_at?: string | null
          loyalty_points?: number | null
          name?: string | null
          opted_in_at?: string | null
          phone?: string | null
          sms_opt_in?: boolean | null
          total_orders?: number | null
          total_spent?: number | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_uses: {
        Row: {
          created_at: string | null
          customer_email: string | null
          deal_id: string
          discount_applied: number
          free_item_name: string | null
          id: string
          order_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          deal_id: string
          discount_applied: number
          free_item_name?: string | null
          id?: string
          order_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          deal_id?: string
          discount_applied?: number
          free_item_name?: string | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_uses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          created_at: string | null
          description: string | null
          foodtruck_id: string
          id: string
          is_active: boolean | null
          name: string
          reward_item_id: string | null
          reward_type: Database["public"]["Enums"]["deal_reward_type"]
          reward_value: number | null
          stackable: boolean | null
          times_used: number | null
          total_discount_given: number | null
          trigger_category_id: string | null
          trigger_option_id: string | null
          trigger_quantity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          foodtruck_id: string
          id?: string
          is_active?: boolean | null
          name: string
          reward_item_id?: string | null
          reward_type: Database["public"]["Enums"]["deal_reward_type"]
          reward_value?: number | null
          stackable?: boolean | null
          times_used?: number | null
          total_discount_given?: number | null
          trigger_category_id?: string | null
          trigger_option_id?: string | null
          trigger_quantity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          foodtruck_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          reward_item_id?: string | null
          reward_type?: Database["public"]["Enums"]["deal_reward_type"]
          reward_value?: number | null
          stackable?: boolean | null
          times_used?: number | null
          total_discount_given?: number | null
          trigger_category_id?: string | null
          trigger_option_id?: string | null
          trigger_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_trigger_category_id_fkey"
            columns: ["trigger_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_trigger_option_id_fkey"
            columns: ["trigger_option_id"]
            isOneToOne: false
            referencedRelation: "category_options"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          id: string
          foodtruck_id: string
          name: string
          description: string | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          config: Json
          is_active: boolean
          start_date: string | null
          end_date: string | null
          time_start: string | null
          time_end: string | null
          days_of_week: number[] | null
          max_uses: number | null
          max_uses_per_customer: number | null
          current_uses: number
          total_discount_given: number
          stackable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          foodtruck_id: string
          name: string
          description?: string | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          config?: Json
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          time_start?: string | null
          time_end?: string | null
          days_of_week?: number[] | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          current_uses?: number
          total_discount_given?: number
          stackable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          foodtruck_id?: string
          name?: string
          description?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"]
          config?: Json
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          time_start?: string | null
          time_end?: string | null
          days_of_week?: number[] | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          current_uses?: number
          total_discount_given?: number
          stackable?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_items: {
        Row: {
          id: string
          offer_id: string
          menu_item_id: string
          role: string
          quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          menu_item_id: string
          role: string
          quantity?: number
          created_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          menu_item_id?: string
          role?: string
          quantity?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_uses: {
        Row: {
          id: string
          offer_id: string
          order_id: string
          customer_email: string | null
          discount_amount: number
          free_item_name: string | null
          used_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          order_id: string
          customer_email?: string | null
          discount_amount: number
          free_item_name?: string | null
          used_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          order_id?: string
          customer_email?: string | null
          discount_amount?: number
          free_item_name?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_uses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          foodtruck_id: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          foodtruck_id?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          foodtruck_id?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      foodtrucks: {
        Row: {
          allow_advance_orders: boolean | null
          auto_accept_orders: boolean | null
          cover_image_url: string | null
          created_at: string | null
          cuisine_types: string[] | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_mobile: boolean | null
          logo_url: string | null
          loyalty_allow_multiple: boolean | null
          loyalty_enabled: boolean | null
          loyalty_points_per_euro: number | null
          loyalty_reward: number | null
          loyalty_threshold: number | null
          max_orders_per_slot: number | null
          min_preparation_time: number | null
          name: string
          order_slot_interval: number | null
          phone: string | null
          send_confirmation_email: boolean | null
          send_reminder_email: boolean | null
          show_menu_photos: boolean
          show_order_popup: boolean
          show_promo_section: boolean | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          updated_at: string | null
          use_ready_status: boolean | null
          user_id: string
        }
        Insert: {
          allow_advance_orders?: boolean | null
          auto_accept_orders?: boolean | null
          cover_image_url?: string | null
          created_at?: string | null
          cuisine_types?: string[] | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_mobile?: boolean | null
          logo_url?: string | null
          loyalty_allow_multiple?: boolean | null
          loyalty_enabled?: boolean | null
          loyalty_points_per_euro?: number | null
          loyalty_reward?: number | null
          loyalty_threshold?: number | null
          max_orders_per_slot?: number | null
          min_preparation_time?: number | null
          name: string
          order_slot_interval?: number | null
          phone?: string | null
          send_confirmation_email?: boolean | null
          send_reminder_email?: boolean | null
          show_menu_photos?: boolean
          show_order_popup?: boolean
          show_promo_section?: boolean | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string | null
          use_ready_status?: boolean | null
          user_id: string
        }
        Update: {
          allow_advance_orders?: boolean | null
          auto_accept_orders?: boolean | null
          cover_image_url?: string | null
          created_at?: string | null
          cuisine_types?: string[] | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_mobile?: boolean | null
          logo_url?: string | null
          loyalty_allow_multiple?: boolean | null
          loyalty_enabled?: boolean | null
          loyalty_points_per_euro?: number | null
          loyalty_reward?: number | null
          loyalty_threshold?: number | null
          max_orders_per_slot?: number | null
          min_preparation_time?: number | null
          name?: string
          order_slot_interval?: number | null
          phone?: string | null
          send_confirmation_email?: boolean | null
          send_reminder_email?: boolean | null
          show_menu_photos?: boolean
          show_order_popup?: boolean
          show_promo_section?: boolean | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          updated_at?: string | null
          use_ready_status?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          created_at: string | null
          foodtruck_id: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          foodtruck_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          foodtruck_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          balance_after: number
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
        }
        Update: {
          balance_after?: number
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          category_id: string | null
          created_at: string | null
          description: string | null
          disabled_options: Json | null
          display_order: number | null
          foodtruck_id: string
          id: string
          image_url: string | null
          is_archived: boolean | null
          is_available: boolean | null
          is_daily_special: boolean | null
          name: string
          option_prices: Json | null
          price: number
          updated_at: string | null
        }
        Insert: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          disabled_options?: Json | null
          display_order?: number | null
          foodtruck_id: string
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          is_available?: boolean | null
          is_daily_special?: boolean | null
          name: string
          option_prices?: Json | null
          price: number
          updated_at?: string | null
        }
        Update: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          disabled_options?: Json | null
          display_order?: number | null
          foodtruck_id?: string
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          is_available?: boolean | null
          is_daily_special?: boolean | null
          name?: string
          option_prices?: Json | null
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      option_groups: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_multiple: boolean | null
          is_required: boolean | null
          menu_item_id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_multiple?: boolean | null
          is_required?: boolean | null
          menu_item_id: string
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_multiple?: boolean | null
          is_required?: boolean | null
          menu_item_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_available: boolean | null
          is_default: boolean | null
          name: string
          option_group_id: string
          price_modifier: number | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          is_default?: boolean | null
          name: string
          option_group_id: string
          price_modifier?: number | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_available?: boolean | null
          is_default?: boolean | null
          name?: string
          option_group_id?: string
          price_modifier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_options: {
        Row: {
          category_option_id: string | null
          created_at: string | null
          id: string
          option_group_name: string
          option_id: string | null
          option_name: string
          order_item_id: string
          price_modifier: number
        }
        Insert: {
          category_option_id?: string | null
          created_at?: string | null
          id?: string
          option_group_name: string
          option_id?: string | null
          option_name: string
          order_item_id: string
          price_modifier: number
        }
        Update: {
          category_option_id?: string | null
          created_at?: string | null
          id?: string
          option_group_name?: string
          option_id?: string | null
          option_name?: string
          order_item_id?: string
          price_modifier?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_options_category_option_id_fkey"
            columns: ["category_option_id"]
            isOneToOne: false
            referencedRelation: "category_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_options_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          notes?: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          deal_discount: number | null
          deal_id: string | null
          discount_amount: number | null
          foodtruck_id: string
          id: string
          notes: string | null
          pickup_time: string
          promo_code_id: string | null
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          deal_discount?: number | null
          deal_id?: string | null
          discount_amount?: number | null
          foodtruck_id: string
          id?: string
          notes?: string | null
          pickup_time: string
          promo_code_id?: string | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deal_discount?: number | null
          deal_id?: string | null
          discount_amount?: number | null
          foodtruck_id?: string
          id?: string
          notes?: string | null
          pickup_time?: string
          promo_code_id?: string | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_uses: {
        Row: {
          created_at: string | null
          customer_email: string
          discount_applied: number
          id: string
          order_id: string
          promo_code_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          discount_applied: number
          id?: string
          order_id: string
          promo_code_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          discount_applied?: number
          id?: string
          order_id?: string
          promo_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          foodtruck_id: string
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          max_uses_per_customer: number | null
          min_order_amount: number | null
          total_discount_given: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          foodtruck_id: string
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          total_discount_given?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          foodtruck_id?: string
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          min_order_amount?: number | null
          total_discount_given?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_exceptions: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          foodtruck_id: string
          id: string
          is_closed: boolean | null
          location_id: string | null
          reason: string | null
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          foodtruck_id: string
          id?: string
          is_closed?: boolean | null
          location_id?: string | null
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          foodtruck_id?: string
          id?: string
          is_closed?: boolean | null
          location_id?: string | null
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          foodtruck_id: string
          id: string
          is_active: boolean | null
          location_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          foodtruck_id: string
          id?: string
          is_active?: boolean | null
          location_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          foodtruck_id?: string
          id?: string
          is_active?: boolean | null
          location_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_foodtruck_id_fkey"
            columns: ["foodtruck_id"]
            isOneToOne: false
            referencedRelation: "foodtrucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_deal: {
        Args: {
          p_customer_email: string
          p_deal_id: string
          p_discount_applied: number
          p_free_item_name?: string
          p_order_id: string
        }
        Returns: undefined
      }
      apply_promo_code: {
        Args: {
          p_customer_email: string
          p_discount_applied: number
          p_order_id: string
          p_promo_code_id: string
        }
        Returns: undefined
      }
      check_slot_availability: {
        Args: {
          p_foodtruck_id: string
          p_max_orders?: number
          p_pickup_time: string
        }
        Returns: boolean
      }
      count_campaign_recipients: {
        Args: { p_foodtruck_id: string; p_targeting: Json }
        Returns: number
      }
      credit_loyalty_points: {
        Args: {
          p_customer_id: string
          p_order_amount: number
          p_order_id: string
          p_points_per_euro?: number
        }
        Returns: number
      }
      get_analytics: {
        Args: {
          p_end_date?: string
          p_foodtruck_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_applicable_deals: {
        Args: { p_cart_items: Json; p_foodtruck_id: string }
        Returns: {
          calculated_discount: number
          cheapest_item_name: string
          deal_id: string
          deal_name: string
          is_applicable: boolean
          items_in_cart: number
          items_needed: number
          reward_item_id: string
          reward_item_name: string
          reward_item_price: number
          reward_type: Database["public"]["Enums"]["deal_reward_type"]
          reward_value: number
          trigger_category_name: string
          trigger_option_name: string
          trigger_quantity: number
        }[]
      }
      get_applicable_offers: {
        Args: {
          p_foodtruck_id: string
          p_cart_items: Json
          p_order_amount: number
          p_promo_code?: string | null
        }
        Returns: {
          offer_id: string
          offer_name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          calculated_discount: number
          free_item_name: string | null
          is_applicable: boolean
          progress_current: number
          progress_required: number
          description: string | null
        }[]
      }
      validate_offer_promo_code: {
        Args: {
          p_foodtruck_id: string
          p_code: string
          p_customer_email: string
          p_order_amount: number
        }
        Returns: {
          is_valid: boolean
          offer_id: string | null
          discount_type: string | null
          discount_value: number | null
          max_discount: number | null
          calculated_discount: number | null
          error_message: string | null
        }[]
      }
      apply_offer: {
        Args: {
          p_offer_id: string
          p_order_id: string
          p_customer_email: string
          p_discount_amount: number
          p_free_item_name?: string | null
        }
        Returns: undefined
      }
      get_available_slots: {
        Args: {
          p_date: string
          p_foodtruck_id: string
          p_interval_minutes?: number
          p_max_orders_per_slot?: number
        }
        Returns: {
          available: boolean
          order_count: number
          slot_time: string
        }[]
      }
      get_campaign_recipients: {
        Args: { p_campaign_id: string }
        Returns: {
          customer_id: string
          email: string
          email_opt_in: boolean
          name: string
          phone: string
          sms_opt_in: boolean
        }[]
      }
      get_customer_loyalty: {
        Args: { p_email: string; p_foodtruck_id: string }
        Returns: {
          can_redeem: boolean
          customer_id: string
          loyalty_allow_multiple: boolean
          loyalty_opt_in: boolean
          loyalty_points: number
          loyalty_points_per_euro: number
          loyalty_reward: number
          loyalty_threshold: number
          max_discount: number
          progress_percent: number
          redeemable_count: number
        }[]
      }
      get_dashboard_stats: { Args: { p_foodtruck_id: string }; Returns: Json }
      redeem_loyalty_reward: {
        Args: {
          p_count?: number
          p_customer_id: string
          p_order_id: string
          p_threshold: number
        }
        Returns: boolean
      }
      validate_promo_code: {
        Args: {
          p_code: string
          p_customer_email: string
          p_foodtruck_id: string
          p_order_amount: number
        }
        Returns: {
          calculated_discount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          error_message: string
          is_valid: boolean
          max_discount: number
          promo_code_id: string
        }[]
      }
    }
    Enums: {
      campaign_channel: "email" | "sms" | "both"
      campaign_status: "draft" | "active" | "paused" | "completed"
      campaign_trigger:
        | "manual"
        | "location_day"
        | "inactive"
        | "welcome"
        | "milestone"
        | "birthday"
      campaign_type: "manual" | "automated"
      deal_reward_type:
        | "free_item"
        | "percentage"
        | "fixed"
        | "cheapest_in_cart"
      discount_type: "percentage" | "fixed"
      offer_type: "bundle" | "buy_x_get_y" | "happy_hour" | "promo_code" | "threshold_discount"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "picked_up"
        | "cancelled"
        | "no_show"
      send_status:
        | "pending"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      campaign_channel: ["email", "sms", "both"],
      campaign_status: ["draft", "active", "paused", "completed"],
      campaign_trigger: [
        "manual",
        "location_day",
        "inactive",
        "welcome",
        "milestone",
        "birthday",
      ],
      campaign_type: ["manual", "automated"],
      deal_reward_type: [
        "free_item",
        "percentage",
        "fixed",
        "cheapest_in_cart",
      ],
      discount_type: ["percentage", "fixed"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ],
      send_status: [
        "pending",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "failed",
      ],
    },
  },
} as const
