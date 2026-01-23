import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { RequestAccessDialog } from "@/components/accountant/RequestAccessDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  FileText,
  Search,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  Shield,
  Eye,
  Edit,
  Upload,
  UserPlus,
  Send,
} from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";
import { BUSINESS_COLUMNS, TAX_FORM_COLUMNS } from "@/lib/exportImport";
import { format, differenceInDays } from "date-fns";

interface AccountantPermissions {
  can_view: boolean;
  can_edit: boolean;
  can_upload: boolean;
  can_generate_reports: boolean;
}

interface AssignedBusiness {
  id: string;
  name: string;
  tin: string;
  address: string | null;
  business_type: string;
  turnover: number;
  tax_types: string[];
  assigned_at: string;
  permissions: AccountantPermissions;
}

interface TaxForm {
  id: string;
  business_id: string;
  business_name: string;
  tax_type: string;
  tax_period: string;
  status: string;
  calculated_tax: number;
  created_at: string;
  submitted_at: string | null;
  due_date: string | null;
  risk_level: string | null;
  ready_for_submission: boolean;
}

const TAX_TYPE_LABELS: Record<string, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  draft: { icon: <Clock className="h-4 w-4" />, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: "Draft" },
  validated: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", label: "Validated" },
  error: { icon: <AlertCircle className="h-4 w-4" />, color: "bg-destructive/10 text-destructive", label: "Errors" },
  submitted: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", label: "Submitted" },
};

