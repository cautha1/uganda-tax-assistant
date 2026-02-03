import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatUGX } from "@/lib/taxCalculations";
import { Calculator, TrendingDown, Percent, Building2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const INCOME_TAX_BRACKETS = [
  { min: 0, max: 2820000, rate: 0, description: "Up to UGX 2,820,000: 0% tax" },
  { min: 2820001, max: 4020000, rate: 0.1, description: "UGX 2,820,001 - 4,020,000: 10% tax" },
  { min: 4020001, max: 4920000, rate: 0.2, description: "UGX 4,020,001 - 4,920,000: 20% tax" },
  { min: 4920001, max: 120000000, rate: 0.3, description: "UGX 4,920,001 - 120,000,000: 30% tax" },
  { min: 120000001, max: Infinity, rate: 0.4, description: "Above UGX 120,000,000: 40% tax" },
];

const COMPANY_TAX_RATE = 0.3; // 30% for companies

interface IncomeTaxResult {
  grossIncome: number;
  totalDeductions: number;
  taxableIncome: number;
  taxPayable: number;
  effectiveRate: number;
  currentBracket: typeof INCOME_TAX_BRACKETS[0] | null;
}

export function IncomeTaxCalculator() {
  const { t } = useTranslation();
  const [taxpayerType, setTaxpayerType] = useState<"individual" | "company">("individual");
  const [businessIncome, setBusinessIncome] = useState<number>(0);
  const [employmentIncome, setEmploymentIncome] = useState<number>(0);
  const [rentalIncome, setRentalIncome] = useState<number>(0);
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [businessExpenses, setBusinessExpenses] = useState<number>(0);
  const [depreciation, setDepreciation] = useState<number>(0);
  const [badDebts, setBadDebts] = useState<number>(0);
  const [donations, setDonations] = useState<number>(0);

  const result = useMemo<IncomeTaxResult>(() => {
    const grossIncome = businessIncome + employmentIncome + rentalIncome + otherIncome;
    const totalDeductions = businessExpenses + depreciation + badDebts + donations;
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);

    let taxPayable = 0;
    let currentBracket: typeof INCOME_TAX_BRACKETS[0] | null = null;

    if (taxpayerType === "company") {
      taxPayable = taxableIncome * COMPANY_TAX_RATE;
      currentBracket = null;
    } else {
      // Progressive tax for individuals
      if (taxableIncome > 120000000) {
        taxPayable += (taxableIncome - 120000000) * 0.4;
        taxPayable += (120000000 - 4920000) * 0.3;
        taxPayable += (4920000 - 4020000) * 0.2;
        taxPayable += (4020000 - 2820000) * 0.1;
        currentBracket = INCOME_TAX_BRACKETS[4];
      } else if (taxableIncome > 4920000) {
        taxPayable += (taxableIncome - 4920000) * 0.3;
        taxPayable += (4920000 - 4020000) * 0.2;
        taxPayable += (4020000 - 2820000) * 0.1;
        currentBracket = INCOME_TAX_BRACKETS[3];
      } else if (taxableIncome > 4020000) {
        taxPayable += (taxableIncome - 4020000) * 0.2;
        taxPayable += (4020000 - 2820000) * 0.1;
        currentBracket = INCOME_TAX_BRACKETS[2];
      } else if (taxableIncome > 2820000) {
        taxPayable += (taxableIncome - 2820000) * 0.1;
        currentBracket = INCOME_TAX_BRACKETS[1];
      } else {
        currentBracket = INCOME_TAX_BRACKETS[0];
      }
    }

    const effectiveRate = grossIncome > 0 ? (taxPayable / grossIncome) * 100 : 0;

    return {
      grossIncome,
      totalDeductions,
      taxableIncome,
      taxPayable: Math.round(taxPayable),
      effectiveRate,
      currentBracket,
    };
  }, [taxpayerType, businessIncome, employmentIncome, rentalIncome, otherIncome, businessExpenses, depreciation, badDebts, donations]);

  return (
    <div className="space-y-6">
      {/* Taxpayer Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('tax.calculator.taxpayerType')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={taxpayerType} onValueChange={(v: "individual" | "company") => setTaxpayerType(v)}>
            <SelectTrigger className="w-full sm:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">{t('tax.calculator.individualSole')}</SelectItem>
              <SelectItem value="company">{t('tax.calculator.limitedCompany')}</SelectItem>
            </SelectContent>
          </Select>
          {taxpayerType === "company" && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('tax.calculator.companyTaxRate')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Income Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t('tax.calculator.annualIncome')}
          </CardTitle>
          <CardDescription>{t('tax.calculator.enterIncomeSources')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessIncome">{t('tax.calculator.businessIncome')}</Label>
              <Input
                id="businessIncome"
                type="number"
                placeholder="0"
                value={businessIncome || ""}
                onChange={(e) => setBusinessIncome(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentIncome">{t('tax.calculator.employmentIncome')}</Label>
              <Input
                id="employmentIncome"
                type="number"
                placeholder="0"
                value={employmentIncome || ""}
                onChange={(e) => setEmploymentIncome(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentalIncome">{t('tax.calculator.rentalIncome')}</Label>
              <Input
                id="rentalIncome"
                type="number"
                placeholder="0"
                value={rentalIncome || ""}
                onChange={(e) => setRentalIncome(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherIncome">{t('tax.calculator.otherIncomeUGX')}</Label>
              <Input
                id="otherIncome"
                type="number"
                placeholder="0"
                value={otherIncome || ""}
                onChange={(e) => setOtherIncome(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            {t('tax.calculator.allowableDeductions')}
          </CardTitle>
          <CardDescription>{t('tax.calculator.enterDeductions')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessExpenses">{t('tax.calculator.businessExpensesUGX')}</Label>
              <Input
                id="businessExpenses"
                type="number"
                placeholder="0"
                value={businessExpenses || ""}
                onChange={(e) => setBusinessExpenses(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depreciation">{t('tax.calculator.depreciationUGX')}</Label>
              <Input
                id="depreciation"
                type="number"
                placeholder="0"
                value={depreciation || ""}
                onChange={(e) => setDepreciation(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badDebts">{t('tax.calculator.badDebtsUGX')}</Label>
              <Input
                id="badDebts"
                type="number"
                placeholder="0"
                value={badDebts || ""}
                onChange={(e) => setBadDebts(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="donations">{t('tax.calculator.donationsMax')}</Label>
              <Input
                id="donations"
                type="number"
                placeholder="0"
                value={donations || ""}
                onChange={(e) => setDonations(Number(e.target.value) || 0)}
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
              <p className="text-sm text-muted-foreground">{t('tax.calculator.incomeTax')}</p>
              <p className="text-2xl font-bold text-destructive">
                {formatUGX(result.taxPayable)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('tax.form.taxableIncome')}</p>
              <p className="text-2xl font-bold text-primary">
                {formatUGX(result.taxableIncome)}
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
                <span className="text-muted-foreground">{t('tax.incomeTax.grossIncomeLabel')}</span>
                <span className="font-medium">{formatUGX(result.grossIncome)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.form.totalDeductions')}</span>
                <span className="font-medium text-destructive">
                  -{formatUGX(result.totalDeductions)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">{t('tax.form.taxableIncome')}</span>
                <span className="font-medium">{formatUGX(result.taxableIncome)}</span>
              </div>
              <div className="flex justify-between py-2 font-medium">
                <span>{t('tax.calculator.taxPayable')}</span>
                <span className="text-destructive">{formatUGX(result.taxPayable)}</span>
              </div>
            </div>
          </div>

          {/* Tax Brackets (Individual only) */}
          {taxpayerType === "individual" && (
            <div className="space-y-3">
              <h4 className="font-medium">{t('tax.calculator.annualTaxBrackets')}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">{t('tax.calculator.annualIncome')}</th>
                      <th className="text-center py-2">{t('tax.calculator.rate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INCOME_TAX_BRACKETS.map((bracket, i) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}