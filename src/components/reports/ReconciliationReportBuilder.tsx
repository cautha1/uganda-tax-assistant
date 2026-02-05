import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FileText, FileSpreadsheet, AlertTriangle, Calculator } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { GenerateReportParams } from "@/hooks/useReconciliationReports";

interface ReconciliationReportBuilderProps {
  businessId: string;
  taxTypes: string[];
  onGenerate: (params: GenerateReportParams) => Promise<void>;
  isGenerating: boolean;
}

const REPORT_TYPES = [
  { value: 'tax_summary', label: 'Tax Reconciliation Summary', icon: Calculator, description: 'Income, expenses, adjustments, and estimated tax liability' },
  { value: 'adjustments', label: 'Adjustments Schedule', icon: FileSpreadsheet, description: 'Add-backs and deductions with supporting details' },
  { value: 'evidence_exceptions', label: 'Evidence & Exceptions Report', icon: AlertTriangle, description: 'Missing receipts, anomalies, and validation warnings' },
];

const PERIOD_TYPES = [
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Annual' },
];

const TAX_TYPE_LABELS: Record<string, string> = {
  income: 'Income Tax',
  presumptive: 'Presumptive Tax',
  paye: 'PAYE',
  vat: 'VAT',
};

export function ReconciliationReportBuilder({
  businessId,
  taxTypes,
  onGenerate,
  isGenerating,
}: ReconciliationReportBuilderProps) {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<string>('tax_summary');
  const [taxType, setTaxType] = useState<string>(taxTypes[0] || 'income');
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [periodValue, setPeriodValue] = useState<string>('');

  // Generate period options based on period type
  const getPeriodOptions = () => {
    const now = new Date();
    const options: { value: string; label: string }[] = [];

    if (periodType === 'month') {
      // Last 12 months
      for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
        options.push({ value, label });
      }
    } else if (periodType === 'quarter') {
      // Last 8 quarters
      const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
      for (let i = 0; i < 8; i++) {
        let quarter = currentQuarter - (i % 4);
        let year = now.getFullYear() - Math.floor(i / 4);
        if (quarter <= 0) {
          quarter += 4;
          year--;
        }
        const value = `${year}-Q${quarter}`;
        const label = `Q${quarter} ${year}`;
        options.push({ value, label });
      }
    } else {
      // Last 5 years
      for (let i = 0; i < 5; i++) {
        const year = now.getFullYear() - i;
        options.push({ value: year.toString(), label: `FY ${year}` });
      }
    }

    return options;
  };

  const periodOptions = getPeriodOptions();

  const handleGenerate = async () => {
    if (!reportType || !taxType || !periodValue) return;

    await onGenerate({
      businessId,
      reportType: reportType as 'tax_summary' | 'adjustments' | 'evidence_exceptions',
      taxType,
      periodType,
      periodValue,
    });
  };

  const selectedReportInfo = REPORT_TYPES.find(r => r.value === reportType);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t('reports.generateReport')}
        </CardTitle>
        <CardDescription>
          {t('reports.generateReportDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type Selection */}
        <div className="space-y-3">
          <Label>{t('reports.reportType')}</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {REPORT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReportType(type.value)}
                  className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                    reportType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${reportType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tax Type & Period Selection */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t('reports.taxType')}</Label>
            <Select value={taxType} onValueChange={setTaxType}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports.selectTaxType')} />
              </SelectTrigger>
              <SelectContent>
                {taxTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TAX_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
                {taxTypes.length === 0 && (
                  <>
                    <SelectItem value="income">Income Tax</SelectItem>
                    <SelectItem value="presumptive">Presumptive Tax</SelectItem>
                    <SelectItem value="paye">PAYE</SelectItem>
                    <SelectItem value="vat">VAT</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('reports.periodType')}</Label>
            <Select value={periodType} onValueChange={(v) => {
              setPeriodType(v as 'month' | 'quarter' | 'year');
              setPeriodValue('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('reports.period')}</Label>
            <Select value={periodValue} onValueChange={setPeriodValue}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports.selectPeriod')} />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Report Info */}
        {selectedReportInfo && (
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <selectedReportInfo.icon className="h-4 w-4 text-primary" />
              <span className="font-medium">{selectedReportInfo.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{selectedReportInfo.description}</p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !reportType || !taxType || !periodValue}
          className="w-full sm:w-auto"
          size="lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              {t('reports.generating')}
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              {t('reports.generateReport')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
