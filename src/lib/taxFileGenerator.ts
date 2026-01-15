// Tax File Generator - Creates downloadable tax return files

import {
  TaxType,
  PAYEFormData,
  IncomeTaxFormData,
  PresumptiveTaxFormData,
  VATFormData,
  TaxFormData,
  formatUGX,
  calculatePAYE,
  calculateIncomeTax,
  calculatePresumptiveTax,
  calculateVAT,
} from "./taxCalculations";
import * as XLSX from "xlsx";
import JSZip from "jszip";

interface BusinessInfo {
  name: string;
  tin: string;
  address: string | null;
}

export type ExportFormat = "txt" | "excel" | "zip";

// Generate PAYE Return
function generatePAYEReturn(
  data: PAYEFormData,
  business: BusinessInfo,
  calculatedTax: number
): string {
  const lines = [
    "=" .repeat(60),
    "UGANDA REVENUE AUTHORITY",
    "PAYE MONTHLY RETURN",
    "=".repeat(60),
    "",
    "EMPLOYER DETAILS",
    "-".repeat(40),
    `Business Name: ${business.name}`,
    `TIN: ${business.tin}`,
    `Address: ${business.address || "N/A"}`,
    "",
    "TAX PERIOD",
    "-".repeat(40),
    `Month: ${data.period_month}`,
    `Year: ${data.period_year}`,
    "",
    "EMPLOYEE DETAILS",
    "-".repeat(40),
    `Employee Name: ${data.employee_name}`,
    `Employee TIN: ${data.employee_tin}`,
    "",
    "INCOME BREAKDOWN",
    "-".repeat(40),
    `Gross Salary:          ${formatUGX(data.gross_salary)}`,
    `Allowances:            ${formatUGX(data.allowances)}`,
    `Total Income:          ${formatUGX(data.gross_salary + data.allowances)}`,
    "",
    "DEDUCTIONS",
    "-".repeat(40),
    `NSSF Contribution:     ${formatUGX(data.nssf_contribution)}`,
    `Other Deductions:      ${formatUGX(data.other_deductions)}`,
    `Total Deductions:      ${formatUGX(data.nssf_contribution + data.other_deductions)}`,
    "",
    "TAX COMPUTATION",
    "-".repeat(40),
    `Taxable Income:        ${formatUGX(data.gross_salary + data.allowances - data.nssf_contribution - data.other_deductions)}`,
    `PAYE Tax Due:          ${formatUGX(calculatedTax)}`,
    "",
    "=".repeat(60),
    "DECLARATION",
    "I declare that the information provided is true and correct.",
    "",
    `Generated on: ${new Date().toLocaleDateString("en-UG")}`,
    "=".repeat(60),
  ];

  return lines.join("\n");
}

// Generate Income Tax Return
function generateIncomeTaxReturn(
  data: IncomeTaxFormData,
  business: BusinessInfo,
  calculatedTax: number
): string {
  const totalDeductions =
    data.business_expenses +
    data.depreciation +
    data.bad_debts +
    data.donations +
    data.other_deductions;

  const lines = [
    "=".repeat(60),
    "UGANDA REVENUE AUTHORITY",
    "ANNUAL INCOME TAX RETURN",
    "=".repeat(60),
    "",
    "TAXPAYER DETAILS",
    "-".repeat(40),
    `Business Name: ${business.name}`,
    `TIN: ${business.tin}`,
    `Address: ${business.address || "N/A"}`,
    "",
    "TAX PERIOD",
    "-".repeat(40),
    `Financial Year: ${data.period_year}`,
    "",
    "INCOME",
    "-".repeat(40),
    `Gross Income:          ${formatUGX(data.gross_income)}`,
    "",
    "ALLOWABLE DEDUCTIONS",
    "-".repeat(40),
    `Business Expenses:     ${formatUGX(data.business_expenses)}`,
    `Depreciation:          ${formatUGX(data.depreciation)}`,
    `Bad Debts:             ${formatUGX(data.bad_debts)}`,
    `Donations:             ${formatUGX(data.donations)}`,
    `Other Deductions:      ${formatUGX(data.other_deductions)}`,
    `Total Deductions:      ${formatUGX(totalDeductions)}`,
    "",
    "TAX COMPUTATION",
    "-".repeat(40),
    `Taxable Income:        ${formatUGX(data.gross_income - totalDeductions)}`,
    `Income Tax Due:        ${formatUGX(calculatedTax)}`,
    "",
    "=".repeat(60),
    "DECLARATION",
    "I declare that the information provided is true and correct.",
    "",
    `Generated on: ${new Date().toLocaleDateString("en-UG")}`,
    "=".repeat(60),
  ];

  return lines.join("\n");
}

