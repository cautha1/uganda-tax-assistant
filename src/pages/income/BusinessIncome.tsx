import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  TrendingUp,
  ArrowLeft,
  FileText,
  Download,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useIncome, type IncomeFormData } from "@/hooks/useIncome";
import { useAccountantPermissions } from "@/hooks/useAccountantPermissions";
import { IncomeForm } from "@/components/income/IncomeForm";
import { IncomeCard } from "@/components/income/IncomeCard";
import { IncomeFilters } from "@/components/income/IncomeFilters";
import { MonthlyIncomeSummaryCard } from "@/components/income/MonthlyIncomeSummaryCard";
import { LockIncomeMonthDialog } from "@/components/income/LockIncomeMonthDialog";
import { IncomeAuditTrail } from "@/components/income/IncomeAuditTrail";
import { AddIncomeAuditNote } from "@/components/income/AddIncomeAuditNote";
import { IncomeTaxReport } from "@/components/income/IncomeTaxReport";
import { IncomeDocumentsDialog } from "@/components/income/IncomeDocumentsDialog";
import { ImportDialog } from "@/components/ui/ImportDialog";
import {
  type Income,
  calculateTotalIncome,
  calculateMonthlyIncomeSummary,
  getUniqueTaxPeriods,
  getTaxPeriodFromDate,
  calculateTaxReadyPercentage,
  formatUGX,
} from "@/lib/incomeCalculations";
import {
  INCOME_IMPORT_MAPPING,
  generateIncomeImportTemplate,
} from "@/lib/exportImport";

interface BusinessInfo {
  id: string;
  name: string;
  owner_id: string;
}

