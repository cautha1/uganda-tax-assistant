/**
 * Required documents configuration per tax type
 * Used for missing document indicators in audit tools
 */

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  required: boolean;
  documentType: string;
}

export const PAYE_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: "paye_payroll",
    name: "Payroll Records",
    description: "Monthly employee payroll summary",
    required: true,
    documentType: "payroll",
  },
  {
    id: "paye_nssf",
    name: "NSSF Statement",
    description: "National Social Security Fund contribution statement",
    required: true,
    documentType: "nssf_statement",
  },
  {
    id: "paye_bank",
    name: "Bank Statements",
    description: "Bank statements showing salary payments",
    required: false,
    documentType: "bank_statement",
  },
  {
    id: "paye_contracts",
    name: "Employment Contracts",
    description: "Contracts for new employees in the period",
    required: false,
    documentType: "contract",
  },
];

export const INCOME_TAX_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: "income_financials",
    name: "Financial Statements",
    description: "Audited or management financial statements",
    required: true,
    documentType: "financial_statement",
  },
  {
    id: "income_receipts",
    name: "Deduction Receipts",
    description: "Receipts supporting claimed deductions",
    required: true,
    documentType: "receipt",
  },
  {
    id: "income_depreciation",
    name: "Depreciation Schedule",
    description: "Asset depreciation calculation schedule",
    required: false,
    documentType: "depreciation_schedule",
  },
  {
    id: "income_trial_balance",
    name: "Trial Balance",
    description: "Trial balance for the tax period",
    required: false,
    documentType: "trial_balance",
  },
];

export const PRESUMPTIVE_TAX_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: "presumptive_license",
    name: "Business License",
    description: "Valid trading license from local authority",
    required: true,
    documentType: "license",
  },
  {
    id: "presumptive_turnover",
    name: "Turnover Records",
    description: "Sales records or turnover declaration",
    required: true,
    documentType: "turnover_record",
  },
  {
    id: "presumptive_bank",
    name: "Bank Statements",
    description: "Bank statements showing business transactions",
    required: false,
    documentType: "bank_statement",
  },
];

export const VAT_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: "vat_purchase",
    name: "Purchase Invoices",
    description: "Tax invoices for input VAT claims",
    required: true,
    documentType: "purchase_invoice",
  },
  {
    id: "vat_sales",
    name: "Sales Invoices",
    description: "Tax invoices issued to customers",
    required: true,
    documentType: "sales_invoice",
  },
  {
    id: "vat_register",
    name: "VAT Register",
    description: "Monthly VAT input/output register",
    required: true,
    documentType: "vat_register",
  },
  {
    id: "vat_customs",
    name: "Customs Documents",
    description: "Import/export documentation if applicable",
    required: false,
    documentType: "customs_document",
  },
];

export type TaxType = "paye" | "income" | "presumptive" | "vat" | "other";

export function getRequiredDocuments(taxType: TaxType): RequiredDocument[] {
  switch (taxType) {
    case "paye":
      return PAYE_REQUIRED_DOCUMENTS;
    case "income":
      return INCOME_TAX_REQUIRED_DOCUMENTS;
    case "presumptive":
      return PRESUMPTIVE_TAX_REQUIRED_DOCUMENTS;
    case "vat":
      return VAT_REQUIRED_DOCUMENTS;
    default:
      return [];
  }
}

export function getRequiredDocumentCount(taxType: TaxType): number {
  return getRequiredDocuments(taxType).filter(d => d.required).length;
}

export function getAllDocumentTypes(): string[] {
  const allDocs = [
    ...PAYE_REQUIRED_DOCUMENTS,
    ...INCOME_TAX_REQUIRED_DOCUMENTS,
    ...PRESUMPTIVE_TAX_REQUIRED_DOCUMENTS,
    ...VAT_REQUIRED_DOCUMENTS,
  ];
  
  return [...new Set(allDocs.map(d => d.documentType))];
}
