import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VerificationResult {
  verified: boolean;
  status: "active" | "inactive" | "not_found" | "suspended";
  businessName: string | null;
  registrationDate: string | null;
  taxTypes: string[];
  message: string;
}

export type VerificationState = "idle" | "verifying" | "verified" | "error";

interface UseTINVerificationReturn {
  state: VerificationState;
  result: VerificationResult | null;
  error: string | null;
  verify: (tin: string) => Promise<VerificationResult | null>;
  reset: () => void;
}

export function useTINVerification(): UseTINVerificationReturn {
  const [state, setState] = useState<VerificationState>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (tin: string): Promise<VerificationResult | null> => {
    setState("verifying");
    setError(null);
    setResult(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("verify-tin-mock", {
        body: { tin },
      });

      if (invokeError) {
        throw new Error(invokeError.message || "Failed to verify TIN");
      }

      if (data.error) {
        throw new Error(data.message || data.error);
      }

      const verificationResult = data as VerificationResult;
      setResult(verificationResult);
      setState("verified");
      return verificationResult;
    } catch (err: any) {
      console.error("[useTINVerification] Error:", err);
      setError(err.message || "Verification failed");
      setState("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return {
    state,
    result,
    error,
    verify,
    reset,
  };
}
