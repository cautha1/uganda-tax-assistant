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

export function PresumptiveTaxCalculator() {
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
            Annual Turnover
          </CardTitle>
          <CardDescription>
            Enter your business annual turnover to calculate presumptive tax
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="turnover">Annual Turnover (UGX)</Label>
            <Input
              id="turnover"
              type="number"
              placeholder="Enter annual turnover"
              value={annualTurnover || ""}
              onChange={(e) => setAnnualTurnover(Number(e.target.value) || 0)}
              className="text-lg"
            />
            <p className="text-sm text-muted-foreground">
              Presumptive tax applies to businesses with turnover between UGX 10M and UGX 150M
            </p>
          </div>

          {/* Eligibility Status */}
          {annualTurnover > 0 && (
            <>
              {result.isBelowThreshold && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Below Tax Threshold</AlertTitle>
                  <AlertDescription>
                    With turnover below UGX 10M, you are exempt from presumptive tax.
                  </AlertDescription>
                </Alert>
              )}

              {result.isAboveThreshold && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Not Eligible for Presumptive Tax</AlertTitle>
                  <AlertDescription>
                    Turnover above UGX 150M requires registration for Income Tax and VAT instead.
                  </AlertDescription>
                </Alert>
              )}

              {result.isEligible && (
                <Alert className="border-primary/50 bg-primary/5">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">Eligible for Presumptive Tax</AlertTitle>
                  <AlertDescription>
                    Your turnover qualifies for the simplified presumptive tax regime.
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
            <CardTitle>Tax Calculation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Presumptive Tax</p>
                <p className="text-2xl font-bold text-destructive">
                  {result.isEligible ? formatUGX(result.tax) : "N/A"}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Annual Turnover</p>
                <p className="text-2xl font-bold text-primary">
                  {formatUGX(annualTurnover)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Effective Rate</p>
                <p className="text-2xl font-bold">
                  {result.isEligible ? `${result.effectiveRate.toFixed(2)}%` : "N/A"}
                </p>
              </div>
            </div>

            {/* Current Bracket */}
            {result.currentBracket && result.isEligible && (
              <div className="space-y-3">
                <h4 className="font-medium">Your Tax Bracket</h4>
                <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{result.currentBracket.description}</span>
                    <Badge>
                      {result.currentBracket.fixedAmount
                        ? formatUGX(result.currentBracket.fixedAmount)
                        : "Fixed + %"}
                    </Badge>
                  </div>
                  <Progress value={getBracketProgress()} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Position within bracket: {getBracketProgress().toFixed(0)}%
                  </p>
                </div>
              </div>
            )}

            {/* Special Calculation Note for 80M-150M bracket */}
            {annualTurnover > 80000000 && annualTurnover <= 150000000 && (
              <Alert>
                <Calculator className="h-4 w-4" />
                <AlertTitle>Calculation Breakdown</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>For turnover between UGX 80M - 150M:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Fixed amount: UGX 360,000</li>
                    <li>
                      Plus 0.7% of excess over 80M:{" "}
                      {formatUGX(Math.round((annualTurnover - 80000000) * 0.007))}
                    </li>
                    <li>
                      <strong>Total: {formatUGX(result.tax)}</strong>
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* All Brackets Reference */}
            <div className="space-y-3">
              <h4 className="font-medium">Presumptive Tax Brackets</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Annual Turnover</th>
                      <th className="text-left py-2">Tax</th>
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
                            <Badge variant="secondary">Exempt</Badge>
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
