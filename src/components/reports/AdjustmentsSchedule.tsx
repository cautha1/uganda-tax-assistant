import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, FileText, Link as LinkIcon } from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";
import { AdjustmentsData } from "@/lib/reconciliationCalculations";
import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";

interface AdjustmentsScheduleProps {
  data: AdjustmentsData;
  businessId: string;
}

export function AdjustmentsSchedule({ data, businessId }: AdjustmentsScheduleProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.totalAddBacks')}</p>
                <p className="text-2xl font-bold text-amber-600">{formatUGX(data.totalAddBacks)}</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                {data.items.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.totalDeductions')}</p>
                <p className="text-2xl font-bold text-green-600">{formatUGX(data.totalDeductions)}</p>
              </div>
              <Badge variant="secondary" className="text-lg">
                0
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adjustments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('reports.adjustmentsSchedule')}
          </CardTitle>
          <CardDescription>
            {t('reports.adjustmentsScheduleDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.category')}</TableHead>
                    <TableHead>{t('reports.reason')}</TableHead>
                    <TableHead className="text-right">{t('reports.amount')}</TableHead>
                    <TableHead className="text-center">{t('reports.evidence')}</TableHead>
                    <TableHead className="text-center">{t('reports.link')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium capitalize">
                        {item.category.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.reason}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        {formatUGX(item.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.hasEvidence ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 inline-block" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 inline-block" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link
                          to={`/businesses/${businessId}/${item.entryType === 'income' ? 'income' : 'expenses'}`}
                          className="inline-flex items-center text-primary hover:underline text-sm"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          {t('reports.viewEntry')}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t('reports.noAdjustments')}</h3>
              <p className="text-muted-foreground">{t('reports.noAdjustmentsDesc')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-4">{t('reports.legend')}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span>{t('reports.addBacksExplanation')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>{t('reports.deductionsExplanation')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>{t('reports.hasEvidence')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>{t('reports.missingEvidence')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