export default function BusinessIncome() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [selectedIncomeForAudit, setSelectedIncomeForAudit] = useState<Income | null>(null);
  const [selectedIncomeForDocs, setSelectedIncomeForDocs] = useState<Income | null>(null);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [lockDialogState, setLockDialogState] = useState<{
    open: boolean;
    taxPeriod: string;
    isLocking: boolean;
  }>({ open: false, taxPeriod: "", isLocking: true });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("entries");

  const {
    incomeEntries,
    isLoading,
    fetchIncome,
    createIncome,
    updateIncome,
    deleteIncome,
    lockMonth,
  } = useIncome({ businessId: businessId || "" });

  const { permissions, isOwner, isAccountant } = useAccountantPermissions(businessId || "");
  
  // Permissions following expense module pattern
  const canEdit = isOwner || isAdmin || (permissions?.can_edit ?? false);
  const canUpload = isOwner || isAdmin || (permissions?.can_upload ?? false);
  const canDelete = isOwner || isAdmin; // Only owners/admins can delete
  const canLock = isOwner || isAdmin; // Only owners/admins can lock/unlock
  const canAddNotes = isAccountant && permissions?.can_view && !isOwner && !isAdmin;

  // Fetch business info
  useEffect(() => {
    async function fetchBusiness() {
      if (!businessId) return;
      setIsLoadingBusiness(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name, owner_id")
          .eq("id", businessId)
          .maybeSingle();

        if (error) throw error;
        setBusiness(data);
      } catch (error) {
        console.error("Failed to load business:", error);
      } finally {
        setIsLoadingBusiness(false);
      }
    }

    fetchBusiness();
    fetchIncome();
  }, [businessId, fetchIncome]);

  // Fetch document counts
  const fetchDocumentCounts = useCallback(async () => {
    if (!businessId || incomeEntries.length === 0) return;
    try {
      const { data, error } = await supabase
        .from("income_documents")
        .select("income_id")
        .in(
          "income_id",
          incomeEntries.map((e) => e.id)
        );

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((doc: { income_id: string }) => {
        counts[doc.income_id] = (counts[doc.income_id] || 0) + 1;
      });
      setDocumentCounts(counts);
    } catch (error) {
      console.error("Failed to fetch document counts:", error);
    }
  }, [businessId, incomeEntries]);

  useEffect(() => {
    if (incomeEntries.length > 0) {
      fetchDocumentCounts();
    }
  }, [incomeEntries, fetchDocumentCounts]);

  // Filter income entries
  const filteredIncome = useMemo(() => {
    return incomeEntries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.source_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = sourceFilter === "all" || entry.source === sourceFilter;
      const matchesPayment =
        paymentMethodFilter === "all" || entry.payment_method === paymentMethodFilter;
      const matchesPeriod = periodFilter === "all" || entry.tax_period === periodFilter;

      return matchesSearch && matchesSource && matchesPayment && matchesPeriod;
    });
  }, [incomeEntries, searchTerm, sourceFilter, paymentMethodFilter, periodFilter]);

  // Get unique periods for filter
  const availablePeriods = getUniqueTaxPeriods(incomeEntries);

  // Calculate monthly summaries
  const monthlySummaries = useMemo(() => {
    return availablePeriods.map((period) => ({
      ...calculateMonthlyIncomeSummary(incomeEntries, period, documentCounts),
      taxReadyPercentage: calculateTaxReadyPercentage(
        incomeEntries.filter((e) => e.tax_period === period),
        documentCounts
      ),
    }));
  }, [incomeEntries, availablePeriods, documentCounts]);

  // Form handlers
  const handleSubmitIncome = async (formData: IncomeFormData, files?: File[]) => {
    const taxPeriod = getTaxPeriodFromDate(formData.income_date);

    if (editingIncome) {
      await updateIncome(editingIncome.id, formData, editingIncome);
      setEditingIncome(null);
    } else {
      const incomeId = await createIncome(formData, taxPeriod);

      // Upload files if any
      if (incomeId && files && files.length > 0) {
        for (const file of files) {
          const filePath = `${businessId}/${incomeId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("income-documents")
            .upload(filePath, file);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("income-documents")
              .getPublicUrl(filePath);

            await supabase.from("income_documents").insert({
              income_id: incomeId,
              file_url: urlData.publicUrl,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              uploaded_by: user?.id,
            });
          }
        }
        fetchDocumentCounts();
      }
      setShowAddForm(false);
    }
  };

  const handleLockConfirm = async () => {
    await lockMonth(lockDialogState.taxPeriod, lockDialogState.isLocking);
    setLockDialogState({ open: false, taxPeriod: "", isLocking: true });
  };

  const handleImport = async (data: Record<string, unknown>[]): Promise<{ success: boolean; message: string }> => {
    try {
      let successCount = 0;
      for (const row of data) {
        const formData: IncomeFormData = {
          income_date: String(row.income_date || new Date().toISOString().split("T")[0]),
          source: (row.source as any) || "other",
          source_name: row.source_name ? String(row.source_name) : undefined,
          description: row.description ? String(row.description) : undefined,
          amount: Number(row.amount) || 0,
          payment_method: (row.payment_method as any) || "cash",
        };
        const taxPeriod = getTaxPeriodFromDate(formData.income_date);
        const result = await createIncome(formData, taxPeriod);
        if (result) successCount++;
      }
      return {
        success: true,
        message: `Successfully imported ${successCount} income entries`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
      };
    }
  };

  if (isLoadingBusiness) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!business) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Business not found.</p>
          <Button variant="link" onClick={() => navigate("/businesses")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Businesses
          </Button>
        </div>
      </MainLayout>
    );
  }

  const totalIncome = calculateTotalIncome(incomeEntries);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/businesses/${businessId}`)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to {business.name}
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Income - {business.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <ImportDialog
                  title="Import Income"
                  description="Import income entries from Excel or CSV file"
                  columnMapping={INCOME_IMPORT_MAPPING}
                  onImport={handleImport}
                  onDownloadTemplate={generateIncomeImportTemplate}
                  triggerButton={
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" />
                      Import
                    </Button>
                  }
                />
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Income
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600 break-all">
                {formatUGX(totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Entries</p>
              <p className="text-2xl font-bold">{incomeEntries.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Months Recorded</p>
              <p className="text-2xl font-bold">{availablePeriods.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Documents</p>
              <p className="text-2xl font-bold">
                {Object.values(documentCounts).reduce((a, b) => a + b, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingIncome) && (
          <IncomeForm
            onSubmit={handleSubmitIncome}
            onCancel={() => {
              setShowAddForm(false);
              setEditingIncome(null);
            }}
            initialData={editingIncome || undefined}
            isLoading={isLoading}
            isEdit={!!editingIncome}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="entries">
              <FileText className="h-4 w-4 mr-1" />
              Entries
            </TabsTrigger>
            <TabsTrigger value="monthly">
              <TrendingUp className="h-4 w-4 mr-1" />
              Monthly View
            </TabsTrigger>
            <TabsTrigger value="reports">
              <Download className="h-4 w-4 mr-1" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            <IncomeFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              paymentMethodFilter={paymentMethodFilter}
              onPaymentMethodFilterChange={setPaymentMethodFilter}
              periodFilter={periodFilter}
              onPeriodFilterChange={setPeriodFilter}
              availablePeriods={availablePeriods}
            />

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredIncome.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No income entries found.</p>
                  {canEdit && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Your First Income
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredIncome.map((entry) => (
                  <IncomeCard
                    key={entry.id}
                    income={entry}
                    documentCount={documentCounts[entry.id] || 0}
                    onEdit={(inc) => setEditingIncome(inc)}
                    onDelete={deleteIncome}
                    onViewDocuments={(inc) => setSelectedIncomeForDocs(inc)}
                    onViewAudit={(inc) => setSelectedIncomeForAudit(inc)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Monthly View Tab */}
          <TabsContent value="monthly" className="space-y-4">
            {monthlySummaries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No monthly data available yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {monthlySummaries.map((summary) => (
                  <MonthlyIncomeSummaryCard
                    key={summary.taxPeriod}
                    summary={summary}
                    onLockToggle={(period, lock) =>
                      setLockDialogState({ open: true, taxPeriod: period, isLocking: lock })
                    }
                    onViewDetails={(period) => {
                      setPeriodFilter(period);
                      setActiveTab("entries");
                    }}
                    canLock={canLock}
                    taxReadyPercentage={summary.taxReadyPercentage}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <IncomeTaxReport
              incomeEntries={incomeEntries}
              businessName={business.name}
              documentCounts={documentCounts}
            />
          </TabsContent>
        </Tabs>

        {/* Lock Month Dialog */}
        <LockIncomeMonthDialog
          open={lockDialogState.open}
          onOpenChange={(open) => setLockDialogState((s) => ({ ...s, open }))}
          taxPeriod={lockDialogState.taxPeriod}
          isLocking={lockDialogState.isLocking}
          onConfirm={handleLockConfirm}
        />

        {/* Audit Trail Sheet */}
        <Sheet
          open={!!selectedIncomeForAudit}
          onOpenChange={(open) => !open && setSelectedIncomeForAudit(null)}
        >
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Income Audit Trail</SheetTitle>
            </SheetHeader>
            {selectedIncomeForAudit && (
              <div className="mt-4 space-y-4">
                <IncomeAuditTrail incomeId={selectedIncomeForAudit.id} />
                {canAddNotes && (
                  <AddIncomeAuditNote
                    incomeId={selectedIncomeForAudit.id}
                    onNoteAdded={() => {}}
                  />
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Documents Dialog */}
        <IncomeDocumentsDialog
          open={!!selectedIncomeForDocs}
          onOpenChange={(open) => !open && setSelectedIncomeForDocs(null)}
          income={selectedIncomeForDocs}
          canUpload={canUpload}
          canDelete={canDelete}
          onDocumentsChange={fetchDocumentCounts}
        />
      </div>
    </MainLayout>
  );
}