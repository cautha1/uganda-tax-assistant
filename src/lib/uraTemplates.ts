// URA Tax Form Templates Configuration

export interface TaxTemplate {
  id: string;
  name: string;
  description: string;
  taxType: "paye" | "income" | "presumptive" | "vat";
  version: string;
  lastUpdated: string;
  uraLink: string;
  fields: TemplateField[];
  brackets?: TaxBracket[];
}

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  required: boolean;
  excelCell?: string; // Maps to Excel cell for auto-fill
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface TaxBracket {
  min: number;
  max: number;
  rate?: number;
  fixedAmount?: number;
  description: string;
}

// Presumptive Tax Brackets (UGX 10M - 150M turnover)
export const PRESUMPTIVE_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 10000000, fixedAmount: 0, description: "Below UGX 10M - Exempt from tax" },
  { min: 10000001, max: 30000000, fixedAmount: 100000, description: "UGX 10M - 30M: Fixed tax of UGX 100,000" },
  { min: 30000001, max: 50000000, fixedAmount: 250000, description: "UGX 30M - 50M: Fixed tax of UGX 250,000" },
  { min: 50000001, max: 80000000, fixedAmount: 450000, description: "UGX 50M - 80M: Fixed tax of UGX 450,000" },
  { min: 80000001, max: 150000000, fixedAmount: 750000, rate: 0.007, description: "UGX 80M - 150M: UGX 360,000 + 0.7% of excess over UGX 80M" },
];

// PAYE Monthly Brackets
export const PAYE_MONTHLY_BRACKETS: TaxBracket[] = [
  { min: 0, max: 235000, rate: 0, description: "Up to UGX 235,000: 0% tax" },
  { min: 235001, max: 335000, rate: 0.1, description: "UGX 235,001 - 335,000: 10% tax" },
  { min: 335001, max: 410000, rate: 0.2, description: "UGX 335,001 - 410,000: 20% tax" },
  { min: 410001, max: 10000000, rate: 0.3, description: "UGX 410,001 - 10,000,000: 30% tax" },
  { min: 10000001, max: Infinity, rate: 0.4, description: "Above UGX 10,000,000: 40% tax" },
];

