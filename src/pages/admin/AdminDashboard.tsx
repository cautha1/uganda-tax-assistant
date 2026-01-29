import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RoleManagementDialog, RoleBadges } from "@/components/admin/RoleManagement";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { CreateBusinessForUserDialog } from "@/components/admin/CreateBusinessForUserDialog";
import { 
  Building2, Users, FileText, Search, ShieldCheck, TrendingUp, 
  UserCog, ClipboardList, UserPlus, LayoutDashboard, Briefcase, Plus 
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatUGX } from "@/lib/taxCalculations";

type AppRole = "sme_owner" | "accountant" | "admin" | "guest";

interface BusinessSummary {
  id: string;
  name: string;
  tin: string;
  business_type: string;
  turnover: number;
  created_at: string;
  owner_id: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  verified: boolean;
  created_at: string;
  roles: AppRole[];
}

interface TaxFormSummary {
  id: string;
  business_id: string;
  tax_type: string;
  tax_period: string;
  status: string;
  calculated_tax: number;
  created_at: string;
  submitted_at: string | null;
  businesses?: { name: string; tin: string };
}

const TAX_TYPE_LABELS: Record<string, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  validated: "bg-info/10 text-info",
  error: "bg-destructive/10 text-destructive",
  submitted: "bg-success/10 text-success",
};

