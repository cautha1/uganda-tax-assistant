import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAccountantPermissions } from "@/hooks/useAccountantPermissions";
import { useTaxForm } from "@/hooks/useTaxForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  ArrowLeft, 
  Save, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  MessageSquare,
  History,
  ShieldCheck,
  Download,
  Building2,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { 
  TaxType, 
  TaxFormData, 
  formatUGX, 
  PAYEFormData, 
  IncomeTaxFormData, 
  PresumptiveTaxFormData, 
  VATFormData 
} from "@/lib/taxCalculations";
import { PAYEForm } from "@/components/tax/forms/PAYEForm";
import { IncomeTaxForm } from "@/components/tax/forms/IncomeTaxForm";
import { PresumptiveTaxForm } from "@/components/tax/forms/PresumptiveTaxForm";
import { VATForm } from "@/components/tax/forms/VATForm";
import { TaxFormComments } from "@/components/tax/TaxFormComments";
import { TaxFormVersions } from "@/components/tax/TaxFormVersions";
import { ComplianceChecks } from "@/components/tax/ComplianceChecks";
import { differenceInDays, format } from "date-fns";
import { Json } from "@/integrations/supabase/types";

interface TaxFormRecord {
  id: string;
  business_id: string;
  tax_type: TaxType;
  tax_period: string;
  status: string;
  form_data: TaxFormData;
  calculated_tax: number;
  validation_errors: { field: string; message: string }[] | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  due_date: string | null;
  risk_level: string | null;
  ready_for_submission: boolean;
  ready_marked_at: string | null;
}

interface Business {
  id: string;
  name: string;
  tin: string;
  address: string | null;
}

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  paye: "PAYE",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "VAT",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  draft: { icon: <Clock className="h-4 w-4" />, color: "bg-amber-100 text-amber-700", label: "Draft" },
  validated: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-blue-100 text-blue-700", label: "Validated" },
  error: { icon: <AlertCircle className="h-4 w-4" />, color: "bg-destructive/10 text-destructive", label: "Errors" },
  submitted: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-700", label: "Submitted" },
};

