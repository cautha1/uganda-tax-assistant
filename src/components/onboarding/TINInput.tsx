import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Shield, CheckCircle2, AlertCircle, Key, Lock } from "lucide-react";
import { validateTIN, getTINError, formatTIN } from "@/lib/tinValidation";
import { Switch } from "@/components/ui/switch";
import { TINGuide } from "./TINGuide";

export interface TINFormData {
  hasTin: boolean;
  tin: string;
  uraPassword: string;
  applyLater: boolean;
}

interface TINInputProps {
  data: TINFormData;
  onChange: (data: TINFormData) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function TINInput({ data, onChange, onNext, onBack, isLoading }: TINInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: keyof TINFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
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
                  <div className="relative">
                    <Input
                      id="tin"
                      placeholder="1234567890"
                      value={data.tin}
                      onChange={(e) => handleChange("tin", e.target.value.replace(/\D/g, ""))}
                      onBlur={() => handleBlur("tin")}
                      className={touched.tin && tinError ? "border-destructive" : isTinValid ? "border-green-500" : ""}
                      maxLength={10}
                    />
                    {isTinValid && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {touched.tin && tinError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {tinError}
                    </p>
                  )}
                  {isTinValid && (
                    <p className="text-sm text-green-600">
                      Formatted: {formatTIN(data.tin)}
                    </p>
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
