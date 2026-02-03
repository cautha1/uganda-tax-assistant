import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatUGX } from "@/lib/taxCalculations";
import { Calculator, TrendingUp, TrendingDown, AlertCircle, Percent } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const VAT_RATE = 0.18; // 18%

export function VATCalculator() {
  const { t } = useTranslation();
  const [totalSales, setTotalSales] = useState<number>(0);
  const [exemptSupplies, setExemptSupplies] = useState<number>(0);
  const [zeroRatedSupplies, setZeroRatedSupplies] = useState<number>(0);
  const [inputVAT, setInputVAT] = useState<number>(0);

  const result = useMemo(() => {
    const taxableSupplies = Math.max(0, totalSales - exemptSupplies - zeroRatedSupplies);
    const outputVAT = Math.round(taxableSupplies * VAT_RATE);
    const netVAT = outputVAT - inputVAT;
    const isRefundable = netVAT < 0;
    const effectiveRate = totalSales > 0 ? (Math.max(0, netVAT) / totalSales) * 100 : 0;

    return {
      taxableSupplies,
      outputVAT,
      netVAT: Math.abs(netVAT),
      isRefundable,
      effectiveRate,
    };
  }, [totalSales, exemptSupplies, zeroRatedSupplies, inputVAT]);

  return (
    <div className="space-y-6">
      {/* Sales Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('tax.calculator.salesSupplies')}
          </CardTitle>
          <CardDescription>
            {t('tax.calculator.enterMonthlySales')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalSales">{t('tax.calculator.totalSalesSupplies')}</Label>
              <Input
                id="totalSales"
                type="number"
                placeholder="0"
                value={totalSales || ""}
                onChange={(e) => setTotalSales(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exemptSupplies">{t('tax.calculator.exemptSuppliesUGX')}</Label>
              <Input
                id="exemptSupplies"
                type="number"
                placeholder="0"
                value={exemptSupplies || ""}
                onChange={(e) => setExemptSupplies(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                {t('tax.calculator.exemptSuppliesDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zeroRatedSupplies">{t('tax.calculator.zeroRatedSuppliesUGX')}</Label>
              <Input
                id="zeroRatedSupplies"
                type="number"
                placeholder="0"
                value={zeroRatedSupplies || ""}
                onChange={(e) => setZeroRatedSupplies(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                {t('tax.calculator.zeroRatedDesc')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inputVAT">{t('tax.calculator.inputVATClaimed')}</Label>
              <Input
                id="inputVAT"
                type="number"
                placeholder="0"
                value={inputVAT || ""}
                onChange={(e) => setInputVAT(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                {t('tax.calculator.inputVATDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tax.calculator.vatCalculationResults')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={`p-4 rounded-lg ${result.isRefundable ? "bg-primary/10" : "bg-muted"}`}>
              <p className="text-sm text-muted-foreground">
                {result.isRefundable ? t('tax.calculator.vatRefundable') : t('tax.calculator.vatPayable')}
              </p>
              <p className={`text-2xl font-bold ${result.isRefundable ? "text-primary" : "text-destructive"}`}>
                {formatUGX(result.netVAT)}
              </p>
              {result.isRefundable && (
                <Badge variant="secondary" className="mt-1">{t('tax.calculator.refund')}</Badge>
              )}
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('tax.calculator.taxableSupplies')}</p>
              <p className="text-2xl font-bold text-primary">
                {formatUGX(result.taxableSupplies)}
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
            <h4 className="font-medium">{t('tax.calculator.calculationBreakdown')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.calculator.totalSales')}</span>
                <span className="font-medium">{formatUGX(totalSales)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {t('tax.vat.exemptSupplies')}
                </span>
                <span className="font-medium text-muted-foreground">
                  -{formatUGX(exemptSupplies)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {t('tax.vat.zeroRatedSupplies')}
                </span>
                <span className="font-medium text-muted-foreground">
                  -{formatUGX(zeroRatedSupplies)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b bg-muted/50 px-2 -mx-2 rounded">
                <span className="font-medium">{t('tax.calculator.taxableSupplies')}</span>
                <span className="font-medium">{formatUGX(result.taxableSupplies)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.calculator.outputVAT18')}</span>
                <span className="font-medium text-destructive">
                  {formatUGX(result.outputVAT)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.calculator.inputVATCredit')}</span>
                <span className="font-medium text-primary">
                  -{formatUGX(inputVAT)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-medium">
                <span>{result.isRefundable ? t('tax.calculator.vatRefundable') : t('tax.calculator.netVATPayable')}</span>
                <span className={result.isRefundable ? "text-primary" : "text-destructive"}>
                  {formatUGX(result.netVAT)}
                </span>
              </div>
            </div>
          </div>

          {/* Info Alerts */}
          {result.isRefundable && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('tax.calculator.vatRefundAvailable')}</AlertTitle>
              <AlertDescription>
                {t('tax.calculator.vatRefundAvailableDesc')}
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertTitle>{t('tax.calculator.vatRateInfo')}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>{t('tax.calculator.vatRateInfoItems.standard')}</li>
                <li>{t('tax.calculator.vatRateInfoItems.zeroRated')}</li>
                <li>{t('tax.calculator.vatRateInfoItems.exempt')}</li>
                <li>{t('tax.calculator.vatRateInfoItems.threshold')}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}