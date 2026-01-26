// Income calculation utilities and type definitions

export const INCOME_SOURCES = {
  sales: { label: "Sales", color: "hsl(var(--chart-1))" },
  services: { label: "Services", color: "hsl(var(--chart-2))" },
  contracts: { label: "Contracts", color: "hsl(var(--chart-3))" },
  grants: { label: "Grants", color: "hsl(var(--chart-4))" },
  other: { label: "Other", color: "hsl(var(--chart-5))" },
} as const;

export type IncomeSource = keyof typeof INCOME_SOURCES;

export const INCOME_PAYMENT_METHODS = {
  cash: { label: "Cash", icon: "banknote" },
  bank: { label: "Bank Transfer", icon: "building" },
  mobile_money: { label: "Mobile Money", icon: "smartphone" },
  other: { label: "Other", icon: "credit-card" },
} as const;

export type IncomePaymentMethod = keyof typeof INCOME_PAYMENT_METHODS;

export interface Income {
  id: string;
  business_id: string;
  income_date: string;
  source: IncomeSource;
  source_name: string | null;
  description: string | null;
  amount: number;
  payment_method: IncomePaymentMethod;
  tax_period: string;
  is_locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeDocument {
  id: string;
  income_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface IncomeAuditEntry {
  id: string;
  income_id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  change_summary: string | null;
}

export interface SourceSummary {
  source: IncomeSource;
  label: string;
  total: number;
  count: number;
  color: string;
}

export interface MonthlyIncomeSummary {
  taxPeriod: string;
  month: string;
  year: string;
  totalIncome: number;
  entryCount: number;
  isLocked: boolean;
  sourceBreakdown: SourceSummary[];
  hasDocuments: boolean;
  documentCount: number;
}

/**
 * Calculate total income from a list of income entries
 */
export function calculateTotalIncome(incomeEntries: Income[]): number {
  return incomeEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
}

/**
 * Calculate subtotals by income source
 */
export function calculateSourceSubtotals(incomeEntries: Income[]): SourceSummary[] {
  const summaryMap = new Map<IncomeSource, { total: number; count: number }>();

  incomeEntries.forEach((entry) => {
    const source = entry.source as IncomeSource;
    const current = summaryMap.get(source) || { total: 0, count: 0 };
    summaryMap.set(source, {
      total: current.total + Number(entry.amount),
      count: current.count + 1,
    });
  });

  return Array.from(summaryMap.entries()).map(([source, data]) => ({
    source,
    label: INCOME_SOURCES[source]?.label || source,
    total: data.total,
    count: data.count,
    color: INCOME_SOURCES[source]?.color || "hsl(var(--muted))",
  }));
}

/**
 * Group income entries by tax period (month)
 */
export function groupIncomeByMonth(
  incomeEntries: Income[]
): Map<string, Income[]> {
  const grouped = new Map<string, Income[]>();

  incomeEntries.forEach((entry) => {
    const period = entry.tax_period;
    const existing = grouped.get(period) || [];
    existing.push(entry);
    grouped.set(period, existing);
  });

  return grouped;
}

/**
 * Calculate monthly summary for a specific tax period
 */
export function calculateMonthlyIncomeSummary(
  incomeEntries: Income[],
  taxPeriod: string,
  documentCounts: Record<string, number> = {}
): MonthlyIncomeSummary {
  const periodEntries = incomeEntries.filter((e) => e.tax_period === taxPeriod);
  const [year, month] = taxPeriod.split("-");
  const totalDocuments = periodEntries.reduce(
    (sum, entry) => sum + (documentCounts[entry.id] || 0),
    0
  );

  return {
    taxPeriod,
    month,
    year,
    totalIncome: calculateTotalIncome(periodEntries),
    entryCount: periodEntries.length,
    isLocked: periodEntries.length > 0 && periodEntries.every((e) => e.is_locked),
    sourceBreakdown: calculateSourceSubtotals(periodEntries),
    hasDocuments: totalDocuments > 0,
    documentCount: totalDocuments,
  };
}

/**
 * Format amount as UGX currency
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
 * Format tax period for display
 */
export function formatTaxPeriod(taxPeriod: string): string {
  const [year, month] = taxPeriod.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-UG", { month: "long", year: "numeric" });
}

/**
 * Get current tax period (YYYY-MM format)
 */
export function getCurrentTaxPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get tax period from a date
 */
export function getTaxPeriodFromDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get all unique tax periods from income entries, sorted descending
 */
export function getUniqueTaxPeriods(incomeEntries: Income[]): string[] {
  const periods = new Set(incomeEntries.map((e) => e.tax_period));
  return Array.from(periods).sort((a, b) => b.localeCompare(a));
}

/**
 * Check if an income entry is tax-ready (has documentation)
 */
export function isIncomeDocumented(
  incomeId: string,
  documentCounts: Record<string, number>
): boolean {
  return (documentCounts[incomeId] || 0) > 0;
}

/**
 * Calculate tax-ready percentage for a period
 */
export function calculateTaxReadyPercentage(
  incomeEntries: Income[],
  documentCounts: Record<string, number>
): number {
  if (incomeEntries.length === 0) return 100;
  const documented = incomeEntries.filter(
    (e) => isIncomeDocumented(e.id, documentCounts)
  ).length;
  return Math.round((documented / incomeEntries.length) * 100);
}
