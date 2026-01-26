import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Lock,
  Unlock,
  LockOpen,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import {
  type MonthlyIncomeSummary,
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
  // Estimate missing docs: if documentCount >= entryCount, assume all have docs
  const estimatedMissing = summary.documentCount >= summary.entryCount ? 0 : summary.entryCount - summary.documentCount;

  return (
    <Card className={`transition-all hover:shadow-md ${isLocked ? "border-muted bg-muted/20" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            {monthLabel}
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Tax-Ready Status */}
            {isTaxReady ? (
              <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
                <CheckCircle className="h-3 w-3" />
                Tax-Ready
              </Badge>
            ) : estimatedMissing > 0 ? (
              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                <AlertCircle className="h-3 w-3" />
                {estimatedMissing} missing docs
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
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <span className="text-2xl font-bold break-all">
            {formatUGX(totalIncome)}
          </span>
        </div>

        {/* Entry Count & Documents Row */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{entryCount} entries</Badge>
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-3 w-3" />
            {summary.documentCount} documents
          </div>
          {/* Lock Status Badge */}
          {isLocked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          ) : canLock && entryCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => onLockToggle?.(taxPeriod, true)}
            >
              <LockOpen className="h-3 w-3" />
              Lock
            </Button>
          ) : null}
        </div>

        {/* Documentation Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Documentation</span>
            <span>{taxReadyPercentage}%</span>
          </div>
          <Progress value={taxReadyPercentage} className="h-2" />
        </div>

        {/* Source Breakdown - Collapsible on mobile */}
        {sourceBreakdown.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              By Source
            </p>
            <div className="grid gap-1.5">
              {sourceBreakdown.slice(0, 3).map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="truncate">{source.label}</span>
                    <span className="text-muted-foreground flex-shrink-0">({source.count})</span>
                  </div>
                  <span className="font-medium flex-shrink-0 ml-2">{formatUGX(source.total)}</span>
                </div>
              ))}
              {sourceBreakdown.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{sourceBreakdown.length - 3} more sources
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1"
            onClick={() => onViewDetails?.(taxPeriod)}
          >
            View Details
            <ChevronRight className="h-4 w-4" />
          </Button>
          {canLock && isLocked && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => onLockToggle?.(taxPeriod, false)}
            >
              <Unlock className="h-4 w-4" />
              Unlock
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
