import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Download, MoreVertical, CheckCircle2, Trash2, FileSpreadsheet, Eye } from "lucide-react";
import { ReconciliationReport } from "@/hooks/useReconciliationReports";
import { getReportTypeLabel, getTaxTypeLabel } from "@/lib/reconciliationCalculations";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/lib/auth";

interface ReportHistoryProps {
  reports: ReconciliationReport[];
  businessOwnerId: string | null;
  onApprove: (reportId: string) => Promise<boolean>;
  onDelete: (reportId: string) => Promise<boolean>;
  onDownload: (reportId: string, format: 'pdf' | 'excel') => void;
  onView: (report: ReconciliationReport) => void;
}

export function ReportHistory({
  reports,
  businessOwnerId,
  onApprove,
  onDelete,
  onDownload,
  onView,
}: ReportHistoryProps) {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === businessOwnerId;
  const isAdmin = hasRole("admin");
  const canApprove = isOwner;
  const canDelete = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    await onDelete(deleteConfirmId);
    setIsDeleting(false);
    setDeleteConfirmId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return startDate.toLocaleDateString('en-UG', { month: 'long', year: 'numeric' });
    }
    
    return `${startDate.toLocaleDateString('en-UG', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-UG', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('reports.reportHistory')}
          </CardTitle>
          <CardDescription>
            {t('reports.reportHistoryDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.reportType')}</TableHead>
                    <TableHead>{t('reports.taxType')}</TableHead>
                    <TableHead>{t('reports.period')}</TableHead>
                    <TableHead>{t('reports.status')}</TableHead>
                    <TableHead>{t('reports.createdAt')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {getReportTypeLabel(report.report_type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTaxTypeLabel(report.tax_type)}</Badge>
                      </TableCell>
                      <TableCell>{formatPeriod(report.period_start, report.period_end)}</TableCell>
                      <TableCell>
                        {report.status === 'approved' ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('reports.approved')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t('reports.draft')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(report.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(report)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('reports.viewReport')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDownload(report.id, 'pdf')}>
                              <FileText className="h-4 w-4 mr-2" />
                              {t('reports.downloadPDF')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDownload(report.id, 'excel')}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              {t('reports.downloadExcel')}
                            </DropdownMenuItem>
                            {canApprove && report.status === 'draft' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => onApprove(report.id)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('reports.approveReport')}
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteConfirmId(report.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t('reports.noReports')}</h3>
              <p className="text-muted-foreground">{t('reports.noReportsDesc')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reports.deleteReport')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('reports.deleteReportConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('common.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
