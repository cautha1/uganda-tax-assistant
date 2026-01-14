import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Building2, Plus, Search, ArrowRight } from "lucide-react";

interface Business {
  id: string;
  name: string;
  tin: string;
  business_type: string;
  address: string | null;
  created_at: string;
}

export default function BusinessesList() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (!error && data) setBusinesses(data);
    setIsLoading(false);
  };

  const filtered = businesses.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.tin.includes(searchQuery)
  );

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Businesses</h1>
            <p className="text-muted-foreground">Manage your registered businesses</p>
          </div>
          <Button asChild>
            <Link to="/businesses/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Business
            </Link>
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or TIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="card-elevated flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No businesses found</h3>
            <p className="text-sm text-muted-foreground mb-4">Get started by adding your first business</p>
            <Button asChild><Link to="/businesses/new"><Plus className="h-4 w-4 mr-2" />Add Business</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((business) => (
              <Link key={business.id} to={`/businesses/${business.id}`} className="card-interactive p-6 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-semibold mb-1">{business.name}</h3>
                <p className="text-sm text-muted-foreground">TIN: {business.tin}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{business.business_type.replace("_", " ")}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
