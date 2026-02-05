import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp, TrendingDown, Calculator, FileText } from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";
import { TaxReconciliationData } from "@/lib/reconciliationCalculations";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface TaxReconciliationSummaryProps {
  data: TaxReconciliationData;
  periodLabel: string;
  taxType: string;
}

export function TaxReconciliationSummary({
  data,
  periodLabel,
  taxType,
}: TaxReconciliationSummaryProps) {
  const { t } = useTranslation();
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);

  const hasAddBacks = data.adjustments.addBacks.length > 0;
  const hasDeductions = data.adjustments.deductions.length > 0;
  const totalAddBacks = data.adjustments.addBacks.reduce((sum, a) => sum + a.amount, 0);
  const totalDeductions = data.adjustments.deductions.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.totalIncome')}</p>
                <p className="text-2xl font-bold text-green-600">{formatUGX(data.totalIncome)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.totalExpenses')}</p>
                <p className="text-2xl font-bold text-red-600">{formatUGX(data.totalExpenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.netProfit')}</p>
                <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatUGX(data.netProfit)}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.estimatedTax')}</p>
                <p className="text-2xl font-bold text-primary">{formatUGX(data.estimatedTax)}</p>
                <Badge variant="outline" className="mt-1 text-xs">{t('reports.estimate')}</Badge>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taxable Profit Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('reports.taxableCalculation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span>{t('reports.netProfit')}</span>
              <span className="font-medium">{formatUGX(data.netProfit)}</span>
            </div>
            {totalAddBacks > 0 && (
              <div className="flex justify-between py-2 border-b text-amber-600">
                <span>{t('reports.addBacks')}</span>
                <span className="font-medium">+ {formatUGX(totalAddBacks)}</span>
              </div>
            )}
            {totalDeductions > 0 && (
              <div className="flex justify-between py-2 border-b text-green-600">
                <span>{t('reports.allowableDeductions')}</span>
                <span className="font-medium">- {formatUGX(totalDeductions)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 bg-muted/50 rounded px-2 font-bold">
              <span>{t('reports.taxableProfit')}</span>
              <span>{formatUGX(data.taxableProfit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Breakdown */}
      <Collapsible open={incomeOpen} onOpenChange={setIncomeOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  {t('reports.incomeBreakdown')}
                </CardTitle>
                <ChevronDown className={`h-5 w-5 transition-transform ${incomeOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {data.incomeBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b last:border-0">
                    <span className="capitalize">{item.source.replace('_', ' ')}</span>
                    <span className="font-medium">{formatUGX(item.amount)}</span>
                  </div>
                ))}
                {data.incomeBreakdown.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">{t('reports.noIncomeData')}</p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Expense Breakdown */}
      <Collapsible open={expenseOpen} onOpenChange={setExpenseOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  {t('reports.expenseBreakdown')}
                </CardTitle>
                <ChevronDown className={`h-5 w-5 transition-transform ${expenseOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {data.expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b last:border-0">
                    <span className="capitalize">{item.category.replace('_', ' ')}</span>
                    <span className="font-medium">{formatUGX(item.amount)}</span>
                  </div>
                ))}
                {data.expenseBreakdown.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">{t('reports.noExpenseData')}</p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Adjustments */}
      {(hasAddBacks || hasDeductions) && (
        <Collapsible open={adjustmentsOpen} onOpenChange={setAdjustmentsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-amber-600" />
                    {t('reports.adjustments')}
                    <Badge variant="secondary">{data.adjustments.addBacks.length + data.adjustments.deductions.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${adjustmentsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {hasAddBacks && (
                  <div className="mb-4">
                    <h4 className="font-medium text-amber-600 mb-2">{t('reports.addBacks')}</h4>
                    <div className="space-y-2">
                      {data.adjustments.addBacks.map((item, index) => (
                        <div key={index} className="flex justify-between py-2 border-b last:border-0 text-sm">
                          <div>
                            <span className="capitalize">{item.category.replace('_', ' ')}</span>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                          <span className="font-medium text-amber-600">+ {formatUGX(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {hasDeductions && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">{t('reports.allowableDeductions')}</h4>
                    <div className="space-y-2">
                      {data.adjustments.deductions.map((item, index) => (
                        <div key={index} className="flex justify-between py-2 border-b last:border-0 text-sm">
                          <div>
                            <span className="capitalize">{item.category.replace('_', ' ')}</span>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                          <span className="font-medium text-green-600">- {formatUGX(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>{t('reports.disclaimer')}:</strong> {t('reports.disclaimerText')}
        </p>
      </div>
    </div>
  );
}
