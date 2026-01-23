import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { AssignAccountantDialog } from "@/components/business/AssignAccountantDialog";
import {
  Building2,
  Plus,
  FileText,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Clock,
  FileSpreadsheet,
  Download,
  Calculator,
  Bell,
} from "lucide-react";

interface Business {
  id: string;
  name: string;
  tin: string;
  business_type: string;
  created_at: string;
}

interface DashboardStats {
  totalBusinesses: number;
  pendingForms: number;
  assignedAccountants: number;
  pendingAccessRequests: number;
}

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBusinesses: 0,
    pendingForms: 0,
    assignedAccountants: 0,
    pendingAccessRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch businesses
      const { data: businessesData, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const allBusinessIds = (businessesData || []).map((b) => b.id);

      // Fetch pending access requests count for user's businesses
      let pendingRequestsCount = 0;
      if (allBusinessIds.length > 0) {
        const { count } = await supabase
          .from("access_requests")
          .select("*", { count: "exact", head: true })
          .in("business_id", allBusinessIds)
          .eq("status", "pending");
        pendingRequestsCount = count || 0;
      }

      setBusinesses(businessesData || []);
      setStats({
        totalBusinesses: businessesData?.length || 0,
        pendingForms: 0,
        assignedAccountants: 0,
        pendingAccessRequests: pendingRequestsCount,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatBusinessType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <MainLayout className="theme-owner">
      <div className="container py-8">
        {/* Header with Owner Theme */}
        <div className="mb-8 p-6 rounded-xl bg-gradient-hero text-primary-foreground">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <Badge variant="secondary" className="mb-1 bg-accent text-accent-foreground">
                Business Owner
              </Badge>
              <h1 className="text-3xl font-display font-bold">
                {getGreeting()}, {profile?.name?.split(" ")[0] || "there"}
              </h1>
            </div>
          </div>
          <p className="text-primary-foreground/80 ml-16">
            Here's what's happening with your tax filings
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Businesses</p>
                <p className="text-3xl font-bold font-display mt-1">
                  {stats.totalBusinesses}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Forms</p>
                <p className="text-3xl font-bold font-display mt-1">
                  {stats.pendingForms}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accountants</p>
                <p className="text-3xl font-bold font-display mt-1">
                  {stats.assignedAccountants}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </div>

          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold font-display mt-1">UGX 0</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Businesses */}
          <div className="lg:col-span-2">
            <div className="card-elevated">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-display font-semibold">
                    Your Businesses
                  </h2>
                  <Button asChild size="sm">
                    <Link to="/businesses/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Business
                    </Link>
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : businesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">No businesses yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your first business to start filing taxes
                  </p>
                  <Button asChild>
                    <Link to="/businesses/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Business
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {businesses.map((business) => (
                    <Link
                      key={business.id}
                      to={`/businesses/${business.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{business.name}</p>
                          <p className="text-sm text-muted-foreground">
                            TIN: {business.tin} •{" "}
                            {formatBusinessType(business.business_type)}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}

              {businesses.length > 0 && (
                <div className="p-4 border-t border-border">
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/businesses">View all businesses</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Reminders */}
          <div className="space-y-6">
            <div className="card-elevated p-6">
              <h2 className="text-lg font-display font-semibold mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/businesses/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Register New Business
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/tax/calculator">
                    <Calculator className="h-4 w-4 mr-2" />
                    Tax Calculator
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/tax/templates">
                    <Download className="h-4 w-4 mr-2" />
                    Download Tax Templates
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/tax/templates">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Auto-Fill Tax Forms
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setAssignDialogOpen(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign Accountant
                  {stats.pendingAccessRequests > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {stats.pendingAccessRequests}
                    </Badge>
                  )}
                </Button>

                <AssignAccountantDialog
                  open={assignDialogOpen}
                  onOpenChange={setAssignDialogOpen}
                  onAssigned={fetchDashboardData}
                />
              </div>
            </div>

            <div className="card-elevated p-6">
              <h2 className="text-lg font-display font-semibold mb-4">
                Upcoming Deadlines
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">PAYE Filing</p>
                    <p className="text-xs text-muted-foreground">
                      Due by 15th of each month
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">VAT Returns</p>
                    <p className="text-xs text-muted-foreground">
                      Due by 15th of each month
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="card-elevated p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Your Role</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {roles.join(", ") || "SME Owner"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
