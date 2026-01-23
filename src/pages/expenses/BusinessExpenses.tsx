import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useExpenses, type ExpenseFormData } from "@/hooks/useExpenses";
import { useAccountantPermissions } from "@/hooks/useAccountantPermissions";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseCard } from "@/components/expenses/ExpenseCard";
import { MonthlySummaryCard } from "@/components/expenses/MonthlySummaryCard";
import {
  ExpenseFiltersComponent,
  type ExpenseFilters,
} from "@/components/expenses/ExpenseFilters";
import { ExpenseDocumentsUpload } from "@/components/expenses/ExpenseDocumentsUpload";
import { ExpenseAuditTrail } from "@/components/expenses/ExpenseAuditTrail";
import { ExpenseTaxReport } from "@/components/expenses/ExpenseTaxReport";
import {
  ArrowLeft,
  Plus,
  Receipt,
  TrendingUp,
  Calendar,
  PieChart,
  FileBarChart,
  AlertCircle,
} from "lucide-react";
import {
  groupExpensesByMonth,
  calculateMonthlySummary,
  calculateTotalExpenses,
  calculateCategorySubtotals,
  formatUGX,
  formatTaxPeriod,
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenseCalculations";
import type { ExportOptions } from "@/lib/exportImport";

interface Business {
  id: string;
  name: string;
  tin: string;
  owner_id: string;
}

export default function BusinessExpenses() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showTaxReport, setShowTaxReport] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpenseForDocs, setSelectedExpenseForDocs] = useState<
    string | null
  >(null);
  const [selectedExpenseForAudit, setSelectedExpenseForAudit] = useState<
    string | null
  >(null);
  const [selectedExpenseIsLocked, setSelectedExpenseIsLocked] = useState(false);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});

  const [filters, setFilters] = useState<ExpenseFilters>({
    search: "",
    category: "all",
    paymentMethod: "all",
    taxPeriod: "all",
  });

  const {
    expenses,
    isLoading: isLoadingExpenses,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useExpenses({ businessId: businessId || "" });

  const { permissions, isOwner, isAdmin, isAccountant, isLoading: isLoadingPermissions } =
    useAccountantPermissions(businessId || "");

  const canEdit = isOwner || isAdmin || (permissions?.can_edit ?? false);
  const canUpload = isOwner || isAdmin || (permissions?.can_upload ?? false);
  const canAddNotes = isAccountant && permissions?.can_view && !isOwner && !isAdmin;

  // Fetch business details
  useEffect(() => {
    async function fetchBusiness() {
      if (!businessId) return;

      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, tin, owner_id")
          .eq("id", businessId)
          .single();

        if (error) throw error;
        setBusiness(data);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load business";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        navigate("/businesses");
      } finally {
        setIsLoadingBusiness(false);
      }
    }

    fetchBusiness();
  }, [businessId, navigate, toast]);

  // Fetch expenses when business is loaded
  useEffect(() => {
    if (business) {
      fetchExpenses();
    }
  }, [business, fetchExpenses]);

  // Fetch document counts for all expenses
  useEffect(() => {
    async function fetchDocumentCounts() {
      if (expenses.length === 0) return;

      try {
        const { data } = await supabase
          .from("expense_documents")
          .select("expense_id")
          .in("expense_id", expenses.map((e) => e.id));

        const counts: Record<string, number> = {};
        (data || []).forEach((doc) => {
          counts[doc.expense_id] = (counts[doc.expense_id] || 0) + 1;
        });
        setDocumentCounts(counts);
      } catch (error) {
        console.error("Failed to fetch document counts:", error);
      }
    }

    fetchDocumentCounts();
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (
        filters.search &&
        !expense.description
          ?.toLowerCase()
          .includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      if (filters.category !== "all" && expense.category !== filters.category) {
        return false;
      }
      if (
        filters.paymentMethod !== "all" &&
        expense.payment_method !== filters.paymentMethod
      ) {
        return false;
      }
      if (
        filters.taxPeriod !== "all" &&
        expense.tax_period !== filters.taxPeriod
      ) {
        return false;
      }
      return true;
    });
  }, [expenses, filters]);

  // Group expenses by month
  const expensesByMonth = useMemo(
    () => groupExpensesByMonth(filteredExpenses),
    [filteredExpenses]
  );

  // Calculate summaries
  const monthlySummaries = useMemo(() => {
    return Array.from(expensesByMonth.entries()).map(([period, exps]) =>
      calculateMonthlySummary(period, exps)
    );
  }, [expensesByMonth]);

  // Overall stats
  const totalExpenses = calculateTotalExpenses(expenses);
  const categorySubtotals = calculateCategorySubtotals(expenses);
  const expensesMissingDocs = expenses.filter((e) => !documentCounts[e.id]).length;

  const handleSubmitExpense = async (
    formData: ExpenseFormData,
    taxPeriod: string
  ) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, formData, editingExpense);
    } else {
      await createExpense(formData, taxPeriod);
    }
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    await deleteExpense(expense);
  };

  const handleViewDocuments = (expense: Expense) => {
    setSelectedExpenseForDocs(expense.id);
    setSelectedExpenseIsLocked(expense.is_locked);
  };

  const handleViewAuditTrail = (expense: Expense) => {
    setSelectedExpenseForAudit(expense.id);
  };

  const handleMonthLocked = () => {
    fetchExpenses();
  };

  // Export options
  const exportOptions: ExportOptions = {
    title: `Expenses - ${business?.name || "Business"}`,
    filename: `expenses-${business?.name?.replace(/\s+/g, "-").toLowerCase() || "business"}`,
    columns: [
      { header: "Date", key: "expense_date", width: 15 },
      { header: "Category", key: "category_label", width: 15 },
      { header: "Description", key: "description", width: 30 },
      { header: "Amount (UGX)", key: "amount", width: 20 },
      { header: "Payment Method", key: "payment_method_label", width: 15 },
      { header: "Tax Period", key: "tax_period", width: 15 },
      { header: "Locked", key: "is_locked", width: 10 },
    ],
    data: filteredExpenses.map((e) => ({
      ...e,
      category_label: EXPENSE_CATEGORIES[e.category].label,
      payment_method_label:
        e.payment_method === "mobile_money"
          ? "Mobile Money"
          : e.payment_method.charAt(0).toUpperCase() + e.payment_method.slice(1),
      is_locked: e.is_locked ? "Yes" : "No",
    })),
  };

  if (isLoadingBusiness || isLoadingPermissions) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </MainLayout>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/businesses/${businessId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Receipt className="h-6 w-6" />
                Expenses
              </h1>
              <p className="text-muted-foreground">{business.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowTaxReport(true)}>
              <FileBarChart className="mr-2 h-4 w-4" />
              Tax Report
            </Button>
            <ExportDropdown options={exportOptions} disabled={expenses.length === 0} />
            {canEdit && (
              <Button onClick={() => setShowExpenseForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUGX(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatUGX(monthlySummaries[0]?.totalExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {monthlySummaries[0]?.expenseCount || 0} expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Missing Receipts
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {expensesMissingDocs}
              </div>
              <p className="text-xs text-muted-foreground">
                expenses without documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Top Categories
              </CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categorySubtotals
                  .filter((c) => c.count > 0)
                  .slice(0, 2)
                  .map((cat) => (
                    <div
                      key={cat.category}
                      className="flex items-center gap-1 text-sm"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor:
                            EXPENSE_CATEGORIES[cat.category as ExpenseCategory].color,
                        }}
                      />
                      <span className="text-xs">{cat.label}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <ExpenseFiltersComponent filters={filters} onFiltersChange={setFilters} />

        {/* Content Tabs */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">All Expenses</TabsTrigger>
            <TabsTrigger value="monthly">By Month</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {isLoadingExpenses ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No expenses found</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {expenses.length === 0
                      ? "Start tracking your business expenses by adding your first expense."
                      : "No expenses match your current filters."}
                  </p>
                  {canEdit && expenses.length === 0 && (
                    <Button
                      className="mt-4"
                      onClick={() => setShowExpenseForm(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Expense
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                    onViewDocuments={handleViewDocuments}
                    onViewAuditTrail={handleViewAuditTrail}
                    canEdit={canEdit}
                    documentCount={documentCounts[expense.id] || 0}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            {isLoadingExpenses ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : monthlySummaries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No monthly data</h3>
                  <p className="text-muted-foreground">
                    Add expenses to see monthly summaries.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {monthlySummaries.map((summary) => {
                  const monthExpenses = expensesByMonth.get(summary.taxPeriod) || [];
                  return (
                    <MonthlySummaryCard
                      key={summary.taxPeriod}
                      summary={summary}
                      expenses={monthExpenses}
                      documentCounts={documentCounts}
                      businessId={businessId}
                      isOwner={isOwner || isAdmin}
                      onClick={() =>
                        setFilters({ ...filters, taxPeriod: summary.taxPeriod })
                      }
                      onLocked={handleMonthLocked}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Expense Form Dialog */}
      <ExpenseForm
        open={showExpenseForm}
        onOpenChange={(open) => {
          setShowExpenseForm(open);
          if (!open) setEditingExpense(null);
        }}
        onSubmit={handleSubmitExpense}
        expense={editingExpense}
        isLoading={isLoadingExpenses}
      />

      {/* Tax Report Dialog */}
      <ExpenseTaxReport
        open={showTaxReport}
        onOpenChange={setShowTaxReport}
        businessId={businessId!}
        businessName={business.name}
        businessTin={business.tin}
      />

      {/* Documents Dialog */}
      <ExpenseDocumentsUpload
        open={!!selectedExpenseForDocs}
        onOpenChange={(open) => !open && setSelectedExpenseForDocs(null)}
        expenseId={selectedExpenseForDocs || ""}
        isLocked={selectedExpenseIsLocked}
        canUpload={canUpload}
      />

      {/* Audit Trail Dialog */}
      <ExpenseAuditTrail
        open={!!selectedExpenseForAudit}
        onOpenChange={(open) => !open && setSelectedExpenseForAudit(null)}
        expenseId={selectedExpenseForAudit || ""}
        canAddNotes={canAddNotes}
      />
    </MainLayout>
  );
}
