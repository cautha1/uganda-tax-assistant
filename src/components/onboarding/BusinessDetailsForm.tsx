import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, MapPin, DollarSign, FileText, AlertTriangle } from "lucide-react";
import { InformalBusinessModal } from "./InformalBusinessModal";
import { Constants } from "@/integrations/supabase/types";

export interface BusinessFormData {
  businessName: string;
  businessType: string;
  address: string;
  annualTurnover: string;
  taxTypes: string[];
  isInformal: boolean;
  informalAcknowledged: boolean;
}

// Valid enum values from database schema
const VALID_BUSINESS_TYPES = Constants.public.Enums.business_type;
const VALID_TAX_TYPES = Constants.public.Enums.tax_type;

// Zod schema for form validation against database enums
const businessFormSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200, "Business name must be less than 200 characters"),
  businessType: z.enum([...VALID_BUSINESS_TYPES] as [string, ...string[]], {
    errorMap: () => ({ message: "Please select a valid business type" }),
  }),
  address: z.string().trim().min(1, "Address is required").max(500, "Address must be less than 500 characters"),
  annualTurnover: z.string().optional(),
  taxTypes: z.array(z.enum([...VALID_TAX_TYPES] as [string, ...string[]])),
  isInformal: z.boolean(),
  informalAcknowledged: z.boolean(),
});

// Generate business type options from database enum
const businessTypes = VALID_BUSINESS_TYPES.map((type) => ({
  value: type,
  label: type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" "),
}));

// Generate tax type options from database enum
const taxTypeOptions = VALID_TAX_TYPES.map((type) => ({
  value: type,
  label: type === "vat" 
    ? "Value Added Tax (VAT)" 
    : type === "paye" 
    ? "PAYE (Employee Tax)" 
    : type
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
}));

interface BusinessDetailsFormProps {
  data: BusinessFormData;
  onChange: (data: BusinessFormData) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function BusinessDetailsForm({ data, onChange, onNext, onBack, isLoading }: BusinessDetailsFormProps) {
  const [showInformalModal, setShowInformalModal] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: keyof BusinessFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  const handleTaxTypeToggle = (taxType: string) => {
    const current = data.taxTypes || [];
    const updated = current.includes(taxType)
      ? current.filter((t) => t !== taxType)
      : [...current, taxType];
    handleChange("taxTypes", updated);
  };

  const handleInformalChange = (checked: boolean) => {
    if (checked) {
      setShowInformalModal(true);
    } else {
      handleChange("isInformal", false);
      handleChange("informalAcknowledged", false);
    }
  };

  const handleInformalAcknowledge = () => {
    handleChange("isInformal", true);
    handleChange("informalAcknowledged", true);
    setShowInformalModal(false);
  };

  const handleFormalize = () => {
    handleChange("isInformal", false);
    handleChange("informalAcknowledged", false);
    setShowInformalModal(false);
    window.open("https://ursb.go.ug/business-registration", "_blank");
  };

  // Validate form data using Zod schema
  const validationResult = businessFormSchema.safeParse(data);
  
  const errors: Record<string, string | null> = {
    businessName: null,
    businessType: null,
    address: null,
  };

  if (!validationResult.success) {
    validationResult.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (field in errors) {
        errors[field] = err.message;
      }
    });
  }

  const isValid = validationResult.success && 
    (!data.isInformal || data.informalAcknowledged);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Details
          </CardTitle>
          <CardDescription>
            Provide information about your business for tax registration purposes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Business Name
              </Label>
              <Input
                id="businessName"
                placeholder="Enter your business name"
                value={data.businessName}
                onChange={(e) => handleChange("businessName", e.target.value)}
                onBlur={() => handleBlur("businessName")}
                className={touched.businessName && errors.businessName ? "border-destructive" : ""}
              />
              {touched.businessName && errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Business Type
              </Label>
              <Select
                value={data.businessType}
                onValueChange={(value) => handleChange("businessType", value)}
              >
                <SelectTrigger className={touched.businessType && errors.businessType ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.businessType && errors.businessType && (
                <p className="text-sm text-destructive">{errors.businessType}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Business Address
              </Label>
              <Input
                id="address"
                placeholder="Enter your business address"
                value={data.address}
                onChange={(e) => handleChange("address", e.target.value)}
                onBlur={() => handleBlur("address")}
                className={touched.address && errors.address ? "border-destructive" : ""}
              />
              {touched.address && errors.address && (
                <p className="text-sm text-destructive">{errors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="annualTurnover" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Estimated Annual Turnover (UGX)
              </Label>
              <Input
                id="annualTurnover"
                type="number"
                placeholder="e.g., 50000000"
                value={data.annualTurnover}
                onChange={(e) => handleChange("annualTurnover", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This helps determine applicable tax types
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Applicable Tax Types
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {taxTypeOptions.map((tax) => (
                <div key={tax.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={tax.value}
                    checked={(data.taxTypes || []).includes(tax.value)}
                    onCheckedChange={() => handleTaxTypeToggle(tax.value)}
                  />
                  <Label htmlFor={tax.value} className="text-sm font-normal cursor-pointer">
                    {tax.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/50">
              <Checkbox
                id="isInformal"
                checked={data.isInformal}
                onCheckedChange={handleInformalChange}
              />
              <div className="space-y-1">
                <Label htmlFor="isInformal" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  This is an informal/unregistered business
                </Label>
                <p className="text-sm text-muted-foreground">
                  Check this if your business is not registered with URSB
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!isValid || isLoading}>
          Continue to TIN Setup
        </Button>
      </div>

      <InformalBusinessModal
        open={showInformalModal}
        onOpenChange={setShowInformalModal}
        onAcknowledge={handleInformalAcknowledge}
        onFormalize={handleFormalize}
      />
    </>
  );
}
