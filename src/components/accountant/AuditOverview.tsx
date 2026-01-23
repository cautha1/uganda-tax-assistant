import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  FileWarning,
  TrendingUp,
  Calendar,
  ExternalLink
} from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";
import { calculateTotalPenalties } from "@/lib/penaltyCalculations";
import { differenceInDays, format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";

interface AuditOverviewProps {
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
  }[];
}

const RISK_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  unassessed: "#94a3b8",
};

const STATUS_COLORS = {
  draft: "#f59e0b",
  validated: "#3b82f6",
  error: "#ef4444",
  submitted: "#22c55e",
};

const TAX_TYPE_LABELS: Record<string, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
};

export function AuditOverview({ taxForms }: AuditOverviewProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const riskDistribution = {
      low: taxForms.filter(f => f.risk_level === "low").length,
      medium: taxForms.filter(f => f.risk_level === "medium").length,
      high: taxForms.filter(f => f.risk_level === "high").length,
      unassessed: taxForms.filter(f => !f.risk_level).length,
    };

    const statusDistribution = {
      draft: taxForms.filter(f => f.status === "draft").length,
      validated: taxForms.filter(f => f.status === "validated").length,
      error: taxForms.filter(f => f.status === "error").length,
      submitted: taxForms.filter(f => f.status === "submitted").length,
    };

    const overdueForms = taxForms.filter(f => {
      if (!f.due_date || f.status === "submitted") return false;
      return differenceInDays(new Date(f.due_date), new Date()) < 0;
    });

    const upcomingDue = taxForms.filter(f => {
      if (!f.due_date || f.status === "submitted") return false;
      const days = differenceInDays(new Date(f.due_date), new Date());
      return days >= 0 && days <= 14;
    });

    // Calculate total penalty exposure
    let totalPenaltyExposure = 0;
    overdueForms.forEach(form => {
      if (form.due_date) {
        const penalties = calculateTotalPenalties({
          taxDue: form.calculated_tax,
          dueDate: form.due_date,
          isPaid: false,
        });
        totalPenaltyExposure += penalties.totalPenalty;
      }
    });

    const readyCount = taxForms.filter(f => f.ready_for_submission && f.status !== "submitted").length;
    const completionRate = taxForms.length > 0
      ? Math.round((statusDistribution.submitted / taxForms.length) * 100)
      : 0;

    return {
      riskDistribution,
      statusDistribution,
      overdueForms,
      upcomingDue,
      totalPenaltyExposure,
      readyCount,
      completionRate,
    };
  }, [taxForms]);

  // Chart data
  const riskChartData = [
    { name: "Low", value: stats.riskDistribution.low, color: RISK_COLORS.low },
    { name: "Medium", value: stats.riskDistribution.medium, color: RISK_COLORS.medium },
    { name: "High", value: stats.riskDistribution.high, color: RISK_COLORS.high },
    { name: "Unassessed", value: stats.riskDistribution.unassessed, color: RISK_COLORS.unassessed },
  ].filter(d => d.value > 0);

  const statusChartData = [
    { name: "Draft", count: stats.statusDistribution.draft, fill: STATUS_COLORS.draft },
    { name: "Validated", count: stats.statusDistribution.validated, fill: STATUS_COLORS.validated },
    { name: "Errors", count: stats.statusDistribution.error, fill: STATUS_COLORS.error },
    { name: "Submitted", count: stats.statusDistribution.submitted, fill: STATUS_COLORS.submitted },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <Progress value={stats.completionRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ready for Owner</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.readyCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting submission</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Forms</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueForms.length}</div>
            <p className="text-xs text-muted-foreground">Need immediate attention</p>
          </CardContent>
        </Card>
        
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Penalty Exposure</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {formatUGX(stats.totalPenaltyExposure)}
            </div>
            <p className="text-xs text-muted-foreground">Estimated total</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Risk Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskChartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {riskChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
            <div className="flex justify-center gap-4 mt-4">
              {riskChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overdue Forms */}
        <Card className={stats.overdueForms.length > 0 ? "border-destructive/50" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Overdue Forms
              {stats.overdueForms.length > 0 && (
                <Badge variant="destructive">{stats.overdueForms.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Forms past their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.overdueForms.length > 0 ? (
              <div className="space-y-3">
                {stats.overdueForms.slice(0, 5).map((form) => {
                  const daysOverdue = Math.abs(differenceInDays(new Date(form.due_date!), new Date()));
                  const penalties = calculateTotalPenalties({
                    taxDue: form.calculated_tax,
                    dueDate: form.due_date!,
                    isPaid: false,
                  });
                  
                  return (
                    <div key={form.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                      <div>
                        <p className="font-medium">{form.business_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {TAX_TYPE_LABELS[form.tax_type]} • {form.tax_period}
                        </p>
                        <p className="text-xs text-destructive">
                          {daysOverdue} days overdue • Est. penalty: {formatUGX(penalties.totalPenalty)}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/tax/${form.id}`}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
                {stats.overdueForms.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{stats.overdueForms.length - 5} more overdue forms
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p>No overdue forms</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Deadlines
              {stats.upcomingDue.length > 0 && (
                <Badge variant="secondary">{stats.upcomingDue.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Due within the next 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.upcomingDue.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingDue.slice(0, 5).map((form) => {
                  const daysUntilDue = differenceInDays(new Date(form.due_date!), new Date());
                  const isUrgent = daysUntilDue <= 7;
                  
                  return (
                    <div 
                      key={form.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isUrgent ? "bg-amber-50 dark:bg-amber-900/20" : "bg-muted/50"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{form.business_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {TAX_TYPE_LABELS[form.tax_type]} • {form.tax_period}
                        </p>
                        <p className={`text-xs ${isUrgent ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3 inline mr-1" />
                          Due in {daysUntilDue} day{daysUntilDue !== 1 ? "s" : ""}
                          {form.ready_for_submission && " • Ready ✓"}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/tax/${form.id}`}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
                {stats.upcomingDue.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{stats.upcomingDue.length - 5} more upcoming
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p>No upcoming deadlines</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