// Generate Presumptive Tax Return
function generatePresumptiveTaxReturn(
  data: PresumptiveTaxFormData,
  business: BusinessInfo,
  calculatedTax: number
): string {
  const lines = [
    "=".repeat(60),
    "UGANDA REVENUE AUTHORITY",
    "PRESUMPTIVE TAX RETURN",
    "=".repeat(60),
    "",
    "TAXPAYER DETAILS",
    "-".repeat(40),
    `Business Name: ${business.name}`,
    `TIN: ${business.tin}`,
    `Address: ${business.address || "N/A"}`,
    `Business Category: ${data.business_category || "General"}`,
    "",
    "TAX PERIOD",
    "-".repeat(40),
    `Financial Year: ${data.period_year}`,
    "",
    "TURNOVER DECLARATION",
    "-".repeat(40),
    `Annual Turnover:       ${formatUGX(data.annual_turnover)}`,
    "",
    "TAX COMPUTATION",
    "-".repeat(40),
    `Presumptive Tax Band:  ${getTurnoverBand(data.annual_turnover)}`,
    `Tax Payable:           ${formatUGX(calculatedTax)}`,
    "",
    "NOTE: Presumptive tax is applicable for businesses with",
    "annual turnover not exceeding UGX 150,000,000",
    "",
    "=".repeat(60),
    "DECLARATION",
    "I declare that the information provided is true and correct.",
    "",
    `Generated on: ${new Date().toLocaleDateString("en-UG")}`,
    "=".repeat(60),
  ];

  return lines.join("\n");
}

function getTurnoverBand(turnover: number): string {
  if (turnover <= 10000000) return "Below UGX 10M (Exempt)";
  if (turnover <= 30000000) return "UGX 10M - 30M";
  if (turnover <= 50000000) return "UGX 30M - 50M";
  if (turnover <= 80000000) return "UGX 50M - 80M";
  if (turnover <= 150000000) return "UGX 80M - 150M";
  return "Above UGX 150M (Not Eligible)";
}

// Generate VAT Return
function generateVATReturn(
  data: VATFormData,
  business: BusinessInfo,
  calculatedTax: number
): string {
  const lines = [
    "=".repeat(60),
    "UGANDA REVENUE AUTHORITY",
    "VALUE ADDED TAX (VAT) RETURN",
    "=".repeat(60),
    "",
    "TAXPAYER DETAILS",
    "-".repeat(40),
    `Business Name: ${business.name}`,
    `TIN: ${business.tin}`,
    `Address: ${business.address || "N/A"}`,
    "",
    "TAX PERIOD",
    "-".repeat(40),
    `Month: ${data.period_month}`,
    `Year: ${data.period_year}`,
    "",
    "SUPPLIES",
    "-".repeat(40),
    `Total Sales:           ${formatUGX(data.total_sales)}`,
    `Exempt Supplies:       ${formatUGX(data.exempt_supplies)}`,
    `Zero-Rated Supplies:   ${formatUGX(data.zero_rated_supplies)}`,
    "",
    "VAT COMPUTATION",
    "-".repeat(40),
    `Output VAT (18%):      ${formatUGX(data.output_vat)}`,
    `Input VAT:             ${formatUGX(data.input_vat)}`,
    "",
    `Net VAT Payable:       ${formatUGX(calculatedTax)}`,
    calculatedTax < 0 ? "(Credit carried forward)" : "",
    "",
    "=".repeat(60),
    "DECLARATION",
    "I declare that the information provided is true and correct.",
    "",
    `Generated on: ${new Date().toLocaleDateString("en-UG")}`,
    "=".repeat(60),
  ];

  return lines.join("\n");
}

