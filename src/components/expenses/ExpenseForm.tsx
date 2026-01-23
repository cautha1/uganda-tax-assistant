import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type PaymentMethod,
  type Expense,
  getCurrentTaxPeriod,
} from "@/lib/expenseCalculations";
import type { ExpenseFormData } from "@/hooks/useExpenses";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseFormData, taxPeriod: string) => Promise<void>;
  expense?: Expense | null;
  isLoading?: boolean;
}

export function ExpenseForm({
  open,
  onOpenChange,
  onSubmit,
  expense,
  isLoading = false,
}: ExpenseFormProps) {
  const isEditing = !!expense;

  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_date: new Date().toISOString().split("T")[0],
    category: "other",
    description: "",
    amount: 0,
    payment_method: "cash",
  });

  const [taxPeriod, setTaxPeriod] = useState(getCurrentTaxPeriod());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (expense) {
      setFormData({
        expense_date: expense.expense_date,
        category: expense.category,
        description: expense.description || "",
        amount: expense.amount,
        payment_method: expense.payment_method,
      });
      setTaxPeriod(expense.tax_period);
    } else {
      setFormData({
        expense_date: new Date().toISOString().split("T")[0],
        category: "other",
        description: "",
        amount: 0,
        payment_method: "cash",
      });
      setTaxPeriod(getCurrentTaxPeriod());
    }
    setErrors({});
  }, [expense, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.expense_date) {
      newErrors.expense_date = "Date is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!formData.payment_method) {
      newErrors.payment_method = "Payment method is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit(formData, taxPeriod);
    onOpenChange(false);
  };

  const handleDateChange = (date: string) => {
    setFormData({ ...formData, expense_date: date });
    // Auto-update tax period based on date
    if (date) {
      const [year, month] = date.split("-");
      setTaxPeriod(`${year}-${month}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the expense details below."
              : "Enter the expense details below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense_date">Date *</Label>
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleDateChange(e.target.value)}
                className={errors.expense_date ? "border-destructive" : ""}
              />
              {errors.expense_date && (
                <p className="text-sm text-destructive">{errors.expense_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_period">Tax Period</Label>
              <Input
                id="tax_period"
                value={taxPeriod}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: ExpenseCategory) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger
                className={errors.category ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map(
                  (cat) => (
                    <SelectItem key={cat} value={cat}>
                      {EXPENSE_CATEGORIES[cat].label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter a brief description..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UGX) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="100"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className={errors.amount ? "border-destructive" : ""}
                placeholder="0"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value: PaymentMethod) =>
                  setFormData({ ...formData, payment_method: value })
                }
              >
                <SelectTrigger
                  className={errors.payment_method ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map(
                    (method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHODS[method]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {errors.payment_method && (
                <p className="text-sm text-destructive">
                  {errors.payment_method}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : isEditing
                ? "Update Expense"
                : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
