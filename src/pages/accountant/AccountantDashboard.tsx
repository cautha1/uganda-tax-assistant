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
} from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";

interface AssignedBusiness {
  id: string;
  name: string;
  tin: string;
  address: string | null;
  business_type: string;
  turnover: number;
  tax_types: string[];
  assigned_at: string;
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
}

const TAX_TYPE_LABELS: Record<string, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  draft: { icon: <Clock className="h-4 w-4" />, color: "bg-muted text-muted-foreground" },
  validated: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
  error: { icon: <AlertCircle className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
  submitted: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-500/10 text-green-600" },
};

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<AssignedBusiness[]>([]);
  const [taxForms, setTaxForms] = useState<TaxForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("businesses");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setIsLoading(true);

    // Fetch assigned businesses
    const { data: assignments } = await supabase
      .from("business_accountants")
      .select("business_id, assigned_at")
      .eq("accountant_id", user!.id);

    if (!assignments || assignments.length === 0) {
      setBusinesses([]);
      setTaxForms([]);
      setIsLoading(false);
      return;
    }

    const businessIds = assignments.map((a) => a.business_id);
    const assignmentMap = new Map(assignments.map((a) => [a.business_id, a.assigned_at]));

    // Fetch business details
    const { data: businessData } = await supabase
      .from("businesses")
      .select("*")
      .in("id", businessIds)
      .eq("is_deleted", false);

    const assignedBusinesses: AssignedBusiness[] = (businessData || []).map((b) => ({
      id: b.id,
      name: b.name,
      tin: b.tin,
      address: b.address,
      business_type: b.business_type || "other",
      turnover: b.turnover || 0,
      tax_types: b.tax_types || [],
      assigned_at: assignmentMap.get(b.id) || "",
    }));

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

  const filteredForms = taxForms.filter(
    (f) =>
      f.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.tax_period.toLowerCase().includes(searchQuery.toLowerCase()) ||
      TAX_TYPE_LABELS[f.tax_type]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalBusinesses: businesses.length,
    totalForms: taxForms.length,
    pendingForms: taxForms.filter((f) => f.status === "draft" || f.status === "validated").length,
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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            Accountant Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage tax filings for your assigned businesses
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
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
              <CardTitle className="text-sm font-medium">Total Tax Forms</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalForms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Submissions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingForms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tax Managed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatUGX(stats.totalTaxManaged)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses or tax forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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

          <TabsContent value="businesses" className="mt-6">
            {filteredBusinesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No businesses assigned</h3>
                  <p className="text-muted-foreground">
                    You haven't been assigned to any businesses yet. Contact a business owner to get access.
                  </p>
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
                        <div className="text-xs text-muted-foreground">
                          Assigned on {formatDate(business.assigned_at)}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button asChild size="sm" className="flex-1">
                            <Link to={`/businesses/${business.id}`}>
                              View Details
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/businesses/${business.id}/tax/new`}>
                              <Plus className="h-4 w-4" />
                            </Link>
                          </Button>
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
                              <p className="font-medium">{TAX_TYPE_LABELS[form.tax_type]}</p>
                              <p className="text-sm text-muted-foreground">
                                {form.business_name} • {form.tax_period}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <Badge
                                variant="secondary"
                                className={`capitalize ${statusConfig.color}`}
                              >
                                {form.status}
                              </Badge>
                              <p className="text-sm font-medium mt-1">
                                {formatUGX(form.calculated_tax)}
                              </p>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/businesses/${form.business_id}`}>View</Link>
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
