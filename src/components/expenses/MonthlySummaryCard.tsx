import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, TrendingUp } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  formatTaxPeriod,
  formatUGX,
  type MonthlySummary,
} from "@/lib/expenseCalculations";

interface MonthlySummaryCardProps {
  summary: MonthlySummary;
  onClick?: () => void;
}

export function MonthlySummaryCard({ summary, onClick }: MonthlySummaryCardProps) {
  // Filter categories with expenses
  const activeCategories = summary.categoryBreakdown.filter((c) => c.count > 0);

  return (
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
            {summary.isLocked && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
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
  );
}
