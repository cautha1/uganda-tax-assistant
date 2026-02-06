// Reconciliation Report Calculation Utilities
import { supabase } from "@/integrations/supabase/client";
import { calculateIncomeTax, calculatePresumptiveTax, PRESUMPTIVE_TAX_BANDS, formatUGX } from "./taxCalculations";

// Type definitions
export interface TaxReconciliationData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  adjustments: {
    addBacks: { category: string; amount: number; reason: string }[];
    deductions: { category: string; amount: number; reason: string }[];
  };
  taxableProfit: number;
  estimatedTax: number;
  incomeBreakdown: { source: string; amount: number }[];
  expenseBreakdown: { category: string; amount: number }[];
}

export interface AdjustmentsData {
  items: {
    id: string;
    category: string;
    reason: string;
    amount: number;
    entryId: string;
    entryType: 'income' | 'expense';
    hasEvidence: boolean;
  }[];
  totalAddBacks: number;
  totalDeductions: number;
}

export interface EvidenceExceptionsData {
  missingReceipts: { id: string; type: string; amount: number; date: string; description: string }[];
  largeEntries: { id: string; type: string; amount: number; threshold: number; description: string }[];
  editedAfterLock: { id: string; type: string; editedAt: string; description: string }[];
  validationWarnings: { id: string; message: string }[];
  summary: {
    totalMissingReceipts: number;
    totalLargeEntries: number;
    totalEditedAfterLock: number;
  };
}

// Categories that are typically non-deductible (add-backs)
const NON_DEDUCTIBLE_CATEGORIES = [
  'entertainment',
  'personal',
  'fines',
  'penalties',
  'donations_unapproved',
];

// Categories with partial deductibility
const PARTIALLY_DEDUCTIBLE = {
  'meals': 0.5, // 50% deductible
  'vehicle': 0.7, // 70% deductible for mixed use
};

// Large entry threshold multiplier (3x average)
const LARGE_ENTRY_THRESHOLD_MULTIPLIER = 3;

/**
 * Calculate Tax Reconciliation Summary
 */
export async function calculateTaxReconciliationSummary(
  businessId: string,
  periodStart: string,
  periodEnd: string,
  taxType: string
): Promise<TaxReconciliationData> {
  // Fetch income for period
  const { data: incomeData, error: incomeError } = await supabase
    .from('income')
    .select('*')
    .eq('business_id', businessId)
    .gte('income_date', periodStart)
    .lte('income_date', periodEnd);

  if (incomeError) throw incomeError;

  // Fetch expenses for period
  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .select('*')
    .eq('business_id', businessId)
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd);

  if (expenseError) throw expenseError;

  const income = incomeData || [];
  const expenses = expenseData || [];

  // Calculate totals
  const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  // Group income by source
  const incomeBySource: Record<string, number> = {};
  income.forEach(i => {
    const source = i.source || 'other';
    incomeBySource[source] = (incomeBySource[source] || 0) + Number(i.amount);
  });
  const incomeBreakdown = Object.entries(incomeBySource).map(([source, amount]) => ({
    source,
    amount,
  }));

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const category = e.category || 'other';
    expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(e.amount);
  });
  const expenseBreakdown = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    amount,
  }));

  // Calculate adjustments
  const addBacks: { category: string; amount: number; reason: string }[] = [];
  const deductions: { category: string; amount: number; reason: string }[] = [];

  // Add-backs for non-deductible expenses
  expenses.forEach(e => {
    if (NON_DEDUCTIBLE_CATEGORIES.includes(e.category)) {
      addBacks.push({
        category: e.category,
        amount: Number(e.amount),
        reason: `Non-deductible expense: ${e.category}`,
      });
    } else if (PARTIALLY_DEDUCTIBLE[e.category as keyof typeof PARTIALLY_DEDUCTIBLE]) {
      const nonDeductiblePortion = Number(e.amount) * (1 - PARTIALLY_DEDUCTIBLE[e.category as keyof typeof PARTIALLY_DEDUCTIBLE]);
      if (nonDeductiblePortion > 0) {
        addBacks.push({
          category: e.category,
          amount: nonDeductiblePortion,
          reason: `Partially non-deductible: ${e.category}`,
        });
      }
    }
  });

  const totalAddBacks = addBacks.reduce((sum, a) => sum + a.amount, 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const taxableProfit = netProfit + totalAddBacks - totalDeductions;

  // Calculate estimated tax based on tax type
  let estimatedTax = 0;
  if (taxType === 'income') {
    estimatedTax = calculateIncomeTax({
      gross_income: totalIncome,
      business_expenses: totalExpenses - totalAddBacks,
      depreciation: 0,
      bad_debts: 0,
      donations: 0,
      other_deductions: 0,
      period_year: new Date(periodStart).getFullYear().toString(),
    });
  } else if (taxType === 'presumptive') {
    estimatedTax = calculatePresumptiveTax({
      annual_turnover: totalIncome,
      period_year: new Date(periodStart).getFullYear().toString(),
      business_category: 'other',
    });
    if (estimatedTax === -1) estimatedTax = 0; // Not eligible
  } else if (taxType === 'vat') {
    // VAT is 18% of taxable supplies
    estimatedTax = Math.round(totalIncome * 0.18);
  } else if (taxType === 'paye') {
    // PAYE would be calculated differently per employee
    estimatedTax = 0;
  }

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    adjustments: { addBacks, deductions },
    taxableProfit,
    estimatedTax,
    incomeBreakdown,
    expenseBreakdown,
  };
}