// Generate Excel data for each tax type
function generateExcelData(
  taxType: TaxType,
  formData: TaxFormData,
  business: BusinessInfo,
  calculatedTax: number
): { sheetName: string; data: Record<string, unknown>[] }[] {
  const commonInfo = [
    { Field: "Business Name", Value: business.name },
    { Field: "TIN", Value: business.tin },
    { Field: "Address", Value: business.address || "N/A" },
    { Field: "Generated Date", Value: new Date().toLocaleDateString("en-UG") },
  ];

  switch (taxType) {
    case "paye": {
      const data = formData as PAYEFormData;
      return [
        { sheetName: "Business Info", data: commonInfo },
        {
          sheetName: "PAYE Return",
          data: [
            { Field: "Tax Period", Value: `${data.period_month} ${data.period_year}` },
            { Field: "Employee Name", Value: data.employee_name },
            { Field: "Employee TIN", Value: data.employee_tin },
            { Field: "Gross Salary (UGX)", Value: data.gross_salary },
            { Field: "Allowances (UGX)", Value: data.allowances },
            { Field: "NSSF Contribution (UGX)", Value: data.nssf_contribution },
            { Field: "Other Deductions (UGX)", Value: data.other_deductions },
            { Field: "Taxable Income (UGX)", Value: data.gross_salary + data.allowances - data.nssf_contribution - data.other_deductions },
            { Field: "PAYE Tax Due (UGX)", Value: calculatedTax },
          ],
        },
      ];
    }
    case "income": {
      const data = formData as IncomeTaxFormData;
      const totalDeductions = data.business_expenses + data.depreciation + data.bad_debts + data.donations + data.other_deductions;
      return [
        { sheetName: "Business Info", data: commonInfo },
        {
          sheetName: "Income Tax Return",
          data: [
            { Field: "Financial Year", Value: data.period_year },
            { Field: "Gross Income (UGX)", Value: data.gross_income },
            { Field: "Business Expenses (UGX)", Value: data.business_expenses },
            { Field: "Depreciation (UGX)", Value: data.depreciation },
            { Field: "Bad Debts (UGX)", Value: data.bad_debts },
            { Field: "Donations (UGX)", Value: data.donations },
            { Field: "Other Deductions (UGX)", Value: data.other_deductions },
            { Field: "Total Deductions (UGX)", Value: totalDeductions },
            { Field: "Taxable Income (UGX)", Value: data.gross_income - totalDeductions },
            { Field: "Income Tax Due (UGX)", Value: calculatedTax },
          ],
        },
      ];
    }
    case "presumptive": {
      const data = formData as PresumptiveTaxFormData;
      return [
        { sheetName: "Business Info", data: commonInfo },
        {
          sheetName: "Presumptive Tax Return",
          data: [
            { Field: "Financial Year", Value: data.period_year },
            { Field: "Business Category", Value: data.business_category || "General" },
            { Field: "Annual Turnover (UGX)", Value: data.annual_turnover },
            { Field: "Turnover Band", Value: getTurnoverBand(data.annual_turnover) },
            { Field: "Presumptive Tax Due (UGX)", Value: calculatedTax },
          ],
        },
      ];
    }
    case "vat": {
      const data = formData as VATFormData;
      return [
        { sheetName: "Business Info", data: commonInfo },
        {
          sheetName: "VAT Return",
          data: [
            { Field: "Tax Period", Value: `${data.period_month} ${data.period_year}` },
            { Field: "Total Sales (UGX)", Value: data.total_sales },
            { Field: "Exempt Supplies (UGX)", Value: data.exempt_supplies },
            { Field: "Zero-Rated Supplies (UGX)", Value: data.zero_rated_supplies },
            { Field: "Taxable Supplies (UGX)", Value: data.total_sales - data.exempt_supplies - data.zero_rated_supplies },
            { Field: "Output VAT (UGX)", Value: data.output_vat },
            { Field: "Input VAT (UGX)", Value: data.input_vat },
            { Field: "Net VAT Payable (UGX)", Value: calculatedTax },
          ],
        },
      ];
    }
    default:
      return [{ sheetName: "Data", data: commonInfo }];
  }
}

