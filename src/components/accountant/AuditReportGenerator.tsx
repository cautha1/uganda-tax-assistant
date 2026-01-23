import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Download, 
  ClipboardCheck,
  ShieldCheck,
  Calculator,
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportToPDF, exportToExcel, ExportColumn } from "@/lib/exportImport";
import { calculateTotalPenalties, getPenaltyRiskLevel } from "@/lib/penaltyCalculations";
import { formatUGX } from "@/lib/taxCalculations";
import { format } from "date-fns";

interface AuditReportGeneratorProps {
  businesses: {
    id: string;
    name: string;
    tin: string;
  }[];
  taxForms: {
    id: string;
    business_id: string;
    business_name: string;
    tax_type: string;
    tax_period: string;
    status: string;
    calculated_tax: number;
    due_date: string | null;
    risk_level: string | null;
    ready_for_submission: boolean;
    audit_notes?: string | null;
  }[];
}

type ReportType = "internal-audit" | "compliance-readiness" | "penalty-exposure";

const REPORT_TYPES = [
  {
    value: "internal-audit" as ReportType,
    label: "Internal Audit Report",
    description: "Comprehensive audit status for all forms",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    value: "compliance-readiness" as ReportType,
    label: "Compliance Readiness Summary",
    description: "Overview of submission readiness",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    value: "penalty-exposure" as ReportType,
    label: "Penalty & Interest Exposure",
    description: "Calculate potential penalties for overdue forms",
    icon: <Calculator className="h-5 w-5" />,
  },
];

const TAX_TYPE_LABELS: Record<string, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
};

