import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const businessTypeValues = Constants.public.Enums.business_type;
const taxTypeValues = Constants.public.Enums.tax_type;

const businessTypes = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "limited_company", label: "Limited Company" },
  { value: "cooperative", label: "Cooperative" },
  { value: "other", label: "Other" },
].filter((t) => businessTypeValues.includes(t.value as any));

const taxTypeOptions = [
  { value: "paye", label: "PAYE" },
  { value: "income", label: "Income Tax" },
  { value: "presumptive", label: "Presumptive Tax" },
  { value: "vat", label: "VAT" },
  { value: "other", label: "Other" },
].filter((t) => taxTypeValues.includes(t.value as any));

const editBusinessSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  business_type: z.enum(businessTypeValues as unknown as [string, ...string[]]),
  address: z.string().optional(),
  annual_turnover: z.number().min(0, "Turnover must be positive"),
  tax_types: z.array(z.enum(taxTypeValues as unknown as [string, ...string[]])),
  tin: z.string().regex(/^\d{10}$/, "TIN must be exactly 10 digits").nullable().optional(),
});

interface Business {
  id: string;
  name: string;
  tin: string | null;
  address: string | null;
  business_type: string;
  turnover: number;
  tax_types: string[];
  is_informal: boolean;
}

interface EditBusinessDialogProps {
  business: Business;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditBusinessDialog({
  business,
  open,
  onOpenChange,
  onSuccess,
}: EditBusinessDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: business.name,
    business_type: business.business_type,
    address: business.address || "",
    annual_turnover: business.turnover?.toString() || "0",
    tax_types: business.tax_types || [],
    tin: business.tin || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFormData({
        name: business.name,
        business_type: business.business_type,
        address: business.address || "",
        annual_turnover: business.turnover?.toString() || "0",
        tax_types: business.tax_types || [],
        tin: business.tin || "",
      });
      setErrors({});
    }
  }, [open, business]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleTaxTypeToggle = (taxType: string) => {
    const current = formData.tax_types;
    const updated = current.includes(taxType)
      ? current.filter((t) => t !== taxType)
      : [...current, taxType];
    handleChange("tax_types", updated);
  };

  const handleSubmit = async () => {
    const turnoverNum = parseInt(formData.annual_turnover) || 0;
    const dataToValidate = {
      name: formData.name,
      business_type: formData.business_type,
      address: formData.address || undefined,
      annual_turnover: turnoverNum,
      tax_types: formData.tax_types,
      tin: formData.tin || null,
    };

    const result = editBusinessSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Check for duplicate TIN if changed
      if (formData.tin && formData.tin !== business.tin) {
        const { data: existing } = await supabase
          .from("businesses")
          .select("id")
          .eq("tin", formData.tin)
          .neq("id", business.id)
          .maybeSingle();

        if (existing) {
          setErrors({ tin: "This TIN is already registered to another business" });
          setIsLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("businesses")
        .update({
          name: formData.name,
          business_type: formData.business_type as any,
          address: formData.address || null,
          turnover: turnoverNum,
          annual_turnover: turnoverNum,
          tax_types: formData.tax_types as any[],
          tin: formData.tin || null,
        })
        .eq("id", business.id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "business_updated",
        business_id: business.id,
        details: {
          updated_fields: Object.keys(formData),
        },
      });

      toast({
        title: "Business Updated",
        description: "Your business information has been updated successfully.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update business",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Business</DialogTitle>
          <DialogDescription>
            Update your business information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Business Type */}
          <div className="space-y-2">
            <Label>Business Type *</Label>
            <Select
              value={formData.business_type}
              onValueChange={(value) => handleChange("business_type", value)}
            >
              <SelectTrigger className={errors.business_type ? "border-destructive" : ""}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.business_type && (
              <p className="text-sm text-destructive">{errors.business_type}</p>
            )}
          </div>

          {/* TIN */}
          <div className="space-y-2">
            <Label htmlFor="tin">TIN (Optional)</Label>
            <Input
              id="tin"
              value={formData.tin}
              onChange={(e) => handleChange("tin", e.target.value.replace(/\D/g, ""))}
              placeholder="1234567890"
              maxLength={10}
              className={errors.tin ? "border-destructive" : ""}
            />
            {errors.tin && <p className="text-sm text-destructive">{errors.tin}</p>}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              rows={2}
            />
          </div>

          {/* Annual Turnover */}
          <div className="space-y-2">
            <Label htmlFor="turnover">Annual Turnover (UGX)</Label>
            <Input
              id="turnover"
              type="number"
              value={formData.annual_turnover}
              onChange={(e) => handleChange("annual_turnover", e.target.value)}
              min={0}
              className={errors.annual_turnover ? "border-destructive" : ""}
            />
            {errors.annual_turnover && (
              <p className="text-sm text-destructive">{errors.annual_turnover}</p>
            )}
          </div>

          {/* Tax Types */}
          <div className="space-y-2">
            <Label>Tax Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {taxTypeOptions.map((tax) => (
                <div key={tax.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tax-${tax.value}`}
                    checked={formData.tax_types.includes(tax.value)}
                    onCheckedChange={() => handleTaxTypeToggle(tax.value)}
                  />
                  <Label htmlFor={`tax-${tax.value}`} className="text-sm font-normal cursor-pointer">
                    {tax.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
