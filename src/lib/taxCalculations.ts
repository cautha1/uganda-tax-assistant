// Uganda Tax Calculation Utilities

export type TaxType = "paye" | "income" | "presumptive" | "vat" | "other";

// PAYE Tax Bands for Uganda (Annual - UGX)
export const PAYE_BANDS = [
  { min: 0, max: 2820000, rate: 0 }, // 0% up to 2.82M
  { min: 2820001, max: 4020000, rate: 0.1 }, // 10% on next 1.2M
  { min: 4020001, max: 4920000, rate: 0.2 }, // 20% on next 900K
  { min: 4920001, max: 120000000, rate: 0.3 }, // 30% on next 115.08M
  { min: 120000001, max: Infinity, rate: 0.4 }, // 40% above 120M
];

// Monthly PAYE bands
export const PAYE_BANDS_MONTHLY = PAYE_BANDS.map((band) => ({
  min: Math.floor(band.min / 12),
  max: band.max === Infinity ? Infinity : Math.floor(band.max / 12),
  rate: band.rate,
}));

// Presumptive Tax Bands (based on annual turnover)
export const PRESUMPTIVE_TAX_BANDS = [
  { min: 0, max: 10000000, tax: 0 }, // Below 10M - exempt
  { min: 10000001, max: 30000000, tax: 100000 }, // 10M-30M: 100K
  { min: 30000001, max: 50000000, tax: 250000 }, // 30M-50M: 250K
  { min: 50000001, max: 80000000, tax: 450000 }, // 50M-80M: 450K
  { min: 80000001, max: 150000000, tax: 750000 }, // 80M-150M: 750K
];

// VAT Rate
export const VAT_RATE = 0.18; // 18%
export const VAT_THRESHOLD = 150000000; // 150M UGX annual turnover

// Income Tax Rates
export const INCOME_TAX_RATE_INDIVIDUAL = 0.3;
export const INCOME_TAX_RATE_COMPANY = 0.3;
export const INCOME_TAX_RATE_SMALL_BUSINESS = 0; // If using presumptive

export interface PAYEFormData {
  employee_name: string;
  employee_tin: string;
  gross_salary: number;
  allowances: number;
  nssf_contribution: number;
  other_deductions: number;
  period_month: string;
  period_year: string;
}

export interface IncomeTaxFormData {
  gross_income: number;
  business_expenses: number;
  depreciation: number;
  bad_debts: number;
  donations: number;
  other_deductions: number;
  period_year: string;
}

export interface PresumptiveTaxFormData {
  annual_turnover: number;
  period_year: string;
  business_category: string;
}

export interface VATFormData {
  output_vat: number;
  input_vat: number;
  exempt_supplies: number;
  zero_rated_supplies: number;
  period_month: string;
  period_year: string;
  total_sales: number;
}

export interface OtherTaxFormData {
  tax_description: string;
  tax_amount: number;
  period: string;
  notes: string;
}

export type TaxFormData =
  | PAYEFormData
  | IncomeTaxFormData
  | PresumptiveTaxFormData
  | VATFormData
  | OtherTaxFormData;

// Calculate PAYE tax
export function calculatePAYE(data: PAYEFormData): number {
  const { gross_salary, allowances, nssf_contribution, other_deductions } = data;
  
  // Calculate taxable income
  const totalIncome = gross_salary + allowances;
  const totalDeductions = nssf_contribution + other_deductions;
  const taxableIncome = Math.max(0, totalIncome - totalDeductions);
  
  // Calculate monthly tax using bands
  let tax = 0;
  let remainingIncome = taxableIncome;
  
  for (const band of PAYE_BANDS_MONTHLY) {
    if (remainingIncome <= 0) break;
    
    const taxableInBand = Math.min(
      remainingIncome,
      band.max === Infinity ? remainingIncome : band.max - band.min + 1
    );
    
    if (taxableIncome > band.min) {
      const incomeInBand = Math.min(
        taxableIncome - band.min,
        band.max === Infinity ? taxableIncome : band.max - band.min
      );
      tax += incomeInBand * band.rate;
    }
    
    remainingIncome -= taxableInBand;
  }
  
  return Math.round(tax);
}

