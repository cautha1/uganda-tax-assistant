import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  calculateTaxReconciliationSummary,
  generateAdjustmentsSchedule,
  generateEvidenceExceptionsReport,
  getPeriodDates,
  TaxReconciliationData,
  AdjustmentsData,
  EvidenceExceptionsData,
} from '@/lib/reconciliationCalculations';
import { Json } from '@/integrations/supabase/types';

export interface ReconciliationReport {
  id: string;
  business_id: string;
  generated_by: string;
  report_type: 'tax_summary' | 'adjustments' | 'evidence_exceptions';
  tax_type: string;
  period_start: string;
  period_end: string;
  report_data: TaxReconciliationData | AdjustmentsData | EvidenceExceptionsData;
  status: 'draft' | 'approved';
  approved_by: string | null;
  approved_at: string | null;
  pdf_url: string | null;
  excel_url: string | null;
  created_at: string;
}

export interface GenerateReportParams {
  businessId: string;
  reportType: 'tax_summary' | 'adjustments' | 'evidence_exceptions';
  taxType: string;
  periodType: 'month' | 'quarter' | 'year';
  periodValue: string;
}

// Helper to safely cast JSON to report data types
function castReportData(data: Json): TaxReconciliationData | AdjustmentsData | EvidenceExceptionsData {
  return data as unknown as TaxReconciliationData | AdjustmentsData | EvidenceExceptionsData;
}

export function useReconciliationReports(businessId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!businessId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reconciliation_reports')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedReports: ReconciliationReport[] = (data || []).map(row => ({
        ...row,
        report_type: row.report_type as 'tax_summary' | 'adjustments' | 'evidence_exceptions',
        status: row.status as 'draft' | 'approved',
        report_data: castReportData(row.report_data),
      }));
      setReports(mappedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch reports',
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast]);

  const generateReport = useCallback(async (params: GenerateReportParams): Promise<ReconciliationReport | null> => {
    if (!user) return null;

    setIsGenerating(true);
    try {
      const { start, end } = getPeriodDates(params.periodType, params.periodValue);
      
      let reportData: TaxReconciliationData | AdjustmentsData | EvidenceExceptionsData;
      
      switch (params.reportType) {
        case 'tax_summary':
          reportData = await calculateTaxReconciliationSummary(
            params.businessId,
            start,
            end,
            params.taxType
          );
          break;
        case 'adjustments':
          reportData = await generateAdjustmentsSchedule(
            params.businessId,
            start,
            end
          );
          break;
        case 'evidence_exceptions':
          reportData = await generateEvidenceExceptionsReport(
            params.businessId,
            start,
            end
          );
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Save to database
      const { data, error } = await supabase
        .from('reconciliation_reports')
        .insert([{
          business_id: params.businessId,
          generated_by: user.id,
          report_type: params.reportType,
          tax_type: params.taxType,
          period_start: start,
          period_end: end,
          report_data: reportData as unknown as Json,
          status: 'draft',
        }])
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        business_id: params.businessId,
        action: 'REPORT_GENERATED',
        details: {
          report_id: data.id,
          report_type: params.reportType,
          tax_type: params.taxType,
          period: `${start} to ${end}`,
        },
      }]);

      toast({
        title: 'Report Generated',
        description: 'Your reconciliation report has been generated successfully.',
      });

      // Refresh reports list
      await fetchReports();

      const mappedReport: ReconciliationReport = {
        ...data,
        report_type: data.report_type as 'tax_summary' | 'adjustments' | 'evidence_exceptions',
        status: data.status as 'draft' | 'approved',
        report_data: castReportData(data.report_data),
      };
      return mappedReport;
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate report',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [user, toast, fetchReports]);

  const approveReport = useCallback(async (reportId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('reconciliation_reports')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      // Log audit trail
      const report = reports.find(r => r.id === reportId);
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        business_id: report?.business_id,
        action: 'REPORT_APPROVED',
        details: {
          report_id: reportId,
        },
      }]);

      toast({
        title: 'Report Approved',
        description: 'The report has been marked as approved and ready for lodgment.',
      });

      await fetchReports();
      return true;
    } catch (error) {
      console.error('Error approving report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve report',
      });
      return false;
    }
  }, [user, reports, toast, fetchReports]);

  const deleteReport = useCallback(async (reportId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const report = reports.find(r => r.id === reportId);

      const { error } = await supabase
        .from('reconciliation_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Log audit trail
      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        business_id: report?.business_id,
        action: 'REPORT_DELETED',
        details: {
          report_id: reportId,
          report_type: report?.report_type,
        },
      }]);

      toast({
        title: 'Report Deleted',
        description: 'The report has been deleted.',
      });

      await fetchReports();
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete report',
      });
      return false;
    }
  }, [user, reports, toast, fetchReports]);

  const logDownload = useCallback(async (reportId: string, format: 'pdf' | 'excel') => {
    if (!user) return;

    const report = reports.find(r => r.id === reportId);
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      business_id: report?.business_id,
      action: 'REPORT_DOWNLOADED',
      details: {
        report_id: reportId,
        format,
      },
    }]);
  }, [user, reports]);

  return {
    reports,
    isLoading,
    isGenerating,
    fetchReports,
    generateReport,
    approveReport,
    deleteReport,
    logDownload,
  };
}
