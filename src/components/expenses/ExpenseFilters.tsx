import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  getRecentTaxPeriods,
  formatTaxPeriod,
  type ExpenseCategory,
  type PaymentMethod,
} from "@/lib/expenseCalculations";

export interface ExpenseFilters {
  search: string;
  category: ExpenseCategory | "all";
  paymentMethod: PaymentMethod | "all";
  taxPeriod: string | "all";
}

interface ExpenseFiltersProps {
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
}

export function ExpenseFiltersComponent({
  filters,
  onFiltersChange,
}: ExpenseFiltersProps) {
  const taxPeriods = getRecentTaxPeriods(24);

  const hasActiveFilters =
    filters.search ||
    filters.category !== "all" ||
    filters.paymentMethod !== "all" ||
    filters.taxPeriod !== "all";

  const resetFilters = () => {
    onFiltersChange({
      search: "",
      category: "all",
      paymentMethod: "all",
      taxPeriod: "all",
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9"
        />
      </div>

      <Select
        value={filters.category}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            category: value as ExpenseCategory | "all",
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((cat) => (
            <SelectItem key={cat} value={cat}>
              {EXPENSE_CATEGORIES[cat].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.paymentMethod}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            paymentMethod: value as PaymentMethod | "all",
          })
        }
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Methods</SelectItem>
          {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((method) => (
            <SelectItem key={method} value={method}>
              {PAYMENT_METHODS[method]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.taxPeriod}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, taxPeriod: value })
        }
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Tax Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Periods</SelectItem>
          {taxPeriods.map((period) => (
            <SelectItem key={period} value={period}>
              {formatTaxPeriod(period)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={resetFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
