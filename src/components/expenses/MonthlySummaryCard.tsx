import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Lock, TrendingUp, CheckCircle, AlertCircle, LockOpen } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  formatTaxPeriod,
  formatUGX,
  isPastTaxPeriod,
  type MonthlySummary,
  type Expense,
} from "@/lib/expenseCalculations";
import { calculateTaxReadyStatus, type TaxReadyStatus } from "@/lib/expenseReportHelpers";
import { LockMonthDialog } from "./LockMonthDialog";

interface MonthlySummaryCardProps {
  summary: MonthlySummary;
  expenses?: Expense[];
  documentCounts?: Record<string, number>;
  businessId?: string;
  isOwner?: boolean;
  onClick?: () => void;
  onLocked?: () => void;
}

export function MonthlySummaryCard({
  summary,
  expenses = [],
  documentCounts = {},
  businessId,
  isOwner = false,
  onClick,
  onLocked,
}: MonthlySummaryCardProps) {
  const [showLockDialog, setShowLockDialog] = useState(false);

  // Filter categories with expenses
  const activeCategories = summary.categoryBreakdown.filter((c) => c.count > 0);

  // Calculate tax-ready status
  const taxStatus: TaxReadyStatus | null = expenses.length > 0
    ? calculateTaxReadyStatus(expenses, documentCounts)
    : null;

  const isPast = isPastTaxPeriod(summary.taxPeriod);
  const canLock = isOwner && isPast && !summary.isLocked && summary.expenseCount > 0;

  const handleLockClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLockDialog(true);
  };

  return (
    <>
      <Card
        className={`transition-all ${onClick ? "cursor-pointer hover:shadow-md" : ""}`}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium">
              {formatTaxPeriod(summary.taxPeriod)}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Tax-Ready Status Badge */}
              {taxStatus && (
                <>
                  {taxStatus.isReady ? (
                    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Tax-Ready
                    </Badge>
                  ) : taxStatus.missingDocCount > 0 ? (
                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                      <AlertCircle className="h-3 w-3" />
                      {taxStatus.missingDocCount} missing docs
                    </Badge>
                  ) : null}
                </>
              )}

              {summary.isLocked ? (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              ) : canLock ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleLockClick}
                >
                  <LockOpen className="h-3 w-3" />
                  Lock
                </Button>
              ) : null}

              <Badge variant="outline">{summary.expenseCount} expenses</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">
              {formatUGX(summary.totalExpenses)}
            </span>
          </div>

          {/* Documentation Progress */}
          {taxStatus && taxStatus.totalCount > 0 && (
            <div className="mb-4 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Documentation</span>
                <span className="font-medium">
                  {taxStatus.documentedCount}/{taxStatus.totalCount}
                </span>
              </div>
              <Progress
                value={(taxStatus.documentedCount / taxStatus.totalCount) * 100}
                className="h-1.5"
              />
            </div>
          )}

          {activeCategories.length > 0 && (
            <div className="space-y-2">
              {activeCategories.slice(0, 4).map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="font-medium">{formatUGX(cat.total)}</span>
                  </div>
                  <Progress
                    value={cat.percentage}
                    className="h-1.5"
                    style={{
                      // @ts-expect-error Custom CSS property for progress color
                      "--progress-foreground": EXPENSE_CATEGORIES[cat.category].color,
                    }}
                  />
                </div>
              ))}
              {activeCategories.length > 4 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{activeCategories.length - 4} more categories
                </p>
              )}
            </div>
          )}

          {activeCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No expenses recorded
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lock Dialog */}
      {businessId && (
        <LockMonthDialog
          open={showLockDialog}
          onOpenChange={setShowLockDialog}
          businessId={businessId}
          taxPeriod={summary.taxPeriod}
          expenseCount={summary.expenseCount}
          onLocked={() => onLocked?.()}
        />
      )}
    </>
  );
}
