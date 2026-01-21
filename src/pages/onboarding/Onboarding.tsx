import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { ProfileSearch } from "@/components/onboarding/ProfileSearch";
import { BusinessOwnerForm, OwnerFormData } from "@/components/onboarding/BusinessOwnerForm";
import { BusinessDetailsForm, BusinessFormData } from "@/components/onboarding/BusinessDetailsForm";
import { TINInput, TINFormData } from "@/components/onboarding/TINInput";
import { ReviewStep } from "@/components/onboarding/ReviewStep";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Building2 } from "lucide-react";
import { PageLoader } from "@/components/ui/LoadingSpinner";

const STEPS = ["Search", "Owner", "Business", "TIN", "Review"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);

  const [ownerData, setOwnerData] = useState<OwnerFormData>({
    ownerName: "",
    ownerNin: "",
    ownerEmail: user?.email || "",
    ownerPhone: "",
  });

  const [businessData, setBusinessData] = useState<BusinessFormData>({
    businessName: "",
    businessType: "",
    address: "",
    annualTurnover: "",
    taxTypes: [],
    isInformal: false,
    informalAcknowledged: false,
  });

  const [tinData, setTinData] = useState<TINFormData>({
    hasTin: false,
    tin: "",
    applyLater: false,
  });

  useEffect(() => {
    if (user?.email && !ownerData.ownerEmail) {
      setOwnerData((prev) => ({ ...prev, ownerEmail: user.email || "" }));
    }
  }, [user]);

  const handleProfileFound = (profile: any) => {
    setOwnerData({
      ownerName: profile.name || "",
      ownerNin: profile.nin || "",
      ownerEmail: profile.email || user?.email || "",
      ownerPhone: profile.phone || "",
    });
    setCurrentStep(1);
    toast({
      title: "Profile found",
      description: "Your information has been pre-filled. Please verify and continue.",
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check for duplicate TIN before creating business
      if (tinData.hasTin && tinData.tin) {
        const { data: existing } = await supabase
          .from("businesses")
          .select("id")
          .eq("tin", tinData.tin)
          .maybeSingle();

        if (existing) {
          toast({
            title: "TIN Already Registered",
            description: "This TIN is already associated with another business.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Create the business with all onboarding data
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .insert({
          name: businessData.businessName,
          tin: tinData.hasTin ? tinData.tin : null,
          address: businessData.address,
          business_type: businessData.businessType as any,
          annual_turnover: businessData.annualTurnover ? parseFloat(businessData.annualTurnover) : null,
          tax_types: businessData.taxTypes as any[],
          is_informal: businessData.isInformal,
          owner_id: user.id,
          owner_name: ownerData.ownerName,
          owner_nin: ownerData.ownerNin,
          owner_phone: ownerData.ownerPhone,
          owner_email: ownerData.ownerEmail,
          tin_verified: false,
          onboarding_completed: true,
          informal_acknowledged: businessData.informalAcknowledged,
        })
        .select()
        .single();

      if (businessError) throw businessError;

      // Update the user's profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: ownerData.ownerName,
          nin: ownerData.ownerNin,
          phone: ownerData.ownerPhone,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Log the onboarding completion
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "business_onboarding_completed",
        business_id: business.id,
        details: {
          business_name: businessData.businessName,
          has_tin: tinData.hasTin,
          is_informal: businessData.isInformal,
        },
      });

      setCreatedBusinessId(business.id);
      setIsComplete(true);

      toast({
        title: "Setup complete!",
        description: "Your business has been registered successfully.",
      });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        title: "Setup failed",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <PageLoader />;
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Setup Complete!</CardTitle>
            <CardDescription>
              Your business has been registered successfully. You can now start managing your tax filings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate(createdBusinessId ? `/businesses/${createdBusinessId}` : "/dashboard")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Go to Business Dashboard
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/businesses/new")}
            >
              Register Another Business
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Complete Your Business Setup</h1>
          <p className="text-muted-foreground mt-2">
            Let's get your business registered for tax compliance in Uganda
          </p>
        </div>

        <OnboardingProgress currentStep={currentStep} steps={STEPS} />

        <div className="mt-8">
          {currentStep === 0 && (
            <ProfileSearch
              onProfileFound={handleProfileFound}
              onSkip={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 1 && (
            <BusinessOwnerForm
              data={ownerData}
              onChange={setOwnerData}
              onNext={() => setCurrentStep(2)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 2 && (
            <BusinessDetailsForm
              data={businessData}
              onChange={setBusinessData}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 3 && (
            <TINInput
              data={tinData}
              onChange={setTinData}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
              isLoading={isLoading}
            />
          )}

          {currentStep === 4 && (
            <ReviewStep
              ownerData={ownerData}
              businessData={businessData}
              tinData={tinData}
              onSubmit={handleSubmit}
              onBack={() => setCurrentStep(3)}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