// URA Tax Templates
export const URA_TEMPLATES: TaxTemplate[] = [
  {
    id: "paye-monthly",
    name: "PAYE Monthly Return",
    description: "Pay As You Earn monthly employer return for employee tax deductions",
    taxType: "paye",
    version: "2024.1",
    lastUpdated: "2024-01-01",
    uraLink: "https://www.ura.go.ug/openFile.do?path=//webupload//upload//download//staticContent//TOPMENU//9854//10108_PAYE.xlsx",
    brackets: PAYE_MONTHLY_BRACKETS,
    fields: [
      { id: "employer_tin", name: "employer_tin", label: "Employer TIN", type: "text", required: true, excelCell: "B4", validation: { pattern: "^\\d{10}$", message: "TIN must be 10 digits" } },
      { id: "employer_name", name: "employer_name", label: "Employer Name", type: "text", required: true, excelCell: "B5" },
      { id: "period_month", name: "period_month", label: "Tax Period (Month)", type: "select", required: true, excelCell: "B6" },
      { id: "period_year", name: "period_year", label: "Tax Period (Year)", type: "select", required: true, excelCell: "B7" },
      { id: "total_employees", name: "total_employees", label: "Total Number of Employees", type: "number", required: true, excelCell: "B10", validation: { min: 1, message: "Must have at least 1 employee" } },
      { id: "gross_emoluments", name: "gross_emoluments", label: "Total Gross Emoluments (UGX)", type: "number", required: true, excelCell: "B11", validation: { min: 0 } },
      { id: "nssf_contributions", name: "nssf_contributions", label: "Total NSSF Contributions (UGX)", type: "number", required: false, excelCell: "B12", validation: { min: 0 } },
      { id: "taxable_pay", name: "taxable_pay", label: "Total Taxable Pay (UGX)", type: "number", required: true, excelCell: "B13", validation: { min: 0 } },
      { id: "paye_deducted", name: "paye_deducted", label: "Total PAYE Deducted (UGX)", type: "number", required: true, excelCell: "B14", validation: { min: 0 } },
    ],
  },
  {
    id: "income-annual",
    name: "Income Tax Return (Individual)",
    description: "Annual income tax return for individuals and sole proprietors",
    taxType: "income",
    version: "2024.1",
    lastUpdated: "2024-01-01",
    uraLink: "https://www.ura.go.ug/openFile.do?path=//webupload//upload//download//staticContent//TOPMENU//9854//10109_ITR.xlsx",
    fields: [
      { id: "taxpayer_tin", name: "taxpayer_tin", label: "Taxpayer TIN", type: "text", required: true, excelCell: "B4", validation: { pattern: "^\\d{10}$", message: "TIN must be 10 digits" } },
      { id: "taxpayer_name", name: "taxpayer_name", label: "Taxpayer Name", type: "text", required: true, excelCell: "B5" },
      { id: "period_year", name: "period_year", label: "Tax Year", type: "select", required: true, excelCell: "B6" },
      { id: "business_income", name: "business_income", label: "Business Income (UGX)", type: "number", required: false, excelCell: "B10", validation: { min: 0 } },
      { id: "employment_income", name: "employment_income", label: "Employment Income (UGX)", type: "number", required: false, excelCell: "B11", validation: { min: 0 } },
      { id: "rental_income", name: "rental_income", label: "Rental Income (UGX)", type: "number", required: false, excelCell: "B12", validation: { min: 0 } },
      { id: "other_income", name: "other_income", label: "Other Income (UGX)", type: "number", required: false, excelCell: "B13", validation: { min: 0 } },
      { id: "gross_income", name: "gross_income", label: "Total Gross Income (UGX)", type: "number", required: true, excelCell: "B15", validation: { min: 0 } },
      { id: "allowable_deductions", name: "allowable_deductions", label: "Allowable Deductions (UGX)", type: "number", required: false, excelCell: "B20", validation: { min: 0 } },
      { id: "taxable_income", name: "taxable_income", label: "Taxable Income (UGX)", type: "number", required: true, excelCell: "B25", validation: { min: 0 } },
      { id: "tax_payable", name: "tax_payable", label: "Tax Payable (UGX)", type: "number", required: true, excelCell: "B30", validation: { min: 0 } },
    ],
  },
  {
    id: "presumptive-annual",
    name: "Presumptive Tax Return",
    description: "Simplified tax for small businesses with turnover UGX 10M - 150M",
    taxType: "presumptive",
    version: "2024.1",
    lastUpdated: "2024-01-01",
    uraLink: "https://www.ura.go.ug/openFile.do?path=//webupload//upload//download//staticContent//TOPMENU//9854//10110_PTR.xlsx",
    brackets: PRESUMPTIVE_TAX_BRACKETS,
    fields: [
      { id: "taxpayer_tin", name: "taxpayer_tin", label: "Taxpayer TIN", type: "text", required: true, excelCell: "B4", validation: { pattern: "^\\d{10}$", message: "TIN must be 10 digits" } },
      { id: "taxpayer_name", name: "taxpayer_name", label: "Business Name", type: "text", required: true, excelCell: "B5" },
      { id: "business_address", name: "business_address", label: "Business Address", type: "text", required: true, excelCell: "B6" },
      { id: "period_year", name: "period_year", label: "Tax Year", type: "select", required: true, excelCell: "B7" },
      { id: "business_category", name: "business_category", label: "Business Category", type: "select", required: true, excelCell: "B10" },
      { id: "annual_turnover", name: "annual_turnover", label: "Annual Turnover (UGX)", type: "number", required: true, excelCell: "B12", validation: { min: 10000001, max: 150000000, message: "Turnover must be between UGX 10M and 150M for presumptive tax" } },
      { id: "presumptive_tax", name: "presumptive_tax", label: "Presumptive Tax Payable (UGX)", type: "number", required: true, excelCell: "B15", validation: { min: 0 } },
    ],
  },
  {
    id: "vat-monthly",
    name: "VAT Monthly Return",
    description: "Monthly VAT return for registered businesses (turnover above UGX 150M)",
    taxType: "vat",
    version: "2024.1",
    lastUpdated: "2024-01-01",
    uraLink: "https://www.ura.go.ug/openFile.do?path=//webupload//upload//download//staticContent//TOPMENU//9854//10111_VAT.xlsx",
    fields: [
      { id: "taxpayer_tin", name: "taxpayer_tin", label: "Taxpayer TIN", type: "text", required: true, excelCell: "B4", validation: { pattern: "^\\d{10}$", message: "TIN must be 10 digits" } },
      { id: "taxpayer_name", name: "taxpayer_name", label: "Business Name", type: "text", required: true, excelCell: "B5" },
      { id: "period_month", name: "period_month", label: "Tax Period (Month)", type: "select", required: true, excelCell: "B6" },
      { id: "period_year", name: "period_year", label: "Tax Period (Year)", type: "select", required: true, excelCell: "B7" },
      { id: "total_sales", name: "total_sales", label: "Total Sales/Supplies (UGX)", type: "number", required: true, excelCell: "B10", validation: { min: 0 } },
      { id: "taxable_supplies", name: "taxable_supplies", label: "Taxable Supplies (UGX)", type: "number", required: true, excelCell: "B11", validation: { min: 0 } },
      { id: "zero_rated_supplies", name: "zero_rated_supplies", label: "Zero-Rated Supplies (UGX)", type: "number", required: false, excelCell: "B12", validation: { min: 0 } },
      { id: "exempt_supplies", name: "exempt_supplies", label: "Exempt Supplies (UGX)", type: "number", required: false, excelCell: "B13", validation: { min: 0 } },
      { id: "output_vat", name: "output_vat", label: "Output VAT (18%) (UGX)", type: "number", required: true, excelCell: "B15", validation: { min: 0 } },
      { id: "input_vat", name: "input_vat", label: "Input VAT Claimed (UGX)", type: "number", required: false, excelCell: "B20", validation: { min: 0 } },
      { id: "net_vat", name: "net_vat", label: "Net VAT Payable (UGX)", type: "number", required: true, excelCell: "B25", validation: { min: 0 } },
    ],
  },
];

