import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, Building2, Key, CheckCircle2, AlertCircle, 
  Mail, Phone, CreditCard, MapPin, DollarSign, FileText,
  Loader2
} from "lucide-react";
import { OwnerFormData } from "./BusinessOwnerForm";
import { BusinessFormData } from "./BusinessDetailsForm";
import { TINFormData } from "./TINInput";
import { formatTIN, formatNIN, formatPhone } from "@/lib/tinValidation";
import { useState } from "react";

interface ReviewStepProps {
  ownerData: OwnerFormData;
  businessData: BusinessFormData;
  tinData: TINFormData;
  onSubmit: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const businessTypeLabels: Record<string, string> = {
  sole_proprietorship: "Sole Proprietorship",
  partnership: "Partnership",
  private_limited: "Private Limited Company",
  public_limited: "Public Limited Company",
  ngo: "NGO/Non-Profit",
};

const taxTypeLabels: Record<string, string> = {
  income_tax: "Income Tax",
  vat: "VAT",
  paye: "PAYE",
  withholding_tax: "Withholding Tax",
  presumptive_tax: "Presumptive Tax",
};

export function ReviewStep({ 
  ownerData, 
  businessData, 
  tinData, 
  onSubmit, 
  onBack,
  isLoading 
}: ReviewStepProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  const formatCurrency = (value: string) => {
    if (!value) return "Not specified";
    const num = parseInt(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Review Your Information
          </CardTitle>
          <CardDescription>
            Please review all the information you've provided before submitting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Owner Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Owner Information
            </h4>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{ownerData.ownerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> NIN
                </p>
                <p className="font-medium font-mono">{formatNIN(ownerData.ownerNin)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="font-medium">{ownerData.ownerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </p>
                <p className="font-medium">{formatPhone(ownerData.ownerPhone)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Business Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Information
            </h4>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{businessData.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Type</p>
                <p className="font-medium">
                  {businessTypeLabels[businessData.businessType] || businessData.businessType}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Address
                </p>
                <p className="font-medium">{businessData.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Annual Turnover
                </p>
                <p className="font-medium">{formatCurrency(businessData.annualTurnover)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registration Status</p>
                <Badge variant={businessData.isInformal ? "destructive" : "default"}>
                  {businessData.isInformal ? "Informal" : "Registered"}
                </Badge>
              </div>
              {businessData.taxTypes && businessData.taxTypes.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <FileText className="h-3 w-3" /> Tax Types
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {businessData.taxTypes.map((tax) => (
                      <Badge key={tax} variant="secondary">
                        {taxTypeLabels[tax] || tax}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* TIN Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Key className="h-4 w-4" />
              TIN & URA Information
            </h4>
            <div className="p-4 rounded-lg bg-muted/50">
              {tinData.hasTin ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">TIN</p>
                    <p className="font-medium font-mono">{formatTIN(tinData.tin)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">URA Password</p>
                    <p className="font-medium">••••••••</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">
                    TIN not provided - You'll need to register for a TIN to file taxes.
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Terms and Conditions */}
          <div className="p-4 rounded-lg border">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="terms" className="cursor-pointer">
                  I confirm that all information provided is accurate
                </Label>
                <p className="text-sm text-muted-foreground">
                  By checking this box, you confirm that the information provided is true and accurate 
                  to the best of your knowledge. False information may result in penalties under 
                  Uganda tax laws.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={!termsAccepted || isLoading}
          className="min-w-[150px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
