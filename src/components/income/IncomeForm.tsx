import { useState, useRef } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload, FileText, Image as ImageIcon } from "lucide-react";
import {
  INCOME_SOURCES,
  INCOME_PAYMENT_METHODS,
  type IncomeSource,
  type IncomePaymentMethod,
} from "@/lib/incomeCalculations";
import type { IncomeFormData } from "@/hooks/useIncome";

interface IncomeFormProps {
  onSubmit: (data: IncomeFormData, files?: File[]) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<IncomeFormData>;
  isLoading?: boolean;
  isEdit?: boolean;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function IncomeForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
  isEdit = false,
}: IncomeFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<IncomeFormData>({
    income_date: initialData?.income_date || new Date().toISOString().split("T")[0],
    source: initialData?.source || "sales",
    source_name: initialData?.source_name || "",
    description: initialData?.description || "",
    amount: initialData?.amount || 0,
    payment_method: initialData?.payment_method || "cash",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const handleChange = (field: keyof IncomeFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 5MB)`);
      } else if (selectedFiles.length + validFiles.length >= 5) {
        errors.push(`${file.name}: Maximum 5 files allowed`);
      } else {
        validFiles.push(file);
      }
    });

    setFileErrors(errors);
    setSelectedFiles((prev) => [...prev, ...validFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, selectedFiles.length > 0 ? selectedFiles : undefined);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {isEdit ? "Edit Income Entry" : "Add Income Entry"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="income_date">Date Received *</Label>
              <Input
                id="income_date"
                type="date"
                value={formData.income_date}
                onChange={(e) => handleChange("income_date", e.target.value)}
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UGX) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                value={formData.amount || ""}
                onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
                required
              />
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Income Source *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => handleChange("source", value as IncomeSource)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_SOURCES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  handleChange("payment_method", value as IncomePaymentMethod)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_PAYMENT_METHODS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Name */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="source_name">Customer / Source Name</Label>
              <Input
                id="source_name"
                value={formData.source_name || ""}
                onChange={(e) => handleChange("source_name", e.target.value)}
                placeholder="Optional: Customer or source name"
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description / Reference</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Optional: Invoice number, reference, or description"
                rows={2}
              />
            </div>
          </div>

          {/* Document Upload (only for new entries) */}
          {!isEdit && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Supporting Documents (Optional)
              </Label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedFiles.length >= 5}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add File
                </Button>
                <span className="text-xs text-muted-foreground self-center">
                  Max 5 files, 5MB each (JPG, PNG, PDF, Excel)
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ALLOWED_TYPES.join(",")}
                multiple
                onChange={handleFileSelect}
              />

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded-md"
                    >
                      {getFileIcon(file.type)}
                      <span className="flex-1 text-sm truncate">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {(file.size / 1024).toFixed(0)} KB
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* File Errors */}
              {fileErrors.length > 0 && (
                <div className="text-sm text-destructive space-y-1">
                  {fileErrors.map((error, index) => (
                    <p key={index}>{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || formData.amount <= 0}>
              {isLoading ? "Saving..." : isEdit ? "Update Income" : "Add Income"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
