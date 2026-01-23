import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Lock, AlertTriangle } from "lucide-react";
import { formatTaxPeriod } from "@/lib/expenseCalculations";

interface LockMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  taxPeriod: string;
  expenseCount: number;
  onLocked: () => void;
}

export function LockMonthDialog({
  open,
  onOpenChange,
  businessId,
  taxPeriod,
  expenseCount,
  onLocked,
}: LockMonthDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLocking, setIsLocking] = useState(false);

  const handleLock = async () => {
    if (!user) return;

    setIsLocking(true);
    try {
      // Get all expense IDs for this period
      const { data: expenses, error: fetchError } = await supabase
        .from("expenses")
        .select("id")
        .eq("business_id", businessId)
        .eq("tax_period", taxPeriod)
        .eq("is_locked", false);

      if (fetchError) throw fetchError;

      if (!expenses || expenses.length === 0) {
        toast({
          title: "No expenses to lock",
          description: "All expenses in this period are already locked.",
        });
        onOpenChange(false);
        return;
      }

      // Update all expenses to locked
      const { error: updateError } = await supabase
        .from("expenses")
        .update({ is_locked: true })
        .eq("business_id", businessId)
        .eq("tax_period", taxPeriod)
        .eq("is_locked", false);

      if (updateError) throw updateError;

      // Log to audit trail for each expense
      const auditEntries = expenses.map((expense) => ({
        expense_id: expense.id,
        action: "locked",
        changed_by: user.id,
        change_summary: `Expense locked as part of ${formatTaxPeriod(taxPeriod)} period lock`,
      }));

      await supabase.from("expense_audit_trail").insert(auditEntries);

      toast({
        title: "Month Locked",
        description: `${expenses.length} expense(s) in ${formatTaxPeriod(taxPeriod)} have been locked.`,
      });

      onLocked();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to lock month";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Lock {formatTaxPeriod(taxPeriod)}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to lock all expenses for{" "}
                <strong>{formatTaxPeriod(taxPeriod)}</strong>.
              </p>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">This action cannot be undone!</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Locked expenses cannot be edited or deleted</li>
                    <li>No new documents can be uploaded to locked expenses</li>
                    <li>This is typically done after tax filing</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm">
                <strong>{expenseCount}</strong> expense(s) will be locked.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLocking}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleLock();
            }}
            disabled={isLocking}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Locking...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Lock Month
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
