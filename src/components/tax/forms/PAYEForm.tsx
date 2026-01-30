import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYEFormData, ValidationError } from "@/lib/taxCalculations";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

interface PAYEFormProps {
  onChange: (data: PAYEFormData) => void;
  errors: ValidationError[];
  initialData?: Partial<PAYEFormData>;
}

export function PAYEForm({ onChange, errors, initialData }: PAYEFormProps) {
  const [form, setForm] = useState<PAYEFormData>({
    employee_name: initialData?.employee_name || "",
    employee_tin: initialData?.employee_tin || "",
    gross_salary: initialData?.gross_salary || 0,
    allowances: initialData?.allowances || 0,
    nssf_contribution: initialData?.nssf_contribution || 0,
    local_service_tax: initialData?.local_service_tax || 0,
    provident_fund: initialData?.provident_fund || 0,
    other_deductions: initialData?.other_deductions || 0,
    period_month: initialData?.period_month || MONTHS[new Date().getMonth()],
    period_year: initialData?.period_year || currentYear.toString(),
  });

  useEffect(() => {
    onChange(form);
  }, [form, onChange]);

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const handleChange = (field: keyof PAYEFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Tax Period */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">Tax Period</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Month *</Label>
            <Select value={form.period_month} onValueChange={(v) => handleChange("period_month", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getError("period_month") && (
              <p className="text-sm text-destructive">{getError("period_month")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Year *</Label>
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
        <h3 className="font-semibold mb-4">Employee Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employee_name">Employee Name *</Label>
            <Input
              id="employee_name"
              value={form.employee_name}
              onChange={(e) => handleChange("employee_name", e.target.value)}
              placeholder="Full name"
            />
            {getError("employee_name") && (
              <p className="text-sm text-destructive">{getError("employee_name")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="employee_tin">Employee TIN *</Label>
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
        <h3 className="font-semibold mb-4">Income (UGX)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gross_salary">Gross Salary *</Label>
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
            <Label htmlFor="allowances">Allowances</Label>
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
        <h3 className="font-semibold mb-4">Deductions (UGX)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nssf_contribution">NSSF Contribution</Label>
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
            <Label htmlFor="local_service_tax">Local Service Tax (LST)</Label>
            <Input
              id="local_service_tax"
              type="number"
              value={form.local_service_tax || ""}
              onChange={(e) => handleChange("local_service_tax", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provident_fund">Provident Fund</Label>
            <Input
              id="provident_fund"
              type="number"
              value={form.provident_fund || ""}
              onChange={(e) => handleChange("provident_fund", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="other_deductions">Other Deductions</Label>
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
