import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Calculator,
  Users,
  Building2,
  Receipt,
  ShoppingCart,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { PAYECalculator } from "@/components/tax/calculators/PAYECalculator";
import { IncomeTaxCalculator } from "@/components/tax/calculators/IncomeTaxCalculator";
import { PresumptiveTaxCalculator } from "@/components/tax/calculators/PresumptiveTaxCalculator";
import { VATCalculator } from "@/components/tax/calculators/VATCalculator";

const TAX_TYPES = [
  {
    id: "paye",
    name: "PAYE",
    description: "Pay As You Earn - Employee tax",
    icon: Users,
    color: "text-blue-500",
  },
  {
    id: "income",
    name: "Income Tax",
    description: "Annual income tax for individuals/companies",
    icon: Building2,
    color: "text-green-500",
  },
  {
    id: "presumptive",
    name: "Presumptive Tax",
    description: "Simplified tax for SMEs (UGX 10M-150M)",
    icon: Receipt,
    color: "text-amber-500",
  },
  {
    id: "vat",
    name: "VAT",
    description: "Value Added Tax at 18%",
    icon: ShoppingCart,
    color: "text-purple-500",
  },
];

export default function TaxCalculator() {
  const [activeTab, setActiveTab] = useState("paye");

  return (
    <MainLayout>
      <div className="container max-w-5xl py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-display font-bold flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              Tax Calculator
            </h1>
            <Button asChild variant="outline" size="sm">
              <Link to="/tax/templates">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                File Tax Returns
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="text-muted-foreground">
            Estimate your tax liability before filing. All calculations are based on current URA rates.
          </p>
        </div>

        {/* Quick Tax Type Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {TAX_TYPES.map((tax) => {
            const Icon = tax.icon;
            return (
              <button
                key={tax.id}
                onClick={() => setActiveTab(tax.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  activeTab === tax.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`h-5 w-5 ${tax.color}`} />
                  <span className="font-medium">{tax.name}</span>
                  {activeTab === tax.id && (
                    <Badge variant="default" className="ml-auto text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{tax.description}</p>
              </button>
            );
          })}
        </div>

        {/* Calculator Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="paye" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">PAYE</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Income Tax</span>
            </TabsTrigger>
            <TabsTrigger value="presumptive" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Presumptive</span>
            </TabsTrigger>
            <TabsTrigger value="vat" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">VAT</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paye">
            <PAYECalculator />
          </TabsContent>

          <TabsContent value="income">
            <IncomeTaxCalculator />
          </TabsContent>

          <TabsContent value="presumptive">
            <PresumptiveTaxCalculator />
          </TabsContent>

          <TabsContent value="vat">
            <VATCalculator />
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Ready to File?</CardTitle>
            <CardDescription>
              Once you've calculated your taxes, proceed to download and fill official URA forms
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/tax/templates">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download URA Templates
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/businesses">
                <Building2 className="h-4 w-4 mr-2" />
                Manage Businesses
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
