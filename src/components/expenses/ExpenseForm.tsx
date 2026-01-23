import { useState, useEffect, useRef } from "react";
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
import { Upload, X, FileText, ImageIcon, FileSpreadsheet } from "lucide-react";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExpenseFormData, taxPeriod: string, files?: File[]) => Promise<void>;
  expense?: Expense | null;
  isLoading?: boolean;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (type === "application/pdf") return <FileText className="h-4 w-4" />;
  if (type.includes("spreadsheet") || type.includes("excel")) return <FileSpreadsheet className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExpenseForm({
  open,
  onOpenChange,
  onSubmit,
  expense,
  isLoading = false,
}: ExpenseFormProps) {
  const isEditing = !!expense;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    expense_date: new Date().toISOString().split("T")[0],
    category: "other",
    description: "",
    amount: 0,
    payment_method: "cash",
  });

  const [taxPeriod, setTaxPeriod] = useState(getCurrentTaxPeriod());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

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
    setSelectedFiles([]);
    setFileErrors([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newErrors: string[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      if (selectedFiles.length + validFiles.length >= MAX_FILES) {
        newErrors.push(`Maximum ${MAX_FILES} files allowed`);
        break;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        newErrors.push(`${file.name}: Invalid file type`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`${file.name}: File too large (max 5MB)`);
        continue;
      }

      if (selectedFiles.some((f) => f.name === file.name)) {
        newErrors.push(`${file.name}: Already selected`);
        continue;
      }

      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setFileErrors(newErrors);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit(formData, taxPeriod, selectedFiles.length > 0 ? selectedFiles : undefined);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the expense details below."
              : "Enter the expense details and attach supporting documents."}
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

          {/* Document Upload Section */}
          {!isEditing && (
            <div className="space-y-3 pt-2 border-t">
              <Label>Supporting Documents (Optional)</Label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload receipts, invoices, or documents
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, PDF, Excel (max 5MB each, up to {MAX_FILES} files)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* File Errors */}
              {fileErrors.length > 0 && (
                <div className="text-sm text-destructive space-y-1">
                  {fileErrors.map((error, i) => (
                    <p key={i}>• {error}</p>
                  ))}
                </div>
              )}

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(file.type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
