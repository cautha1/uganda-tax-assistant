import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { PRESUMPTIVE_TAX_BRACKETS, calculatePresumptiveTaxFromBracket } from "@/lib/uraTemplates";
import { formatUGX } from "@/lib/taxCalculations";
import { Calculator, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function PresumptiveTaxCalculator() {
  const { t } = useTranslation();
  const [annualTurnover, setAnnualTurnover] = useState<number>(0);

  const result = useMemo(() => {
    const tax = calculatePresumptiveTaxFromBracket(annualTurnover);
    const isEligible = annualTurnover >= 10000000 && annualTurnover <= 150000000;
    const isBelowThreshold = annualTurnover < 10000000;
    const isAboveThreshold = annualTurnover > 150000000;

    const currentBracket = PRESUMPTIVE_TAX_BRACKETS.find(
      (b) => annualTurnover >= b.min && annualTurnover <= b.max
    );

    const effectiveRate = annualTurnover > 0 && tax > 0 ? (tax / annualTurnover) * 100 : 0;

    return {
      tax: Math.max(0, tax),
      isEligible,
      isBelowThreshold,
      isAboveThreshold,
      currentBracket,
      effectiveRate,
    };
  }, [annualTurnover]);

  const getBracketProgress = () => {
    if (!result.currentBracket) return 0;
    const { min, max } = result.currentBracket;
    const range = max - min;
    const position = annualTurnover - min;
    return Math.min(100, Math.max(0, (position / range) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t('tax.calculator.annualTurnover')}
          </CardTitle>
          <CardDescription>
            {t('tax.calculator.enterTurnover')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="turnover">{t('tax.calculator.annualTurnoverUGX')}</Label>
            <Input
              id="turnover"
              type="number"
              placeholder={t('tax.calculator.enterAnnualTurnover')}
              value={annualTurnover || ""}
              onChange={(e) => setAnnualTurnover(Number(e.target.value) || 0)}
              className="text-lg"
            />
            <p className="text-sm text-muted-foreground">
              {t('tax.calculator.presumptiveApplies')}
            </p>
          </div>

          {/* Eligibility Status */}
          {annualTurnover > 0 && (
            <>
              {result.isBelowThreshold && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>{t('tax.calculator.belowThreshold')}</AlertTitle>
                  <AlertDescription>
                    {t('tax.calculator.belowThresholdDesc')}
                  </AlertDescription>
                </Alert>
              )}

              {result.isAboveThreshold && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('tax.calculator.notEligiblePresumptive')}</AlertTitle>
                  <AlertDescription>
                    {t('tax.calculator.notEligibleDesc')}
                  </AlertDescription>
                </Alert>
              )}

              {result.isEligible && (
                <Alert className="border-primary/50 bg-primary/5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">{t('tax.calculator.eligiblePresumptive')}</AlertTitle>
                  <AlertDescription>
                    {t('tax.calculator.eligibleDesc')}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {annualTurnover > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('tax.calculator.taxCalculationResults')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('tax.calculator.presumptiveTax')}</p>
                <p className="text-2xl font-bold text-destructive">
                  {result.isEligible ? formatUGX(result.tax) : t('tax.calculator.na')}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('tax.calculator.annualTurnover')}</p>
                <p className="text-2xl font-bold text-primary">
                  {formatUGX(annualTurnover)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('tax.calculator.effectiveRate')}</p>
                <p className="text-2xl font-bold">
                  {result.isEligible ? `${result.effectiveRate.toFixed(2)}%` : t('tax.calculator.na')}
                </p>
              </div>
            </div>

            {/* Current Bracket */}
            {result.currentBracket && result.isEligible && (
              <div className="space-y-3">
                <h4 className="font-medium">{t('tax.calculator.yourTaxBracket')}</h4>
                <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{result.currentBracket.description}</span>
                    <Badge>
                      {result.currentBracket.fixedAmount
                        ? formatUGX(result.currentBracket.fixedAmount)
                        : t('tax.calculator.fixedPlusPercent')}
                    </Badge>
                  </div>
                  <Progress value={getBracketProgress()} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('tax.calculator.positionWithinBracket')}: {getBracketProgress().toFixed(0)}%
                  </p>
                </div>
              </div>
            )}

            {/* Special Calculation Note for 80M-150M bracket */}
            {annualTurnover > 80000000 && annualTurnover <= 150000000 && (
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertTitle>{t('tax.calculator.calculationBreakdownTitle')}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{t('tax.calculator.forTurnover80M150M')}</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>{t('tax.calculator.fixedAmount')}</li>
                    <li>
                      {t('tax.calculator.plusExcess')}{" "}
                      {formatUGX(Math.round((annualTurnover - 80000000) * 0.007))}
                    </li>
                    <li>
                      <strong>{t('tax.calculator.totalLabel')} {formatUGX(result.tax)}</strong>
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* All Brackets Reference */}
            <div className="space-y-3">
              <h4 className="font-medium">{t('tax.calculator.presumptiveTaxBrackets')}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">{t('tax.calculator.annualTurnover')}</th>
                      <th className="text-left py-2">{t('tax.calculator.tax')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRESUMPTIVE_TAX_BRACKETS.map((bracket, i) => (
                      <tr
                        key={i}
                        className={`border-b ${
                          result.currentBracket === bracket ? "bg-primary/10" : ""
                        }`}
                      >
                        <td className="py-2">
                          {formatUGX(bracket.min)} - {formatUGX(bracket.max)}
                        </td>
                        <td className="py-2">
                          {bracket.fixedAmount === 0 ? (
                            <Badge variant="secondary">{t('tax.presumptive.exempt')}</Badge>
                          ) : bracket.rate ? (
                            <span>
                              {formatUGX(360000)} + 0.7% excess
                            </span>
                          ) : (
                            <Badge variant={result.currentBracket === bracket ? "default" : "outline"}>
                              {formatUGX(bracket.fixedAmount || 0)}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}