import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle 
} from "lucide-react";
import { TaxType, TaxFormData } from "@/lib/taxCalculations";
import { 
  runComplianceChecks, 
  getComplianceStatus, 
  ComplianceCheck 
} from "@/lib/complianceChecks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ComplianceChecksProps {
  taxFormId: string;
  formData: TaxFormData;
  taxType: TaxType;
  onChecksComplete?: (status: "pass" | "warning" | "fail") => void;
}

const STATUS_CONFIG = {
  pass: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  fail: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
};

export function ComplianceChecks({
  taxFormId,
  formData,
  taxType,
  onChecksComplete,
}: ComplianceChecksProps) {
  const { user } = useAuth();
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    // Auto-run checks on mount
    if (formData && !hasRun) {
      handleRunChecks();
    }
  }, [formData]);

  async function handleRunChecks() {
    setIsRunning(true);

    // Run the compliance checks
    const results = runComplianceChecks(formData, taxType);
    setChecks(results);
    setHasRun(true);

    const overallStatus = getComplianceStatus(results);
    
    // Save checks to database
    if (user) {
      // Clear existing checks
      await supabase
        .from("compliance_checks")
        .delete()
        .eq("tax_form_id", taxFormId);

      // Insert new checks
      const checksToInsert = results.map((check) => ({
        tax_form_id: taxFormId,
        check_type: check.check_type,
        status: check.status,
        message: check.message,
        checked_by: user.id,
      }));

      await supabase.from("compliance_checks").insert(checksToInsert);
    }

    onChecksComplete?.(overallStatus);
    setIsRunning(false);
  }

  const overallStatus = getComplianceStatus(checks);
  const passCount = checks.filter((c) => c.status === "pass").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Compliance Checks
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunChecks}
            disabled={isRunning}
          >
            {isRunning ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-run
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasRun ? (
          <div className="text-center py-6">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Run compliance checks to validate your tax form
            </p>
            <Button onClick={handleRunChecks} disabled={isRunning}>
              {isRunning ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Run Checks
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-3 border rounded-lg">
              <div className={`${STATUS_CONFIG[overallStatus].color}`}>
                {STATUS_CONFIG[overallStatus].icon}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {overallStatus === "pass" && "All checks passed"}
                  {overallStatus === "warning" && "Some warnings found"}
                  {overallStatus === "fail" && "Issues need attention"}
                </p>
                <div className="flex gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {passCount} passed
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    {warningCount} warnings
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-destructive" />
                    {failCount} failed
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Checks */}
            <div className="space-y-2">
              {checks.map((check) => {
                const config = STATUS_CONFIG[check.status];
                return (
                  <div
                    key={check.id}
                    className={`flex items-start gap-3 p-2 rounded-lg ${config.bgColor}`}
                  >
                    <span className={config.color}>{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{check.message}</p>
                      {check.field && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {check.field.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
