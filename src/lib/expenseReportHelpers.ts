import type { Expense, ExpenseCategory, MonthlySummary } from "./expenseCalculations";
import { EXPENSE_CATEGORIES, isPastTaxPeriod } from "./expenseCalculations";

/**
 * Check if an expense has supporting documents
 */
export function expenseHasDocuments(
  expenseId: string,
  documentCounts: Record<string, number>
): boolean {
  return (documentCounts[expenseId] || 0) > 0;
}

/**
 * Get expenses missing documents
 */
export function getExpensesMissingDocuments(
  expenses: Expense[],
  documentCounts: Record<string, number>
): Expense[] {
  return expenses.filter((e) => !expenseHasDocuments(e.id, documentCounts));
}

/**
 * Tax-ready status for a monthly summary
 */
export interface TaxReadyStatus {
  isReady: boolean;
  allDocumented: boolean;
  canLock: boolean;
  missingDocCount: number;
  totalCount: number;
  documentedCount: number;
}

/**
 * Calculate tax-ready status for a month
 */
export function calculateTaxReadyStatus(
  expenses: Expense[],
  documentCounts: Record<string, number>
): TaxReadyStatus {
  const totalCount = expenses.length;
  const documentedCount = expenses.filter((e) => 
    expenseHasDocuments(e.id, documentCounts)
  ).length;
  const missingDocCount = totalCount - documentedCount;
  const allLocked = expenses.every((e) => e.is_locked);
  const allDocumented = missingDocCount === 0;
  const isPast = expenses.length > 0 && isPastTaxPeriod(expenses[0].tax_period);

  return {
    isReady: allDocumented && (allLocked || isPast),
    allDocumented,
    canLock: isPast && !allLocked && totalCount > 0,
    missingDocCount,
    totalCount,
    documentedCount,
  };
}

/**
 * Deductible expense categories for tax purposes
 */
export const DEDUCTIBLE_CATEGORIES: ExpenseCategory[] = [
  "rent",
  "utilities",
  "transport",
  "supplies",
  "salaries",
  "other",
];

/**
 * Calculate deductible total from expenses
 */
export function calculateDeductibleTotal(expenses: Expense[]): number {
  return expenses
    .filter((e) => DEDUCTIBLE_CATEGORIES.includes(e.category))
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

/**
 * Generate summary text for tax reports
 */
export function generateTaxSummaryText(
  summary: MonthlySummary,
  documentCounts: Record<string, number>,
  expenses: Expense[]
): string {
  const status = calculateTaxReadyStatus(expenses, documentCounts);
  const lines: string[] = [];

  lines.push(`Period: ${summary.taxPeriod}`);
  lines.push(`Total Expenses: UGX ${summary.totalExpenses.toLocaleString()}`);
  lines.push(`Number of Expenses: ${summary.expenseCount}`);
  lines.push(`Documented: ${status.documentedCount}/${status.totalCount}`);
  lines.push(`Status: ${summary.isLocked ? "Locked" : "Open"}`);

  if (status.missingDocCount > 0) {
    lines.push(`⚠️ ${status.missingDocCount} expense(s) missing documentation`);
  }

  return lines.join("\n");
}
