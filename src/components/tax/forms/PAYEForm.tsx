import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYEFormData, ValidationError } from "@/lib/taxCalculations";
import { useTranslation } from "@/hooks/useTranslation";

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
] as const;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

interface PAYEFormProps {
  onChange: (data: PAYEFormData) => void;
  errors: ValidationError[];
  initialData?: Partial<PAYEFormData>;
}

export function PAYEForm({ onChange, errors, initialData }: PAYEFormProps) {
  const { t } = useTranslation();
  
  const [form, setForm] = useState<PAYEFormData>({
    employee_name: initialData?.employee_name || "",
    employee_tin: initialData?.employee_tin || "",
    gross_salary: initialData?.gross_salary || 0,
    allowances: initialData?.allowances || 0,
    nssf_contribution: initialData?.nssf_contribution || 0,
    local_service_tax: initialData?.local_service_tax || 0,
    provident_fund: initialData?.provident_fund || 0,
    other_deductions: initialData?.other_deductions || 0,
    period_month: initialData?.period_month || MONTH_KEYS[new Date().getMonth()],
    period_year: initialData?.period_year || currentYear.toString(),
  });

  useEffect(() => {
    onChange(form);
  }, [form, onChange]);

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const handleChange = (field: keyof PAYEFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getMonthLabel = (monthKey: string) => {
    return t(`tax.months.${monthKey}` as any);
  };

  return (
    <div className="space-y-6">
      {/* Tax Period */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">{t('tax.paye.taxPeriodTitle')}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('tax.form.month')} *</Label>
            <Select value={form.period_month} onValueChange={(v) => handleChange("period_month", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_KEYS.map((monthKey) => (
                  <SelectItem key={monthKey} value={monthKey}>{getMonthLabel(monthKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getError("period_month") && (
              <p className="text-sm text-destructive">{getError("period_month")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('tax.form.year')} *</Label>
            <Select value={form.period_year} onValueChange={(v) => handleChange("period_year", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Employee Details */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">{t('tax.paye.employeeDetails')}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employee_name">{t('tax.paye.employeeName')} *</Label>
            <Input
              id="employee_name"
              value={form.employee_name}
              onChange={(e) => handleChange("employee_name", e.target.value)}
              placeholder={t('tax.paye.fullNamePlaceholder')}
            />
            {getError("employee_name") && (
              <p className="text-sm text-destructive">{getError("employee_name")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee_tin">{t('tax.paye.employeeTin')} *</Label>
            <Input
              id="employee_tin"
              value={form.employee_tin}
              onChange={(e) => handleChange("employee_tin", e.target.value)}
              placeholder="1000000000"
              maxLength={10}
            />
            {getError("employee_tin") && (
              <p className="text-sm text-destructive">{getError("employee_tin")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">{t('tax.paye.income')} {t('tax.paye.ugxLabel')}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gross_salary">{t('tax.paye.grossSalary')} *</Label>
            <Input
              id="gross_salary"
              type="number"
              value={form.gross_salary || ""}
              onChange={(e) => handleChange("gross_salary", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            {getError("gross_salary") && (
              <p className="text-sm text-destructive">{getError("gross_salary")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="allowances">{t('tax.paye.allowances')}</Label>
            <Input
              id="allowances"
              type="number"
              value={form.allowances || ""}
              onChange={(e) => handleChange("allowances", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Deductions */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">{t('tax.paye.deductions')} {t('tax.paye.ugxLabel')}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nssf_contribution">{t('tax.paye.nssfContribution')}</Label>
            <Input
              id="nssf_contribution"
              type="number"
              value={form.nssf_contribution || ""}
              onChange={(e) => handleChange("nssf_contribution", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            {getError("nssf_contribution") && (
              <p className="text-sm text-destructive">{getError("nssf_contribution")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="local_service_tax">{t('tax.paye.localServiceTax')}</Label>
            <Input
              id="local_service_tax"
              type="number"
              value={form.local_service_tax || ""}
              onChange={(e) => handleChange("local_service_tax", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provident_fund">{t('tax.paye.providentFund')}</Label>
            <Input
              id="provident_fund"
              type="number"
              value={form.provident_fund || ""}
              onChange={(e) => handleChange("provident_fund", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="other_deductions">{t('tax.paye.otherDeductions')}</Label>
            <Input
              id="other_deductions"
              type="number"
              value={form.other_deductions || ""}
              onChange={(e) => handleChange("other_deductions", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}