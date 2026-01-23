import { TaxType, TaxFormData, PAYEFormData, IncomeTaxFormData, PresumptiveTaxFormData, VATFormData } from "./taxCalculations";

export interface ComplianceCheck {
  id: string;
  check_type: string;
  status: "pass" | "warning" | "fail";
  message: string;
  field?: string;
}

export function runComplianceChecks(formData: TaxFormData, taxType: TaxType): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  switch (taxType) {
    case "paye":
      checks.push(...runPAYEChecks(formData as PAYEFormData));
      break;
    case "income":
      checks.push(...runIncomeTaxChecks(formData as IncomeTaxFormData));
      break;
    case "presumptive":
      checks.push(...runPresumptiveTaxChecks(formData as PresumptiveTaxFormData));
      break;
    case "vat":
      checks.push(...runVATChecks(formData as VATFormData));
      break;
  }

  // Common checks
  checks.push(...runCommonChecks(formData, taxType));

  return checks;
}

function runPAYEChecks(data: PAYEFormData): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check gross salary
  if (data.gross_salary > 0) {
    checks.push({
      id: "paye_gross_salary",
      check_type: "gross_salary",
      status: "pass",
      message: "Gross salary is recorded",
      field: "gross_salary",
    });
  } else {
    checks.push({
      id: "paye_gross_salary",
      check_type: "gross_salary",
      status: "fail",
      message: "Gross salary must be greater than 0",
      field: "gross_salary",
    });
  }

  // Check employee name
  if (data.employee_name && data.employee_name.trim().length > 0) {
    checks.push({
      id: "paye_employee_name",
      check_type: "employee_name",
      status: "pass",
      message: "Employee name is provided",
      field: "employee_name",
    });
  } else {
    checks.push({
      id: "paye_employee_name",
      check_type: "employee_name",
      status: "fail",
      message: "Employee name is required",
      field: "employee_name",
    });
  }

  // Check NSSF contribution (should be 5% of gross salary for employee + 10% employer)
  const expectedNSSF = data.gross_salary * 0.05;
  if (data.nssf_contribution > 0) {
    if (Math.abs(data.nssf_contribution - expectedNSSF) / expectedNSSF > 0.1) {
      checks.push({
        id: "nssf_contribution",
        check_type: "nssf_contribution",
        status: "warning",
        message: `NSSF contribution (${data.nssf_contribution.toLocaleString()}) differs from expected 5% (${expectedNSSF.toLocaleString()})`,
        field: "nssf_contribution",
      });
    } else {
      checks.push({
        id: "nssf_contribution",
        check_type: "nssf_contribution",
        status: "pass",
        message: "NSSF contribution is within expected range",
        field: "nssf_contribution",
      });
    }
  } else if (data.gross_salary > 0) {
    checks.push({
      id: "nssf_contribution",
      check_type: "nssf_contribution",
      status: "fail",
      message: "NSSF contribution is required for all employees",
      field: "nssf_contribution",
    });
  }

  return checks;
}

function runIncomeTaxChecks(data: IncomeTaxFormData): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check gross income
  if (data.gross_income > 0) {
    checks.push({
      id: "gross_income",
      check_type: "gross_income",
      status: "pass",
      message: "Gross income recorded",
      field: "gross_income",
    });
  } else {
    checks.push({
      id: "gross_income",
      check_type: "gross_income",
      status: "fail",
      message: "Gross income must be greater than 0",
      field: "gross_income",
    });
  }

  // Check deductions ratio
  const totalDeductions = 
    (data.business_expenses || 0) + 
    (data.depreciation || 0) + 
    (data.other_deductions || 0);
  
  const deductionRatio = data.gross_income > 0 ? totalDeductions / data.gross_income : 0;

  if (deductionRatio > 0.5) {
    checks.push({
      id: "deduction_ratio",
      check_type: "deduction_ratio",
      status: "warning",
      message: `Deductions (${(deductionRatio * 100).toFixed(1)}%) exceed 50% of income - may require documentation`,
    });
  } else if (deductionRatio > 0.3) {
    checks.push({
      id: "deduction_ratio",
      check_type: "deduction_ratio",
      status: "pass",
      message: "Deductions are within acceptable range",
    });
  }

  // Check for depreciation
  if (data.depreciation > data.gross_income * 0.4) {
    checks.push({
      id: "depreciation",
      check_type: "depreciation",
      status: "warning",
      message: "Depreciation is unusually high - ensure proper depreciation schedules",
      field: "depreciation",
    });
  }

  return checks;
}

