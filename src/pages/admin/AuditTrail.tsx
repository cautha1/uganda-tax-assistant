import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ExportDropdown } from "@/components/ui/ExportDropdown";
import { format } from "date-fns";
import { CalendarIcon, Filter, RefreshCw, Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AUDIT_LOG_COLUMNS } from "@/lib/exportImport";

import { Json } from "@/integrations/supabase/types";

interface AuditLog {
  id: string;
  user_id: string | null;
  business_id: string | null;
  action: string;
  details: Json | null;
  ip_address: string | null;
  created_at: string | null;
  user_name?: string;
  user_email?: string;
  business_name?: string;
}

interface FilterState {
  userId: string;
  businessId: string;
  actionType: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  register: { label: "User Registration", color: "bg-green-100 text-green-800" },
  login: { label: "User Login", color: "bg-blue-100 text-blue-800" },
  logout: { label: "User Logout", color: "bg-gray-100 text-gray-800" },
  create_business: { label: "Business Created", color: "bg-purple-100 text-purple-800" },
  update_business: { label: "Business Updated", color: "bg-yellow-100 text-yellow-800" },
  delete_business: { label: "Business Deleted", color: "bg-red-100 text-red-800" },
  create_tax_form: { label: "Tax Form Created", color: "bg-indigo-100 text-indigo-800" },
  update_tax_form: { label: "Tax Form Updated", color: "bg-orange-100 text-orange-800" },
  validate_tax_form: { label: "Tax Form Validated", color: "bg-teal-100 text-teal-800" },
  generate_tax_form: { label: "Tax Form Generated", color: "bg-cyan-100 text-cyan-800" },
  submit_tax_form: { label: "Tax Form Submitted", color: "bg-emerald-100 text-emerald-800" },
  upload_proof: { label: "Proof Uploaded", color: "bg-pink-100 text-pink-800" },
  assign_accountant: { label: "Accountant Assigned", color: "bg-violet-100 text-violet-800" },
  remove_accountant: { label: "Accountant Removed", color: "bg-rose-100 text-rose-800" },
};

const ITEMS_PER_PAGE = 20;

export default function AuditTrail() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    userId: "",
    businessId: "",
    actionType: "",
    startDate: undefined,
    endDate: undefined,
  });

  // Check admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) return;
      
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      
      if (!data) {
        navigate("/dashboard");
      }
    };

    if (!authLoading && user) {
      checkAdminRole();
    }
  }, [user, authLoading, navigate]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const [usersResult, businessesResult] = await Promise.all([
        supabase.from("profiles").select("id, name, email"),
        supabase.from("businesses").select("id, name").eq("is_deleted", false),
      ]);

      if (usersResult.data) {
        setUsers(usersResult.data);
      }
      if (businessesResult.data) {
        setBusinesses(businessesResult.data);
      }
    };

    if (user) {
      fetchFilterOptions();
    }
  }, [user]);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.userId) {
        query = query.eq("user_id", filters.userId);
      }
      if (filters.businessId) {
        query = query.eq("business_id", filters.businessId);
      }
      if (filters.actionType) {
        query = query.eq("action", filters.actionType);
      }
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      // Enrich with user and business names
      const enrichedLogs = await Promise.all(
        (data || []).map(async (log) => {
          let user_name = "";
          let user_email = "";
          let business_name = "";

          if (log.user_id) {
            const userInfo = users.find((u) => u.id === log.user_id);
            if (userInfo) {
              user_name = userInfo.name;
              user_email = userInfo.email;
            }
          }

          if (log.business_id) {
            const businessInfo = businesses.find((b) => b.id === log.business_id);
            if (businessInfo) {
              business_name = businessInfo.name;
            }
          }

          return {
            ...log,
            user_name,
            user_email,
            business_name,
          };
        })
      );

      setLogs(enrichedLogs);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [user, filters, currentPage, users, businesses]);

  useEffect(() => {
    if (users.length > 0 || businesses.length > 0) {
      fetchLogs();
    }
  }, [fetchLogs, users.length, businesses.length]);

  const resetFilters = () => {
    setFilters({
      userId: "",
      businessId: "",
      actionType: "",
      startDate: undefined,
      endDate: undefined,
    });
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ["Date", "User", "Email", "Business", "Action", "IP Address", "Details"];
    const csvData = logs.map((log) => [
      log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : "",
      log.user_name || "",
      log.user_email || "",
      log.business_name || "",
      ACTION_LABELS[log.action]?.label || log.action,
      log.ip_address || "",
      JSON.stringify(log.details || {}),
    ]);

    const csvContent = [headers.join(","), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-trail-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
            <p className="text-muted-foreground">
              Track all user actions and system events
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchLogs()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <ExportDropdown
              options={{
                title: "Audit Trail Export",
                columns: AUDIT_LOG_COLUMNS,
                data: logs.map((log) => ({
                  ...log,
                  created_at_formatted: log.created_at
                    ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")
                    : "",
                  action_label: ACTION_LABELS[log.action]?.label || log.action,
                  details_str: JSON.stringify(log.details || {}),
                })),
                filename: `audit-trail-${format(new Date(), "yyyy-MM-dd")}`,
                subtitle: `Total: ${totalCount} records`,
              }}
              disabled={logs.length === 0}
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter audit logs by user, business, action type, or date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* User Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">User</label>
                <Select
                  value={filters.userId}
                  onValueChange={(value) => {
                    setFilters((prev) => ({ ...prev, userId: value === "all" ? "" : value }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Business Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Business</label>
                <Select
                  value={filters.businessId}
                  onValueChange={(value) => {
                    setFilters((prev) => ({ ...prev, businessId: value === "all" ? "" : value }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All businesses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All businesses</SelectItem>
                    {businesses.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <Select
                  value={filters.actionType}
                  onValueChange={(value) => {
                    setFilters((prev) => ({ ...prev, actionType: value === "all" ? "" : value }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.startDate ? format(filters.startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.startDate}
                      onSelect={(date) => {
                        setFilters((prev) => ({ ...prev, startDate: date }));
                        setCurrentPage(1);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.endDate ? format(filters.endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.endDate}
                      onSelect={(date) => {
                        setFilters((prev) => ({ ...prev, endDate: date }));
                        setCurrentPage(1);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Logs
              </CardTitle>
              <Badge variant="secondary">{totalCount} records</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No audit logs found</h3>
                <p className="mt-2 text-muted-foreground">
                  Try adjusting your filters to find what you're looking for.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {log.created_at
                              ? format(new Date(log.created_at), "MMM dd, yyyy HH:mm")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.user_name || "-"}</div>
                              <div className="text-sm text-muted-foreground">
                                {log.user_email || ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{log.business_name || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                ACTION_LABELS[log.action]?.color || "bg-gray-100 text-gray-800"
                              }
                            >
                              {ACTION_LABELS[log.action]?.label || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || "-"}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  View Details
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="end">
                                <pre className="text-xs overflow-auto max-h-60 bg-muted p-2 rounded">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                href="#"
                                isActive={currentPage === pageNum}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={
                              currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
