import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, FileX, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";
import { EvidenceExceptionsData } from "@/lib/reconciliationCalculations";
import { useTranslation } from "@/hooks/useTranslation";

interface EvidenceExceptionsReportProps {
  data: EvidenceExceptionsData;
}

export function EvidenceExceptionsReport({ data }: EvidenceExceptionsReportProps) {
  const { t } = useTranslation();

  const totalIssues = data.summary.totalMissingReceipts + data.summary.totalLargeEntries + data.summary.totalEditedAfterLock;
  const hasIssues = totalIssues > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={data.summary.totalMissingReceipts > 0 ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.missingReceipts')}</p>
                <p className={`text-2xl font-bold ${data.summary.totalMissingReceipts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.summary.totalMissingReceipts}
                </p>
              </div>
              <FileX className={`h-8 w-8 ${data.summary.totalMissingReceipts > 0 ? 'text-red-600' : 'text-green-600'} opacity-50`} />
            </div>
          </CardContent>
        </Card>

        <Card className={data.summary.totalLargeEntries > 0 ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.largeEntries')}</p>
                <p className={`text-2xl font-bold ${data.summary.totalLargeEntries > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {data.summary.totalLargeEntries}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${data.summary.totalLargeEntries > 0 ? 'text-amber-600' : 'text-green-600'} opacity-50`} />
            </div>
          </CardContent>
        </Card>

        <Card className={data.summary.totalEditedAfterLock > 0 ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.editedAfterLock')}</p>
                <p className={`text-2xl font-bold ${data.summary.totalEditedAfterLock > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {data.summary.totalEditedAfterLock}
                </p>
              </div>
              <Clock className={`h-8 w-8 ${data.summary.totalEditedAfterLock > 0 ? 'text-amber-600' : 'text-green-600'} opacity-50`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Warnings */}
      {data.validationWarnings.length > 0 && (
        <div className="space-y-3">
          {data.validationWarnings.map((warning) => (
            <Alert key={warning.id} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('reports.warning')}</AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* No Issues Message */}
      {!hasIssues && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">{t('reports.noIssuesFound')}</h3>
                <p className="text-green-700 dark:text-green-300">{t('reports.noIssuesFoundDesc')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Receipts */}
      {data.missingReceipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <FileX className="h-5 w-5" />
              {t('reports.missingReceipts')}
              <Badge variant="destructive">{data.missingReceipts.length}</Badge>
            </CardTitle>
            <CardDescription>
              {t('reports.missingReceiptsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.type')}</TableHead>
                    <TableHead>{t('reports.date')}</TableHead>
                    <TableHead>{t('reports.description')}</TableHead>
                    <TableHead className="text-right">{t('reports.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.missingReceipts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{item.type}</Badge>
                      </TableCell>
                      <TableCell>{new Date(item.date).toLocaleDateString('en-UG')}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                      <TableCell className="text-right font-medium">{formatUGX(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Large/Unusual Entries */}
      {data.largeEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <TrendingUp className="h-5 w-5" />
              {t('reports.largeEntries')}
              <Badge className="bg-amber-500">{data.largeEntries.length}</Badge>
            </CardTitle>
            <CardDescription>
              {t('reports.largeEntriesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.type')}</TableHead>
                    <TableHead>{t('reports.description')}</TableHead>
                    <TableHead className="text-right">{t('reports.amount')}</TableHead>
                    <TableHead className="text-right">{t('reports.threshold')}</TableHead>
                    <TableHead className="text-right">{t('reports.variance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.largeEntries.map((item) => {
                    const variance = ((item.amount / item.threshold - 1) * 100).toFixed(0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{item.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                        <TableCell className="text-right font-medium text-amber-600">{formatUGX(item.amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatUGX(item.threshold)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-amber-600">+{variance}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edited After Lock */}
      {data.editedAfterLock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              {t('reports.editedAfterLock')}
              <Badge className="bg-amber-500">{data.editedAfterLock.length}</Badge>
            </CardTitle>
            <CardDescription>
              {t('reports.editedAfterLockDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.type')}</TableHead>
                    <TableHead>{t('reports.description')}</TableHead>
                    <TableHead>{t('reports.editedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.editedAfterLock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{item.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.description}</TableCell>
                      <TableCell>{new Date(item.editedAt).toLocaleString('en-UG')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
