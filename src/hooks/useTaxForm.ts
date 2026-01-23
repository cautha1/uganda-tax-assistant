import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  TaxType,
  TaxFormData,
  ValidationError,
  validatePAYE,
  validateIncomeTax,
  validatePresumptiveTax,
  validateVAT,
  calculatePAYE,
  calculateIncomeTax,
  calculatePresumptiveTax,
  calculateVAT,
  PAYEFormData,
  IncomeTaxFormData,
  PresumptiveTaxFormData,
  VATFormData,
} from "@/lib/taxCalculations";
import { generateTaxFile, downloadTaxFile } from "@/lib/taxFileGenerator";
import { Json } from "@/integrations/supabase/types";

interface UseTaxFormProps {
  businessId: string;
  taxType: TaxType;
  onSuccess?: (formId: string) => void;
}

interface BusinessInfo {
  name: string;
  tin: string;
  address: string | null;
}

export function useTaxForm({ businessId, taxType, onSuccess }: UseTaxFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [calculatedTax, setCalculatedTax] = useState<number>(0);

  const validate = useCallback(
    (formData: TaxFormData): ValidationError[] => {
      let errors: ValidationError[] = [];

      switch (taxType) {
        case "paye":
          errors = validatePAYE(formData as PAYEFormData);
          break;
        case "income":
          errors = validateIncomeTax(formData as IncomeTaxFormData);
          break;
        case "presumptive":
          errors = validatePresumptiveTax(formData as PresumptiveTaxFormData);
          break;
        case "vat":
          errors = validateVAT(formData as VATFormData);
          break;
      }

      setValidationErrors(errors);
      return errors;
    },
    [taxType]
  );

  const calculateTax = useCallback(
    (formData: TaxFormData): number => {
      let tax = 0;

      switch (taxType) {
        case "paye":
          tax = calculatePAYE(formData as PAYEFormData);
          break;
        case "income":
          tax = calculateIncomeTax(formData as IncomeTaxFormData);
          break;
        case "presumptive":
          tax = calculatePresumptiveTax(formData as PresumptiveTaxFormData);
          break;
        case "vat":
          tax = calculateVAT(formData as VATFormData);
          break;
      }

      setCalculatedTax(tax);
      return tax;
    },
    [taxType]
  );

  const getTaxPeriod = (formData: TaxFormData): string => {
    switch (taxType) {
      case "paye":
      case "vat": {
        const data = formData as PAYEFormData | VATFormData;
        return `${data.period_year}-${data.period_month}`;
      }
      case "income":
      case "presumptive": {
        const data = formData as IncomeTaxFormData | PresumptiveTaxFormData;
        return data.period_year;
      }
      default:
        return new Date().getFullYear().toString();
    }
  };

  const saveDraft = async (formData: TaxFormData): Promise<string | null> => {
    if (!user) return null;
    setIsLoading(true);

    try {
      const tax = calculateTax(formData);
      const errors = validate(formData);
      const taxPeriod = getTaxPeriod(formData);

      const { data, error } = await supabase
        .from("tax_forms")
        .insert({
          business_id: businessId,
          tax_type: taxType,
          tax_period: taxPeriod,
          status: "draft",
          form_data: formData as unknown as Json,
          validation_errors: errors.length > 0 ? (errors as unknown as Json) : null,
          calculated_tax: tax,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Draft saved",
        description: "Your tax form has been saved as a draft.",
      });

      onSuccess?.(data.id);
      return data.id;
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save draft. Please try again.",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateForm = async (formId: string, formData: TaxFormData): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);

    try {
      const tax = calculateTax(formData);
      const errors = validate(formData);
      const taxPeriod = getTaxPeriod(formData);

      const { error } = await supabase
        .from("tax_forms")
        .update({
          tax_period: taxPeriod,
          form_data: formData as unknown as Json,
          validation_errors: errors.length > 0 ? (errors as unknown as Json) : null,
          calculated_tax: tax,
          status: errors.length > 0 ? "error" : "validated",
        })
        .eq("id", formId);

      if (error) throw error;

      toast({
        title: "Form updated",
        description: errors.length > 0 ? "Form has validation errors." : "Form validated successfully.",
      });

      return true;
    } catch (error) {
      console.error("Error updating form:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update form. Please try again.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubmissionPermission = async (): Promise<boolean> => {
    if (!user) return false;

    // Check if user is business owner
    const { data: business } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .single();

    if (business?.owner_id === user.id) return true;

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (isAdmin) return true;

    return false;
  };

  const submitForm = async (formId: string, formData: TaxFormData): Promise<boolean> => {
    if (!user) return false;

    // CRITICAL: Verify submission permission - only owners and admins can submit
    const canSubmit = await checkSubmissionPermission();
    if (!canSubmit) {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "Only business owners can submit tax returns. Please ask the owner to review and submit.",
      });
      return false;
    }

    const errors = validate(formData);
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: "Please fix all errors before submitting.",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("tax_forms")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
        })
        .eq("id", formId);

      if (error) throw error;

      // Log the submission
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        business_id: businessId,
        action: "submit_tax_form",
        details: { form_id: formId, tax_type: taxType },
      });

      toast({
        title: "Form submitted",
        description: "Your tax form has been submitted successfully.",
      });

      return true;
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit form. Please try again.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const markReadyForSubmission = async (formId: string, ready: boolean): Promise<boolean> => {
    if (!user) return false;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("tax_forms")
        .update({
          ready_for_submission: ready,
          ready_marked_by: ready ? user.id : null,
          ready_marked_at: ready ? new Date().toISOString() : null,
        })
        .eq("id", formId);

      if (error) throw error;

      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        business_id: businessId,
        action: ready ? "marked_ready_for_submission" : "unmarked_ready_for_submission",
        details: { form_id: formId, tax_type: taxType },
      });

      toast({
        title: ready ? "Marked as ready" : "Unmarked",
        description: ready
          ? "Form is now marked as ready for owner submission."
          : "Form is no longer marked as ready.",
      });

      return true;
    } catch (error) {
      console.error("Error marking form:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update form status.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const generateAndDownload = async (
    formData: TaxFormData,
    business: BusinessInfo
  ): Promise<void> => {
    const errors = validate(formData);
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: "Please fix all errors before generating the file.",
      });
      return;
    }

    const { content, filename } = generateTaxFile(taxType, formData, business);
    downloadTaxFile(content, filename);

    toast({
      title: "File generated",
      description: `Downloaded ${filename}`,
    });
  };

  return {
    isLoading,
    validationErrors,
    calculatedTax,
    validate,
    calculateTax,
    saveDraft,
    updateForm,
    submitForm,
    generateAndDownload,
    markReadyForSubmission,
    checkSubmissionPermission,
  };
}
