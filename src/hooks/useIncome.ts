import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type {
  Income,
  IncomeDocument,
  IncomeAuditEntry,
  IncomeSource,
  IncomePaymentMethod,
} from "@/lib/incomeCalculations";

export interface IncomeFormData {
  income_date: string;
  source: IncomeSource;
  source_name?: string;
  description?: string;
  amount: number;
  payment_method: IncomePaymentMethod;
}

interface UseIncomeProps {
  businessId: string;
}

export function useIncome({ businessId }: UseIncomeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [incomeEntries, setIncomeEntries] = useState<Income[]>([]);

  const fetchIncome = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("income")
        .select("*")
        .eq("business_id", businessId)
        .order("income_date", { ascending: false });

      if (error) throw error;
      setIncomeEntries((data as Income[]) || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load income";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast]);

  const createIncome = async (
    formData: IncomeFormData,
    taxPeriod: string
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create income entries",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("income")
        .insert({
          business_id: businessId,
          income_date: formData.income_date,
          source: formData.source,
          source_name: formData.source_name || null,
          description: formData.description || null,
          amount: formData.amount,
          payment_method: formData.payment_method,
          tax_period: taxPeriod,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log to audit trail (types will be updated after migration)
      await (supabase.from("income_audit_trail") as any).insert([{
        income_id: data.id,
        action: "created",
        changed_by: user.id,
        new_values: formData,
        change_summary: `Created income: ${formData.source} - ${formData.amount}`,
      }]);

      toast({
        title: "Success",
        description: "Income entry created successfully",
      });

      await fetchIncome();
      return data.id;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create income";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateIncome = async (
    incomeId: string,
    formData: IncomeFormData,
    previousValues: Partial<Income>
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update income entries",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("income")
        .update({
          income_date: formData.income_date,
          source: formData.source,
          source_name: formData.source_name || null,
          description: formData.description || null,
          amount: formData.amount,
          payment_method: formData.payment_method,
        })
        .eq("id", incomeId)
        .eq("is_locked", false);

      if (error) throw error;

      // Log to audit trail
      await (supabase.from("income_audit_trail") as any).insert([{
        income_id: incomeId,
        action: "updated",
        changed_by: user.id,
        previous_values: previousValues,
        new_values: formData,
        change_summary: `Updated income: ${formData.source} - ${formData.amount}`,
      }]);

      toast({
        title: "Success",
        description: "Income entry updated successfully",
      });

      await fetchIncome();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update income";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteIncome = async (income: Income): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to delete income entries",
        variant: "destructive",
      });
      return false;
    }

    if (income.is_locked) {
      toast({
        title: "Error",
        description: "Cannot delete a locked income entry",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Log to audit trail before deletion
      await (supabase.from("income_audit_trail") as any).insert([{
        income_id: income.id,
        action: "deleted",
        changed_by: user.id,
        previous_values: income,
        change_summary: `Deleted income: ${income.source} - ${income.amount}`,
      }]);

      const { error } = await supabase
        .from("income")
        .delete()
        .eq("id", income.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Income entry deleted successfully",
      });

      await fetchIncome();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete income";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const lockMonth = async (taxPeriod: string, lock: boolean): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to lock/unlock months",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("income")
        .update({ is_locked: lock })
        .eq("business_id", businessId)
        .eq("tax_period", taxPeriod);

      if (error) throw error;

      // Log audit entry for each affected record
      const affectedEntries = incomeEntries.filter((e) => e.tax_period === taxPeriod);
      for (const entry of affectedEntries) {
        await (supabase.from("income_audit_trail") as any).insert([{
          income_id: entry.id,
          action: lock ? "locked" : "unlocked",
          changed_by: user.id,
          change_summary: `Month ${lock ? "locked" : "unlocked"}: ${taxPeriod}`,
        }]);
      }

      toast({
        title: "Success",
        description: `Month ${lock ? "locked" : "unlocked"} successfully`,
      });

      await fetchIncome();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${lock ? "lock" : "unlock"} month`;
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIncomeDocuments = async (
    incomeId: string
  ): Promise<IncomeDocument[]> => {
    try {
      const { data, error } = await supabase
        .from("income_documents")
        .select("*")
        .eq("income_id", incomeId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return (data as IncomeDocument[]) || [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load documents";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchIncomeAuditTrail = async (
    incomeId: string
  ): Promise<IncomeAuditEntry[]> => {
    try {
      const { data, error } = await supabase
        .from("income_audit_trail")
        .select("*")
        .eq("income_id", incomeId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return (data as IncomeAuditEntry[]) || [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load audit trail";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      return [];
    }
  };

  return {
    incomeEntries,
    isLoading,
    fetchIncome,
    createIncome,
    updateIncome,
    deleteIncome,
    lockMonth,
    fetchIncomeDocuments,
    fetchIncomeAuditTrail,
  };
}
