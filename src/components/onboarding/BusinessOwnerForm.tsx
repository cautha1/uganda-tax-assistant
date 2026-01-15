import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, Phone, CreditCard, AlertCircle } from "lucide-react";
import { validateNIN, validateUgandaPhone, getNINError, getPhoneError } from "@/lib/tinValidation";

export interface OwnerFormData {
  ownerName: string;
  ownerNin: string;
  ownerEmail: string;
  ownerPhone: string;
}

interface BusinessOwnerFormProps {
  data: OwnerFormData;
  onChange: (data: OwnerFormData) => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function BusinessOwnerForm({ data, onChange, onNext, isLoading }: BusinessOwnerFormProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: keyof OwnerFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  const errors = {
    ownerName: !data.ownerName ? "Owner name is required" : null,
    ownerNin: touched.ownerNin ? getNINError(data.ownerNin) : null,
    ownerEmail: !data.ownerEmail 
      ? "Email is required" 
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail) 
        ? "Enter a valid email address" 
        : null,
    ownerPhone: touched.ownerPhone ? getPhoneError(data.ownerPhone) : null,
  };

  const isValid = 
    data.ownerName && 
    data.ownerEmail && 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.ownerEmail) &&
    validateNIN(data.ownerNin) && 
    validateUgandaPhone(data.ownerPhone);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Business Owner Identification
        </CardTitle>
        <CardDescription>
          Please provide your personal details as the business owner. This information will be used for tax registration and compliance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All fields are required for URA tax registration. Ensure your NIN matches your National ID exactly.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ownerName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name (as on National ID)
            </Label>
            <Input
              id="ownerName"
              placeholder="Enter your full name"
              value={data.ownerName}
              onChange={(e) => handleChange("ownerName", e.target.value)}
              onBlur={() => handleBlur("ownerName")}
              className={touched.ownerName && errors.ownerName ? "border-destructive" : ""}
            />
            {touched.ownerName && errors.ownerName && (
              <p className="text-sm text-destructive">{errors.ownerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerNin" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              National ID Number (NIN)
            </Label>
            <Input
              id="ownerNin"
              placeholder="e.g., CM12345678ABCD"
              value={data.ownerNin}
              onChange={(e) => handleChange("ownerNin", e.target.value.toUpperCase())}
              onBlur={() => handleBlur("ownerNin")}
              className={touched.ownerNin && errors.ownerNin ? "border-destructive" : ""}
              maxLength={14}
            />
            {touched.ownerNin && errors.ownerNin && (
              <p className="text-sm text-destructive">{errors.ownerNin}</p>
            )}
            <p className="text-xs text-muted-foreground">Format: CM followed by 12 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="ownerEmail"
              type="email"
              placeholder="your.email@example.com"
              value={data.ownerEmail}
              onChange={(e) => handleChange("ownerEmail", e.target.value)}
              onBlur={() => handleBlur("ownerEmail")}
              className={touched.ownerEmail && errors.ownerEmail ? "border-destructive" : ""}
            />
            {touched.ownerEmail && errors.ownerEmail && (
              <p className="text-sm text-destructive">{errors.ownerEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPhone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="ownerPhone"
              placeholder="+256 7XX XXX XXX"
              value={data.ownerPhone}
              onChange={(e) => handleChange("ownerPhone", e.target.value)}
              onBlur={() => handleBlur("ownerPhone")}
              className={touched.ownerPhone && errors.ownerPhone ? "border-destructive" : ""}
            />
            {touched.ownerPhone && errors.ownerPhone && (
              <p className="text-sm text-destructive">{errors.ownerPhone}</p>
            )}
            <p className="text-xs text-muted-foreground">Uganda format: +256... or 0...</p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onNext} disabled={!isValid || isLoading}>
            Continue to Business Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
