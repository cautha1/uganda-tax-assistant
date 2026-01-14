import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { VATFormData, ValidationError, VAT_RATE, formatUGX } from "@/lib/taxCalculations";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

interface VATFormProps {
  onChange: (data: VATFormData) => void;
  errors: ValidationError[];
  initialData?: Partial<VATFormData>;
}

export function VATForm({ onChange, errors, initialData }: VATFormProps) {
  const [form, setForm] = useState<VATFormData>({
    output_vat: initialData?.output_vat || 0,
    input_vat: initialData?.input_vat || 0,
    exempt_supplies: initialData?.exempt_supplies || 0,
    zero_rated_supplies: initialData?.zero_rated_supplies || 0,
    period_month: initialData?.period_month || MONTHS[new Date().getMonth() - 1] || MONTHS[11],
    period_year: initialData?.period_year || currentYear.toString(),
    total_sales: initialData?.total_sales || 0,
  });

  useEffect(() => {
    onChange(form);
  }, [form, onChange]);

  // Auto-calculate output VAT from total sales
  useEffect(() => {
    const taxableSales = form.total_sales - form.exempt_supplies - form.zero_rated_supplies;
    const calculatedOutputVAT = Math.max(0, taxableSales * VAT_RATE);
    if (form.total_sales > 0) {
      setForm((prev) => ({ ...prev, output_vat: Math.round(calculatedOutputVAT) }));
    }
  }, [form.total_sales, form.exempt_supplies, form.zero_rated_supplies]);

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  const handleChange = (field: keyof VATFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const netVAT = form.output_vat - form.input_vat;
  const isRefund = netVAT < 0;

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          VAT is charged at {VAT_RATE * 100}% on taxable supplies. File your VAT return by the 
          15th of the following month.
        </AlertDescription>
      </Alert>

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

      {/* Sales & Supplies */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">Sales & Supplies (UGX)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="total_sales">Total Sales/Revenue *</Label>
            <Input
              id="total_sales"
              type="number"
              value={form.total_sales || ""}
              onChange={(e) => handleChange("total_sales", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Total value of all goods/services sold
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exempt_supplies">Exempt Supplies</Label>
            <Input
              id="exempt_supplies"
              type="number"
              value={form.exempt_supplies || ""}
              onChange={(e) => handleChange("exempt_supplies", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Medical, education, financial services, etc.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zero_rated_supplies">Zero-Rated Supplies</Label>
            <Input
              id="zero_rated_supplies"
              type="number"
              value={form.zero_rated_supplies || ""}
              onChange={(e) => handleChange("zero_rated_supplies", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Exports, basic food items, etc.
            </p>
          </div>
        </div>
      </div>

      {/* VAT Computation */}
      <div className="form-section">
        <h3 className="font-semibold mb-4">VAT Computation (UGX)</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="output_vat">Output VAT (18%)</Label>
            <Input
              id="output_vat"
              type="number"
              value={form.output_vat || ""}
              onChange={(e) => handleChange("output_vat", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              VAT charged on your sales
            </p>
            {getError("output_vat") && (
              <p className="text-sm text-destructive">{getError("output_vat")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="input_vat">Input VAT</Label>
            <Input
              id="input_vat"
              type="number"
              value={form.input_vat || ""}
              onChange={(e) => handleChange("input_vat", parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              VAT paid on your purchases
            </p>
            {getError("input_vat") && (
              <p className="text-sm text-destructive">{getError("input_vat")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Taxable Sales</span>
          <span>{formatUGX(form.total_sales - form.exempt_supplies - form.zero_rated_supplies)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Output VAT (18%)</span>
          <span>{formatUGX(form.output_vat)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Less: Input VAT</span>
          <span>- {formatUGX(form.input_vat)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-medium">
          <span>{isRefund ? "VAT Refund Due" : "Net VAT Payable"}</span>
          <span className={isRefund ? "text-success" : "text-primary"}>
            {formatUGX(Math.abs(netVAT))}
          </span>
        </div>
      </div>
    </div>
  );
}
