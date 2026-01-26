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
import { Lock, Unlock } from "lucide-react";
import { formatTaxPeriod } from "@/lib/incomeCalculations";

interface LockIncomeMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxPeriod: string;
  isLocking: boolean;
  onConfirm: () => void;
}

export function LockIncomeMonthDialog({
  open,
  onOpenChange,
  taxPeriod,
  isLocking,
  onConfirm,
}: LockIncomeMonthDialogProps) {
  const monthLabel = formatTaxPeriod(taxPeriod);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isLocking ? (
              <Lock className="h-5 w-5" />
            ) : (
              <Unlock className="h-5 w-5" />
            )}
            {isLocking ? "Lock" : "Unlock"} {monthLabel}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLocking ? (
              <>
                Locking this month will prevent any further edits or deletions to
                income entries for {monthLabel}. This is recommended after
                reconciling your records for tax purposes.
              </>
            ) : (
              <>
                Unlocking this month will allow editing and deletion of income
                entries for {monthLabel}. Any changes will be logged in the audit
                trail.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {isLocking ? "Lock Month" : "Unlock Month"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
