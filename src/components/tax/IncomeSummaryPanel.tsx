import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp, AlertCircle } from "lucide-react";
import {
  type Income,
  type IncomeSource,
  INCOME_SOURCES,
  calculateTotalIncome,
  calculateSourceSubtotals,
  formatUGX,
} from "@/lib/incomeCalculations";

interface IncomeSummaryPanelProps {
  businessId: string;
  taxPeriod: string; // Format: "2026-01" for monthly, "2025" for annual
  taxType: "paye" | "income" | "presumptive" | "vat" | "other";
}

// Map tax types to whether they use income data
const INCOME_RELEVANT_TAX_TYPES = ["income", "presumptive"];

export function IncomeSummaryPanel({
  businessId,
  taxPeriod,
  taxType,
}: IncomeSummaryPanelProps) {
  const [incomeEntries, setIncomeEntries] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIncome() {
      if (!businessId || !taxPeriod) return;

      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("income")
          .select("*")
          .eq("business_id", businessId)
          .order("income_date", { ascending: false });

        if (taxPeriod.length === 4) {
          // Annual period (e.g., "2025")
          query = query
            .gte("tax_period", `${taxPeriod}-01`)
            .lte("tax_period", `${taxPeriod}-12`);
        } else {
          // Monthly period (e.g., "2026-01")
          query = query.eq("tax_period", taxPeriod);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setIncomeEntries((data as Income[]) || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load income";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchIncome();
  }, [businessId, taxPeriod]);

  // Check if income is relevant for this tax type
  const isIncomeRelevant = INCOME_RELEVANT_TAX_TYPES.includes(taxType);

  const totalIncome = calculateTotalIncome(incomeEntries);
  const sourceBreakdown = calculateSourceSubtotals(incomeEntries).filter(
    (s) => s.count > 0
  );

  // Don't show panel for tax types that don't use income
  if (!isIncomeRelevant) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mt-6 border-dashed">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6 border-dashed border-destructive/50">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const periodLabel =
    taxPeriod.length === 4
      ? `Year ${taxPeriod}`
      : new Date(`${taxPeriod}-01`).toLocaleDateString("en-UG", {
          month: "long",
          year: "numeric",
        });

  return (
    <Card className="mt-6 border-dashed border-green-500/30 bg-green-500/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-medium">
                  Recorded Income
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {periodLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-green-600">
                  {formatUGX(totalIncome)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {incomeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No income recorded for this period. Add income entries to see
                your gross income for tax calculations.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Total Entries</p>
                      <p className="font-medium">{incomeEntries.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-muted-foreground">Gross Income</p>
                      <p className="font-medium text-green-600">
                        {formatUGX(totalIncome)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Source breakdown */}
                {sourceBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      By Source
                    </p>
                    <div className="grid gap-2">
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
                            <span className="text-muted-foreground">
                              ({source.count})
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatUGX(source.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note about integration */}
                <p className="text-xs text-muted-foreground border-t pt-3">
                  <Badge variant="outline" className="mr-1 text-xs">
                    System-calculated
                  </Badge>
                  These figures are derived from your recorded income entries
                  and may be used for tax return calculations.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
