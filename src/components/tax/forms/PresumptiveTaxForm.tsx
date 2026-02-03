import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { PresumptiveTaxFormData, ValidationError, PRESUMPTIVE_TAX_BANDS, formatUGX } from "@/lib/taxCalculations";
import { useTranslation } from "@/hooks/useTranslation";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

const CATEGORY_KEYS = [
  "retailTrade",
  "wholesaleTrade",
  "serviceProvider",
  "manufacturing",
  "transport",
  "foodBeverages",
  "agriculturalProcessing",
  "other",
] as const;

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
  const { t } = useTranslation();
  
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

  const getCategoryLabel = (categoryKey: string) => {
    return t(`tax.presumptive.categories.${categoryKey}` as any);
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('tax.presumptive.infoMessage')}
        </AlertDescription>
      </Alert>

      {/* Tax Period */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">{t('tax.presumptive.financialYearTitle')}</h3>
        <div className="max-w-xs space-y-2">
          <Label>{t('tax.form.yearOfAssessment')} *</Label>
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
        <h3 className="font-semibold mb-4">{t('tax.presumptive.businessInfo')}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="annual_turnover">{t('tax.presumptive.annualTurnoverUGX')} *</Label>
            <Input
              id="annual_turnover"
              type="number"
              value={form.annual_turnover || ""}
              onChange={(e) => handleChange("annual_turnover", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              {t('tax.presumptive.turnoverDesc')}
            </p>
            {getError("annual_turnover") && (
              <p className="text-sm text-destructive">{getError("annual_turnover")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('tax.presumptive.businessCategory')}</Label>
            <Select 
              value={form.business_category} 
              onValueChange={(v) => handleChange("business_category", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('tax.presumptive.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_KEYS.map((categoryKey) => (
                  <SelectItem key={categoryKey} value={categoryKey}>{getCategoryLabel(categoryKey)}</SelectItem>
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
            {t('tax.presumptive.eligibilityWarning')}
          </AlertDescription>
        </Alert>
      )}

      {/* Tax Bands Reference */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">{t('tax.presumptive.taxBands')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left py-2 px-3">{t('tax.presumptive.turnoverRange')}</th>
                <th className="text-right py-2 px-3">{t('tax.presumptive.taxAmount')}</th>
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
                      <span className="ml-2 text-xs text-primary font-medium">{t('tax.presumptive.yourBand')}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">
                    {band.tax === 0 ? t('tax.presumptive.exempt') : formatUGX(band.tax)}
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
              <p className="font-medium">{t('tax.presumptive.yourPresumptiveTax')}</p>
              <p className="text-sm text-muted-foreground">
                {t('tax.presumptive.basedOnTurnover')} {formatUGX(form.annual_turnover)}
              </p>
            </div>
            <span className="text-2xl font-bold text-success">
              {currentBand.tax === 0 ? t('tax.presumptive.exempt') : formatUGX(currentBand.tax)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}