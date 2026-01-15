import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Shield, CheckCircle2, AlertCircle, Key, Lock, Loader2, BadgeCheck, XCircle } from "lucide-react";
import { validateTIN, getTINError, formatTIN } from "@/lib/tinValidation";
import { Switch } from "@/components/ui/switch";
import { TINGuide } from "./TINGuide";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export interface TINFormData {
  hasTin: boolean;
  tin: string;
  uraPassword: string;
  applyLater: boolean;
  verified?: boolean;
  verificationMessage?: string;
  taxpayerName?: string;
}

interface TINInputProps {
  data: TINFormData;
  onChange: (data: TINFormData) => void;
  onNext: () => void;
  onBack: () => void;
  ownerName?: string;
  businessName?: string;
  isLoading?: boolean;
}

interface VerificationResult {
  verified: boolean;
  taxpayerName?: string;
  businessType?: string;
  registrationDate?: string;
  status?: string;
  message?: string;
}

export function TINInput({ data, onChange, onNext, onBack, ownerName, businessName, isLoading }: TINInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleChange = (field: keyof TINFormData, value: any) => {
    // Reset verification when TIN changes
    if (field === 'tin') {
      onChange({ 
        ...data, 
        [field]: value, 
        verified: undefined, 
        verificationMessage: undefined,
        taxpayerName: undefined 
      });
    } else {
      onChange({ ...data, [field]: value });
    }
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  const verifyTIN = async () => {
    if (!validateTIN(data.tin)) {
      toast({
        title: "Invalid TIN",
        description: "Please enter a valid 10-digit TIN first.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const { data: result, error } = await supabase.functions.invoke<VerificationResult>('verify-tin', {
        body: {
          tin: data.tin,
          ownerName: ownerName,
          businessName: businessName,
        },
      });

      if (error) throw error;

      onChange({
        ...data,
        verified: result?.verified ?? false,
        verificationMessage: result?.message,
        taxpayerName: result?.taxpayerName,
      });

      if (result?.verified) {
        toast({
          title: "TIN Verified",
          description: result.message || "Your TIN has been verified successfully.",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: result?.message || "Unable to verify TIN. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('TIN verification error:', error);
      toast({
        title: "Verification Error",
        description: "Unable to connect to verification service. Please try again.",
        variant: "destructive",
      });
      onChange({
        ...data,
        verified: false,
        verificationMessage: "Verification service unavailable",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const tinError = touched.tin ? getTINError(data.tin) : null;
  const isTinValid = validateTIN(data.tin);

  const canProceed = data.hasTin 
    ? (isTinValid && data.uraPassword.length > 0) 
    : data.applyLater;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            TIN & URA Account Setup
          </CardTitle>
          <CardDescription>
            Link your existing TIN or learn how to obtain one from URA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
            <div className="space-y-0.5">
              <Label htmlFor="hasTin" className="text-base">Do you have a TIN?</Label>
              <p className="text-sm text-muted-foreground">
                A Taxpayer Identification Number from URA
              </p>
            </div>
            <Switch
              id="hasTin"
              checked={data.hasTin}
              onCheckedChange={(checked) => handleChange("hasTin", checked)}
            />
          </div>

          {data.hasTin ? (
            <div className="space-y-4">
              <Alert className="bg-primary/5 border-primary/20">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your TIN and URA password are encrypted and stored securely. We never share your credentials.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tin" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Taxpayer Identification Number (TIN)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="tin"
                        placeholder="1234567890"
                        value={data.tin}
                        onChange={(e) => handleChange("tin", e.target.value.replace(/\D/g, ""))}
                        onBlur={() => handleBlur("tin")}
                        className={
                          touched.tin && tinError 
                            ? "border-destructive" 
                            : data.verified === true 
                              ? "border-green-500 pr-10" 
                              : data.verified === false 
                                ? "border-amber-500 pr-10"
                                : isTinValid 
                                  ? "border-green-500" 
                                  : ""
                        }
                        maxLength={10}
                      />
                      {data.verified === true && (
                        <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                      )}
                      {data.verified === false && (
                        <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                      )}
                      {data.verified === undefined && isTinValid && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={verifyTIN}
                      disabled={!isTinValid || isVerifying}
                      className="shrink-0"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying
                        </>
                      ) : (
                        <>
                          <BadgeCheck className="h-4 w-4 mr-2" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                  {touched.tin && tinError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {tinError}
                    </p>
                  )}
                  {isTinValid && !data.verified && data.verified !== false && (
                    <p className="text-sm text-green-600">
                      Formatted: {formatTIN(data.tin)}
                    </p>
                  )}
                  
                  {/* Verification Status */}
                  {data.verified === true && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                      {data.taxpayerName && (
                        <p className="text-sm text-green-700">
                          <strong>Taxpayer:</strong> {data.taxpayerName}
                        </p>
                      )}
                      {data.verificationMessage && (
                        <p className="text-xs text-green-600">{data.verificationMessage}</p>
                      )}
                    </div>
                  )}
                  
                  {data.verified === false && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-amber-500 text-amber-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Verified
                        </Badge>
                      </div>
                      {data.verificationMessage && (
                        <p className="text-sm text-amber-700">{data.verificationMessage}</p>
                      )}
                      <p className="text-xs text-amber-600">
                        You can still proceed, but please ensure your TIN is correct.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uraPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    URA Portal Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="uraPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your URA password"
                      value={data.uraPassword}
                      onChange={(e) => handleChange("uraPassword", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used to access URA e-filing services on your behalf
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <TINGuide 
                onApplyLater={() => handleChange("applyLater", true)} 
              />
              
              {data.applyLater && (
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> You can continue setup, but you won't be able to file taxes until you obtain and register your TIN. We'll remind you to complete this step.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed || isLoading}>
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
