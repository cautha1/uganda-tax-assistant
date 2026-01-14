import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IncomeTaxFormData, ValidationError } from "@/lib/taxCalculations";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

interface IncomeTaxFormProps {
  onChange: (data: IncomeTaxFormData) => void;
  errors: ValidationError[];
  initialData?: Partial<IncomeTaxFormData>;
}

export function IncomeTaxForm({ onChange, errors, initialData }: IncomeTaxFormProps) {
  const [form, setForm] = useState<IncomeTaxFormData>({
    gross_income: initialData?.gross_income || 0,
    business_expenses: initialData?.business_expenses || 0,
    depreciation: initialData?.depreciation || 0,
    bad_debts: initialData?.bad_debts || 0,
    donations: initialData?.donations || 0,
    other_deductions: initialData?.other_deductions || 0,
    period_year: initialData?.period_year || (currentYear - 1).toString(),
  });

  useEffect(() => {
    onChange(form);
  }, [form, onChange]);

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const handleChange = (field: keyof IncomeTaxFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const totalDeductions = 
    form.business_expenses + 
    form.depreciation + 
    form.bad_debts + 
    form.donations + 
    form.other_deductions;

  const taxableIncome = Math.max(0, form.gross_income - totalDeductions);

  return (
    <div className="space-y-6">
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

      {/* Income */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">Gross Income (UGX)</h3>
        <div className="max-w-md space-y-2">
          <Label htmlFor="gross_income">Total Gross Income *</Label>
          <Input
            id="gross_income"
            type="number"
            value={form.gross_income || ""}
            onChange={(e) => handleChange("gross_income", parseFloat(e.target.value) || 0)}
            placeholder="0"
          />
          <p className="text-sm text-muted-foreground">
            Include all business income, rental income, and other sources
          </p>
          {getError("gross_income") && (
            <p className="text-sm text-destructive">{getError("gross_income")}</p>
          )}
        </div>
      </div>

      {/* Deductions */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">Allowable Deductions (UGX)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="business_expenses">Business Expenses</Label>
            <Input
              id="business_expenses"
              type="number"
              value={form.business_expenses || ""}
              onChange={(e) => handleChange("business_expenses", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            {getError("business_expenses") && (
              <p className="text-sm text-destructive">{getError("business_expenses")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="depreciation">Depreciation</Label>
            <Input
              id="depreciation"
              type="number"
              value={form.depreciation || ""}
              onChange={(e) => handleChange("depreciation", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bad_debts">Bad Debts</Label>
            <Input
              id="bad_debts"
              type="number"
              value={form.bad_debts || ""}
              onChange={(e) => handleChange("bad_debts", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donations">Donations (Approved charities)</Label>
            <Input
              id="donations"
              type="number"
              value={form.donations || ""}
              onChange={(e) => handleChange("donations", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="other_deductions">Other Allowable Deductions</Label>
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

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Gross Income</span>
          <span>{new Intl.NumberFormat("en-UG").format(form.gross_income)} UGX</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Deductions</span>
          <span>- {new Intl.NumberFormat("en-UG").format(totalDeductions)} UGX</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-medium">
          <span>Taxable Income</span>
          <span>{new Intl.NumberFormat("en-UG").format(taxableIncome)} UGX</span>
        </div>
      </div>
    </div>
  );
}