export function AuditReportGenerator({ businesses, taxForms }: AuditReportGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedReport, setSelectedReport] = useState<ReportType>("internal-audit");
  const [selectedBusiness, setSelectedBusiness] = useState<string>("all");
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredForms = selectedBusiness === "all"
    ? taxForms
    : taxForms.filter(f => f.business_id === selectedBusiness);

  async function generateReport(exportFormat: "pdf" | "xlsx") {
    setIsGenerating(true);

    try {
      let columns: ExportColumn[];
      let data: Record<string, unknown>[];
      let title: string;
      let subtitle: string;

      switch (selectedReport) {
        case "internal-audit":
          ({ columns, data, title, subtitle } = generateInternalAuditData());
          break;
        case "compliance-readiness":
          ({ columns, data, title, subtitle } = generateComplianceReadinessData());
          break;
        case "penalty-exposure":
          ({ columns, data, title, subtitle } = generatePenaltyExposureData());
          break;
        default:
          throw new Error("Unknown report type");
      }

      const filename = `${selectedReport}-report-${format(new Date(), "yyyy-MM-dd")}`;

      if (exportFormat === "pdf") {
        exportToPDF({ title, subtitle, columns, data, filename });
      } else {
        exportToExcel({ title, subtitle, columns, data, filename }, "xlsx");
      }

      // Log to audit trail
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "generate_report",
        details: {
          report_type: selectedReport,
          export_format: exportFormat,
          business_filter: selectedBusiness,
          form_count: filteredForms.length,
        },
      });

      toast({
        title: "Report Generated",
        description: `${REPORT_TYPES.find(r => r.value === selectedReport)?.label} exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate report",
      });
    }

    setIsGenerating(false);
  }

  function generateInternalAuditData() {
    const columns: ExportColumn[] = [
      { header: "Business", key: "business_name", width: 25 },
      { header: "Tax Type", key: "tax_type_label", width: 15 },
      { header: "Period", key: "tax_period", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Risk Level", key: "risk_level", width: 12 },
      { header: "Ready", key: "ready_status", width: 10 },
      { header: "Tax Amount", key: "calculated_tax_formatted", width: 18 },
      { header: "Audit Notes", key: "audit_notes", width: 30 },
    ];

    const data = filteredForms.map(form => ({
      business_name: form.business_name,
      tax_type_label: TAX_TYPE_LABELS[form.tax_type] || form.tax_type,
      tax_period: form.tax_period,
      status: form.status.charAt(0).toUpperCase() + form.status.slice(1),
      risk_level: form.risk_level ? form.risk_level.charAt(0).toUpperCase() + form.risk_level.slice(1) : "Not assessed",
      ready_status: form.ready_for_submission ? "Yes" : "No",
      calculated_tax_formatted: formatUGX(form.calculated_tax),
      audit_notes: form.audit_notes || "-",
    }));

    const businessName = selectedBusiness === "all" 
      ? "All Clients" 
      : businesses.find(b => b.id === selectedBusiness)?.name || "";

    return {
      columns,
      data,
      title: "Internal Audit Report",
      subtitle: `${businessName} | Generated: ${format(new Date(), "PPP")} | Forms: ${data.length}`,
    };
  }

  function generateComplianceReadinessData() {
    // Group by status
    const statusCounts = {
      draft: filteredForms.filter(f => f.status === "draft").length,
      validated: filteredForms.filter(f => f.status === "validated").length,
      error: filteredForms.filter(f => f.status === "error").length,
      submitted: filteredForms.filter(f => f.status === "submitted").length,
      ready: filteredForms.filter(f => f.ready_for_submission && f.status !== "submitted").length,
    };

    const columns: ExportColumn[] = [
      { header: "Business", key: "business_name", width: 25 },
      { header: "Tax Type", key: "tax_type_label", width: 15 },
      { header: "Period", key: "tax_period", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Risk", key: "risk_level", width: 10 },
      { header: "Ready for Submission", key: "ready_status", width: 18 },
      { header: "Due Date", key: "due_date_formatted", width: 12 },
      { header: "Days Until Due", key: "days_until_due", width: 12 },
    ];

    const data = filteredForms.map(form => {
      const daysUntilDue = form.due_date
        ? Math.floor((new Date(form.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        business_name: form.business_name,
        tax_type_label: TAX_TYPE_LABELS[form.tax_type] || form.tax_type,
        tax_period: form.tax_period,
        status: form.status.charAt(0).toUpperCase() + form.status.slice(1),
        risk_level: form.risk_level || "N/A",
        ready_status: form.ready_for_submission ? "✓ Ready" : "Not Ready",
        due_date_formatted: form.due_date ? format(new Date(form.due_date), "PP") : "N/A",
        days_until_due: daysUntilDue !== null 
          ? daysUntilDue < 0 
            ? `Overdue ${Math.abs(daysUntilDue)}d` 
            : `${daysUntilDue}d`
          : "N/A",
      };
    });

    return {
      columns,
      data,
      title: "Compliance Readiness Summary",
      subtitle: `Draft: ${statusCounts.draft} | Validated: ${statusCounts.validated} | Errors: ${statusCounts.error} | Ready: ${statusCounts.ready} | Submitted: ${statusCounts.submitted}`,
    };
  }

  function generatePenaltyExposureData() {
    const columns: ExportColumn[] = [
      { header: "Business", key: "business_name", width: 22 },
      { header: "Tax Type", key: "tax_type_label", width: 12 },
      { header: "Period", key: "tax_period", width: 12 },
      { header: "Tax Due", key: "tax_due_formatted", width: 15 },
      { header: "Due Date", key: "due_date_formatted", width: 12 },
      { header: "Days Overdue", key: "days_overdue", width: 12 },
      { header: "Late Filing", key: "late_filing_formatted", width: 14 },
      { header: "Late Payment", key: "late_payment_formatted", width: 14 },
      { header: "Interest", key: "interest_formatted", width: 12 },
      { header: "Total Penalty", key: "total_penalty_formatted", width: 15 },
      { header: "Risk", key: "penalty_risk", width: 8 },
    ];

    let totalExposure = 0;

    const data = filteredForms
      .filter(f => f.status !== "submitted" && f.due_date)
      .map(form => {
        const penalties = calculateTotalPenalties({
          taxDue: form.calculated_tax,
          dueDate: form.due_date!,
          isPaid: false,
        });

        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(form.due_date!).getTime()) / (1000 * 60 * 60 * 24)
        );

        totalExposure += penalties.totalPenalty;

        return {
          business_name: form.business_name,
          tax_type_label: TAX_TYPE_LABELS[form.tax_type] || form.tax_type,
          tax_period: form.tax_period,
          tax_due_formatted: formatUGX(form.calculated_tax),
          due_date_formatted: format(new Date(form.due_date!), "PP"),
          days_overdue: daysOverdue > 0 ? `${daysOverdue} days` : "Not overdue",
          late_filing_formatted: formatUGX(penalties.lateFilingPenalty),
          late_payment_formatted: formatUGX(penalties.latePaymentPenalty),
          interest_formatted: formatUGX(penalties.interestCharge),
          total_penalty_formatted: formatUGX(penalties.totalPenalty),
          penalty_risk: getPenaltyRiskLevel(penalties.totalPenalty, form.calculated_tax).toUpperCase(),
        };
      })
      .filter(d => d.days_overdue !== "Not overdue" || true); // Include all for reference

    return {
      columns,
      data,
      title: "Penalty & Interest Exposure Report",
      subtitle: `Total Exposure: ${formatUGX(totalExposure)} | Forms analyzed: ${data.length} | Generated: ${format(new Date(), "PPP")}`,
    };
  }

  const selectedReportInfo = REPORT_TYPES.find(r => r.value === selectedReport);

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="grid gap-4 md:grid-cols-3">
        {REPORT_TYPES.map((report) => (
          <Card
            key={report.value}
            className={`cursor-pointer transition-all ${
              selectedReport === report.value
                ? "ring-2 ring-primary border-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedReport(report.value)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedReport === report.value 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                }`}>
                  {report.icon}
                </div>
                <div>
                  <h3 className="font-medium">{report.label}</h3>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedReportInfo?.icon}
            {selectedReportInfo?.label}
          </CardTitle>
          <CardDescription>
            Configure and export your report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Filter */}
          <div className="space-y-2">
            <Label>Filter by Business</Label>
            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses ({businesses.length})</SelectItem>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Stats */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Report will include:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{filteredForms.length} tax forms</Badge>
              <Badge variant="secondary">
                {selectedBusiness === "all" ? businesses.length : 1} business(es)
              </Badge>
              {selectedReport === "penalty-exposure" && (
                <Badge variant="secondary">
                  {filteredForms.filter(f => f.status !== "submitted" && f.due_date).length} forms with due dates
                </Badge>
              )}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => generateReport("pdf")}
              disabled={isGenerating || filteredForms.length === 0}
            >
              {isGenerating ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Export as PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => generateReport("xlsx")}
              disabled={isGenerating || filteredForms.length === 0}
            >
              {isGenerating ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Export as Excel
            </Button>
          </div>

          {filteredForms.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No tax forms available for the selected filter.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
