import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Calculator,
  ExternalLink,
  Info,
  Building2,
  FileText,
  ArrowRight
} from "lucide-react";
import { 
  URA_TEMPLATES, 
  PRESUMPTIVE_TAX_BRACKETS, 
  PAYE_MONTHLY_BRACKETS,
  TaxTemplate,
  calculatePresumptiveTaxFromBracket
} from "@/lib/uraTemplates";
import { formatUGX } from "@/lib/taxCalculations";

interface Business {
  id: string;
  name: string;
  tin: string;
  turnover: number;
  tax_types: string[];
}

export default function TaxTemplates() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [_selectedTemplate, _setSelectedTemplate] = useState<TaxTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("templates");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    async function fetchBusinesses() {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, tin, turnover, tax_types")
        .eq("is_deleted", false)
        .order("name");

      setBusinesses((data || []) as Business[]);
      if (data && data.length > 0) {
        setSelectedBusiness(data[0].id);
      }
      setIsLoading(false);
    }

    if (user) {
      fetchBusinesses();
    }
  }, [user, authLoading, navigate]);

  const currentBusiness = businesses.find(b => b.id === selectedBusiness);

  const handleDownloadTemplate = (template: TaxTemplate) => {
    // Open URA link in new tab
    window.open(template.uraLink, "_blank");
  };

  const handleStartFilling = (template: TaxTemplate) => {
    if (!selectedBusiness) return;
    // Navigate to the tax form wizard with the template pre-selected
    navigate(`/businesses/${selectedBusiness}/tax/new?template=${template.id}`);
  };

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            URA Tax Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Download official URA tax forms, auto-fill with your business data, and validate before submission
          </p>
        </div>

        {/* Business Selector */}
        {businesses.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Select Business:</span>
                </div>
                <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select a business" />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name} (TIN: {business.tin})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentBusiness && (
                  <Badge variant="secondary">
                    Turnover: {formatUGX(currentBusiness.turnover || 0)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {businesses.length === 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Businesses Found</AlertTitle>
            <AlertDescription>
              You need to register a business first before downloading tax templates.
              <Button asChild variant="link" className="p-0 ml-2">
                <Link to="/businesses/new">Register a Business</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Templates
            </TabsTrigger>
            <TabsTrigger value="brackets" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Tax Brackets Guide
            </TabsTrigger>
            <TabsTrigger value="fill" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Auto-Fill Forms
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {URA_TEMPLATES.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">v{template.version}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>Last updated: {new Date(template.lastUpdated).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{template.fields.length} fields</span>
                    </div>

                    {/* Macro Warning */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Enable macros in Excel after downloading for automatic calculations
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleDownloadTemplate(template)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => handleStartFilling(template)}
                        disabled={!selectedBusiness}
                      >
                        Fill Online
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tax Brackets Tab */}
          <TabsContent value="brackets" className="space-y-6">
            {/* Presumptive Tax */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Presumptive Tax Brackets
                </CardTitle>
                <CardDescription>
                  For businesses with annual turnover between UGX 10M and UGX 150M
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {PRESUMPTIVE_TAX_BRACKETS.map((bracket, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border ${
                        currentBusiness && 
                        currentBusiness.turnover >= bracket.min && 
                        currentBusiness.turnover <= bracket.max
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {formatUGX(bracket.min)} - {bracket.max === 150000000 ? formatUGX(bracket.max) : "Above"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {bracket.description}
                          </p>
                        </div>
                        <Badge variant={bracket.fixedAmount === 0 ? "secondary" : "default"}>
                          {bracket.fixedAmount === 0 ? "Exempt" : formatUGX(bracket.fixedAmount || 0)}
                        </Badge>
                      </div>
                      {currentBusiness && 
                        currentBusiness.turnover >= bracket.min && 
                        currentBusiness.turnover <= bracket.max && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-primary">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Your business ({currentBusiness.name}) falls in this bracket
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            Estimated tax: <strong>{formatUGX(calculatePresumptiveTaxFromBracket(currentBusiness.turnover))}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important Note</AlertTitle>
                  <AlertDescription>
                    Businesses with turnover above UGX 150M are not eligible for presumptive tax 
                    and must register for Income Tax and VAT.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* PAYE Brackets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  PAYE Monthly Tax Brackets
                </CardTitle>
                <CardDescription>
                  Pay As You Earn tax rates for employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Monthly Income Range</th>
                        <th className="text-center py-3 px-4">Tax Rate</th>
                        <th className="text-left py-3 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PAYE_MONTHLY_BRACKETS.map((bracket, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4">
                            {formatUGX(bracket.min)} - {bracket.max === Infinity ? "Above" : formatUGX(bracket.max)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={bracket.rate === 0 ? "secondary" : "default"}>
                              {(bracket.rate * 100).toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-sm">
                            {bracket.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Fill Tab */}
          <TabsContent value="fill" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Fill Tax Forms</CardTitle>
                <CardDescription>
                  Select a template to automatically populate with your business data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedBusiness ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please select a business above to auto-fill tax forms
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    {/* Business Data Preview */}
                    {currentBusiness && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-3">Business Data to Pre-fill</h4>
                        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                          <div>
                            <dt className="text-muted-foreground">Business Name</dt>
                            <dd className="font-medium">{currentBusiness.name}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">TIN</dt>
                            <dd className="font-medium font-mono">{currentBusiness.tin}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Annual Turnover</dt>
                            <dd className="font-medium">{formatUGX(currentBusiness.turnover || 0)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Registered Tax Types</dt>
                            <dd className="flex gap-1 flex-wrap">
                              {currentBusiness.tax_types?.map(t => (
                                <Badge key={t} variant="secondary" className="text-xs">{t.toUpperCase()}</Badge>
                              )) || <span className="text-muted-foreground">None</span>}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    {/* Template Selection */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {URA_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleStartFilling(template)}
                          className="p-4 border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.fields.filter(f => f.required).length} required fields
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Import from Accounting Software */}
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Import from Accounting Software</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Import data from QuickBooks, Xero, or other accounting software via CSV
                      </p>
                      <Button variant="outline" onClick={() => navigate(`/businesses/${selectedBusiness}`)}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Import CSV Data
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
