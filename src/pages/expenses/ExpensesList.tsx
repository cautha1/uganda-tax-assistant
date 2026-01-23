import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Receipt,
  Building2,
  Search,
  TrendingUp,
  ArrowRight,
  Calendar,
} from "lucide-react";
import {
  formatUGX,
  formatTaxPeriod,
  getCurrentTaxPeriod,
  type Expense,
} from "@/lib/expenseCalculations";

interface BusinessWithExpenses {
  id: string;
  name: string;
  tin: string;
  totalExpenses: number;
  expenseCount: number;
  currentMonthExpenses: number;
  lastExpenseDate: string | null;
}

export default function ExpensesList() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const [businesses, setBusinesses] = useState<BusinessWithExpenses[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        // Fetch businesses
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("id, name, tin")
          .eq("is_deleted", false)
          .order("name");

        if (businessError) throw businessError;

        // Fetch all expenses for these businesses
        const businessIds = businessData?.map((b) => b.id) || [];
        const { data: expenseData, error: expenseError } = await supabase
          .from("expenses")
          .select("id, business_id, amount, expense_date, tax_period")
          .in("business_id", businessIds);

        if (expenseError) throw expenseError;

        // Calculate stats for each business
        const currentPeriod = getCurrentTaxPeriod();
        const businessesWithExpenses: BusinessWithExpenses[] = (businessData || []).map(
          (business) => {
            const businessExpenses = (expenseData || []).filter(
              (e) => e.business_id === business.id
            );
            const totalExpenses = businessExpenses.reduce(
              (sum, e) => sum + Number(e.amount),
              0
            );
            const currentMonthExpenses = businessExpenses
              .filter((e) => e.tax_period === currentPeriod)
              .reduce((sum, e) => sum + Number(e.amount), 0);
            const lastExpense = businessExpenses.sort(
              (a, b) =>
                new Date(b.expense_date).getTime() -
                new Date(a.expense_date).getTime()
            )[0];

            return {
              ...business,
              totalExpenses,
              expenseCount: businessExpenses.length,
              currentMonthExpenses,
              lastExpenseDate: lastExpense?.expense_date || null,
            };
          }
        );

        setBusinesses(businessesWithExpenses);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load data";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, toast]);

  const filteredBusinesses = useMemo(() => {
    if (!searchQuery) return businesses;
    const query = searchQuery.toLowerCase();
    return businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.tin.toLowerCase().includes(query)
    );
  }, [businesses, searchQuery]);

  const totalAllExpenses = businesses.reduce(
    (sum, b) => sum + b.totalExpenses,
    0
  );
  const totalCurrentMonth = businesses.reduce(
    (sum, b) => sum + b.currentMonthExpenses,
    0
  );
  const totalExpenseCount = businesses.reduce(
    (sum, b) => sum + b.expenseCount,
    0
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Business Expenses
            </h1>
            <p className="text-muted-foreground">
              Track and manage expenses across all your businesses
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatUGX(totalAllExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalExpenseCount} total entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {formatTaxPeriod(getCurrentTaxPeriod())}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatUGX(totalCurrentMonth)}
              </div>
              <p className="text-xs text-muted-foreground">Current month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Businesses</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{businesses.length}</div>
              <p className="text-xs text-muted-foreground">
                With expense tracking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Business List */}
        {filteredBusinesses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No businesses found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {businesses.length === 0
                  ? "Create a business to start tracking expenses."
                  : "No businesses match your search."}
              </p>
              {businesses.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate("/businesses/new")}
                >
                  Create Business
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBusinesses.map((business) => (
              <Card
                key={business.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/businesses/${business.id}/expenses`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">
                        {business.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        TIN: {business.tin}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Expenses
                      </span>
                      <span className="font-semibold">
                        {formatUGX(business.totalExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        This Month
                      </span>
                      <span className="font-medium text-primary">
                        {formatUGX(business.currentMonthExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {business.expenseCount} expense
                        {business.expenseCount !== 1 ? "s" : ""}
                      </span>
                      {business.lastExpenseDate && (
                        <span className="text-muted-foreground">
                          Last:{" "}
                          {new Date(business.lastExpenseDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
