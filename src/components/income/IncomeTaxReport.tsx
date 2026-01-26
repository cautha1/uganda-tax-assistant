import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, FileSpreadsheet, TrendingUp } from "lucide-react";
import {
  type Income,
  INCOME_SOURCES,
  calculateTotalIncome,
  calculateSourceSubtotals,
  formatUGX,
  formatTaxPeriod,
} from "@/lib/incomeCalculations";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface IncomeTaxReportProps {
  incomeEntries: Income[];
  businessName: string;
  documentCounts: Record<string, number>;
}

export function IncomeTaxReport({
  incomeEntries,
  businessName,
  documentCounts,
}: IncomeTaxReportProps) {
  const [reportType, setReportType] = useState<"monthly" | "annual">("monthly");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  // Get unique periods
  const periods = useMemo(() => {
    const monthlyPeriods = [...new Set(incomeEntries.map((e) => e.tax_period))].sort(
      (a, b) => b.localeCompare(a)
    );
    const years = [...new Set(monthlyPeriods.map((p) => p.split("-")[0]))].sort(
      (a, b) => b.localeCompare(a)
    );
    return { monthly: monthlyPeriods, annual: years };
  }, [incomeEntries]);

  // Filter income by selected period
  const filteredIncome = useMemo(() => {
    if (!selectedPeriod) return incomeEntries;
    if (reportType === "monthly") {
      return incomeEntries.filter((e) => e.tax_period === selectedPeriod);
    }
    return incomeEntries.filter((e) => e.tax_period.startsWith(selectedPeriod));
  }, [incomeEntries, selectedPeriod, reportType]);

  const totalIncome = calculateTotalIncome(filteredIncome);
  const sourceBreakdown = calculateSourceSubtotals(filteredIncome);

  const getPeriodLabel = () => {
    if (!selectedPeriod) return "All Time";
    if (reportType === "annual") return `Year ${selectedPeriod}`;
    return formatTaxPeriod(selectedPeriod);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const periodLabel = getPeriodLabel();

    // Header
    doc.setFontSize(16);
    doc.text(`Income Report - ${businessName}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Period: ${periodLabel}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-UG")}`, 14, 38);

    // Summary
    doc.setFontSize(14);
    doc.text("Summary", 14, 52);
    doc.setFontSize(11);
    doc.text(`Total Income: ${formatUGX(totalIncome)}`, 14, 62);
    doc.text(`Number of Entries: ${filteredIncome.length}`, 14, 70);

    // Source breakdown
    if (sourceBreakdown.length > 0) {
      doc.setFontSize(14);
      doc.text("Income by Source", 14, 84);

      autoTable(doc, {
        startY: 90,
        head: [["Source", "Entries", "Amount (UGX)"]],
        body: sourceBreakdown.map((source) => [
          source.label,
          source.count.toString(),
          formatUGX(source.total),
        ]),
        foot: [["Total", filteredIncome.length.toString(), formatUGX(totalIncome)]],
      });
    }

    // Detail table
    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(14);
    doc.text("Income Details", 14, finalY + 14);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Date", "Source", "Customer", "Description", "Amount"]],
      body: filteredIncome.map((entry) => [
        new Date(entry.income_date).toLocaleDateString("en-UG"),
        INCOME_SOURCES[entry.source]?.label || entry.source,
        entry.source_name || "-",
        entry.description || "-",
        formatUGX(entry.amount),
      ]),
    });

    doc.save(`income-report-${selectedPeriod || "all"}.pdf`);
  };

  const exportToExcel = () => {
    const periodLabel = getPeriodLabel();

    // Summary sheet data
    const summaryData = [
      ["Income Report", businessName],
      ["Period", periodLabel],
      ["Generated", new Date().toLocaleDateString("en-UG")],
      [],
      ["Total Income", totalIncome],
      ["Number of Entries", filteredIncome.length],
      [],
      ["Source Breakdown"],
      ["Source", "Entries", "Amount"],
      ...sourceBreakdown.map((s) => [s.label, s.count, s.total]),
    ];

    // Detail sheet data
    const detailData = [
      ["Date", "Source", "Customer", "Description", "Payment Method", "Amount", "Has Docs"],
      ...filteredIncome.map((entry) => [
        new Date(entry.income_date).toLocaleDateString("en-UG"),
        INCOME_SOURCES[entry.source]?.label || entry.source,
        entry.source_name || "",
        entry.description || "",
        entry.payment_method,
        entry.amount,
        (documentCounts[entry.id] || 0) > 0 ? "Yes" : "No",
      ]),
    ];

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Details");

    XLSX.writeFile(workbook, `income-report-${selectedPeriod || "all"}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Income Tax Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Type Selection */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={reportType}
            onValueChange={(v) => {
              setReportType(v as "monthly" | "annual");
              setSelectedPeriod("");
            }}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Periods</SelectItem>
              {(reportType === "monthly" ? periods.monthly : periods.annual)
                .filter((period) => period && period.trim() !== "")
                .map((period) => (
                  <SelectItem key={period} value={period}>
                    {reportType === "monthly" ? formatTaxPeriod(period) : period}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Preview */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm font-medium">{getPeriodLabel()}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="text-lg font-bold text-green-600">{formatUGX(totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entries</p>
              <p className="text-lg font-bold">{filteredIncome.length}</p>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button onClick={exportToPDF} className="flex-1">
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="flex-1">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
