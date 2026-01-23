import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Download, FileSpreadsheet, Calendar } from "lucide-react";
import {
  Expense,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  calculateCategorySubtotals,
  calculateTotalExpenses,
  formatTaxPeriod,
  formatUGX,
  getRecentTaxPeriods,
} from "@/lib/expenseCalculations";
import { exportToPDF, exportToExcel, type ExportOptions } from "@/lib/exportImport";

interface ExpenseTaxReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  businessTin?: string;
}

export function ExpenseTaxReport({
  open,
  onOpenChange,
  businessId,
  businessName,
  businessTin,
}: ExpenseTaxReportProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [reportType, setReportType] = useState<"monthly" | "annual">("monthly");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});

  const taxPeriods = getRecentTaxPeriods(12);
  const currentYear = new Date().getFullYear().toString();
  const years = [currentYear, String(Number(currentYear) - 1), String(Number(currentYear) - 2)];

  useEffect(() => {
    if (open && businessId) {
      fetchExpenses();
    }
  }, [open, businessId, selectedPeriod, reportType]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("business_id", businessId)
        .order("expense_date", { ascending: false });

      if (reportType === "monthly" && selectedPeriod !== "all") {
        query = query.eq("tax_period", selectedPeriod);
      } else if (reportType === "annual" && selectedPeriod !== "all") {
        query = query.like("tax_period", `${selectedPeriod}-%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const fetchedExpenses = (data as Expense[]) || [];
      setExpenses(fetchedExpenses);

      // Fetch document counts for each expense
      const expenseIds = fetchedExpenses.map((e) => e.id);
      if (expenseIds.length > 0) {
        const { data: docs } = await supabase
          .from("expense_documents")
          .select("expense_id")
          .in("expense_id", expenseIds);

        const counts: Record<string, number> = {};
        (docs || []).forEach((doc) => {
          counts[doc.expense_id] = (counts[doc.expense_id] || 0) + 1;
        });
        setDocumentCounts(counts);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load expenses";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalExpenses = calculateTotalExpenses(expenses);
  const categorySubtotals = calculateCategorySubtotals(expenses);
  const expensesWithDocs = expenses.filter((e) => documentCounts[e.id] > 0).length;

  const getReportTitle = () => {
    if (reportType === "annual" && selectedPeriod !== "all") {
      return `Annual Expense Report - ${selectedPeriod}`;
    }
    if (reportType === "monthly" && selectedPeriod !== "all") {
      return `Monthly Expense Report - ${formatTaxPeriod(selectedPeriod)}`;
    }
    return "Expense Report - All Periods";
  };

  const generateReport = async (exportFormat: "pdf" | "excel") => {
    setIsGenerating(true);
    try {
      const exportOptions: ExportOptions = {
        title: getReportTitle(),
        subtitle: `${businessName}${businessTin ? ` (TIN: ${businessTin})` : ""} - Generated ${format(new Date(), "dd MMM yyyy")}`,
        filename: `expense-report-${businessName.replace(/\s+/g, "-").toLowerCase()}-${selectedPeriod}`,
        columns: [
          { header: "Date", key: "expense_date", width: 15 },
          { header: "Category", key: "category_label", width: 15 },
          { header: "Description", key: "description", width: 25 },
          { header: "Amount (UGX)", key: "amount", width: 18 },
          { header: "Payment Method", key: "payment_method_label", width: 18 },
          { header: "Tax Period", key: "tax_period", width: 12 },
          { header: "Documents", key: "doc_count", width: 10 },
          { header: "Status", key: "status", width: 10 },
        ],
        data: expenses.map((e) => ({
          expense_date: format(new Date(e.expense_date), "dd/MM/yyyy"),
          category_label: EXPENSE_CATEGORIES[e.category].label,
          description: e.description || "-",
          amount: e.amount,
          payment_method_label: PAYMENT_METHODS[e.payment_method],
          tax_period: e.tax_period,
          doc_count: documentCounts[e.id] || 0,
          status: e.is_locked ? "Locked" : "Open",
        })),
      };

      if (exportFormat === "pdf") {
        exportToPDF(exportOptions);
      } else {
        exportToExcel(exportOptions);
      }

      toast({
        title: "Report Generated",
        description: `Your ${exportFormat.toUpperCase()} report has been downloaded.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate report";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Period Expense Report
          </DialogTitle>
          <DialogDescription>
            Generate expense reports for URA tax filing and business records.
          </DialogDescription>
        </DialogHeader>

        {/* Report Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={reportType}
              onValueChange={(v) => {
                setReportType(v as "monthly" | "annual");
                setSelectedPeriod("all");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="annual">Annual Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {reportType === "monthly" ? "Tax Period" : "Year"}
            </Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {reportType === "monthly"
                  ? taxPeriods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {formatTaxPeriod(period)}
                      </SelectItem>
                    ))
                  : years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Report Preview */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Total Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{formatUGX(totalExpenses)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Expense Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">{expenses.length}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    With Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold">
                    {expensesWithDocs}/{expenses.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {categorySubtotals
                    .filter((c) => c.count > 0)
                    .map((cat) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: EXPENSE_CATEGORIES[cat.category].color,
                            }}
                          />
                          <span>{cat.label}</span>
                        </div>
                        <span className="font-medium">{formatUGX(cat.total)}</span>
                      </div>
                    ))}
                </div>
                {categorySubtotals.every((c) => c.count === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No expenses for selected period.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Export Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => generateReport("pdf")}
                disabled={isGenerating || expenses.length === 0}
                className="flex-1"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => generateReport("excel")}
                disabled={isGenerating || expenses.length === 0}
                className="flex-1"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Reports include all expense details and can be used for URA tax lodgment.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