export default function TaxFormDetail() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  
  const [taxForm, setTaxForm] = useState<TaxFormRecord | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<TaxFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("form");

  const { permissions, isOwner, isAdmin, canSubmit, isLoading: permissionsLoading } = 
    useAccountantPermissions(business?.id || "");

  const taxFormHook = useTaxForm({
    businessId: business?.id || "",
    taxType: taxForm?.tax_type || "paye",
  });

  const canEdit = isOwner || isAdmin || (permissions?.can_edit ?? false);
  const isReadOnly = taxForm?.status === "submitted" || !canEdit;

  useEffect(() => {
    if (formId) {
      fetchTaxForm();
    }
  }, [formId]);

  async function fetchTaxForm() {
    setIsLoading(true);

    const { data: formData, error: formError } = await supabase
      .from("tax_forms")
      .select("*")
      .eq("id", formId)
      .single();

    if (formError || !formData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tax form not found",
      });
      navigate("/dashboard");
      return;
    }

    // Fetch business details
    const { data: businessData } = await supabase
      .from("businesses")
      .select("id, name, tin, address")
      .eq("id", formData.business_id)
      .single();

    const taxFormRecord: TaxFormRecord = {
      ...formData,
      tax_type: formData.tax_type as TaxType,
      form_data: formData.form_data as unknown as TaxFormData,
      validation_errors: formData.validation_errors as { field: string; message: string }[] | null,
    };

    setTaxForm(taxFormRecord);
    setBusiness(businessData as Business);
    setFormData(taxFormRecord.form_data as TaxFormData);
    setIsLoading(false);
  }

  const handleFormChange = useCallback((data: TaxFormData) => {
    setFormData(data);
  }, []);

  async function handleSave() {
    if (!formId || !formData || !user || !taxForm) return;

    setIsSaving(true);

    // Create version before updating
    const { data: existingVersions } = await supabase
      .from("tax_form_versions")
      .select("version_number")
      .eq("tax_form_id", formId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

    await supabase.from("tax_form_versions").insert({
      tax_form_id: formId,
      version_number: nextVersion,
      form_data: taxForm.form_data as unknown as Json,
      calculated_tax: taxForm.calculated_tax,
      changed_by: user.id,
      change_summary: "Manual save",
    });

    // Update form
    const success = await taxFormHook.updateForm(formId, formData);
    
    if (success) {
      fetchTaxForm();
    }

    setIsSaving(false);
  }

  async function handleMarkReady() {
    if (!formId) return;
    
    const success = await taxFormHook.markReadyForSubmission(formId, !taxForm?.ready_for_submission);
    if (success) {
      fetchTaxForm();
    }
  }

  async function handleSubmit() {
    if (!formId || !formData) return;
    
    const success = await taxFormHook.submitForm(formId, formData);
    if (success) {
      fetchTaxForm();
    }
  }

  function handleRestoreVersion(restoredData: Record<string, unknown>) {
    setFormData(restoredData as unknown as TaxFormData);
    toast({
      title: "Version restored",
      description: "Form data has been restored. Click Save to apply changes.",
    });
  }

  function getDaysUntilDue(): { days: number; urgent: boolean } | null {
    if (!taxForm?.due_date) return null;
    const days = differenceInDays(new Date(taxForm.due_date), new Date());
    return { days, urgent: days <= 7 };
  }

  if (isLoading || permissionsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!taxForm || !business || !formData) return null;

  const statusConfig = STATUS_CONFIG[taxForm.status] || STATUS_CONFIG.draft;
  const dueInfo = getDaysUntilDue();

  const renderForm = () => {
    switch (taxForm.tax_type) {
      case "paye":
        return (
          <PAYEForm
            onChange={handleFormChange}
            errors={taxFormHook.validationErrors}
            initialData={formData as PAYEFormData}
          />
        );
      case "income":
        return (
          <IncomeTaxForm
            onChange={handleFormChange}
            errors={taxFormHook.validationErrors}
            initialData={formData as IncomeTaxFormData}
          />
        );
      case "presumptive":
        return (
          <PresumptiveTaxForm
            onChange={handleFormChange}
            errors={taxFormHook.validationErrors}
            initialData={formData as PresumptiveTaxFormData}
            businessTurnover={0}
          />
        );
      case "vat":
        return (
          <VATForm
            onChange={handleFormChange}
            errors={taxFormHook.validationErrors}
            initialData={formData as VATFormData}
          />
        );
      default:
        return <p>Unsupported tax type</p>;
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-6xl py-8">
        {/* Back Link */}
        <Link
          to={`/businesses/${business.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {business.name}
        </Link>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-display font-bold">
                {TAX_TYPE_LABELS[taxForm.tax_type]} Return
              </h1>
              <Badge className={statusConfig.color}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
              {taxForm.ready_for_submission && taxForm.status !== "submitted" && (
                <Badge variant="default">Ready for Submission</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {business.name}
              </span>
              <span>TIN: {business.tin}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {taxForm.tax_period}
              </span>
            </div>
            {dueInfo && (
              <p className={`text-sm mt-2 ${dueInfo.urgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                {dueInfo.days < 0
                  ? `⚠️ Overdue by ${Math.abs(dueInfo.days)} days`
                  : dueInfo.days === 0
                    ? "⚠️ Due today"
                    : `Due in ${dueInfo.days} days`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {!isReadOnly && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            )}
            
            {/* Mark Ready - for accountants */}
            {!isReadOnly && !canSubmit && taxForm.status !== "submitted" && (
              <Button
                variant={taxForm.ready_for_submission ? "secondary" : "outline"}
                onClick={handleMarkReady}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {taxForm.ready_for_submission ? "Marked Ready" : "Mark Ready for Owner"}
              </Button>
            )}

            {/* Submit - for owners/admins only */}
            {canSubmit && taxForm.status !== "submitted" && (
              <Button variant="default" onClick={handleSubmit}>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => taxFormHook.generateAndDownload(formData, business)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Read-only notice */}
        {isReadOnly && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-amber-800 dark:text-amber-200">
                  {taxForm.status === "submitted"
                    ? "This form has been submitted and cannot be edited."
                    : "You don't have permission to edit this form."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Section - Left */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="form" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Form
                </TabsTrigger>
                <TabsTrigger value="comments" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="form" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tax Form Details</CardTitle>
                    <CardDescription>
                      {isReadOnly
                        ? "View the tax form details below"
                        : "Fill in the required fields below"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <fieldset disabled={isReadOnly}>
                      {renderForm()}
                    </fieldset>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="mt-6">
                <TaxFormComments
                  taxFormId={taxForm.id}
                  canAdd={!isReadOnly || canSubmit}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <TaxFormVersions
                  taxFormId={taxForm.id}
                  onRestore={handleRestoreVersion}
                  canRestore={!isReadOnly}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Right */}
          <div className="space-y-6">
            {/* Estimated Tax */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estimated Tax</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">
                  {formatUGX(taxFormHook.calculatedTax || taxForm.calculated_tax)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on current form data
                </p>
              </CardContent>
            </Card>

            {/* Validation Errors */}
            {taxFormHook.validationErrors.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Validation Errors ({taxFormHook.validationErrors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {taxFormHook.validationErrors.map((error, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-destructive">•</span>
                        <span>{error.message}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Compliance Checks */}
            <ComplianceChecks
              taxFormId={taxForm.id}
              formData={formData}
              taxType={taxForm.tax_type}
            />

            {/* Form Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Form Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(taxForm.created_at), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(new Date(taxForm.updated_at), "PPP")}</span>
                </div>
                {taxForm.submitted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{format(new Date(taxForm.submitted_at), "PPP")}</span>
                  </div>
                )}
                {taxForm.risk_level && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Level</span>
                    <Badge
                      variant="outline"
                      className={
                        taxForm.risk_level === "high"
                          ? "text-destructive"
                          : taxForm.risk_level === "medium"
                            ? "text-amber-600"
                            : "text-green-600"
                      }
                    >
                      {taxForm.risk_level}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
