import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Building, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUGX } from "@/lib/incomeCalculations";

interface BusinessWithIncome {
  id: string;
  name: string;
  totalIncome: number;
  entryCount: number;
}

export default function IncomeList() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [businesses, setBusinesses] = useState<BusinessWithIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBusinessesWithIncome() {
      if (!user) return;

      setIsLoading(true);
      try {
        // Fetch businesses
        let query = supabase
          .from("businesses")
          .select("id, name")
          .eq("is_deleted", false);

        if (!isAdmin) {
          query = query.eq("owner_id", user.id);
        }

        const { data: businessData, error: bizError } = await query;
        if (bizError) throw bizError;

        // Fetch income totals for each business
        const businessesWithIncome: BusinessWithIncome[] = [];

        for (const biz of businessData || []) {
          const { data: incomeData, error: incomeError } = await supabase
            .from("income")
            .select("amount")
            .eq("business_id", biz.id);

          if (!incomeError) {
            const totalIncome = (incomeData || []).reduce(
              (sum, e) => sum + Number(e.amount),
              0
            );
            businessesWithIncome.push({
              id: biz.id,
              name: biz.name,
              totalIncome,
              entryCount: incomeData?.length || 0,
            });
          }
        }

        setBusinesses(businessesWithIncome);
      } catch (error) {
        console.error("Failed to load businesses:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBusinessesWithIncome();
  }, [user, isAdmin]);

  const totalIncome = businesses.reduce((sum, b) => sum + b.totalIncome, 0);
  const totalEntries = businesses.reduce((sum, b) => sum + b.entryCount, 0);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Income
            </h1>
            <p className="text-muted-foreground">
              Track and manage income across your businesses
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-bold text-green-600 break-all">
                {formatUGX(totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{totalEntries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Businesses</p>
              <p className="text-2xl font-bold">{businesses.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Business List */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No businesses found. Create a business to start tracking income.
              </p>
              <Button onClick={() => navigate("/businesses/new")}>
                Create Business
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Card
                key={business.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/businesses/${business.id}/income`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="truncate">{business.name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Income
                      </span>
                      <span className="font-semibold text-green-600">
                        {formatUGX(business.totalIncome)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Entries
                      </span>
                      <Badge variant="secondary">{business.entryCount}</Badge>
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