// Calculate presumptive tax based on turnover
export function calculatePresumptiveTaxFromBracket(turnover: number): number {
  if (turnover <= 10000000) return 0;
  if (turnover <= 30000000) return 100000;
  if (turnover <= 50000000) return 250000;
  if (turnover <= 80000000) return 450000;
  if (turnover <= 150000000) {
    // UGX 360,000 + 0.7% of excess over 80M
    const excess = turnover - 80000000;
    return 360000 + Math.round(excess * 0.007);
  }
  return -1; // Not eligible for presumptive tax
}

// Validate form data against template fields
export function validateTemplateData(template: TaxTemplate, data: Record<string, any>): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];

  for (const field of template.fields) {
    const value = data[field.id];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push({ field: field.id, message: `${field.label} is required` });
      continue;
    }

    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === "") continue;

    // Validate based on type and rules
    if (field.type === "number" && field.validation) {
      const numValue = Number(value);
      if (field.validation.min !== undefined && numValue < field.validation.min) {
        errors.push({ field: field.id, message: field.validation.message || `${field.label} must be at least ${field.validation.min}` });
      }
      if (field.validation.max !== undefined && numValue > field.validation.max) {
        errors.push({ field: field.id, message: field.validation.message || `${field.label} must be at most ${field.validation.max}` });
      }
    }

    if (field.type === "text" && field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(String(value))) {
        errors.push({ field: field.id, message: field.validation.message || `${field.label} format is invalid` });
      }
    }
  }

  return errors;
}

// Get template by ID
export function getTemplateById(templateId: string): TaxTemplate | undefined {
  return URA_TEMPLATES.find(t => t.id === templateId);
}

// Get templates by tax type
export function getTemplatesByTaxType(taxType: string): TaxTemplate[] {
  return URA_TEMPLATES.filter(t => t.taxType === taxType);
}
