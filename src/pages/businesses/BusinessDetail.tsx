import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ArrowLeft, Plus, FileText, Building2, Receipt, Pencil } from "lucide-react";
import { formatUGX } from "@/lib/taxCalculations";
import { AccountantManagement } from "@/components/business/AccountantManagement";
import { EditBusinessDialog } from "@/components/business/EditBusinessDialog";
import { useAuth } from "@/lib/auth";

interface Business {
  id: string;
  name: string;
  tin: string;
  address: string | null;
  business_type: string;
  turnover: number;
  tax_types: string[];
  is_informal: boolean;
  owner_id: string | null;
}

interface TaxForm {
  id: string;
  tax_type: string;
  tax_period: string;
  status: string;
  calculated_tax: number;
  created_at: string;
}

const TAX_TYPE_LABELS: Record<string, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
  other: "Other",
};

export default function BusinessDetail() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [taxForms, setTaxForms] = useState<TaxForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const isOwner = business?.owner_id === user?.id;
  const isAdmin = hasRole("admin");

  const fetchData = useCallback(async () => {
    if (!businessId) return;

    const [businessRes, formsRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", businessId).single(),
      supabase.from("tax_forms").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(10),
    ]);

    if (businessRes.error) {
      navigate("/businesses");
      return;
    }

    setBusiness(businessRes.data as Business);
    setTaxForms((formsRes.data || []) as TaxForm[]);
    setIsLoading(false);
  }, [businessId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!business) return null;

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <Link to="/businesses" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to businesses
        </Link>

        {/* Business Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              {business.name}
            </h1>
            <p className="text-muted-foreground mt-1">TIN: {business.tin || "Not registered"}</p>
          </div>
          <div className="flex gap-2">
            {(isOwner || isAdmin) && (
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            <Button asChild>
              <Link to={`/businesses/${businessId}/tax/new`}>
                <Plus className="mr-2 h-4 w-4" />
                File Tax Return
              </Link>
            </Button>
          </div>
        </div>

        {/* Edit Business Dialog */}
        <EditBusinessDialog
          business={business}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={fetchData}
        />

        {/* Business Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Business Type</dt>
                <dd className="font-medium capitalize">{business.business_type?.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Annual Turnover</dt>
                <dd className="font-medium">{formatUGX(business.turnover || 0)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Address</dt>
                <dd className="font-medium">{business.address || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Tax Types</dt>
                <dd className="flex gap-2 flex-wrap">
                  {business.tax_types?.map((t) => (
                    <Badge key={t} variant="secondary">{TAX_TYPE_LABELS[t] || t}</Badge>
                  ))}
                  {(!business.tax_types || business.tax_types.length === 0) && <span className="text-muted-foreground">None registered</span>}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Accountant Management */}
        <div className="mb-8">
          <AccountantManagement
            businessId={business.id}
            businessName={business.name}
            isOwner={isOwner}
            isAdmin={isAdmin}
          />
        </div>

        {/* Tax Forms */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Tax Returns
              </CardTitle>
              <CardDescription>Recent tax filings for this business</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {taxForms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No tax returns yet</h3>
                <p className="text-muted-foreground mb-4">Start filing your first tax return</p>
                <Button asChild>
                  <Link to={`/businesses/${businessId}/tax/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    File Tax Return
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {taxForms.map((form) => (
                  <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{TAX_TYPE_LABELS[form.tax_type]}</p>
                      <p className="text-sm text-muted-foreground">{form.tax_period}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={`status-${form.status}`}>{form.status}</Badge>
                      <p className="text-sm font-medium mt-1">{formatUGX(form.calculated_tax)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
