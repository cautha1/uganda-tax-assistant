// Expense category labels and configuration
export const EXPENSE_CATEGORIES = {
  rent: { label: "Rent", color: "hsl(var(--chart-1))" },
  utilities: { label: "Utilities", color: "hsl(var(--chart-2))" },
  transport: { label: "Transport", color: "hsl(var(--chart-3))" },
  supplies: { label: "Supplies", color: "hsl(var(--chart-4))" },
  salaries: { label: "Salaries", color: "hsl(var(--chart-5))" },
  other: { label: "Other", color: "hsl(var(--muted-foreground))" },
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export const PAYMENT_METHODS = {
  cash: "Cash",
  bank: "Bank Transfer",
  mobile_money: "Mobile Money",
  other: "Other",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export interface Expense {
  id: string;
  business_id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  payment_method: PaymentMethod;
  tax_period: string;
  is_locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDocument {
  id: string;
  expense_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ExpenseAuditEntry {
  id: string;
  expense_id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  change_summary: string | null;
}

export interface CategorySummary {
  category: ExpenseCategory;
  label: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlySummary {
  taxPeriod: string;
  totalExpenses: number;
  expenseCount: number;
  categoryBreakdown: CategorySummary[];
  isLocked: boolean;
}

/**
 * Calculate total expenses from an array of expenses
 */
export function calculateTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

/**
 * Calculate category subtotals from an array of expenses
 */
export function calculateCategorySubtotals(expenses: Expense[]): CategorySummary[] {
  const total = calculateTotalExpenses(expenses);
  const categoryMap = new Map<ExpenseCategory, { total: number; count: number }>();

  // Initialize all categories
  (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).forEach((cat) => {
    categoryMap.set(cat, { total: 0, count: 0 });
  });

  // Sum up expenses by category
  expenses.forEach((expense) => {
    const current = categoryMap.get(expense.category)!;
    current.total += Number(expense.amount);
    current.count += 1;
  });

  // Convert to array with percentages
  return (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((category) => {
    const data = categoryMap.get(category)!;
    return {
      category,
      label: EXPENSE_CATEGORIES[category].label,
      total: data.total,
      count: data.count,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
    };
  });
}

/**
 * Group expenses by tax period (month)
 */
export function groupExpensesByMonth(expenses: Expense[]): Map<string, Expense[]> {
  const grouped = new Map<string, Expense[]>();

  expenses.forEach((expense) => {
    const existing = grouped.get(expense.tax_period) || [];
    existing.push(expense);
    grouped.set(expense.tax_period, existing);
  });

  // Sort by tax period (newest first)
  return new Map(
    [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  );
}

/**
 * Calculate monthly summary for a group of expenses
 */
export function calculateMonthlySummary(
  taxPeriod: string,
  expenses: Expense[]
): MonthlySummary {
  const isLocked = expenses.some((e) => e.is_locked);

  return {
    taxPeriod,
    totalExpenses: calculateTotalExpenses(expenses),
    expenseCount: expenses.length,
    categoryBreakdown: calculateCategorySubtotals(expenses),
    isLocked,
  };
}

/**
 * Format tax period for display (e.g., "2026-01" -> "January 2026")
 */
export function formatTaxPeriod(taxPeriod: string): string {
  const [year, month] = taxPeriod.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-UG", { month: "long", year: "numeric" });
}

/**
 * Get current tax period in YYYY-MM format
 */
export function getCurrentTaxPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Check if a tax period is in the past (should be locked)
 */
export function isPastTaxPeriod(taxPeriod: string): boolean {
  const current = getCurrentTaxPeriod();
  return taxPeriod < current;
}

/**
 * Format currency as UGX
 */
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate tax periods for the last N months
 */
export function getRecentTaxPeriods(months: number = 12): string[] {
  const periods: string[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    periods.push(`${year}-${month}`);
  }

  return periods;
}
