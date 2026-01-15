import { formatUGX, TaxType } from "@/lib/taxCalculations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, Clock } from "lucide-react";

interface PaymentCalculatorProps {
  taxAmount: number;
  taxType: TaxType;
  taxPeriod: string;
  dueDate?: Date;
}

const LATE_PAYMENT_PENALTY_RATE = 0.02; // 2% per month
const INTEREST_RATE_PER_MONTH = 0.02; // 2% simple interest per month

function getDueDate(taxType: TaxType, taxPeriod: string): Date {
  const currentYear = new Date().getFullYear();
  
  switch (taxType) {
    case "paye":
    case "vat": {
      // Due by 15th of following month
      const [year, month] = taxPeriod.split("-").map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      return new Date(nextYear, nextMonth - 1, 15);
    }
    case "income":
    case "presumptive": {
      // Due by 30th June of following year
      const year = parseInt(taxPeriod);
      return new Date(year + 1, 5, 30); // June 30
    }
    default:
      return new Date(currentYear, 11, 31);
  }
}

function getMonthsOverdue(dueDate: Date): number {
  const today = new Date();
  if (today <= dueDate) return 0;
  
  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.ceil(diffDays / 30);
}

export function PaymentCalculator({
  taxAmount,
  taxType,
  taxPeriod,
  dueDate: providedDueDate,
}: PaymentCalculatorProps) {
  const dueDate = providedDueDate || getDueDate(taxType, taxPeriod);
  const monthsOverdue = getMonthsOverdue(dueDate);
  const isOverdue = monthsOverdue > 0;

  const penalty = isOverdue
    ? taxAmount * LATE_PAYMENT_PENALTY_RATE * monthsOverdue
    : 0;
  const interest = isOverdue
    ? taxAmount * INTEREST_RATE_PER_MONTH * monthsOverdue
    : 0;
  const totalDue = taxAmount + penalty + interest;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-UG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      {/* Due Date Banner */}
      <div
        className={`p-4 rounded-lg flex items-center gap-3 ${
          isOverdue
            ? "bg-destructive/10 border border-destructive/20"
            : daysUntilDue <= 7
            ? "bg-warning/10 border border-warning/20"
            : "bg-primary/10 border border-primary/20"
        }`}
      >
        <Calendar
          className={`h-5 w-5 ${
            isOverdue
              ? "text-destructive"
              : daysUntilDue <= 7
              ? "text-warning"
              : "text-primary"
          }`}
        />
        <div className="flex-1">
          <p className="font-medium">
            Due Date: {formatDate(dueDate)}
          </p>
          <p
            className={`text-sm ${
              isOverdue
                ? "text-destructive"
                : daysUntilDue <= 7
                ? "text-warning"
                : "text-muted-foreground"
            }`}
          >
            {isOverdue
              ? `${monthsOverdue} month(s) overdue`
              : daysUntilDue <= 0
              ? "Due today"
              : `${daysUntilDue} days remaining`}
          </p>
        </div>
      </div>

      {/* Penalty Warning */}
      {isOverdue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Late payment attracts a penalty of 2% per month on the tax amount.
            Your current penalty: {formatUGX(penalty)}
          </AlertDescription>
        </Alert>
      )}

      {/* Payment Breakdown */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/50">
          <h3 className="font-semibold">Payment Breakdown</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Principal Tax</span>
            <span className="font-medium">{formatUGX(taxAmount)}</span>
          </div>
          
          {isOverdue && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Late Payment Penalty (2% × {monthsOverdue} months)
                </span>
                <span className="font-medium text-destructive">
                  + {formatUGX(penalty)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Interest (2% × {monthsOverdue} months)
                </span>
                <span className="font-medium text-destructive">
                  + {formatUGX(interest)}
                </span>
              </div>
            </>
          )}

          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold">Total Amount Due</span>
            <span className="text-xl font-bold text-primary">
              {formatUGX(totalDue)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Notes */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>
          <Clock className="h-3.5 w-3.5 inline mr-1" />
          Payments typically reflect within 24-48 hours
        </p>
        <p>
          • Keep your payment receipt for verification
        </p>
        <p>
          • Reference: TIN + Tax Type + Period
        </p>
      </div>
    </div>
  );
}