export default function AdminDashboard() {
  const { hasRole, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [taxForms, setTaxForms] = useState<TaxFormSummary[]>([]);
  const [userRolesMap, setUserRolesMap] = useState<Record<string, AppRole[]>>({});
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalUsers: 0,
    totalTaxForms: 0,
    totalTaxCollected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [createBusinessDialogOpen, setCreateBusinessDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !hasRole("admin")) {
      navigate("/dashboard");
    }
  }, [authLoading, hasRole, navigate]);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);

    const [businessesRes, usersRes, taxFormsRes, rolesRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("is_deleted", false).order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, name, email, phone, verified, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("tax_forms").select("*, businesses(name, tin)").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const businessData = (businessesRes.data || []) as BusinessSummary[];
    const userData = (usersRes.data || []) as Omit<UserProfile, "roles">[];
    const taxFormData = (taxFormsRes.data || []) as TaxFormSummary[];
    const rolesData = (rolesRes.data || []) as { user_id: string; role: AppRole }[];

    // Build roles map
    const rolesMap: Record<string, AppRole[]> = {};
    rolesData.forEach(({ user_id, role }) => {
      if (!rolesMap[user_id]) rolesMap[user_id] = [];
      rolesMap[user_id].push(role);
    });
    setUserRolesMap(rolesMap);

    // Add roles to users
    const usersWithRoles: UserProfile[] = userData.map((u) => ({
      ...u,
      roles: rolesMap[u.id] || [],
    }));

    setBusinesses(businessData);
    setUsers(usersWithRoles);
    setTaxForms(taxFormData);

    // Calculate stats
    const totalTaxCollected = taxFormData
      .filter((f) => f.status === "submitted")
      .reduce((sum, f) => sum + (f.calculated_tax || 0), 0);

    setStats({
      totalBusinesses: businessData.length,
      totalUsers: usersWithRoles.length,
      totalTaxForms: taxFormData.length,
      totalTaxCollected,
    });

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && hasRole("admin")) {
      fetchAdminData();
    }
  }, [authLoading, hasRole, fetchAdminData]);

  const handleManageRoles = (user: UserProfile) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleRolesUpdated = () => {
    fetchAdminData();
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  const filteredBusinesses = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.tin.includes(searchTerm)
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTaxForms = taxForms.filter(
    (f) =>
      f.businesses?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.businesses?.tin.includes(searchTerm) ||
      f.tax_type.includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage businesses, users, and tax submissions across the platform
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Owner Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/accountant">
                <Briefcase className="mr-2 h-4 w-4" />
                Accountant View
              </Link>
            </Button>
            <Button onClick={() => setCreateUserDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
            <Button onClick={() => setCreateBusinessDialogOpen(true)}>
              <Building2 className="mr-2 h-4 w-4" />
              Create Business
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/audit">
                <ClipboardList className="mr-2 h-4 w-4" />
                Audit Trail
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Businesses</p>
                  <p className="text-2xl font-bold">{stats.totalBusinesses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-info/10 rounded-lg">
                  <FileText className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Forms</p>
                  <p className="text-2xl font-bold">{stats.totalTaxForms}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Collected</p>
                  <p className="text-2xl font-bold">{formatUGX(stats.totalTaxCollected)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses, users, or tax forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="businesses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="businesses" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Businesses ({filteredBusinesses.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="tax-forms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Tax Forms ({filteredTaxForms.length})
            </TabsTrigger>
          </TabsList>

          {/* Businesses Tab */}
          <TabsContent value="businesses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>All Businesses</CardTitle>
                  <CardDescription>View and manage registered businesses</CardDescription>
                </div>
                <Button onClick={() => setCreateBusinessDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Business
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-left py-3 px-4">Business Name</th>
                        <th className="text-left py-3 px-4">TIN</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-right py-3 px-4">Turnover</th>
                        <th className="text-left py-3 px-4">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinesses.map((business) => (
                        <tr key={business.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{business.name}</td>
                          <td className="py-3 px-4 font-mono text-sm">{business.tin}</td>
                          <td className="py-3 px-4 capitalize">
                            {business.business_type?.replace("_", " ")}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatUGX(business.turnover || 0)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {new Date(business.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredBusinesses.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No businesses found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>Manage user roles and view registered users</CardDescription>
                </div>
                <Button onClick={() => setCreateUserDialogOpen(true)} size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Roles</th>
                        <th className="text-center py-3 px-4">Verified</th>
                        <th className="text-left py-3 px-4">Joined</th>
                        <th className="text-center py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{user.name}</td>
                          <td className="py-3 px-4">{maskEmail(user.email)}</td>
                          <td className="py-3 px-4">
                            <RoleBadges roles={user.roles} />
                          </td>
                          <td className="py-3 px-4 text-center">
                            {user.verified ? (
                              <Badge className="bg-success/10 text-success">Verified</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageRoles(user)}
                            >
                              <UserCog className="h-4 w-4 mr-1" />
                              Roles
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No users found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Forms Tab */}
          <TabsContent value="tax-forms">
            <Card>
              <CardHeader>
                <CardTitle>All Tax Submissions</CardTitle>
                <CardDescription>View all tax forms across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-left py-3 px-4">Business</th>
                        <th className="text-left py-3 px-4">Tax Type</th>
                        <th className="text-left py-3 px-4">Period</th>
                        <th className="text-center py-3 px-4">Status</th>
                        <th className="text-right py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTaxForms.map((form) => (
                        <tr key={form.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{form.businesses?.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {form.businesses?.tin}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {TAX_TYPE_LABELS[form.tax_type] || form.tax_type}
                          </td>
                          <td className="py-3 px-4">{form.tax_period}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={STATUS_COLORS[form.status]}>
                              {form.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatUGX(form.calculated_tax || 0)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {form.submitted_at
                              ? new Date(form.submitted_at).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTaxForms.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No tax forms found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Management Dialog */}
        <RoleManagementDialog
          user={selectedUser}
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          onRolesUpdated={handleRolesUpdated}
        />

        {/* Create User Dialog */}
        <CreateUserDialog
          open={createUserDialogOpen}
          onOpenChange={setCreateUserDialogOpen}
          onUserCreated={fetchAdminData}
        />

        {/* Create Business Dialog */}
        <CreateBusinessForUserDialog
          open={createBusinessDialogOpen}
          onOpenChange={setCreateBusinessDialogOpen}
          onBusinessCreated={fetchAdminData}
        />
      </div>
    </MainLayout>
  );
}

// Helper functions to mask sensitive data in the UI
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "***";
  return `***${phone.slice(-4)}`;
}
