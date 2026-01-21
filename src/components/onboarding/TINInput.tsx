import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, CheckCircle2, AlertCircle, Key, 
  Loader2, XCircle, AlertTriangle, Building2, Calendar, FileText 
} from "lucide-react";
import { validateTIN, getTINError, formatTIN } from "@/lib/tinValidation";
import { Switch } from "@/components/ui/switch";
import { TINGuide } from "./TINGuide";
import { useTINVerification, VerificationResult } from "@/hooks/useTINVerification";

export interface TINFormData {
  hasTin: boolean;
  tin: string;
  applyLater: boolean;
  verificationResult?: VerificationResult | null;
}

interface TINInputProps {
  data: TINFormData;
  onChange: (data: TINFormData) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function TINInput({ data, onChange, onNext, onBack, isLoading }: TINInputProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { state: verificationState, result, error: verificationError, verify, reset } = useTINVerification();

  // Update parent when verification result changes
  useEffect(() => {
    if (result) {
      onChange({ ...data, verificationResult: result });
    }
  }, [result]);

  const handleChange = (field: keyof TINFormData, value: any) => {
    // Reset verification when TIN changes
    if (field === "tin" && value !== data.tin) {
      reset();
      onChange({ ...data, [field]: value, verificationResult: null });
    } else {
      onChange({ ...data, [field]: value });
    }
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
  };

  const handleVerify = async () => {
    if (validateTIN(data.tin)) {
      await verify(data.tin);
    }
  };

  const tinError = touched.tin ? getTINError(data.tin) : null;
  const isTinValid = validateTIN(data.tin);

  const canProceed = data.hasTin 
    ? (isTinValid && verificationState === "verified") 
    : data.applyLater;

  const getVerificationStatusBadge = () => {
    if (!result) return null;

    switch (result.status) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "not_found":
        return <Badge variant="destructive">Not Found</Badge>;
      default:
        return null;
    }
  };

  const getVerificationIcon = () => {
    switch (verificationState) {
      case "verifying":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "verified":
        if (result?.status === "active") {
          return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        } else if (result?.status === "not_found") {
          return <XCircle className="h-4 w-4 text-destructive" />;
        } else {
          return <AlertTriangle className="h-4 w-4 text-amber-500" />;
        }
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

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
              onCheckedChange={(checked) => {
                reset();
                handleChange("hasTin", checked);
              }}
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

              {/* TIN Input with Verification */}
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
                      className={touched.tin && tinError ? "border-destructive" : isTinValid && verificationState === "verified" && result?.status === "active" ? "border-green-500" : ""}
                      maxLength={10}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {getVerificationIcon()}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerify}
                    disabled={!isTinValid || verificationState === "verifying"}
                  >
                    {verificationState === "verifying" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify TIN"
                    )}
                  </Button>
                </div>
                {touched.tin && tinError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {tinError}
                  </p>
                )}
                {isTinValid && verificationState === "idle" && (
                  <p className="text-sm text-muted-foreground">
                    Formatted: {formatTIN(data.tin)} — Click "Verify TIN" to validate with URA registry
                  </p>
                )}
              </div>

              {/* Verification Result Display */}
              {verificationState === "verified" && result && (
                <div className={`p-4 rounded-lg border ${
                  result.status === "active" 
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                    : result.status === "not_found"
                    ? "bg-destructive/10 border-destructive/30"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {result.status === "active" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : result.status === "not_found" ? (
                        <XCircle className="h-5 w-5 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      )}
                      <span className="font-semibold">
                        {result.status === "active" ? "TIN Verified" : 
                         result.status === "not_found" ? "TIN Not Found" : "Verification Warning"}
                      </span>
                    </div>
                    {getVerificationStatusBadge()}
                  </div>
                  
                  <p className="text-sm mb-3">{result.message}</p>

                  {result.businessName && (
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Business Name:</span>
                        <span className="font-medium">{result.businessName}</span>
                      </div>
                      {result.registrationDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Registered:</span>
                          <span className="font-medium">
                            {new Date(result.registrationDate).toLocaleDateString("en-UG", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      {result.taxTypes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Tax Types:</span>
                          <div className="flex flex-wrap gap-1">
                            {result.taxTypes.map((tax) => (
                              <Badge key={tax} variant="outline" className="text-xs">
                                {tax}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Verification Error */}
              {verificationState === "error" && verificationError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {verificationError}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto ml-2" 
                      onClick={handleVerify}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

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
