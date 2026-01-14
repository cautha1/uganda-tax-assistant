import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Download,
  Save,
  Calculator
} from "lucide-react";
import { 
  TaxTemplate, 
  TemplateField, 
  validateTemplateData,
  calculatePresumptiveTaxFromBracket
} from "@/lib/uraTemplates";
import { formatUGX } from "@/lib/taxCalculations";
import * as XLSX from "xlsx";

interface TemplateFormFillerProps {
  template: TaxTemplate;
  businessData: {
    name: string;
    tin: string;
    address?: string;
    turnover?: number;
  };
  onSave?: (data: Record<string, any>) => void;
  onValidate?: (errors: { field: string; message: string }[]) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

const BUSINESS_CATEGORIES = [
  "Retail Trade",
  "Wholesale Trade",
  "Manufacturing",
  "Services",
  "Agriculture",
  "Transport",
  "Construction",
  "Other"
];

export function TemplateFormFiller({ 
  template, 
  businessData, 
  onSave,
  onValidate 
}: TemplateFormFillerProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [calculatedTax, setCalculatedTax] = useState<number | null>(null);

  // Pre-fill with business data
  useEffect(() => {
    const prefilled: Record<string, any> = {};
    
    template.fields.forEach(field => {
      if (field.id.includes("tin") || field.id.includes("taxpayer_tin") || field.id === "employer_tin") {
        prefilled[field.id] = businessData.tin;
      }
      if (field.id.includes("name") || field.id.includes("taxpayer_name") || field.id === "employer_name") {
        prefilled[field.id] = businessData.name;
      }
      if (field.id.includes("address") || field.id === "business_address") {
        prefilled[field.id] = businessData.address || "";
      }
      if (field.id === "annual_turnover" && businessData.turnover) {
        prefilled[field.id] = businessData.turnover;
      }
    });

    setFormData(prev => ({ ...prefilled, ...prev }));
  }, [template, businessData]);

  // Auto-calculate taxes
  const calculateTaxes = useCallback(() => {
    if (template.taxType === "presumptive" && formData.annual_turnover) {
      const tax = calculatePresumptiveTaxFromBracket(Number(formData.annual_turnover));
      setCalculatedTax(tax >= 0 ? tax : null);
      if (tax >= 0) {
        setFormData(prev => ({ ...prev, presumptive_tax: tax }));
      }
    }

    if (template.taxType === "vat") {
      const taxableSupplies = Number(formData.taxable_supplies) || 0;
      const outputVat = Math.round(taxableSupplies * 0.18);
      const inputVat = Number(formData.input_vat) || 0;
      const netVat = Math.max(0, outputVat - inputVat);
      
      setFormData(prev => ({ 
        ...prev, 
        output_vat: outputVat,
        net_vat: netVat 
      }));
      setCalculatedTax(netVat);
    }
  }, [formData, template.taxType]);

  useEffect(() => {
    calculateTaxes();
  }, [formData.annual_turnover, formData.taxable_supplies, formData.input_vat, calculateTaxes]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    setIsValidated(false);
    setErrors([]);
  };

  const handleValidate = () => {
    const validationErrors = validateTemplateData(template, formData);
    setErrors(validationErrors);
    setIsValidated(validationErrors.length === 0);
    onValidate?.(validationErrors);
  };

  const handleSave = () => {
    handleValidate();
    if (errors.length === 0) {
      onSave?.(formData);
    }
  };

  const handleExportToExcel = () => {
    // Create workbook with form data
    const wb = XLSX.utils.book_new();
    
    // Create data for Excel
    const excelData = template.fields.map(field => ({
      "Field": field.label,
      "Value": formData[field.id] || "",
      "Excel Cell": field.excelCell || "N/A"
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, template.name);

    // Download
    XLSX.writeFile(wb, `${template.id}_${businessData.tin}_filled.xlsx`);
  };

  const renderField = (field: TemplateField) => {
    const error = errors.find(e => e.field === field.id);
    const value = formData[field.id] || "";

    const fieldClasses = `${error ? "border-destructive" : ""}`;

    switch (field.type) {
      case "select":
        let options: string[] = [];
        if (field.id.includes("month")) {
          options = MONTHS;
        } else if (field.id.includes("year")) {
          options = YEARS;
        } else if (field.id === "business_category") {
          options = BUSINESS_CATEGORIES;
        }

        return (
          <Select value={value} onValueChange={(v) => handleFieldChange(field.id, v)}>
            <SelectTrigger className={fieldClasses}>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "number":
        return (
          <div className="relative">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value ? Number(e.target.value) : "")}
              className={fieldClasses}
              placeholder="0"
            />
            {field.id.includes("tax") || field.id.includes("vat") || field.id.includes("turnover") || field.id.includes("income") ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                UGX
              </span>
            ) : null}
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={fieldClasses}
            placeholder={field.label}
          />
        );
    }
  };

  // Group fields by category
  const requiredFields = template.fields.filter(f => f.required);
  const optionalFields = template.fields.filter(f => !f.required);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {template.name}
            </CardTitle>
            <CardDescription>
              Fill in the form fields below. Fields marked with * are required.
            </CardDescription>
          </div>
          <Badge variant="outline">v{template.version}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calculated Tax Preview */}
        {calculatedTax !== null && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="font-medium">Auto-Calculated Tax</span>
              </div>
              <span className="text-xl font-bold text-primary">
                {formatUGX(calculatedTax)}
              </span>
            </div>
          </div>
        )}

        {/* Required Fields */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Required Fields
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {requiredFields.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="flex items-center gap-1">
                  {field.label}
                  <span className="text-destructive">*</span>
                  {field.excelCell && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Cell: {field.excelCell}
                    </Badge>
                  )}
                </Label>
                {renderField(field)}
                {errors.find(e => e.field === field.id) && (
                  <p className="text-xs text-destructive">
                    {errors.find(e => e.field === field.id)?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Optional Fields */}
        {optionalFields.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Optional Fields
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {optionalFields.map(field => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="flex items-center gap-1">
                    {field.label}
                    {field.excelCell && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Cell: {field.excelCell}
                      </Badge>
                    )}
                  </Label>
                  {renderField(field)}
                  {errors.find(e => e.field === field.id) && (
                    <p className="text-xs text-destructive">
                      {errors.find(e => e.field === field.id)?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Status */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix {errors.length} validation error{errors.length > 1 ? "s" : ""} before submitting.
            </AlertDescription>
          </Alert>
        )}

        {isValidated && errors.length === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              All validations passed! Your form is ready for submission.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleValidate}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Validate
          </Button>
          <Button variant="outline" onClick={handleExportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
          <Button onClick={handleSave} disabled={!isValidated}>
            <Save className="mr-2 h-4 w-4" />
            Save & Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
