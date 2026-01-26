import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { INCOME_SOURCES, INCOME_PAYMENT_METHODS } from "@/lib/incomeCalculations";

interface IncomeFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  paymentMethodFilter: string;
  onPaymentMethodFilterChange: (value: string) => void;
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  availablePeriods: string[];
}

export function IncomeFilters({
  searchTerm,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  paymentMethodFilter,
  onPaymentMethodFilterChange,
  periodFilter,
  onPeriodFilterChange,
  availablePeriods,
}: IncomeFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by description, customer..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Source Filter */}
      <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {Object.entries(INCOME_SOURCES).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Payment Method Filter */}
      <Select value={paymentMethodFilter} onValueChange={onPaymentMethodFilterChange}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Methods</SelectItem>
          {Object.entries(INCOME_PAYMENT_METHODS).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Period Filter */}
      <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Periods</SelectItem>
          {availablePeriods
            .filter((period) => period && period.trim() !== "")
            .map((period) => {
              const [year, month] = period.split("-");
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              return (
                <SelectItem key={period} value={period}>
                  {date.toLocaleDateString("en-UG", { month: "short", year: "numeric" })}
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>
    </div>
  );
}