function runPresumptiveTaxChecks(data: PresumptiveTaxFormData): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check turnover eligibility
  if (data.annual_turnover <= 150000000) {
    checks.push({
      id: "turnover_eligible",
      check_type: "turnover_eligible",
      status: "pass",
      message: "Business qualifies for presumptive tax (turnover ≤ UGX 150M)",
      field: "annual_turnover",
    });
  } else {
    checks.push({
      id: "turnover_eligible",
      check_type: "turnover_eligible",
      status: "fail",
      message: "Business exceeds presumptive tax threshold (> UGX 150M) - must file income tax",
      field: "annual_turnover",
    });
  }

  // Check business category
  if (data.business_category) {
    checks.push({
      id: "business_category",
      check_type: "business_category",
      status: "pass",
      message: `Business category: ${data.business_category}`,
      field: "business_category",
    });
  }

  return checks;
}

function runVATChecks(data: VATFormData): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check VAT registration threshold
  if (data.total_sales >= 150000000) {
    checks.push({
      id: "vat_threshold",
      check_type: "vat_threshold",
      status: "pass",
      message: "Business meets VAT registration threshold",
      field: "total_sales",
    });
  } else {
    checks.push({
      id: "vat_threshold",
      check_type: "vat_threshold",
      status: "warning",
      message: "Sales below VAT threshold (UGX 150M) - VAT registration may be voluntary",
      field: "total_sales",
    });
  }

  // Check output VAT calculation (should be 18% of taxable sales)
  const taxableSales = data.total_sales - (data.exempt_supplies || 0) - (data.zero_rated_supplies || 0);
  const expectedOutputVAT = taxableSales * 0.18;
  
  if (data.output_vat > 0 && Math.abs(data.output_vat - expectedOutputVAT) / expectedOutputVAT > 0.05) {
    checks.push({
      id: "output_vat",
      check_type: "output_vat",
      status: "warning",
      message: "Output VAT differs from calculated 18% of taxable sales",
      field: "output_vat",
    });
  } else if (data.output_vat > 0) {
    checks.push({
      id: "output_vat",
      check_type: "output_vat",
      status: "pass",
      message: "Output VAT calculation is correct",
      field: "output_vat",
    });
  }

  // Check input VAT claims
  if (data.input_vat > data.output_vat * 0.8) {
    checks.push({
      id: "input_vat_ratio",
      check_type: "input_vat_ratio",
      status: "warning",
      message: "Input VAT claims are high relative to output VAT - may attract audit scrutiny",
      field: "input_vat",
    });
  }

  return checks;
}

function runCommonChecks(formData: TaxFormData, taxType: TaxType): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check period year
  const currentYear = new Date().getFullYear();
  const periodYear = 
    "period_year" in formData 
      ? parseInt(formData.period_year as string) 
      : currentYear;

  if (periodYear > currentYear) {
    checks.push({
      id: "period_year",
      check_type: "period_year",
      status: "fail",
      message: "Tax period cannot be in the future",
    });
  } else if (periodYear < currentYear - 5) {
    checks.push({
      id: "period_year",
      check_type: "period_year",
      status: "warning",
      message: "Tax period is more than 5 years old - late filing penalties may apply",
    });
  } else {
    checks.push({
      id: "period_year",
      check_type: "period_year",
      status: "pass",
      message: "Tax period is valid",
    });
  }

  return checks;
}

export function getComplianceStatus(checks: ComplianceCheck[]): "pass" | "warning" | "fail" {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warning")) return "warning";
  return "pass";
}
