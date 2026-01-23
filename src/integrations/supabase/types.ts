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
      access_requests: {
        Row: {
          accountant_id: string
          business_id: string
          id: string
          message: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          accountant_id: string
          business_id: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          accountant_id?: string
          business_id?: string
          id?: string
          message?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
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
          assigned_by: string | null
          business_id: string
          can_edit: boolean
          can_generate_reports: boolean
          can_upload: boolean
          can_view: boolean
          id: string
        }
        Insert: {
          accountant_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          business_id: string
          can_edit?: boolean
          can_generate_reports?: boolean
          can_upload?: boolean
          can_view?: boolean
          id?: string
        }
        Update: {
          accountant_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          business_id?: string
          can_edit?: boolean
          can_generate_reports?: boolean
          can_upload?: boolean
          can_view?: boolean
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
          annual_turnover: number | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          created_at: string | null
          id: string
          informal_acknowledged: boolean | null
          is_deleted: boolean | null
          is_informal: boolean | null
          name: string
          onboarding_completed: boolean | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          owner_nin: string | null
          owner_phone: string | null
          tax_types: Database["public"]["Enums"]["tax_type"][] | null
          tin: string | null
          tin_verified: boolean | null
          turnover: number | null
          updated_at: string | null
          ura_tin_password: string | null
        }
        Insert: {
          address?: string | null
          annual_turnover?: number | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          id?: string
          informal_acknowledged?: boolean | null
          is_deleted?: boolean | null
          is_informal?: boolean | null
          name: string
          onboarding_completed?: boolean | null
          owner_email?: string | null
          owner_id?: string | null
          owner_name?: string | null
          owner_nin?: string | null
          owner_phone?: string | null
          tax_types?: Database["public"]["Enums"]["tax_type"][] | null
          tin?: string | null
          tin_verified?: boolean | null
          turnover?: number | null
          updated_at?: string | null
          ura_tin_password?: string | null
        }
        Update: {
          address?: string | null
          annual_turnover?: number | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          created_at?: string | null
          id?: string
          informal_acknowledged?: boolean | null
          is_deleted?: boolean | null
          is_informal?: boolean | null
          name?: string
          onboarding_completed?: boolean | null
          owner_email?: string | null
          owner_id?: string | null
          owner_name?: string | null
          owner_nin?: string | null
          owner_phone?: string | null
          tax_types?: Database["public"]["Enums"]["tax_type"][] | null
          tin?: string | null
          tin_verified?: boolean | null
          turnover?: number | null
          updated_at?: string | null
          ura_tin_password?: string | null
        }
        Relationships: []
      }
      compliance_checks: {
        Row: {
          check_type: string
          checked_at: string
          checked_by: string | null
          id: string
          message: string
          status: string
          tax_form_id: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          checked_by?: string | null
          id?: string
          message: string
          status: string
          tax_form_id: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          checked_by?: string | null
          id?: string
          message?: string
          status?: string
          tax_form_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_tax_form_id_fkey"
            columns: ["tax_form_id"]
            isOneToOne: false
            referencedRelation: "tax_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_audit_trail: {
        Row: {
          action: string
          change_summary: string | null
          changed_at: string | null
          changed_by: string
          expense_id: string
          id: string
          new_values: Json | null
          previous_values: Json | null
        }
        Insert: {
          action: string
          change_summary?: string | null
          changed_at?: string | null
          changed_by: string
          expense_id: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
        }
        Update: {
          action?: string
          change_summary?: string | null
          changed_at?: string | null
          changed_by?: string
          expense_id?: string
          id?: string
          new_values?: Json | null
          previous_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_audit_trail_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_documents: {
        Row: {
          expense_id: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          expense_id: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          expense_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          is_locked: boolean | null
          payment_method: string
          tax_period: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          business_id: string
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date: string
          id?: string
          is_locked?: boolean | null
          payment_method: string
          tax_period: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_locked?: boolean | null
          payment_method?: string
          tax_period?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          nin: string | null
          onboarding_completed: boolean | null
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
          onboarding_completed?: boolean | null
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
          onboarding_completed?: boolean | null
          phone?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      tax_form_comments: {
        Row: {
          comment: string
          comment_type: string
          created_at: string
          created_by: string
          field_name: string | null
          id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          tax_form_id: string
        }
        Insert: {
          comment: string
          comment_type?: string
          created_at?: string
          created_by: string
          field_name?: string | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          tax_form_id: string
        }
        Update: {
          comment?: string
          comment_type?: string
          created_at?: string
          created_by?: string
          field_name?: string | null
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          tax_form_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_form_comments_tax_form_id_fkey"
            columns: ["tax_form_id"]
            isOneToOne: false
            referencedRelation: "tax_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_form_documents: {
        Row: {
          description: string | null
          document_type: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          tax_form_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          document_type?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          tax_form_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          tax_form_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_form_documents_tax_form_id_fkey"
            columns: ["tax_form_id"]
            isOneToOne: false
            referencedRelation: "tax_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_form_versions: {
        Row: {
          calculated_tax: number | null
          change_summary: string | null
          changed_at: string
          changed_by: string | null
          form_data: Json
          id: string
          tax_form_id: string
          version_number: number
        }
        Insert: {
          calculated_tax?: number | null
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          form_data: Json
          id?: string
          tax_form_id: string
          version_number: number
        }
        Update: {
          calculated_tax?: number | null
          change_summary?: string | null
          changed_at?: string
          changed_by?: string | null
          form_data?: Json
          id?: string
          tax_form_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_form_versions_tax_form_id_fkey"
            columns: ["tax_form_id"]
            isOneToOne: false
            referencedRelation: "tax_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_forms: {
        Row: {
          audit_notes: string | null
          business_id: string
          calculated_tax: number | null
          created_at: string
          created_by: string | null
          due_date: string | null
          form_data: Json
          id: string
          ready_for_submission: boolean
          ready_marked_at: string | null
          ready_marked_by: string | null
          risk_level: string | null
          status: Database["public"]["Enums"]["tax_form_status"]
          submission_proof_url: string | null
          submitted_at: string | null
          submitted_by: string | null
          tax_period: string
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at: string
          ura_acknowledgement_number: string | null
          ura_submission_date: string | null
          validation_errors: Json | null
        }
        Insert: {
          audit_notes?: string | null
          business_id: string
          calculated_tax?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          form_data?: Json
          id?: string
          ready_for_submission?: boolean
          ready_marked_at?: string | null
          ready_marked_by?: string | null
          risk_level?: string | null
          status?: Database["public"]["Enums"]["tax_form_status"]
          submission_proof_url?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period: string
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
          ura_acknowledgement_number?: string | null
          ura_submission_date?: string | null
          validation_errors?: Json | null
        }
        Update: {
          audit_notes?: string | null
          business_id?: string
          calculated_tax?: number | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          form_data?: Json
          id?: string
          ready_for_submission?: boolean
          ready_marked_at?: string | null
          ready_marked_by?: string | null
          risk_level?: string | null
          status?: Database["public"]["Enums"]["tax_form_status"]
          submission_proof_url?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period?: string
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string
          ura_acknowledgement_number?: string | null
          ura_submission_date?: string | null
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
      tax_payments: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string | null
          due_date: string | null
          id: string
          payment_date: string | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          status: string | null
          tax_form_id: string
          updated_at: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          status?: string | null
          tax_form_id: string
          updated_at?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          status?: string | null
          tax_form_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_payments_tax_form_id_fkey"
            columns: ["tax_form_id"]
            isOneToOne: false
            referencedRelation: "tax_forms"
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
      can_access_expense: {
        Args: { _expense_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_tax_form: {
        Args: { _form_id: string; _user_id: string }
        Returns: boolean
      }
      can_accountant_edit: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      can_accountant_upload: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      get_accountant_permissions: {
        Args: { _business_id: string; _user_id: string }
        Returns: {
          can_edit: boolean
          can_generate_reports: boolean
          can_upload: boolean
          can_view: boolean
        }[]
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
      lookup_accountant_by_email: {
        Args: { lookup_email: string }
        Returns: {
          email: string
          id: string
          is_accountant: boolean
          name: string
        }[]
      }
      search_existing_profiles: {
        Args: { search_term: string }
        Returns: {
          email: string
          id: string
          name: string
          nin: string
          phone: string
        }[]
      }
      validate_nin_format: { Args: { nin: string }; Returns: boolean }
      validate_tin_format: { Args: { tin: string }; Returns: boolean }
      validate_uganda_phone: { Args: { phone: string }; Returns: boolean }
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