/**
 * Generate Adjustments Schedule
 */
export async function generateAdjustmentsSchedule(
  businessId: string,
  periodStart: string,
  periodEnd: string
): Promise<AdjustmentsData> {
  // Fetch expenses for period
  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('*, expense_documents(id)')
    .eq('business_id', businessId)
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd);

  if (expenseError) throw expenseError;

  const items: AdjustmentsData['items'] = [];

  (expenses || []).forEach(e => {
    const hasEvidence = (e.expense_documents?.length || 0) > 0;
    
    if (NON_DEDUCTIBLE_CATEGORIES.includes(e.category)) {
      items.push({
        id: `adj-${e.id}`,
        category: e.category,
        reason: `Non-deductible expense - ${e.category}`,
        amount: Number(e.amount),
        entryId: e.id,
        entryType: 'expense',
        hasEvidence,
      });
    } else if (PARTIALLY_DEDUCTIBLE[e.category as keyof typeof PARTIALLY_DEDUCTIBLE]) {
      const nonDeductiblePortion = Number(e.amount) * (1 - PARTIALLY_DEDUCTIBLE[e.category as keyof typeof PARTIALLY_DEDUCTIBLE]);
      if (nonDeductiblePortion > 0) {
        items.push({
          id: `adj-${e.id}`,
          category: e.category,
          reason: `Partially non-deductible (${(1 - PARTIALLY_DEDUCTIBLE[e.category as keyof typeof PARTIALLY_DEDUCTIBLE]) * 100}%)`,
          amount: nonDeductiblePortion,
          entryId: e.id,
          entryType: 'expense',
          hasEvidence,
        });
      }
    }
  });

  const totalAddBacks = items.reduce((sum, i) => sum + i.amount, 0);

  return {
    items,
    totalAddBacks,
    totalDeductions: 0,
  };
}

/**
 * Generate Evidence & Exceptions Report
 */