// Calculate Income Tax
export function calculateIncomeTax(data: IncomeTaxFormData): number {
  const {
    gross_income,
    business_expenses,
    depreciation,
    bad_debts,
    donations,
    other_deductions,
  } = data;
  
  const allowableDeductions =
    business_expenses + depreciation + bad_debts + donations + other_deductions;
  
  const taxableIncome = Math.max(0, gross_income - allowableDeductions);
  
  // Apply progressive rates (simplified)
  let tax = 0;
  let remainingIncome = taxableIncome;
  
  for (const band of PAYE_BANDS) {
    if (remainingIncome <= 0) break;
    
    if (taxableIncome > band.min) {
      const incomeInBand = Math.min(
        taxableIncome - band.min,
        band.max === Infinity ? taxableIncome : band.max - band.min
      );
      tax += incomeInBand * band.rate;
    }
  }
  
  return Math.round(tax);
}

// Calculate Presumptive Tax
export function calculatePresumptiveTax(data: PresumptiveTaxFormData): number {
  const { annual_turnover } = data;
  
  for (const band of PRESUMPTIVE_TAX_BANDS) {
    if (annual_turnover >= band.min && annual_turnover <= band.max) {
      return band.tax;
    }
  }
  
  // Above threshold - not eligible for presumptive tax
  return -1; // Indicates not eligible
}

// Calculate VAT
export function calculateVAT(data: VATFormData): number {
  const { output_vat, input_vat } = data;
  
  // Net VAT payable = Output VAT - Input VAT
  return Math.max(0, output_vat - input_vat);
}

// Validation functions
export interface ValidationError {
  field: string;
  message: string;
}

export function validatePAYE(data: PAYEFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!data.employee_name?.trim()) {
    errors.push({ field: "employee_name", message: "Employee name is required" });
  }
  
  if (!data.employee_tin?.trim()) {
    errors.push({ field: "employee_tin", message: "Employee TIN is required" });
  } else if (!/^\d{10}$/.test(data.employee_tin)) {
    errors.push({ field: "employee_tin", message: "TIN must be 10 digits" });
  }
  
  if (data.gross_salary <= 0) {
    errors.push({ field: "gross_salary", message: "Gross salary must be greater than 0" });
  }
  
  if (data.nssf_contribution < 0) {
    errors.push({ field: "nssf_contribution", message: "NSSF contribution cannot be negative" });
  }
  
  if (!data.period_month || !data.period_year) {
    errors.push({ field: "period_month", message: "Tax period is required" });
  }
  
  return errors;
}

export function validateIncomeTax(data: IncomeTaxFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (data.gross_income <= 0) {
    errors.push({ field: "gross_income", message: "Gross income must be greater than 0" });
  }
  
  if (data.business_expenses < 0) {
    errors.push({ field: "business_expenses", message: "Business expenses cannot be negative" });
  }
  
  if (!data.period_year) {
    errors.push({ field: "period_year", message: "Tax year is required" });
  }
  
  return errors;
}

export function validatePresumptiveTax(data: PresumptiveTaxFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (data.annual_turnover <= 0) {
    errors.push({ field: "annual_turnover", message: "Annual turnover must be greater than 0" });
  }
  
  if (data.annual_turnover > 150000000) {
    errors.push({
      field: "annual_turnover",
      message: "Turnover above UGX 150M is not eligible for presumptive tax",
    });
  }
  
  if (!data.period_year) {
    errors.push({ field: "period_year", message: "Tax year is required" });
  }
  
  return errors;
}

export function validateVAT(data: VATFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (data.output_vat < 0) {
    errors.push({ field: "output_vat", message: "Output VAT cannot be negative" });
  }
  
  if (data.input_vat < 0) {
    errors.push({ field: "input_vat", message: "Input VAT cannot be negative" });
  }
  
  if (!data.period_month || !data.period_year) {
    errors.push({ field: "period_month", message: "Tax period is required" });
  }
  
  return errors;
}

// Format currency
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Get tax period label
export function getTaxPeriodLabel(taxType: TaxType, formData: TaxFormData): string {
  switch (taxType) {
    case "paye":
    case "vat": {
      const data = formData as PAYEFormData | VATFormData;
      return `${data.period_month} ${data.period_year}`;
    }
    case "income":
    case "presumptive": {
      const data = formData as IncomeTaxFormData | PresumptiveTaxFormData;
      return `FY ${data.period_year}`;
    }
    default:
      return "N/A";
  }
}
