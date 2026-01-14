import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Save, FileDown, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTaxForm } from "@/hooks/useTaxForm";
import { TaxType, TaxFormData, formatUGX } from "@/lib/taxCalculations";
import { PAYEForm } from "./forms/PAYEForm";
import { IncomeTaxForm } from "./forms/IncomeTaxForm";
import { PresumptiveTaxForm } from "./forms/PresumptiveTaxForm";
import { VATForm } from "./forms/VATForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const TAX_TYPE_LABELS: Record<TaxType, string> = {
  paye: "PAYE (Pay As You Earn)",
  income: "Income Tax",
  presumptive: "Presumptive Tax",
  vat: "Value Added Tax (VAT)",
  other: "Other Tax",
};

const STEPS = ["Select Tax Type", "Fill Details", "Review & Validate", "Submit"];

interface Business {
  id: string;
  name: string;
  tin: string;
  address: string | null;
  tax_types: TaxType[];
}

export default function TaxFormWizard() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState(0);
  const [business, setBusiness] = useState<Business | null>(null);
  const [selectedTaxType, setSelectedTaxType] = useState<TaxType | null>(null);
  const [formData, setFormData] = useState<TaxFormData | null>(null);
  const [formId, setFormId] = useState<string | null>(null);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);

  const {
    isLoading,
    validationErrors,
    calculatedTax,
    validate,
    calculateTax,
    saveDraft,
    submitForm,
    generateAndDownload,
  } = useTaxForm({
    businessId: businessId!,
    taxType: selectedTaxType || "other",
    onSuccess: (id) => setFormId(id),
  });

  useEffect(() => {
    async function fetchBusiness() {
      if (!businessId) return;

      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, tin, address, tax_types")
        .eq("id", businessId)
        .single();

      if (error) {
        console.error("Error fetching business:", error);
        navigate("/businesses");
        return;
      }

      setBusiness(data as Business);
      setIsLoadingBusiness(false);
    }

    fetchBusiness();
  }, [businessId, navigate]);

  const handleTaxTypeSelect = (taxType: TaxType) => {
    setSelectedTaxType(taxType);
    setStep(1);
  };

  const handleFormChange = (data: TaxFormData) => {
    setFormData(data);
    calculateTax(data);
  };

  const handleSaveDraft = async () => {
    if (!formData) return;
    await saveDraft(formData);
  };

  const handleValidate = () => {
    if (!formData) return;
    const errors = validate(formData);
    if (errors.length === 0) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!formData || !formId) return;
    const success = await submitForm(formId, formData);
    if (success) {
      setStep(3);
    }
  };

  const handleDownload = () => {
    if (!formData || !business) return;
    generateAndDownload(formData, {
      name: business.name,
      tin: business.tin,
      address: business.address,
    });
  };

  if (isLoadingBusiness) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={`/businesses/${businessId}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {business.name}
          </Link>
          <h1 className="text-2xl font-display font-bold">Tax Filing Wizard</h1>
          <p className="text-muted-foreground mt-1">
            File tax returns for {business.name} (TIN: {business.tin})
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((stepLabel, index) => (
              <div key={stepLabel} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index < step
                      ? "bg-success text-success-foreground"
                      : index === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < step ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </div>
                <span
                  className={`ml-2 text-sm hidden sm:inline ${
                    index === step ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  {stepLabel}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-24 h-0.5 mx-2 ${
                      index < step ? "bg-success" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Tax Type</CardTitle>
              <CardDescription>
                Choose the type of tax return you want to file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["paye", "income", "presumptive", "vat"] as TaxType[]).map((taxType) => (
                  <button
                    key={taxType}
                    onClick={() => handleTaxTypeSelect(taxType)}
                    className="card-interactive p-6 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{TAX_TYPE_LABELS[taxType]}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getDescription(taxType)}
                        </p>
                      </div>
                      {business.tax_types?.includes(taxType) && (
                        <Badge variant="secondary" className="ml-2">
                          Registered
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && selectedTaxType && (
          <Card>
            <CardHeader>
              <CardTitle>{TAX_TYPE_LABELS[selectedTaxType]} Return</CardTitle>
              <CardDescription>
                Fill in the required information for your tax return
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTaxType === "paye" && (
                <PAYEForm onChange={handleFormChange} errors={validationErrors} />
              )}
              {selectedTaxType === "income" && (
                <IncomeTaxForm onChange={handleFormChange} errors={validationErrors} />
              )}
              {selectedTaxType === "presumptive" && (
                <PresumptiveTaxForm
                  onChange={handleFormChange}
                  errors={validationErrors}
                  businessTurnover={0}
                />
              )}
              {selectedTaxType === "vat" && (
                <VATForm onChange={handleFormChange} errors={validationErrors} />
              )}

              {/* Calculated Tax Preview */}
              {formData && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estimated Tax</span>
                    <span className="text-xl font-bold text-primary">
                      {formatUGX(calculatedTax)}
                    </span>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Validation Errors</p>
                      <ul className="mt-1 text-sm text-destructive/80">
                        {validationErrors.map((error, index) => (
                          <li key={index}>• {error.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading || !formData}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button onClick={handleValidate} disabled={isLoading || !formData}>
                  Validate & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && selectedTaxType && formData && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Submit</CardTitle>
              <CardDescription>
                Review your tax return details before submitting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary */}
                <div className="form-section">
                  <h3 className="font-semibold mb-4">Tax Return Summary</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm text-muted-foreground">Tax Type</dt>
                      <dd className="font-medium">{TAX_TYPE_LABELS[selectedTaxType]}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Business</dt>
                      <dd className="font-medium">{business.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">TIN</dt>
                      <dd className="font-medium">{business.tin}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Tax Amount</dt>
                      <dd className="font-bold text-primary text-lg">{formatUGX(calculatedTax)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Validation Status */}
                <div className="flex items-center gap-2 p-4 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-medium text-success">All validations passed</span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={handleDownload}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Return
                  </Button>
                  <Button onClick={handleSubmit} disabled={isLoading}>
                    <Send className="mr-2 h-4 w-4" />
                    {isLoading ? "Submitting..." : "Submit to URA"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">Successfully Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your {selectedTaxType ? TAX_TYPE_LABELS[selectedTaxType] : "tax"} return has been
                submitted to URA.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={handleDownload}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download Copy
                </Button>
                <Button onClick={() => navigate(`/businesses/${businessId}`)}>
                  Back to Business
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

function getDescription(taxType: TaxType): string {
  switch (taxType) {
    case "paye":
      return "Monthly employee tax deductions";
    case "income":
      return "Annual income tax return";
    case "presumptive":
      return "Simplified tax for small businesses";
    case "vat":
      return "Monthly VAT return";
    default:
      return "Other tax obligations";
  }
}
