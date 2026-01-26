import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lock,
  Unlock,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  type MonthlyIncomeSummary,
  INCOME_SOURCES,
  formatUGX,
} from "@/lib/incomeCalculations";

interface MonthlyIncomeSummaryCardProps {
  summary: MonthlyIncomeSummary;
  onLockToggle?: (taxPeriod: string, lock: boolean) => void;
  onViewDetails?: (taxPeriod: string) => void;
  canLock?: boolean;
  taxReadyPercentage?: number;
}

export function MonthlyIncomeSummaryCard({
  summary,
  onLockToggle,
  onViewDetails,
  canLock = true,
  taxReadyPercentage = 0,
}: MonthlyIncomeSummaryCardProps) {
  const { taxPeriod, totalIncome, entryCount, isLocked, sourceBreakdown } = summary;

  const monthLabel = new Date(
    parseInt(summary.year),
    parseInt(summary.month) - 1,
    1
  ).toLocaleDateString("en-UG", { month: "long", year: "numeric" });

  const isTaxReady = taxReadyPercentage === 100;

  return (
    <Card className={`${isLocked ? "border-muted bg-muted/20" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {monthLabel}
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isTaxReady ? (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle className="h-3 w-3" />
                Tax-Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {taxReadyPercentage}% Ready
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Income */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Total Income</span>
          </div>
          <span className="text-xl font-bold text-primary break-all">
            {formatUGX(totalIncome)}
          </span>
        </div>

        {/* Entry Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{entryCount} entries</span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-3 w-3" />
            {summary.documentCount} documents
          </div>
        </div>

        {/* Tax-Ready Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Documentation</span>
            <span>{taxReadyPercentage}%</span>
          </div>
          <Progress value={taxReadyPercentage} className="h-2" />
        </div>

        {/* Source Breakdown */}
        {sourceBreakdown.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              By Source
            </p>
            <div className="grid gap-1.5">
              {sourceBreakdown.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: source.color }}
                    />
                    <span>{source.label}</span>
                    <span className="text-muted-foreground">({source.count})</span>
                  </div>
                  <span className="font-medium">{formatUGX(source.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails?.(taxPeriod)}
          >
            View Details
          </Button>
          {canLock && (
            <Button
              variant={isLocked ? "default" : "secondary"}
              size="sm"
              onClick={() => onLockToggle?.(taxPeriod, !isLocked)}
            >
              {isLocked ? (
                <>
                  <Unlock className="h-4 w-4 mr-1" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Lock
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
