import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ArrowLeft, FileText, History, Building2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useReconciliationReports, ReconciliationReport, GenerateReportParams } from "@/hooks/useReconciliationReports";
import { ReconciliationReportBuilder } from "@/components/reports/ReconciliationReportBuilder";
import { TaxReconciliationSummary } from "@/components/reports/TaxReconciliationSummary";
import { AdjustmentsSchedule } from "@/components/reports/AdjustmentsSchedule";
import { EvidenceExceptionsReport } from "@/components/reports/EvidenceExceptionsReport";
import { ReportHistory } from "@/components/reports/ReportHistory";
import { TaxReconciliationData, AdjustmentsData, EvidenceExceptionsData, getTaxTypeLabel } from "@/lib/reconciliationCalculations";
import { exportToPDF, exportToExcel } from "@/lib/exportImport";
import { formatUGX } from "@/lib/taxCalculations";

interface Business {
  id: string;
  name: string;
  tin: string | null;
  tax_types: string[] | null;
  owner_id: string | null;
}

export default function ReconciliationReports() {
  const { businessId } = useParams<{ businessId: string }>();
  const { t } = useTranslation();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedReport, setSelectedReport] = useState<ReconciliationReport | null>(null);

  const {
    reports,
    isLoading: reportsLoading,
    isGenerating,
    fetchReports,
    generateReport,
    approveReport,
    deleteReport,
    logDownload,
  } = useReconciliationReports(businessId);

  useEffect(() => {
    async function loadBusiness() {
      if (!businessId) return;

      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, tin, tax_types, owner_id")
        .eq("id", businessId)
        .maybeSingle();

      if (error || !data) {
        console.error("Error loading business:", error);
        setIsLoading(false);
        return;
      }

      setBusiness(data);
      setIsLoading(false);
    }

    loadBusiness();
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchReports();
    }
  }, [businessId, fetchReports]);

  const handleGenerate = async (params: GenerateReportParams) => {
    const report = await generateReport(params);
    if (report) {
      setSelectedReport(report);
      setActiveTab("view");
    }
  };

  const handleViewReport = (report: ReconciliationReport) => {
    setSelectedReport(report);
    setActiveTab("view");
  };

  const handleDownload = async (reportId: string, format: 'pdf' | 'excel') => {
    const report = reports.find(r => r.id === reportId);
    if (!report || !business) return;

    await logDownload(reportId, format);

    const periodLabel = `${new Date(report.period_start).toLocaleDateString('en-UG')} - ${new Date(report.period_end).toLocaleDateString('en-UG')}`;
    
    // Generate export based on report type
    if (report.report_type === 'tax_summary') {
      const data = report.report_data as TaxReconciliationData;
      const exportData = [
        { label: t('reports.totalIncome'), value: formatUGX(data.totalIncome) },
        { label: t('reports.totalExpenses'), value: formatUGX(data.totalExpenses) },
        { label: t('reports.netProfit'), value: formatUGX(data.netProfit) },
        { label: t('reports.taxableProfit'), value: formatUGX(data.taxableProfit) },
        { label: t('reports.estimatedTax'), value: formatUGX(data.estimatedTax) },
      ];

      if (format === 'pdf') {
        exportToPDF({
          title: `${t('reports.taxReconciliation')} - ${business.name}`,
          subtitle: `${getTaxTypeLabel(report.tax_type)} | ${periodLabel}`,
          columns: [
            { header: 'Description', key: 'label', width: 30 },
            { header: 'Amount', key: 'value', width: 20 },
          ],
          data: exportData,
          filename: `reconciliation_${business.name}_${report.period_start}`,
        });
      } else {
        exportToExcel({
          title: `${t('reports.taxReconciliation')} - ${business.name}`,
          subtitle: `${getTaxTypeLabel(report.tax_type)} | ${periodLabel}`,
          columns: [
            { header: 'Description', key: 'label', width: 30 },
            { header: 'Amount', key: 'value', width: 20 },
          ],
          data: exportData,
          filename: `reconciliation_${business.name}_${report.period_start}`,
        });
      }
    } else if (report.report_type === 'adjustments') {
      const data = report.report_data as AdjustmentsData;
      const exportData = data.items.map(item => ({
        category: item.category,
        reason: item.reason,
        amount: formatUGX(item.amount),
        hasEvidence: item.hasEvidence ? 'Yes' : 'No',
      }));

      if (format === 'pdf') {
        exportToPDF({
          title: `${t('reports.adjustmentsSchedule')} - ${business.name}`,
          subtitle: periodLabel,
          columns: [
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Reason', key: 'reason', width: 30 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Evidence', key: 'hasEvidence', width: 10 },
          ],
          data: exportData,
          filename: `adjustments_${business.name}_${report.period_start}`,
        });
      } else {
        exportToExcel({
          title: `${t('reports.adjustmentsSchedule')} - ${business.name}`,
          subtitle: periodLabel,
          columns: [
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Reason', key: 'reason', width: 30 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Evidence', key: 'hasEvidence', width: 10 },
          ],
          data: exportData,
          filename: `adjustments_${business.name}_${report.period_start}`,
        });
      }
    } else {
      const data = report.report_data as EvidenceExceptionsData;
      const exportData = [
        ...data.missingReceipts.map(i => ({ type: 'Missing Receipt', description: i.description, amount: formatUGX(i.amount), date: i.date })),
        ...data.largeEntries.map(i => ({ type: 'Large Entry', description: i.description, amount: formatUGX(i.amount), date: '-' })),
      ];

      if (format === 'pdf') {
        exportToPDF({
          title: `${t('reports.evidenceExceptions')} - ${business.name}`,
          subtitle: periodLabel,
          columns: [
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Date', key: 'date', width: 12 },
          ],
          data: exportData,
          filename: `exceptions_${business.name}_${report.period_start}`,
        });
      } else {
        exportToExcel({
          title: `${t('reports.evidenceExceptions')} - ${business.name}`,
          subtitle: periodLabel,
          columns: [
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Date', key: 'date', width: 12 },
          ],
          data: exportData,
          filename: `exceptions_${business.name}_${report.period_start}`,
        });
      }
    }
  };

  const renderSelectedReport = () => {
    if (!selectedReport || !businessId) return null;

    const periodLabel = `${new Date(selectedReport.period_start).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })}`;

    switch (selectedReport.report_type) {
      case 'tax_summary':
        return (
          <TaxReconciliationSummary
            data={selectedReport.report_data as TaxReconciliationData}
            periodLabel={periodLabel}
            taxType={selectedReport.tax_type}
          />
        );
      case 'adjustments':
        return (
          <AdjustmentsSchedule
            data={selectedReport.report_data as AdjustmentsData}
            businessId={businessId}
          />
        );
      case 'evidence_exceptions':
        return (
          <EvidenceExceptionsReport
            data={selectedReport.report_data as EvidenceExceptionsData}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!business) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-8">
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-5xl py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={`/businesses/${businessId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Link>

          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-display font-bold">{t('reports.reconciliationReports')}</h1>
              <p className="text-muted-foreground">{business.name} {business.tin && `• TIN: ${business.tin}`}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('reports.generateReport')}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t('reports.reportHistory')}
            </TabsTrigger>
            {selectedReport && (
              <TabsTrigger value="view" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('reports.viewReport')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="generate">
            <ReconciliationReportBuilder
              businessId={business.id}
              taxTypes={business.tax_types || []}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </TabsContent>

          <TabsContent value="history">
            {reportsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <ReportHistory
                reports={reports}
                businessOwnerId={business.owner_id}
                onApprove={approveReport}
                onDelete={deleteReport}
                onDownload={handleDownload}
                onView={handleViewReport}
              />
            )}
          </TabsContent>

          <TabsContent value="view">
            {selectedReport && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("history")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('reports.backToHistory')}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleDownload(selectedReport.id, 'pdf')}>
                      {t('reports.downloadPDF')}
                    </Button>
                    <Button variant="outline" onClick={() => handleDownload(selectedReport.id, 'excel')}>
                      {t('reports.downloadExcel')}
                    </Button>
                  </div>
                </div>
                {renderSelectedReport()}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
