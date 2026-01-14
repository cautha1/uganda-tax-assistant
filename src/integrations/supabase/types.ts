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
      audit_logs: {
        Row: {
          action: string
          business_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_accountants: {
        Row: {
          accountant_id: string
          assigned_at: string | null
          business_id: string
          id: string
        }
        Insert: {
          accountant_id: string
          assigned_at?: string | null
          business_id: string
          id?: string
        }
        Update: {
          accountant_id?: string
          assigned_at?: string | null
          business_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_accountants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_informal: boolean | null
          name: string
          owner_id: string | null
          tax_types: Database["public"]["Enums"]["tax_type"][] | null
          tin: string
          turnover: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_informal?: boolean | null
          name: string
          owner_id?: string | null
          tax_types?: Database["public"]["Enums"]["tax_type"][] | null
          tin: string
          turnover?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_informal?: boolean | null
          name?: string
          owner_id?: string | null
          tax_types?: Database["public"]["Enums"]["tax_type"][] | null
          tin?: string
          turnover?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          nin: string | null
          phone: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          nin?: string | null
          phone?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          nin?: string | null
          phone?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      tax_forms: {
        Row: {
          business_id: string
          calculated_tax: number | null
          created_at: string
          created_by: string | null
          form_data: Json
          id: string
          status: Database["public"]["Enums"]["tax_form_status"]
          submitted_at: string | null
          submitted_by: string | null
          tax_period: string
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at: string
          validation_errors: Json | null
        }
        Insert: {
          business_id: string
          calculated_tax?: number | null
          created_at?: string
          created_by?: string | null
          form_data?: Json
          id?: string
          status?: Database["public"]["Enums"]["tax_form_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period: string
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
          validation_errors?: Json | null
        }
        Update: {
          business_id?: string
          calculated_tax?: number | null
          created_at?: string
          created_by?: string | null
          form_data?: Json
          id?: string
          status?: Database["public"]["Enums"]["tax_form_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period?: string
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_forms_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_tax_form: {
        Args: { _form_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_accountant: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "sme_owner" | "accountant" | "admin" | "guest"
      business_type:
        | "sole_proprietorship"
        | "partnership"
        | "limited_company"
        | "ngo"
        | "cooperative"
        | "other"
      feedback_type: "challenge" | "solution" | "general"
      tax_form_status: "draft" | "validated" | "error" | "submitted"
      tax_type: "paye" | "income" | "presumptive" | "vat" | "other"
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
      app_role: ["sme_owner", "accountant", "admin", "guest"],
      business_type: [
        "sole_proprietorship",
        "partnership",
        "limited_company",
        "ngo",
        "cooperative",
        "other",
      ],
      feedback_type: ["challenge", "solution", "general"],
      tax_form_status: ["draft", "validated", "error", "submitted"],
      tax_type: ["paye", "income", "presumptive", "vat", "other"],
    },
  },
} as const
