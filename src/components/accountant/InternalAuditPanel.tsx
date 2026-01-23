import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Save,
  ClipboardCheck,
  FileWarning,
  Calculator
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MissingDocumentsIndicator } from "./MissingDocumentsIndicator";
import { ComplianceChecks } from "@/components/tax/ComplianceChecks";
import { calculateTotalPenalties, getPenaltyRiskLevel } from "@/lib/penaltyCalculations";
import { TaxType, TaxFormData, formatUGX } from "@/lib/taxCalculations";

interface InternalAuditPanelProps {
  taxFormId: string;
  businessId: string;
  taxType: TaxType;
  formData: TaxFormData;
  dueDate: string | null;
  calculatedTax: number;
  currentRiskLevel: string | null;
  currentAuditNotes: string | null;
  onUpdate: () => void;
  readOnly?: boolean;
}

const RISK_LEVELS = [
  { value: "low", label: "Low", icon: <Shield className="h-4 w-4" />, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
  { value: "medium", label: "Medium", icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  { value: "high", label: "High", icon: <AlertCircle className="h-4 w-4" />, color: "text-destructive bg-destructive/10" },
];

export function InternalAuditPanel({
  taxFormId,
  businessId,
  taxType,
  formData,
  dueDate,
  calculatedTax,
  currentRiskLevel,
  currentAuditNotes,
  onUpdate,
  readOnly = false,
}: InternalAuditPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [riskLevel, setRiskLevel] = useState(currentRiskLevel || "");
  const [auditNotes, setAuditNotes] = useState(currentAuditNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<"pass" | "warning" | "fail">("pass");
  const [suggestedRisk, setSuggestedRisk] = useState<string | null>(null);

  // Calculate penalty exposure
  const penaltyInfo = dueDate ? calculateTotalPenalties({
    taxDue: calculatedTax,
    dueDate,
    isPaid: false,
  }) : null;

  useEffect(() => {
    // Suggest risk level based on compliance status and penalties
    calculateSuggestedRisk();
  }, [complianceStatus, penaltyInfo]);

  function calculateSuggestedRisk() {
    let risk = "low";
    
    if (complianceStatus === "fail") {
      risk = "high";
    } else if (complianceStatus === "warning") {
      risk = "medium";
    }
    
    // Elevate risk based on penalty exposure
    if (penaltyInfo && penaltyInfo.totalPenalty > 0) {
      const penaltyRisk = getPenaltyRiskLevel(penaltyInfo.totalPenalty, calculatedTax);
      if (penaltyRisk === "high") risk = "high";
      else if (penaltyRisk === "medium" && risk === "low") risk = "medium";
    }
    
    setSuggestedRisk(risk);
  }

  async function handleSave() {
    if (!user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from("tax_forms")
      .update({
        risk_level: riskLevel || null,
        audit_notes: auditNotes || null,
      })
      .eq("id", taxFormId);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save audit information",
      });
    } else {
      // Log to audit trail
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "update_audit_info",
        business_id: businessId,
        details: {
          tax_form_id: taxFormId,
          risk_level: riskLevel,
          has_audit_notes: !!auditNotes,
        },
      });
      
      toast({
        title: "Saved",
        description: "Audit information updated successfully",
      });
      
      onUpdate();
    }
    
    setIsSaving(false);
  }

  function handleComplianceComplete(status: "pass" | "warning" | "fail") {
    setComplianceStatus(status);
  }

  return (
    <div className="space-y-4">
      {/* Risk Assessment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Risk Level</Label>
            <Select
              value={riskLevel}
              onValueChange={setRiskLevel}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select risk level" />
              </SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex items-center gap-2">
                      <span className={level.color.split(" ")[0]}>{level.icon}</span>
                      {level.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {suggestedRisk && suggestedRisk !== riskLevel && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Suggested:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setRiskLevel(suggestedRisk)}
                  disabled={readOnly}
                >
                  <Badge
                    variant="outline"
                    className={
                      suggestedRisk === "high"
                        ? "text-destructive border-destructive"
                        : suggestedRisk === "medium"
                          ? "text-amber-600 border-amber-600"
                          : "text-green-600 border-green-600"
                    }
                  >
                    {suggestedRisk}
                  </Badge>
                </Button>
              </div>
            )}
          </div>

          {/* Current Risk Display */}
          {riskLevel && (
            <div className={`p-3 rounded-lg ${RISK_LEVELS.find(l => l.value === riskLevel)?.color}`}>
              <div className="flex items-center gap-2">
                {RISK_LEVELS.find(l => l.value === riskLevel)?.icon}
                <span className="font-medium capitalize">{riskLevel} Risk</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Penalty Exposure */}
      {penaltyInfo && penaltyInfo.totalPenalty > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Calculator className="h-4 w-4" />
              Penalty Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Late Filing</span>
                <span className="font-medium">{formatUGX(penaltyInfo.lateFilingPenalty)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Late Payment</span>
                <span className="font-medium">{formatUGX(penaltyInfo.latePaymentPenalty)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Interest</span>
                <span className="font-medium">{formatUGX(penaltyInfo.interestCharge)}</span>
              </div>
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="font-medium">Total Exposure</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  {formatUGX(penaltyInfo.totalPenalty)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Documents */}
      <MissingDocumentsIndicator
        taxFormId={taxFormId}
        taxType={taxType}
      />

      {/* Compliance Checks */}
      <ComplianceChecks
        taxFormId={taxFormId}
        formData={formData}
        taxType={taxType}
        onChecksComplete={handleComplianceComplete}
      />

      {/* Audit Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Audit Notes
            <Badge variant="outline" className="text-xs">Visible to Owner</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Add internal audit notes, observations, or recommendations..."
            value={auditNotes}
            onChange={(e) => setAuditNotes(e.target.value)}
            disabled={readOnly}
            rows={4}
            className="resize-none"
          />
          
          {!readOnly && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Audit Information
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