// Main generator function
export function generateTaxFile(
  taxType: TaxType,
  formData: TaxFormData,
  business: BusinessInfo
): { content: string; filename: string } {
  let content: string;
  let calculatedTax: number;
  let filename: string;

  switch (taxType) {
    case "paye": {
      const data = formData as PAYEFormData;
      calculatedTax = calculatePAYE(data);
      content = generatePAYEReturn(data, business, calculatedTax);
      filename = `PAYE_Return_${business.tin}_${data.period_year}_${data.period_month}.txt`;
      break;
    }
    case "income": {
      const data = formData as IncomeTaxFormData;
      calculatedTax = calculateIncomeTax(data);
      content = generateIncomeTaxReturn(data, business, calculatedTax);
      filename = `IncomeTax_Return_${business.tin}_FY${data.period_year}.txt`;
      break;
    }
    case "presumptive": {
      const data = formData as PresumptiveTaxFormData;
      calculatedTax = calculatePresumptiveTax(data);
      content = generatePresumptiveTaxReturn(data, business, calculatedTax);
      filename = `PresumptiveTax_Return_${business.tin}_FY${data.period_year}.txt`;
      break;
    }
    case "vat": {
      const data = formData as VATFormData;
      calculatedTax = calculateVAT(data);
      content = generateVATReturn(data, business, calculatedTax);
      filename = `VAT_Return_${business.tin}_${data.period_year}_${data.period_month}.txt`;
      break;
    }
    default:
      content = "Tax return type not supported";
      filename = "tax_return.txt";
  }

  return { content, filename };
}

// Generate Excel file
export function generateExcelFile(
  taxType: TaxType,
  formData: TaxFormData,
  business: BusinessInfo
): { blob: Blob; filename: string } {
  let calculatedTax: number;

  switch (taxType) {
    case "paye":
      calculatedTax = calculatePAYE(formData as PAYEFormData);
      break;
    case "income":
      calculatedTax = calculateIncomeTax(formData as IncomeTaxFormData);
      break;
    case "presumptive":
      calculatedTax = calculatePresumptiveTax(formData as PresumptiveTaxFormData);
      break;
    case "vat":
      calculatedTax = calculateVAT(formData as VATFormData);
      break;
    default:
      calculatedTax = 0;
  }

  const sheets = generateExcelData(taxType, formData, business, calculatedTax);
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const baseFilename = getBaseFilename(taxType, formData, business);
  return { blob, filename: `${baseFilename}.xlsx` };
}

// Generate ZIP file with all formats
export async function generateZipFile(
  taxType: TaxType,
  formData: TaxFormData,
  business: BusinessInfo
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();

  // Add text file
  const { content: textContent, filename: textFilename } = generateTaxFile(taxType, formData, business);
  zip.file(textFilename, textContent);

  // Add Excel file
  const { blob: excelBlob, filename: excelFilename } = generateExcelFile(taxType, formData, business);
  zip.file(excelFilename, excelBlob);

  // Add README
  const readme = `Tax Return Package
==================
Business: ${business.name}
TIN: ${business.tin}
Generated: ${new Date().toLocaleDateString("en-UG")}

Contents:
- ${textFilename} - Human-readable text return
- ${excelFilename} - Excel spreadsheet for analysis

Instructions:
1. Upload the appropriate file to URA e-Filing portal
2. Keep both files for your records
3. Contact URA helpline 0800 117 000 for assistance
`;
  zip.file("README.txt", readme);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const baseFilename = getBaseFilename(taxType, formData, business);
  return { blob: zipBlob, filename: `${baseFilename}_Package.zip` };
}

function getBaseFilename(taxType: TaxType, formData: TaxFormData, business: BusinessInfo): string {
  switch (taxType) {
    case "paye": {
      const data = formData as PAYEFormData;
      return `PAYE_Return_${business.tin}_${data.period_year}_${data.period_month}`;
    }
    case "income": {
      const data = formData as IncomeTaxFormData;
      return `IncomeTax_Return_${business.tin}_FY${data.period_year}`;
    }
    case "presumptive": {
      const data = formData as PresumptiveTaxFormData;
      return `PresumptiveTax_Return_${business.tin}_FY${data.period_year}`;
    }
    case "vat": {
      const data = formData as VATFormData;
      return `VAT_Return_${business.tin}_${data.period_year}_${data.period_month}`;
    }
    default:
      return `TaxReturn_${business.tin}`;
  }
}

// Download helper
export function downloadTaxFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download blob helper
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
