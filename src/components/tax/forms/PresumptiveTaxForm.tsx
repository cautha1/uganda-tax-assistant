import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { PresumptiveTaxFormData, ValidationError, PRESUMPTIVE_TAX_BANDS, formatUGX } from "@/lib/taxCalculations";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

const BUSINESS_CATEGORIES = [
  "Retail Trade",
  "Wholesale Trade",
  "Service Provider",
  "Manufacturing",
  "Transport",
  "Food & Beverages",
  "Agricultural Processing",
  "Other",
];

interface PresumptiveTaxFormProps {
  onChange: (data: PresumptiveTaxFormData) => void;
  errors: ValidationError[];
  initialData?: Partial<PresumptiveTaxFormData>;
  businessTurnover?: number;
}

export function PresumptiveTaxForm({ 
  onChange, 
  errors, 
  initialData, 
  businessTurnover 
}: PresumptiveTaxFormProps) {
  const [form, setForm] = useState<PresumptiveTaxFormData>({
    annual_turnover: initialData?.annual_turnover || businessTurnover || 0,
    period_year: initialData?.period_year || (currentYear - 1).toString(),
    business_category: initialData?.business_category || "",
  });

  useEffect(() => {
    onChange(form);
  }, [form, onChange]);

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const handleChange = (field: keyof PresumptiveTaxFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isEligible = form.annual_turnover <= 150000000;
  const getCurrentBand = () => {
    for (const band of PRESUMPTIVE_TAX_BANDS) {
      if (form.annual_turnover >= band.min && form.annual_turnover <= band.max) {
        return band;
      }
    }
    return null;
  };

  const currentBand = getCurrentBand();

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Presumptive tax is a simplified tax regime for small businesses with annual turnover 
          not exceeding UGX 150,000,000. The tax is based on turnover bands, not actual profits.
        </AlertDescription>
      </Alert>

      {/* Tax Period */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">Financial Year</h3>
        <div className="max-w-xs space-y-2">
          <Label>Year of Assessment *</Label>
          <Select value={form.period_year} onValueChange={(v) => handleChange("period_year", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>FY {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getError("period_year") && (
            <p className="text-sm text-destructive">{getError("period_year")}</p>
          )}
        </div>
      </div>

      {/* Business Details */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">Business Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annual_turnover">Annual Turnover (UGX) *</Label>
            <Input
              id="annual_turnover"
              type="number"
              value={form.annual_turnover || ""}
              onChange={(e) => handleChange("annual_turnover", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Total sales/revenue for the financial year
            </p>
            {getError("annual_turnover") && (
              <p className="text-sm text-destructive">{getError("annual_turnover")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Business Category</Label>
            <Select 
              value={form.business_category} 
              onValueChange={(v) => handleChange("business_category", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Eligibility Status */}
      {!isEligible && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your turnover exceeds UGX 150,000,000. You are not eligible for presumptive tax 
            and should file under the Income Tax regime instead.
          </AlertDescription>
        </Alert>
      )}

      {/* Tax Bands Reference */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">Presumptive Tax Bands</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left py-2 px-3">Turnover Range</th>
                <th className="text-right py-2 px-3">Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {PRESUMPTIVE_TAX_BANDS.map((band, index) => (
                <tr 
                  key={index} 
                  className={`border-b ${
                    currentBand === band ? "bg-primary/10" : ""
                  }`}
                >
                  <td className="py-2 px-3">
                    {formatUGX(band.min)} - {formatUGX(band.max)}
                    {currentBand === band && (
                      <span className="ml-2 text-xs text-primary font-medium">(Your band)</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {band.tax === 0 ? "Exempt" : formatUGX(band.tax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {isEligible && currentBand && (
        <div className="p-4 bg-success/10 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Your Presumptive Tax</p>
              <p className="text-sm text-muted-foreground">
                Based on turnover of {formatUGX(form.annual_turnover)}
              </p>
            </div>
            <span className="text-2xl font-bold text-success">
              {currentBand.tax === 0 ? "Exempt" : formatUGX(currentBand.tax)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
