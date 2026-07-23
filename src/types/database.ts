export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      billing_customers: {
        Row: {
          created_at: string;
          stripe_customer_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          stripe_customer_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          stripe_customer_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      daily_move_completions: {
        Row: {
          completion_kind: string;
          created_at: string;
          id: string;
          local_date: string;
          move_id: string;
          pact_id: string | null;
          reflection: string | null;
          saved_cents: number;
          stardust_awarded: number;
          user_id: string;
        };
        Insert: {
          completion_kind: string;
          created_at?: string;
          id?: string;
          local_date: string;
          move_id: string;
          pact_id?: string | null;
          reflection?: string | null;
          saved_cents?: number;
          stardust_awarded: number;
          user_id: string;
        };
        Update: {
          completion_kind?: string;
          created_at?: string;
          id?: string;
          local_date?: string;
          move_id?: string;
          pact_id?: string | null;
          reflection?: string | null;
          saved_cents?: number;
          stardust_awarded?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_move_completions_pact_id_fkey";
            columns: ["pact_id"];
            isOneToOne: false;
            referencedRelation: "savings_pacts";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_saver_progress: {
        Row: {
          best_streak: number;
          completed_moves: number;
          current_streak: number;
          last_completed_on: string | null;
          stardust_total: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          best_streak?: number;
          completed_moves?: number;
          current_streak?: number;
          last_completed_on?: string | null;
          stardust_total?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_streak?: number;
          completed_moves?: number;
          current_streak?: number;
          last_completed_on?: string | null;
          stardust_total?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          cancel_at: string | null;
          current_period_end: string | null;
          has_pro_access: boolean;
          plan: string;
          product_key: string;
          stripe_customer_id: string | null;
          stripe_price_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string;
          trial_ends_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          current_period_end?: string | null;
          has_pro_access?: boolean;
          plan?: string;
          product_key: string;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          current_period_end?: string | null;
          has_pro_access?: boolean;
          plan?: string;
          product_key?: string;
          stripe_customer_id?: string | null;
          stripe_price_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string;
          trial_ends_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goal_events: {
        Row: {
          created_at: string;
          delta_cents: number;
          goal_id: string;
          id: string;
          note: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delta_cents: number;
          goal_id: string;
          id?: string;
          note?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delta_cents?: number;
          goal_id?: string;
          id?: string;
          note?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_events_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goal_events_goal_owner_fkey";
            columns: ["goal_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      goals: {
        Row: {
          color: string | null;
          created_at: string;
          deadline_date: string | null;
          emoji: string | null;
          id: string;
          name: string;
          saved_cents: number;
          target_cents: number;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          deadline_date?: string | null;
          emoji?: string | null;
          id?: string;
          name: string;
          saved_cents?: number;
          target_cents: number;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          deadline_date?: string | null;
          emoji?: string | null;
          id?: string;
          name?: string;
          saved_cents?: number;
          target_cents?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          currency_code: string;
          display_name: string | null;
          id: string;
          monthly_savings_capacity_cents: number | null;
          pixie_theme: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          currency_code?: string;
          display_name?: string | null;
          id: string;
          monthly_savings_capacity_cents?: number | null;
          pixie_theme?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          currency_code?: string;
          display_name?: string | null;
          id?: string;
          monthly_savings_capacity_cents?: number | null;
          pixie_theme?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      savepixie_waitlist: {
        Row: {
          consent_at: string;
          created_at: string;
          dream_category: string | null;
          email: string;
          id: string;
          landing_variant: string;
          source: string;
          status: string;
          utm_campaign: string | null;
          utm_medium: string | null;
        };
        Insert: {
          consent_at?: string;
          created_at?: string;
          dream_category?: string | null;
          email: string;
          id?: string;
          landing_variant?: string;
          source?: string;
          status?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
        };
        Update: {
          consent_at?: string;
          created_at?: string;
          dream_category?: string | null;
          email?: string;
          id?: string;
          landing_variant?: string;
          source?: string;
          status?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
        };
        Relationships: [];
      };
      savings_homes: {
        Row: {
          account_hint: string | null;
          connection_status: string;
          created_at: string;
          id: string;
          label: string;
          last_verified_at: string | null;
          provider_name: string | null;
          reported_balance_cents: number | null;
          updated_at: string;
          user_id: string;
          verified_balance_cents: number | null;
        };
        Insert: {
          account_hint?: string | null;
          connection_status?: string;
          created_at?: string;
          id?: string;
          label: string;
          last_verified_at?: string | null;
          provider_name?: string | null;
          reported_balance_cents?: number | null;
          updated_at?: string;
          user_id: string;
          verified_balance_cents?: number | null;
        };
        Update: {
          account_hint?: string | null;
          connection_status?: string;
          created_at?: string;
          id?: string;
          label?: string;
          last_verified_at?: string | null;
          provider_name?: string | null;
          reported_balance_cents?: number | null;
          updated_at?: string;
          user_id?: string;
          verified_balance_cents?: number | null;
        };
        Relationships: [];
      };
      savings_pact_entries: {
        Row: {
          created_at: string;
          delta_cents: number;
          entry_type: string;
          id: string;
          member_user_id: string;
          note: string | null;
          pact_id: string;
          savings_home_id: string | null;
          source_entry_id: string | null;
          verification_state: string;
        };
        Insert: {
          created_at?: string;
          delta_cents: number;
          entry_type: string;
          id?: string;
          member_user_id: string;
          note?: string | null;
          pact_id: string;
          savings_home_id?: string | null;
          source_entry_id?: string | null;
          verification_state?: string;
        };
        Update: {
          created_at?: string;
          delta_cents?: number;
          entry_type?: string;
          id?: string;
          member_user_id?: string;
          note?: string | null;
          pact_id?: string;
          savings_home_id?: string | null;
          source_entry_id?: string | null;
          verification_state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_pact_entries_pact_id_member_user_id_fkey";
            columns: ["pact_id", "member_user_id"];
            isOneToOne: false;
            referencedRelation: "savings_pact_members";
            referencedColumns: ["pact_id", "user_id"];
          },
          {
            foreignKeyName: "savings_pact_entries_savings_home_id_member_user_id_fkey";
            columns: ["savings_home_id", "member_user_id"];
            isOneToOne: false;
            referencedRelation: "savings_homes";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "savings_pact_entries_source_entry_id_fkey";
            columns: ["source_entry_id"];
            isOneToOne: false;
            referencedRelation: "savings_pact_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      savings_pact_activity_cheers: {
        Row: {
          activity_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_pact_activity_cheers_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "savings_pact_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      savings_pact_members: {
        Row: {
          commitment_cents: number | null;
          display_name: string;
          joined_at: string;
          left_at: string | null;
          pact_id: string;
          privacy_mode: string;
          role: string;
          status: string;
          user_id: string;
        };
        Insert: {
          commitment_cents?: number | null;
          display_name: string;
          joined_at?: string;
          left_at?: string | null;
          pact_id: string;
          privacy_mode?: string;
          role: string;
          status?: string;
          user_id: string;
        };
        Update: {
          commitment_cents?: number | null;
          display_name?: string;
          joined_at?: string;
          left_at?: string | null;
          pact_id?: string;
          privacy_mode?: string;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "savings_pact_members_pact_id_fkey";
            columns: ["pact_id"];
            isOneToOne: false;
            referencedRelation: "savings_pacts";
            referencedColumns: ["id"];
          },
        ];
      };
      savings_pacts: {
        Row: {
          color: string;
          contribution_rule: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          deadline_date: string | null;
          emoji: string;
          id: string;
          mode: string;
          name: string;
          reported_cents: number;
          status: string;
          target_cents: number;
          updated_at: string;
          verified_cents: number;
        };
        Insert: {
          color?: string;
          contribution_rule?: string;
          created_at?: string;
          created_by: string;
          currency_code?: string;
          deadline_date?: string | null;
          emoji?: string;
          id?: string;
          mode: string;
          name: string;
          reported_cents?: number;
          status?: string;
          target_cents: number;
          updated_at?: string;
          verified_cents?: number;
        };
        Update: {
          color?: string;
          contribution_rule?: string;
          created_at?: string;
          created_by?: string;
          currency_code?: string;
          deadline_date?: string | null;
          emoji?: string;
          id?: string;
          mode?: string;
          name?: string;
          reported_cents?: number;
          status?: string;
          target_cents?: number;
          updated_at?: string;
          verified_cents?: number;
        };
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: {
          event_type: string;
          processed_at: string;
          stripe_event_id: string;
        };
        Insert: {
          event_type: string;
          processed_at?: string;
          stripe_event_id: string;
        };
        Update: {
          event_type?: string;
          processed_at?: string;
          stripe_event_id?: string;
        };
        Relationships: [];
      };
      weekly_plans: {
        Row: {
          available_cents: number;
          committed_cents: number;
          created_at: string;
          saving_cents: number;
          updated_at: string;
          user_id: string;
          week_start: string;
        };
        Insert: {
          available_cents?: number;
          committed_cents?: number;
          created_at?: string;
          saving_cents?: number;
          updated_at?: string;
          user_id: string;
          week_start: string;
        };
        Update: {
          available_cents?: number;
          committed_cents?: number;
          created_at?: string;
          saving_cents?: number;
          updated_at?: string;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_daily_savings_move: {
        Args: {
          p_completion_kind: string;
          p_local_date: string;
          p_move_id: string;
          p_pact_id?: string;
          p_reflection?: string;
          p_saved_cents?: number;
          p_savings_home_id?: string;
        };
        Returns: {
          best_streak: number;
          completed_moves: number;
          completion_id: string;
          completion_kind: string;
          current_streak: number;
          last_completed_on: string;
          local_date: string;
          move_id: string;
          pact_id: string | null;
          saved_cents: number;
          stardust_awarded: number;
          stardust_total: number;
          was_already_complete: boolean;
        }[];
      };
      create_savings_pact: {
        Args: {
          p_color?: string;
          p_contribution_rule?: string;
          p_deadline_date?: string;
          p_emoji?: string;
          p_mode: string;
          p_name: string;
          p_privacy_mode?: string;
          p_target_cents: number;
        };
        Returns: {
          color: string;
          contribution_rule: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          deadline_date: string | null;
          emoji: string;
          id: string;
          mode: string;
          name: string;
          reported_cents: number;
          status: string;
          target_cents: number;
          updated_at: string;
          verified_cents: number;
        };
        SetofOptions: {
          from: "*";
          to: "savings_pacts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_savings_pact_invite: {
        Args: { p_pact_id: string };
        Returns: string;
      };
      get_savings_pact_activity: {
        Args: { p_limit?: number; p_pact_id: string };
        Returns: {
          activity_id: string;
          activity_kind: string;
          actor_display_name: string;
          actor_user_id: string;
          amount_cents: number | null;
          amount_visible: boolean;
          occurred_at: string;
        }[];
      };
      get_savings_pact_activity_cheers: {
        Args: { p_pact_id: string };
        Returns: {
          activity_id: string;
          cheer_count: number;
          cheered_by_me: boolean;
        }[];
      };
      get_savings_pact_members: {
        Args: { p_pact_id: string };
        Returns: {
          amount_visible: boolean;
          commitment_cents: number;
          display_name: string;
          joined_at: string;
          left_at: string;
          member_status: string;
          on_track: boolean;
          pact_id: string;
          privacy_mode: string;
          reported_cents: number;
          role: string;
          user_id: string;
          verified_cents: number;
        }[];
      };
      join_savings_pact: {
        Args: { p_invite_token: string };
        Returns: {
          color: string;
          contribution_rule: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          deadline_date: string | null;
          emoji: string;
          id: string;
          mode: string;
          name: string;
          reported_cents: number;
          status: string;
          target_cents: number;
          updated_at: string;
          verified_cents: number;
        };
        SetofOptions: {
          from: "*";
          to: "savings_pacts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      leave_savings_pact: {
        Args: { p_pact_id: string };
        Returns: undefined;
      };
      prepare_savepixie_account_deletion: {
        Args: { p_user_id: string };
        Returns: number;
      };
      toggle_savings_pact_activity_cheer: {
        Args: { p_activity_id: string };
        Returns: boolean;
      };
      process_stripe_subscription_event: {
        Args: {
          p_cancel_at: string;
          p_current_period_end: string;
          p_customer_id: string;
          p_event_id: string;
          p_event_type: string;
          p_price_id: string;
          p_product_key: string;
          p_status: string;
          p_subscription_id: string;
          p_trial_ends_at: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      record_goal_deposit: {
        Args: { p_amount_cents: number; p_goal_id: string; p_note?: string };
        Returns: {
          color: string | null;
          created_at: string;
          deadline_date: string | null;
          emoji: string | null;
          id: string;
          name: string;
          saved_cents: number;
          target_cents: number;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "goals";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_pending_pact_save: {
        Args: {
          p_amount_cents: number;
          p_note?: string;
          p_pact_id: string;
          p_savings_home_id: string;
        };
        Returns: {
          color: string;
          contribution_rule: string;
          created_at: string;
          created_by: string;
          currency_code: string;
          deadline_date: string | null;
          emoji: string;
          id: string;
          mode: string;
          name: string;
          reported_cents: number;
          status: string;
          target_cents: number;
          updated_at: string;
          verified_cents: number;
        };
        SetofOptions: {
          from: "*";
          to: "savings_pacts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
