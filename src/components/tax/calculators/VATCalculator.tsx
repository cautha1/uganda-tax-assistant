import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatUGX } from "@/lib/taxCalculations";
import { Calculator, TrendingUp, TrendingDown, AlertCircle, Percent } from "lucide-react";

const VAT_RATE = 0.18; // 18%

export function VATCalculator() {
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
            Sales & Supplies
          </CardTitle>
          <CardDescription>
            Enter your monthly sales figures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalSales">Total Sales/Supplies (UGX)</Label>
              <Input
                id="totalSales"
                type="number"
                placeholder="0"
                value={totalSales || ""}
                onChange={(e) => setTotalSales(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exemptSupplies">Exempt Supplies (UGX)</Label>
              <Input
                id="exemptSupplies"
                type="number"
                placeholder="0"
                value={exemptSupplies || ""}
                onChange={(e) => setExemptSupplies(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                E.g., education, medical, financial services
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zeroRatedSupplies">Zero-Rated Supplies (UGX)</Label>
              <Input
                id="zeroRatedSupplies"
                type="number"
                placeholder="0"
                value={zeroRatedSupplies || ""}
                onChange={(e) => setZeroRatedSupplies(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                E.g., exports, international transport
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inputVAT">Input VAT Claimed (UGX)</Label>
              <Input
                id="inputVAT"
                type="number"
                placeholder="0"
                value={inputVAT || ""}
                onChange={(e) => setInputVAT(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                VAT paid on business purchases
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>VAT Calculation Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={`p-4 rounded-lg ${result.isRefundable ? "bg-primary/10" : "bg-muted"}`}>
              <p className="text-sm text-muted-foreground">
                {result.isRefundable ? "VAT Refundable" : "VAT Payable"}
              </p>
              <p className={`text-2xl font-bold ${result.isRefundable ? "text-primary" : "text-destructive"}`}>
                {formatUGX(result.netVAT)}
              </p>
              {result.isRefundable && (
                <Badge variant="secondary" className="mt-1">Refund</Badge>
              )}
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Taxable Supplies</p>
              <p className="text-2xl font-bold text-primary">
                {formatUGX(result.taxableSupplies)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg flex items-center gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Effective Rate</p>
                <p className="text-2xl font-bold">
                  {result.effectiveRate.toFixed(1)}%
                </p>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium">Calculation Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Sales</span>
                <span className="font-medium">{formatUGX(totalSales)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Exempt Supplies
                </span>
                <span className="font-medium text-muted-foreground">
                  -{formatUGX(exemptSupplies)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Zero-Rated Supplies
                </span>
                <span className="font-medium text-muted-foreground">
                  -{formatUGX(zeroRatedSupplies)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b bg-muted/50 px-2 -mx-2 rounded">
                <span className="font-medium">Taxable Supplies</span>
                <span className="font-medium">{formatUGX(result.taxableSupplies)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Output VAT (18%)</span>
                <span className="font-medium text-destructive">
                  {formatUGX(result.outputVAT)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Input VAT Credit</span>
                <span className="font-medium text-primary">
                  -{formatUGX(inputVAT)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-medium">
                <span>{result.isRefundable ? "VAT Refundable" : "Net VAT Payable"}</span>
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
              <AlertTitle>VAT Refund Available</AlertTitle>
              <AlertDescription>
                Your input VAT exceeds output VAT. You may apply for a refund or carry forward the credit to next period.
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Calculator className="h-4 w-4" />
            <AlertTitle>VAT Rate Information</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Standard rate: 18% on taxable supplies</li>
                <li>Zero-rated: 0% (exports, international services)</li>
                <li>Exempt: Not subject to VAT (education, health, financial)</li>
                <li>Registration threshold: Turnover above UGX 150M/year</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
