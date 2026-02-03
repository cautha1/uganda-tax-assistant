import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PAYE_MONTHLY_BRACKETS } from "@/lib/uraTemplates";
import { formatUGX } from "@/lib/taxCalculations";
import { Calculator, TrendingDown, Percent } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface PAYEResult {
  grossSalary: number;
  nssfDeduction: number;
  taxableIncome: number;
  taxPayable: number;
  netSalary: number;
  effectiveRate: number;
  currentBracket: typeof PAYE_MONTHLY_BRACKETS[0] | null;
}

export function PAYECalculator() {
  const { t } = useTranslation();
  const [grossSalary, setGrossSalary] = useState<number>(0);
  const [allowances, setAllowances] = useState<number>(0);
  const [nssfRate, setNssfRate] = useState<number>(5);

  const result = useMemo<PAYEResult>(() => {
    const totalGross = grossSalary + allowances;
    const nssfDeduction = Math.min(totalGross * (nssfRate / 100), 250000); // NSSF capped at 250k
    const taxableIncome = Math.max(0, totalGross - nssfDeduction);

    let taxPayable = 0;
    let currentBracket: typeof PAYE_MONTHLY_BRACKETS[0] | null = null;

    // Calculate PAYE using progressive rates
    if (taxableIncome > 410000) {
      // Tax on amounts above 410,000
      if (taxableIncome > 10000000) {
        taxPayable += (taxableIncome - 10000000) * 0.4;
        taxPayable += (10000000 - 410000) * 0.3;
        currentBracket = PAYE_MONTHLY_BRACKETS[4];
      } else {
        taxPayable += (taxableIncome - 410000) * 0.3;
        currentBracket = PAYE_MONTHLY_BRACKETS[3];
      }
      // Tax on 335,001 - 410,000 (20%)
      taxPayable += (410000 - 335000) * 0.2;
      // Tax on 235,001 - 335,000 (10%)
      taxPayable += (335000 - 235000) * 0.1;
    } else if (taxableIncome > 335000) {
      taxPayable += (taxableIncome - 335000) * 0.2;
      taxPayable += (335000 - 235000) * 0.1;
      currentBracket = PAYE_MONTHLY_BRACKETS[2];
    } else if (taxableIncome > 235000) {
      taxPayable += (taxableIncome - 235000) * 0.1;
      currentBracket = PAYE_MONTHLY_BRACKETS[1];
    } else {
      currentBracket = PAYE_MONTHLY_BRACKETS[0];
    }

    const netSalary = totalGross - nssfDeduction - taxPayable;
    const effectiveRate = totalGross > 0 ? (taxPayable / totalGross) * 100 : 0;

    return {
      grossSalary: totalGross,
      nssfDeduction,
      taxableIncome,
      taxPayable: Math.round(taxPayable),
      netSalary: Math.round(netSalary),
      effectiveRate,
      currentBracket,
    };
  }, [grossSalary, allowances, nssfRate]);

  const getBracketProgress = () => {
    if (!result.currentBracket) return 0;
    const { min, max } = result.currentBracket;
    const range = max === Infinity ? 10000000 : max - min;
    const position = result.taxableIncome - min;
    return Math.min(100, Math.max(0, (position / range) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t('tax.calculator.monthlySalaryDetails')}
          </CardTitle>
          <CardDescription>
            {t('tax.calculator.enterSalaryDetails')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="grossSalary">{t('tax.calculator.basicSalary')}</Label>
              <Input
                id="grossSalary"
                type="number"
                placeholder="0"
                value={grossSalary || ""}
                onChange={(e) => setGrossSalary(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">{t('tax.paye.allowances')} (UGX)</Label>
              <Input
                id="allowances"
                type="number"
                placeholder="0"
                value={allowances || ""}
                onChange={(e) => setAllowances(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nssfRate">{t('tax.calculator.nssfRate')}</Label>
              <Input
                id="nssfRate"
                type="number"
                placeholder="5"
                value={nssfRate}
                onChange={(e) => setNssfRate(Number(e.target.value) || 0)}
                min={0}
                max={20}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tax.calculator.taxCalculationResults')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('tax.calculator.payeTax')}</p>
              <p className="text-2xl font-bold text-destructive">
                {formatUGX(result.taxPayable)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('tax.calculator.netSalary')}</p>
              <p className="text-2xl font-bold text-primary">
                {formatUGX(result.netSalary)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
              <div>
                <p className="text-sm text-muted-foreground">{t('tax.calculator.effectiveRate')}</p>
                <p className="text-2xl font-bold">
                  {result.effectiveRate.toFixed(1)}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium">{t('tax.calculator.breakdown')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.calculator.grossSalary')}</span>
                <span className="font-medium">{formatUGX(result.grossSalary)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {t('tax.calculator.nssfDeduction')} ({nssfRate}%)
                </span>
                <span className="font-medium text-destructive">
                  -{formatUGX(result.nssfDeduction)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.form.taxableIncome')}</span>
                <span className="font-medium">{formatUGX(result.taxableIncome)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.calculator.payeTax')}</span>
                <span className="font-medium text-destructive">
                  -{formatUGX(result.taxPayable)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-medium">
                <span>{t('tax.calculator.netTakeHome')}</span>
                <span className="text-primary">{formatUGX(result.netSalary)}</span>
              </div>
            </div>
          </div>

          {/* Current Bracket */}
          {result.currentBracket && (
            <div className="space-y-3">
              <h4 className="font-medium">{t('tax.calculator.currentTaxBracket')}</h4>
              <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{result.currentBracket.description}</span>
                  <Badge>{(result.currentBracket.rate * 100).toFixed(0)}%</Badge>
                </div>
                <Progress value={getBracketProgress()} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('tax.calculator.positionWithinBracket')}
                </p>
              </div>
            </div>
          )}

          {/* All Brackets Reference */}
          <div className="space-y-3">
            <h4 className="font-medium">{t('tax.calculator.payeTaxBrackets')}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t('tax.calculator.monthlyIncome')}</th>
                    <th className="text-center py-2">{t('tax.calculator.rate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {PAYE_MONTHLY_BRACKETS.map((bracket, i) => (
                    <tr
                      key={i}
                      className={`border-b ${
                        result.currentBracket === bracket ? "bg-primary/10" : ""
                      }`}
                    >
                      <td className="py-2">
                        {formatUGX(bracket.min)} -{" "}
                        {bracket.max === Infinity ? "Above" : formatUGX(bracket.max)}
                      </td>
                      <td className="text-center py-2">
                        <Badge variant={result.currentBracket === bracket ? "default" : "outline"}>
                          {(bracket.rate * 100).toFixed(0)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}