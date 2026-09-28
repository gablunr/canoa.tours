export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_events: {
        Row: {
          actor_user_id: string | null
          booking_id: string
          created_at: string
          data: Json | null
          id: number
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          booking_id: string
          created_at?: string
          data?: Json | null
          id?: never
          type: string
        }
        Update: {
          actor_user_id?: string | null
          booking_id?: string
          created_at?: string
          data?: Json | null
          id?: never
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adults: number
          balance_amount: number | null
          cancelled_at: string | null
          children: number
          code: string
          confirmed_at: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          customer_id: string
          date_changes_count: number
          deposit_amount: number
          discount_total: number
          expires_at: string | null
          has_insurance: boolean
          hotel_id: string | null
          hotel_name: string | null
          id: string
          infants: number
          insurance_total: number
          lead_name: string
          lead_phone: string | null
          pickup_fee_pending: boolean
          pickup_note: string | null
          pickup_time: string | null
          pickup_total: number
          pickup_zone_id: string | null
          price_breakdown: Json
          product_id: string
          provider_confirmed_at: string | null
          provider_sent_at: string | null
          schedule_id: string
          seats: number
          status: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_method_id: string | null
          subtotal: number
          terms_version: string
          total: number
          tour_date: string
          updated_at: string
          utm: Json | null
        }
        Insert: {
          adults?: number
          balance_amount?: number | null
          cancelled_at?: string | null
          children?: number
          code?: string
          confirmed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          currency: string
          customer_id: string
          date_changes_count?: number
          deposit_amount: number
          discount_total?: number
          expires_at?: string | null
          has_insurance?: boolean
          hotel_id?: string | null
          hotel_name?: string | null
          id?: string
          infants?: number
          insurance_total?: number
          lead_name: string
          lead_phone?: string | null
          pickup_fee_pending?: boolean
          pickup_note?: string | null
          pickup_time?: string | null
          pickup_total?: number
          pickup_zone_id?: string | null
          price_breakdown: Json
          product_id: string
          provider_confirmed_at?: string | null
          provider_sent_at?: string | null
          schedule_id: string
          seats: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal: number
          terms_version: string
          total: number
          tour_date: string
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          adults?: number
          balance_amount?: number | null
          cancelled_at?: string | null
          children?: number
          code?: string
          confirmed_at?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          date_changes_count?: number
          deposit_amount?: number
          discount_total?: number
          expires_at?: string | null
          has_insurance?: boolean
          hotel_id?: string | null
          hotel_name?: string | null
          id?: string
          infants?: number
          insurance_total?: number
          lead_name?: string
          lead_phone?: string | null
          pickup_fee_pending?: boolean
          pickup_note?: string | null
          pickup_time?: string | null
          pickup_total?: number
          pickup_zone_id?: string | null
          price_breakdown?: Json
          product_id?: string
          provider_confirmed_at?: string | null
          provider_sent_at?: string | null
          schedule_id?: string
          seats?: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal?: number
          terms_version?: string
          total?: number
          tour_date?: string
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_pickup_zone_id_fkey"
            columns: ["hotel_id", "pickup_zone_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id", "zone_id"]
          },
          {
            foreignKeyName: "bookings_pickup_zone_id_fkey"
            columns: ["pickup_zone_id"]
            isOneToOne: false
            referencedRelation: "pickup_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "product_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["amount_type"]
          discount_value: number
          id: string
          max_redemptions: number | null
          product_id: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["amount_type"]
          discount_value: number
          id?: string
          max_redemptions?: number | null
          product_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["amount_type"]
          discount_value?: number
          id?: string
          max_redemptions?: number | null
          product_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          locale: Database["public"]["Enums"]["site_locale"]
          phone: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          locale?: Database["public"]["Enums"]["site_locale"]
          phone?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          locale?: Database["public"]["Enums"]["site_locale"]
          phone?: string | null
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      guides: {
        Row: {
          answer: string | null
          author_user_id: string | null
          created_at: string
          description: string
          faqs: Json
          featured: boolean
          id: string
          image_alt: string | null
          image_path: string | null
          locale: Database["public"]["Enums"]["site_locale"]
          published_at: string | null
          reading_minutes: number | null
          sections: Json
          silo: string
          slug: string
          status: Database["public"]["Enums"]["guide_status"]
          title: string
          tour_note: string | null
          tour_product_id: string | null
          translation_of: string | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          author_user_id?: string | null
          created_at?: string
          description: string
          faqs?: Json
          featured?: boolean
          id?: string
          image_alt?: string | null
          image_path?: string | null
          locale?: Database["public"]["Enums"]["site_locale"]
          published_at?: string | null
          reading_minutes?: number | null
          sections?: Json
          silo: string
          slug: string
          status?: Database["public"]["Enums"]["guide_status"]
          title: string
          tour_note?: string | null
          tour_product_id?: string | null
          translation_of?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          author_user_id?: string | null
          created_at?: string
          description?: string
          faqs?: Json
          featured?: boolean
          id?: string
          image_alt?: string | null
          image_path?: string | null
          locale?: Database["public"]["Enums"]["site_locale"]
          published_at?: string | null
          reading_minutes?: number | null
          sections?: Json
          silo?: string
          slug?: string
          status?: Database["public"]["Enums"]["guide_status"]
          title?: string
          tour_note?: string | null
          tour_product_id?: string | null
          translation_of?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_tour_product_id_fkey"
            columns: ["tour_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_translation_of_fkey"
            columns: ["translation_of"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          active: boolean
          id: string
          name: string
          zone_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          zone_id: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "pickup_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_zones: {
        Row: {
          description: string | null
          id: string
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_days: {
        Row: {
          capacity: number | null
          closed: boolean
          note: string | null
          product_id: string
          tour_date: string
        }
        Insert: {
          capacity?: number | null
          closed?: boolean
          note?: string | null
          product_id: string
          tour_date: string
        }
        Update: {
          capacity?: number | null
          closed?: boolean
          note?: string | null
          product_id?: string
          tour_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_days_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          height: number
          id: string
          path: string
          position: number
          product_id: string
          width: number
        }
        Insert: {
          alt: string
          created_at?: string
          height: number
          id?: string
          path: string
          position?: number
          product_id: string
          width: number
        }
        Update: {
          alt?: string
          created_at?: string
          height?: number
          id?: string
          path?: string
          position?: number
          product_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pickup_zones: {
        Row: {
          fee_per_person: number
          product_id: string
          zone_id: string
        }
        Insert: {
          fee_per_person?: number
          product_id: string
          zone_id: string
        }
        Update: {
          fee_per_person?: number
          product_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_pickup_zones_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pickup_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "pickup_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          amount: number
          id: string
          max_age: number | null
          min_age: number | null
          passenger_type: Database["public"]["Enums"]["passenger_type"]
          product_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          amount: number
          id?: string
          max_age?: number | null
          min_age?: number | null
          passenger_type: Database["public"]["Enums"]["passenger_type"]
          product_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          amount?: number
          id?: string
          max_age?: number | null
          min_age?: number | null
          passenger_type?: Database["public"]["Enums"]["passenger_type"]
          product_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_schedules: {
        Row: {
          active: boolean
          id: string
          label: string | null
          pickup_to: string | null
          product_id: string
          return_at: string | null
          start_time: string
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          id?: string
          label?: string | null
          pickup_to?: string | null
          product_id: string
          return_at?: string | null
          start_time: string
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          id?: string
          label?: string | null
          pickup_to?: string | null
          product_id?: string
          return_at?: string | null
          start_time?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "product_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          age_note: string | null
          best_for: string | null
          bring: string[]
          excludes: string[]
          faqs: Json
          highlights: string[]
          image_alt: string | null
          includes: string[]
          includes_summary: string | null
          itinerary: Json
          locale: Database["public"]["Enums"]["site_locale"]
          meeting_point: string | null
          name: string
          price_unit: string | null
          product_id: string
          short_name: string | null
          slug: string
          summary: string | null
        }
        Insert: {
          age_note?: string | null
          best_for?: string | null
          bring?: string[]
          excludes?: string[]
          faqs?: Json
          highlights?: string[]
          image_alt?: string | null
          includes?: string[]
          includes_summary?: string | null
          itinerary?: Json
          locale: Database["public"]["Enums"]["site_locale"]
          meeting_point?: string | null
          name: string
          price_unit?: string | null
          product_id: string
          short_name?: string | null
          slug: string
          summary?: string | null
        }
        Update: {
          age_note?: string | null
          best_for?: string | null
          bring?: string[]
          excludes?: string[]
          faqs?: Json
          highlights?: string[]
          image_alt?: string | null
          includes?: string[]
          includes_summary?: string | null
          itinerary?: Json
          locale?: Database["public"]["Enums"]["site_locale"]
          meeting_point?: string | null
          name?: string
          price_unit?: string | null
          product_id?: string
          short_name?: string | null
          slug?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: string
          daily_capacity: number
          departure_port: string | null
          deposit_type: Database["public"]["Enums"]["amount_type"]
          deposit_value: number
          destination_slug: string
          duration_category: Database["public"]["Enums"]["tour_duration"] | null
          duration_hours: number | null
          id: string
          infants_occupy_seat: boolean
          key: string
          max_group_size: number | null
          min_age: number | null
          most_booked_position: number | null
          position: number
          pregnancy: Database["public"]["Enums"]["pregnancy_policy"] | null
          pregnancy_max_months: number | null
          pricing_mode: Database["public"]["Enums"]["pricing_mode"]
          published_at: string | null
          status: Database["public"]["Enums"]["product_status"]
          supplier_id: string
          updated_at: string
          updated_by: string | null
          wheelchair: boolean
        }
        Insert: {
          created_at?: string
          currency?: string
          daily_capacity?: number
          departure_port?: string | null
          deposit_type?: Database["public"]["Enums"]["amount_type"]
          deposit_value: number
          destination_slug: string
          duration_category?:
            | Database["public"]["Enums"]["tour_duration"]
            | null
          duration_hours?: number | null
          id?: string
          infants_occupy_seat?: boolean
          key: string
          max_group_size?: number | null
          min_age?: number | null
          most_booked_position?: number | null
          position?: number
          pregnancy?: Database["public"]["Enums"]["pregnancy_policy"] | null
          pregnancy_max_months?: number | null
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          published_at?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          supplier_id: string
          updated_at?: string
          updated_by?: string | null
          wheelchair?: boolean
        }
        Update: {
          created_at?: string
          currency?: string
          daily_capacity?: number
          departure_port?: string | null
          deposit_type?: Database["public"]["Enums"]["amount_type"]
          deposit_value?: number
          destination_slug?: string
          duration_category?:
            | Database["public"]["Enums"]["tour_duration"]
            | null
          duration_hours?: number | null
          id?: string
          infants_occupy_seat?: boolean
          key?: string
          max_group_size?: number | null
          min_age?: number | null
          most_booked_position?: number | null
          position?: number
          pregnancy?: Database["public"]["Enums"]["pregnancy_policy"] | null
          pregnancy_max_months?: number | null
          pricing_mode?: Database["public"]["Enums"]["pricing_mode"]
          published_at?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          supplier_id?: string
          updated_at?: string
          updated_by?: string | null
          wheelchair?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      review_photos: {
        Row: {
          id: string
          position: number
          review_id: string
          storage_path: string
        }
        Insert: {
          id?: string
          position?: number
          review_id: string
          storage_path: string
        }
        Update: {
          id?: string
          position?: number
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_avatar_path: string | null
          author_name: string
          body: string
          booking_id: string | null
          created_at: string
          id: string
          locale: Database["public"]["Enums"]["site_locale"]
          product_id: string
          published_at: string | null
          rating: number
          replied_at: string | null
          reply: string | null
          source: Database["public"]["Enums"]["review_source"]
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
        }
        Insert: {
          author_avatar_path?: string | null
          author_name: string
          body: string
          booking_id?: string | null
          created_at?: string
          id?: string
          locale?: Database["public"]["Enums"]["site_locale"]
          product_id: string
          published_at?: string | null
          rating: number
          replied_at?: string | null
          reply?: string | null
          source?: Database["public"]["Enums"]["review_source"]
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
        }
        Update: {
          author_avatar_path?: string | null
          author_name?: string
          body?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          locale?: Database["public"]["Enums"]["site_locale"]
          product_id?: string
          published_at?: string | null
          rating?: number
          replied_at?: string | null
          reply?: string | null
          source?: Database["public"]["Enums"]["review_source"]
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_product_id_fkey"
            columns: ["booking_id", "product_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id", "product_id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_rebuilds: {
        Row: {
          id: number
          reason: string
          requested_at: string
          requested_by: string | null
        }
        Insert: {
          id?: never
          reason: string
          requested_at?: string
          requested_by?: string | null
        }
        Update: {
          id?: never
          reason?: string
          requested_at?: string
          requested_by?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_coupon_usage: {
        Args: { p_from: string; p_to: string }
        Returns: {
          bookings_sold: number
          code: string
          discount_total: number
          gross_sales: number
        }[]
      }
      admin_create_pickup_zone: {
        Args: {
          p_default_fee: number
          p_description: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      admin_create_tour: {
        Args: {
          p_copy_from?: string
          p_destination_slug: string
          p_key: string
          p_name: string
          p_short_name: string
          p_slug: string
          p_user_id: string
        }
        Returns: string
      }
      admin_daily_series: {
        Args: { p_from: string; p_to: string }
        Returns: {
          bookings_sold: number
          day: string
          gross_sales: number
          seats_departing: number
        }[]
      }
      admin_occupancy: {
        Args: { p_from: string; p_to: string }
        Returns: {
          capacity: number
          closed: boolean
          product_key: string
          product_name: string
          seats_sold: number
          tour_date: string
        }[]
      }
      admin_product_ranking: {
        Args: { p_from: string; p_to: string }
        Returns: {
          bookings_sold: number
          gross_sales: number
          product_key: string
          product_name: string
          seats_sold: number
        }[]
      }
      admin_reorder_pickup_zones: {
        Args: { p_zone_ids: string[] }
        Returns: undefined
      }
      admin_reorder_tours: {
        Args: {
          p_destination_slug: string
          p_product_ids: string[]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_save_tour: {
        Args: {
          p_content: Json
          p_images?: Json
          p_operations?: Json
          p_product_id: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_save_zone_fees: {
        Args: { p_fees: Json; p_zone_id: string }
        Returns: undefined
      }
      admin_set_most_booked: {
        Args: { p_position: number; p_product_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_tour_status: {
        Args: {
          p_product_id: string
          p_status: Database["public"]["Enums"]["product_status"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_sources: {
        Args: { p_from: string; p_to: string }
        Returns: {
          bookings_sold: number
          campaign: string
          gross_sales: number
          medium: string
          source: string
        }[]
      }
      admin_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          balance_to_collect: number
          bookings_created: number
          bookings_sold: number
          cancelled_count: number
          conversion_rate: number
          deposits_collected: number
          expired_count: number
          gross_sales: number
          insurance_rate: number
          no_show_charges: number
          refunds: number
          seats_sold: number
        }[]
      }
      assert_staff: {
        Args: { p_roles?: Database["public"]["Enums"]["staff_role"][] }
        Returns: undefined
      }
      cancel_booking: {
        Args: {
          p_actor_user_id?: string
          p_booking_id: string
          p_reason?: string
        }
        Returns: undefined
      }
      change_booking_date: {
        Args: {
          p_actor_user_id?: string
          p_booking_id: string
          p_count_as_change?: boolean
          p_ignore_capacity?: boolean
          p_schedule_id: string
          p_tour_date: string
        }
        Returns: undefined
      }
      complete_past_bookings: { Args: never; Returns: number }
      confirm_booking: { Args: { p_booking_id: string }; Returns: boolean }
      create_booking: {
        Args: { p_booking: Json }
        Returns: {
          code: string
          id: string
        }[]
      }
      daily_manifest: {
        Args: { p_date: string }
        Returns: {
          adults: number
          balance_amount: number
          booking_code: string
          booking_id: string
          children: number
          currency: string
          customer_email: string
          has_insurance: boolean
          hotel: string
          infants: number
          lead_name: string
          lead_phone: string
          pickup_fee_pending: boolean
          pickup_note: string
          pickup_time: string
          pickup_to: string
          product_key: string
          product_name: string
          provider_confirmed_at: string
          provider_sent_at: string
          seats: number
          start_time: string
          zone: string
        }[]
      }
      departs_on: {
        Args: { p_tour_date: string; p_weekdays: number[] }
        Returns: boolean
      }
      generate_booking_code: { Args: never; Returns: string }
      get_availability: {
        Args: { p_from: string; p_product_id: string; p_to: string }
        Returns: {
          available: number
          bookable: boolean
          closed: boolean
          tour_date: string
        }[]
      }
      holds_seat: {
        Args: {
          p_expires_at: string
          p_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: boolean
      }
      is_bookable_start: {
        Args: { p_start_time: string; p_tour_date: string }
        Returns: boolean
      }
      is_staff: {
        Args: { p_roles?: Database["public"]["Enums"]["staff_role"][] }
        Returns: boolean
      }
      jsonb_to_text_array: { Args: { p_value: Json }; Returns: string[] }
      local_today: { Args: never; Returns: string }
      lock_coupon: {
        Args: {
          p_check_validity?: boolean
          p_coupon_id: string
          p_exclude_booking_id?: string
          p_product_id: string
        }
        Returns: undefined
      }
      lock_product_day: {
        Args: {
          p_exclude_booking_id?: string
          p_product_id: string
          p_seats: number
          p_tour_date: string
        }
        Returns: undefined
      }
      record_payment: {
        Args: {
          p_amount: number
          p_booking_id: string
          p_currency: string
          p_kind: Database["public"]["Enums"]["payment_kind"]
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_provider_ref: string
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: string
      }
      set_booking_outcome: {
        Args: {
          p_actor_user_id?: string
          p_booking_id: string
          p_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: undefined
      }
      set_product_price: {
        Args: {
          p_amount: number
          p_max_age?: number
          p_min_age?: number
          p_passenger_type: Database["public"]["Enums"]["passenger_type"]
          p_product_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      amount_type: "percent" | "fixed"
      booking_status:
        | "pending_payment"
        | "expired"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      guide_status: "draft" | "published"
      passenger_type: "adult" | "child" | "infant" | "group"
      payment_kind: "deposit" | "balance" | "no_show_charge" | "refund"
      payment_provider: "stripe" | "paypal" | "cash"
      payment_status: "pending" | "succeeded" | "failed"
      pregnancy_policy: "allowed" | "limited" | "not_allowed"
      pricing_mode: "per_person" | "per_group"
      product_status: "draft" | "active" | "archived"
      review_source: "booking" | "manual"
      review_status: "pending" | "published" | "rejected"
      site_locale: "es" | "en"
      staff_role: "admin" | "operations" | "editor"
      tour_duration: "full_day" | "half_day" | "night"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      amount_type: ["percent", "fixed"],
      booking_status: [
        "pending_payment",
        "expired",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      guide_status: ["draft", "published"],
      passenger_type: ["adult", "child", "infant", "group"],
      payment_kind: ["deposit", "balance", "no_show_charge", "refund"],
      payment_provider: ["stripe", "paypal", "cash"],
      payment_status: ["pending", "succeeded", "failed"],
      pregnancy_policy: ["allowed", "limited", "not_allowed"],
      pricing_mode: ["per_person", "per_group"],
      product_status: ["draft", "active", "archived"],
      review_source: ["booking", "manual"],
      review_status: ["pending", "published", "rejected"],
      site_locale: ["es", "en"],
      staff_role: ["admin", "operations", "editor"],
      tour_duration: ["full_day", "half_day", "night"],
    },
  },
} as const
