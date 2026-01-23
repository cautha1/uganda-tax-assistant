import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type {
  Expense,
  ExpenseDocument,
  ExpenseAuditEntry,
  ExpenseCategory,
  PaymentMethod,
} from "@/lib/expenseCalculations";

export interface ExpenseFormData {
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
}

interface UseExpensesProps {
  businessId: string;
}

export function useExpenses({ businessId }: UseExpensesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const fetchExpenses = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("business_id", businessId)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses((data as Expense[]) || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load expenses";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast]);

  const createExpense = async (
    formData: ExpenseFormData,
    taxPeriod: string
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create expenses",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          business_id: businessId,
          expense_date: formData.expense_date,
          category: formData.category,
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
      await (supabase.from("expense_audit_trail") as any).insert([{
        expense_id: data.id,
        action: "created",
        changed_by: user.id,
        new_values: formData,
        change_summary: `Created expense: ${formData.category} - ${formData.amount}`,
      }]);

      toast({
        title: "Success",
        description: "Expense created successfully",
      });

      await fetchExpenses();
      return data.id;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create expense";
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

  const updateExpense = async (
    expenseId: string,
    formData: ExpenseFormData,
    previousValues: Partial<Expense>
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update expenses",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          expense_date: formData.expense_date,
          category: formData.category,
          description: formData.description || null,
          amount: formData.amount,
          payment_method: formData.payment_method,
        })
        .eq("id", expenseId)
        .eq("is_locked", false);

      if (error) throw error;

      // Log to audit trail
      await (supabase.from("expense_audit_trail") as any).insert([{
        expense_id: expenseId,
        action: "updated",
        changed_by: user.id,
        previous_values: previousValues,
        new_values: formData,
        change_summary: `Updated expense: ${formData.category} - ${formData.amount}`,
      }]);

      toast({
        title: "Success",
        description: "Expense updated successfully",
      });

      await fetchExpenses();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update expense";
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

  const deleteExpense = async (expense: Expense): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to delete expenses",
        variant: "destructive",
      });
      return false;
    }

    if (expense.is_locked) {
      toast({
        title: "Error",
        description: "Cannot delete a locked expense",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      // Log to audit trail before deletion
      await (supabase.from("expense_audit_trail") as any).insert([{
        expense_id: expense.id,
        action: "deleted",
        changed_by: user.id,
        previous_values: expense,
        change_summary: `Deleted expense: ${expense.category} - ${expense.amount}`,
      }]);

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });

      await fetchExpenses();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete expense";
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

  const fetchExpenseDocuments = async (
    expenseId: string
  ): Promise<ExpenseDocument[]> => {
    try {
      const { data, error } = await supabase
        .from("expense_documents")
        .select("*")
        .eq("expense_id", expenseId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return (data as ExpenseDocument[]) || [];
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

  const fetchExpenseAuditTrail = async (
    expenseId: string
  ): Promise<ExpenseAuditEntry[]> => {
    try {
      const { data, error } = await supabase
        .from("expense_audit_trail")
        .select("*")
        .eq("expense_id", expenseId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return (data as ExpenseAuditEntry[]) || [];
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
    expenses,
    isLoading,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    fetchExpenseDocuments,
    fetchExpenseAuditTrail,
  };
}
