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
import { ChevronDown, Receipt, TrendingDown, AlertCircle } from "lucide-react";
import {
  type Expense,
  type ExpenseCategory,
  EXPENSE_CATEGORIES,
  calculateTotalExpenses,
  calculateCategorySubtotals,
  formatUGX,
} from "@/lib/expenseCalculations";

interface ExpenseSummaryPanelProps {
  businessId: string;
  taxPeriod: string; // Format: "2026-01" for monthly, "2025" for annual
  taxType: "paye" | "income" | "presumptive" | "vat" | "other";
}

// Map expense categories to deductibility based on tax type
const DEDUCTIBLE_CATEGORIES: Record<string, ExpenseCategory[]> = {
  income: ["rent", "utilities", "transport", "supplies", "salaries", "other"],
  presumptive: ["rent", "utilities", "supplies"],
  paye: [], // PAYE doesn't use business expense deductions
  vat: [], // VAT uses input tax credits, not expense deductions
  other: [],
};

export function ExpenseSummaryPanel({
  businessId,
  taxPeriod,
  taxType,
}: ExpenseSummaryPanelProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExpenses() {
      if (!businessId || !taxPeriod) return;

      setIsLoading(true);
      setError(null);

      try {
        // For annual tax (income tax), fetch all months in the year
        // For monthly tax, fetch just the specific month
        let query = supabase
          .from("expenses")
          .select("*")
          .eq("business_id", businessId)
          .order("expense_date", { ascending: false });

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
        setExpenses((data as Expense[]) || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load expenses";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExpenses();
  }, [businessId, taxPeriod]);

  // Calculate which expenses are deductible for this tax type
  const deductibleCategories = DEDUCTIBLE_CATEGORIES[taxType] || [];
  const isDeductibleTaxType = deductibleCategories.length > 0;

  const deductibleExpenses = useMemo(() => {
    if (!isDeductibleTaxType) return [];
    return expenses.filter((e) => deductibleCategories.includes(e.category));
  }, [expenses, deductibleCategories, isDeductibleTaxType]);

  const totalExpenses = calculateTotalExpenses(expenses);
  const totalDeductible = calculateTotalExpenses(deductibleExpenses);
  const categoryBreakdown = calculateCategorySubtotals(
    isDeductibleTaxType ? deductibleExpenses : expenses
  ).filter((c) => c.count > 0);

  // Don't show panel for tax types that don't use expense deductions
  if (!isDeductibleTaxType) {
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
    <Card className="mt-6 border-dashed border-primary/30 bg-primary/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">
                  Deductible Expenses
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {periodLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary">
                  {formatUGX(totalDeductible)}
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
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No expenses recorded for this period. Add expenses to see
                potential deductions.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Total Recorded</p>
                      <p className="font-medium">{formatUGX(totalExpenses)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-muted-foreground">Deductible</p>
                      <p className="font-medium text-primary">
                        {formatUGX(totalDeductible)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                {categoryBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      By Category
                    </p>
                    <div className="grid gap-2">
                      {categoryBreakdown.map((cat) => (
                        <div
                          key={cat.category}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  EXPENSE_CATEGORIES[cat.category as ExpenseCategory]
                                    .color,
                              }}
                            />
                            <span>{cat.label}</span>
                            <span className="text-muted-foreground">
                              ({cat.count})
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatUGX(cat.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note about deductibility */}
                <p className="text-xs text-muted-foreground border-t pt-3">
                  {taxType === "income"
                    ? "These expenses may be deductible from your gross income. Consult with a tax professional for specific advice."
                    : "These expenses are summarized for your reference. Deductibility varies by business type."}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