const RISK_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  low: { icon: <Shield className="h-4 w-4" />, color: "text-green-600" },
  medium: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600" },
  high: { icon: <AlertCircle className="h-4 w-4" />, color: "text-destructive" },
};

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<AssignedBusiness[]>([]);
  const [taxForms, setTaxForms] = useState<TaxForm[]>([]);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; business_name: string; status: string; requested_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("businesses");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setIsLoading(true);

    // Fetch pending access requests
    const { data: requestsData } = await supabase
      .from("access_requests")
      .select("id, business_id, status, requested_at")
      .eq("accountant_id", user!.id)
      .order("requested_at", { ascending: false });

    // Get business names for requests
    if (requestsData && requestsData.length > 0) {
      const requestBusinessIds = requestsData.map((r) => r.business_id);
      const { data: requestBusinesses } = await supabase
        .from("businesses")
        .select("id, name")
        .in("id", requestBusinessIds);

      const requestsWithNames = requestsData.map((r) => ({
        id: r.id,
        business_name: requestBusinesses?.find((b) => b.id === r.business_id)?.name || "Unknown",
        status: r.status,
        requested_at: r.requested_at,
      }));
      setPendingRequests(requestsWithNames.filter((r) => r.status === "pending"));
    } else {
      setPendingRequests([]);
    }

    // Fetch assigned businesses with permissions
    const { data: assignments } = await supabase
      .from("business_accountants")
      .select("business_id, assigned_at, can_view, can_edit, can_upload, can_generate_reports")
      .eq("accountant_id", user!.id);

    if (!assignments || assignments.length === 0) {
      setBusinesses([]);
      setTaxForms([]);
      setIsLoading(false);
      return;
    }

    const businessIds = assignments.map((a) => a.business_id);
    const assignmentMap = new Map(assignments.map((a) => [a.business_id, a]));

    // Fetch business details
    const { data: businessData } = await supabase
      .from("businesses")
      .select("*")
      .in("id", businessIds)
      .eq("is_deleted", false);

    const assignedBusinesses: AssignedBusiness[] = (businessData || []).map((b) => {
      const assignment = assignmentMap.get(b.id);
      return {
        id: b.id,
        name: b.name,
        tin: b.tin,
        address: b.address,
        business_type: b.business_type || "other",
        turnover: b.turnover || 0,
        tax_types: b.tax_types || [],
        assigned_at: assignment?.assigned_at || "",
        permissions: {
          can_view: assignment?.can_view ?? true,
          can_edit: assignment?.can_edit ?? true,
          can_upload: assignment?.can_upload ?? true,
          can_generate_reports: assignment?.can_generate_reports ?? true,
        },
      };
    });

    setBusinesses(assignedBusinesses);

    // Fetch tax forms for assigned businesses
    const { data: formsData } = await supabase
      .from("tax_forms")
      .select("*")
      .in("business_id", businessIds)
      .order("created_at", { ascending: false });

    const formsWithBusinessNames: TaxForm[] = (formsData || []).map((f) => {
      const business = assignedBusinesses.find((b) => b.id === f.business_id);
      return {
        id: f.id,
        business_id: f.business_id,
        business_name: business?.name || "Unknown",
        tax_type: f.tax_type,
        tax_period: f.tax_period,
        status: f.status,
        calculated_tax: f.calculated_tax || 0,
        created_at: f.created_at,
        submitted_at: f.submitted_at,
        due_date: f.due_date,
        risk_level: f.risk_level,
        ready_for_submission: f.ready_for_submission || false,
      };
    });

    setTaxForms(formsWithBusinessNames);
    setIsLoading(false);
  }

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredForms = taxForms.filter((f) => {
    const matchesSearch =
      f.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tax_period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      TAX_TYPE_LABELS[f.tax_type]?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    const matchesTaxType = taxTypeFilter === "all" || f.tax_type === taxTypeFilter;
    
    return matchesSearch && matchesStatus && matchesTaxType;
  });

  const stats = {
    totalBusinesses: businesses.length,
    totalForms: taxForms.length,
    pendingForms: taxForms.filter((f) => f.status === "draft" || f.status === "validated").length,
    errorForms: taxForms.filter((f) => f.status === "error").length,
    readyForms: taxForms.filter((f) => f.ready_for_submission && f.status !== "submitted").length,
    submittedForms: taxForms.filter((f) => f.status === "submitted").length,
    totalTaxManaged: taxForms.reduce((sum, f) => sum + f.calculated_tax, 0),
  };

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getDaysUntilDue(dueDate: string | null): { days: number; urgent: boolean } | null {
    if (!dueDate) return null;
    const days = differenceInDays(new Date(dueDate), new Date());
    return { days, urgent: days <= 7 };
  }

  if (isLoading) {
    return (
      <MainLayout className="theme-accountant">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout className="theme-accountant">
      <div className="container py-8">
        {/* Header with Accountant Theme - Teal/Cyan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-6 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <Badge className="mb-1 bg-white/20 text-white border-white/30 hover:bg-white/30">
                Professional Accountant
              </Badge>
              <h1 className="text-3xl font-display font-bold">
                Accountant Dashboard
              </h1>
              <p className="text-white/80 mt-1">
                Manage tax filings for your assigned businesses
              </p>
            </div>
          </div>
          <RequestAccessDialog onRequestSent={fetchData} />
        </div>

        {/* Pending Requests Notification */}
        {pendingRequests.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {pendingRequests.length} pending access request{pendingRequests.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Waiting for approval from business owners
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Assigned Businesses</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingForms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">With Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.errorForms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ready for Owner</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.readyForms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tax Managed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUGX(stats.totalTaxManaged)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses or tax forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={taxTypeFilter} onValueChange={setTaxTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tax Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="paye">PAYE</SelectItem>
              <SelectItem value="income">Income Tax</SelectItem>
              <SelectItem value="presumptive">Presumptive Tax</SelectItem>
              <SelectItem value="vat">VAT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="businesses" className="gap-2">
                <Building2 className="h-4 w-4" />
                Businesses ({filteredBusinesses.length})
              </TabsTrigger>
              <TabsTrigger value="tax-forms" className="gap-2">
                <FileText className="h-4 w-4" />
                Tax Forms ({filteredForms.length})
              </TabsTrigger>
            </TabsList>
            {activeTab === "businesses" && filteredBusinesses.length > 0 && (
              <ExportDropdown
                options={{
                  title: "Assigned Businesses",
                  columns: BUSINESS_COLUMNS,
                  data: filteredBusinesses.map((b) => ({
                    ...b,
                    tax_types_str: b.tax_types?.join(", ") || "",
                    is_informal: "No",
                  })),
                  filename: `my-clients-${format(new Date(), "yyyy-MM-dd")}`,
                  subtitle: `Total: ${filteredBusinesses.length} businesses`,
                }}
              />
            )}
            {activeTab === "tax-forms" && filteredForms.length > 0 && (
              <ExportDropdown
                options={{
                  title: "Tax Forms",
                  columns: TAX_FORM_COLUMNS,
                  data: filteredForms.map((f) => ({
                    ...f,
                    tax_type_label: TAX_TYPE_LABELS[f.tax_type] || f.tax_type,
                    created_at_formatted: format(new Date(f.created_at), "PPP"),
                    submitted_at_formatted: f.submitted_at
                      ? format(new Date(f.submitted_at), "PPP")
                      : "Not submitted",
                  })),
                  filename: `tax-forms-${format(new Date(), "yyyy-MM-dd")}`,
                  subtitle: `Total: ${filteredForms.length} forms`,
                }}
              />
            )}
          </div>

          <TabsContent value="businesses" className="mt-6">
            {filteredBusinesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No businesses assigned</h3>
                  <p className="text-muted-foreground mb-4">
                    Request access to a business by entering their TIN, or wait for a business owner to invite you.
                  </p>
                  <RequestAccessDialog
                    trigger={
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Request Access to Business
                      </Button>
                    }
                    onRequestSent={fetchData}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredBusinesses.map((business) => (
                  <Card key={business.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{business.name}</CardTitle>
                          <CardDescription>TIN: {business.tin}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {business.business_type.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Annual Turnover</p>
                          <p className="font-medium">{formatUGX(business.turnover)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tax Types</p>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {business.tax_types.length > 0 ? (
                              business.tax_types.map((t) => (
                                <Badge key={t} variant="outline" className="text-xs">
                                  {TAX_TYPE_LABELS[t] || t}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Permissions</p>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {business.permissions.can_view && (
                              <Badge variant="outline" className="text-xs py-0">
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Badge>
                            )}
                            {business.permissions.can_edit && (
                              <Badge variant="outline" className="text-xs py-0">
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Badge>
                            )}
                            {business.permissions.can_upload && (
                              <Badge variant="outline" className="text-xs py-0">
                                <Upload className="h-3 w-3 mr-1" /> Upload
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Assigned on {formatDate(business.assigned_at)}
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button asChild size="sm" className="flex-1">
                            <Link to={`/businesses/${business.id}`}>
                              View Details
                            </Link>
                          </Button>
                          {business.permissions.can_edit && (
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/businesses/${business.id}/tax/new`}>
                                <Plus className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tax-forms" className="mt-6">
            {filteredForms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No tax forms yet</h3>
                  <p className="text-muted-foreground">
                    Start filing tax returns for your assigned businesses.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {filteredForms.map((form) => {
                      const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.draft;
                      const riskConfig = form.risk_level ? RISK_CONFIG[form.risk_level] : null;
                      const dueInfo = getDaysUntilDue(form.due_date);
                      
                      return (
                        <div
                          key={form.id}
                          className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-2 rounded-full ${statusConfig.color}`}
                            >
                              {statusConfig.icon}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{TAX_TYPE_LABELS[form.tax_type]}</p>
                                {form.ready_for_submission && form.status !== "submitted" && (
                                  <Badge variant="default" className="text-xs">
                                    Ready
                                  </Badge>
                                )}
                                {riskConfig && (
                                  <span className={riskConfig.color} title={`${form.risk_level} risk`}>
                                    {riskConfig.icon}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {form.business_name} • {form.tax_period}
                              </p>
                              {dueInfo && (
                                <p className={`text-xs ${dueInfo.urgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                  {dueInfo.days < 0 
                                    ? `Overdue by ${Math.abs(dueInfo.days)} days` 
                                    : dueInfo.days === 0 
                                      ? "Due today" 
                                      : `Due in ${dueInfo.days} days`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <Badge variant="secondary" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                              <p className="text-sm font-medium mt-1">
                                {formatUGX(form.calculated_tax)}
                              </p>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/tax/${form.id}`}>View</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