export async function generateEvidenceExceptionsReport(
  businessId: string,
  periodStart: string,
  periodEnd: string
): Promise<EvidenceExceptionsData> {
  // Fetch income with documents
  const { data: income, error: incomeError } = await supabase
    .from('income')
    .select('*, income_documents(id)')
    .eq('business_id', businessId)
    .gte('income_date', periodStart)
    .lte('income_date', periodEnd);

  if (incomeError) throw incomeError;

  // Fetch expenses with documents
  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('*, expense_documents(id)')
    .eq('business_id', businessId)
    .gte('expense_date', periodStart)
    .lte('expense_date', periodEnd);

  if (expenseError) throw expenseError;

  const missingReceipts: EvidenceExceptionsData['missingReceipts'] = [];
  const largeEntries: EvidenceExceptionsData['largeEntries'] = [];
  const editedAfterLock: EvidenceExceptionsData['editedAfterLock'] = [];
  const validationWarnings: EvidenceExceptionsData['validationWarnings'] = [];

  // Calculate average amounts by category for anomaly detection
  const expenseByCategory: Record<string, number[]> = {};
  (expenses || []).forEach(e => {
    if (!expenseByCategory[e.category]) {
      expenseByCategory[e.category] = [];
    }
    expenseByCategory[e.category].push(Number(e.amount));
  });

  const categoryAverages: Record<string, number> = {};
  Object.entries(expenseByCategory).forEach(([category, amounts]) => {
    categoryAverages[category] = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  });

  // Check income entries
  (income || []).forEach(i => {
    // Missing receipts
    if (!i.income_documents || i.income_documents.length === 0) {
      missingReceipts.push({
        id: i.id,
        type: 'income',
        amount: Number(i.amount),
        date: i.income_date,
        description: i.description || `Income from ${i.source}`,
      });
    }
  });

  // Check expense entries
  (expenses || []).forEach(e => {
    // Missing receipts
    if (!e.expense_documents || e.expense_documents.length === 0) {
      missingReceipts.push({
        id: e.id,
        type: 'expense',
        amount: Number(e.amount),
        date: e.expense_date,
        description: e.description || `${e.category} expense`,
      });
    }

    // Large entries (above 3x category average)
    const threshold = (categoryAverages[e.category] || 0) * LARGE_ENTRY_THRESHOLD_MULTIPLIER;
    if (threshold > 0 && Number(e.amount) > threshold) {
      largeEntries.push({
        id: e.id,
        type: 'expense',
        amount: Number(e.amount),
        threshold,
        description: e.description || `${e.category} expense`,
      });
    }

    // Edited after lock (check if locked but updated_at > created_at significantly)
    if (e.is_locked && e.updated_at && e.created_at) {
      const createdDate = new Date(e.created_at);
      const updatedDate = new Date(e.updated_at);
      // If updated more than 1 hour after creation and now locked
      if (updatedDate.getTime() - createdDate.getTime() > 3600000) {
        editedAfterLock.push({
          id: e.id,
          type: 'expense',
          editedAt: e.updated_at,
          description: e.description || `${e.category} expense`,
        });
      }
    }
  });

  // Add validation warnings
  if (missingReceipts.length > 0) {
    validationWarnings.push({
      id: 'missing-receipts-warning',
      message: `${missingReceipts.length} entries are missing supporting documents`,
    });
  }

  if (largeEntries.length > 0) {
    validationWarnings.push({
      id: 'large-entries-warning',
      message: `${largeEntries.length} entries are significantly above category averages`,
    });
  }

  return {
    missingReceipts,
    largeEntries,
    editedAfterLock,
    validationWarnings,
    summary: {
      totalMissingReceipts: missingReceipts.length,
      totalLargeEntries: largeEntries.length,
      totalEditedAfterLock: editedAfterLock.length,
    },
  };
}

/**
 * Get period dates from period string
 */
export function getPeriodDates(
  periodType: 'month' | 'quarter' | 'year',
  periodValue: string
): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (periodType === 'month') {
    // periodValue format: "YYYY-MM"
    const [year, month] = periodValue.split('-').map(Number);
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0); // Last day of month
  } else if (periodType === 'quarter') {
    // periodValue format: "YYYY-Q1", "YYYY-Q2", etc.
    const [yearStr, quarterStr] = periodValue.split('-');
    const year = parseInt(yearStr);
    const quarter = parseInt(quarterStr.replace('Q', ''));
    const startMonth = (quarter - 1) * 3;
    start = new Date(year, startMonth, 1);
    end = new Date(year, startMonth + 3, 0);
  } else {
    // periodValue format: "YYYY" or "YYYY/YYYY"
    const year = parseInt(periodValue.split('/')[0]);
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Format report data for display
 */
export function formatReportCurrency(amount: number): string {
  return formatUGX(amount);
}

/**
 * Get tax type label
 */
export function getTaxTypeLabel(taxType: string): string {
  const labels: Record<string, string> = {
    income: 'Income Tax',
    presumptive: 'Presumptive Tax',
    paye: 'PAYE',
    vat: 'VAT',
  };
  return labels[taxType] || taxType;
}

/**
 * Get report type label
 */
export function getReportTypeLabel(reportType: string): string {
  const labels: Record<string, string> = {
    tax_summary: 'Tax Reconciliation Summary',
    adjustments: 'Adjustments Schedule',
    evidence_exceptions: 'Evidence & Exceptions Report',
  };
  return labels[reportType] || reportType;
}
