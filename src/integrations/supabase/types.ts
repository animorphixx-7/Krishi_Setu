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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          language: string
          last_message_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens: number | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens?: number | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string | null
          end_date: string
          equipment_id: string
          id: string
          start_date: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          equipment_id: string
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          equipment_id?: string
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_owner_private"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_recommendations: {
        Row: {
          created_at: string
          district: string | null
          farm_size: number | null
          id: string
          inputs: Json
          irrigation_type: string | null
          recommendations: Json
          season: string | null
          soil_type: string | null
          top_crop: string | null
          updated_at: string
          user_id: string
          water_availability: string | null
          weather_snapshot: Json | null
        }
        Insert: {
          created_at?: string
          district?: string | null
          farm_size?: number | null
          id?: string
          inputs?: Json
          irrigation_type?: string | null
          recommendations: Json
          season?: string | null
          soil_type?: string | null
          top_crop?: string | null
          updated_at?: string
          user_id: string
          water_availability?: string | null
          weather_snapshot?: Json | null
        }
        Update: {
          created_at?: string
          district?: string | null
          farm_size?: number | null
          id?: string
          inputs?: Json
          irrigation_type?: string | null
          recommendations?: Json
          season?: string | null
          soil_type?: string | null
          top_crop?: string | null
          updated_at?: string
          user_id?: string
          water_availability?: string | null
          weather_snapshot?: Json | null
        }
        Relationships: []
      }
      disease_scans: {
        Row: {
          confidence: string | null
          created_at: string
          diagnosis: Json
          disease_name: string | null
          health_status: string | null
          id: string
          image_url: string | null
          language: string | null
          plant_name: string | null
          severity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          diagnosis: Json
          disease_name?: string | null
          health_status?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          plant_name?: string | null
          severity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          diagnosis?: Json
          disease_name?: string | null
          health_status?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          plant_name?: string | null
          severity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category: string
          contact_number: string
          created_at: string | null
          description: string | null
          district: string
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          owner_id: string
          price_per_day: number
          status: Database["public"]["Enums"]["equipment_status"] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          contact_number: string
          created_at?: string | null
          description?: string | null
          district: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          owner_id: string
          price_per_day: number
          status?: Database["public"]["Enums"]["equipment_status"] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          contact_number?: string
          created_at?: string | null
          description?: string | null
          district?: string
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          owner_id?: string
          price_per_day?: number
          status?: Database["public"]["Enums"]["equipment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farming_advice: {
        Row: {
          advice_type: string
          created_at: string
          crop: string | null
          crop_stage: string | null
          district: string | null
          id: string
          payload: Json
          updated_at: string
          user_id: string
          weather_snapshot: Json | null
        }
        Insert: {
          advice_type: string
          created_at?: string
          crop?: string | null
          crop_stage?: string | null
          district?: string | null
          id?: string
          payload: Json
          updated_at?: string
          user_id: string
          weather_snapshot?: Json | null
        }
        Update: {
          advice_type?: string
          created_at?: string
          crop?: string | null
          crop_stage?: string | null
          district?: string | null
          id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
          weather_snapshot?: Json | null
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          category: string
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          crop_name: string
          district: string
          id: string
          market_name: string
          price_per_quintal: number
          updated_at: string | null
        }
        Insert: {
          crop_name: string
          district: string
          id?: string
          market_name: string
          price_per_quintal: number
          updated_at?: string | null
        }
        Update: {
          crop_name?: string
          district?: string
          id?: string
          market_name?: string
          price_per_quintal?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin_reply: boolean | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin_reply?: boolean | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string | null
          district: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          district?: string | null
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          district?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          equipment_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          equipment_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          equipment_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment_owner_private"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          created_at: string
          expires_at: string
          fetched_at: string
          id: string
          latitude: number
          location_key: string
          longitude: number
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          fetched_at?: string
          id?: string
          latitude: number
          location_key: string
          longitude: number
          payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          fetched_at?: string
          id?: string
          latitude?: number
          location_key?: string
          longitude?: number
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      equipment_owner_private: {
        Row: {
          contact_number: string | null
          id: string | null
          owner_id: string | null
        }
        Insert: {
          contact_number?: string | null
          id?: string | null
          owner_id?: string | null
        }
        Update: {
          contact_number?: string | null
          id?: string | null
          owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_weather_cache: { Args: never; Returns: number }
      get_equipment_public: { Args: { equipment_id?: string }; Returns: Json[] }
      get_masked_contact: {
        Args: { contact: string; equipment_owner_id: string }
        Returns: string
      }
      get_own_profile: { Args: never; Returns: Json }
      get_owner_equipment_contact: {
        Args: { _equipment_id: string }
        Returns: string
      }
      get_safe_profile: { Args: { profile_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_auth_event: {
        Args: { _description?: string; _event_type: string }
        Returns: undefined
      }
      send_notification: {
        Args: {
          _message: string
          _reference_id?: string
          _reference_type?: string
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "completed" | "cancelled"
      equipment_status: "pending" | "approved" | "rejected" | "unavailable"
      notification_type: "booking" | "price_update" | "system" | "reminder"
      user_role: "farmer" | "equipment_owner" | "admin"
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
      booking_status: ["pending", "confirmed", "completed", "cancelled"],
      equipment_status: ["pending", "approved", "rejected", "unavailable"],
      notification_type: ["booking", "price_update", "system", "reminder"],
      user_role: ["farmer", "equipment_owner", "admin"],
    },
  },
} as const
