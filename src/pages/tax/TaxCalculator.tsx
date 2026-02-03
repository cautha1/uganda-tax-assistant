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
import { useTranslation } from "@/hooks/useTranslation";

export default function TaxCalculator() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("paye");

  const TAX_TYPES = [
    {
      id: "paye",
      name: t('tax.types.paye'),
      description: t('tax.types.payeDesc'),
      icon: Users,
      color: "text-blue-500",
    },
    {
      id: "income",
      name: t('tax.types.income'),
      description: t('tax.types.incomeDesc'),
      icon: Building2,
      color: "text-green-500",
    },
    {
      id: "presumptive",
      name: t('tax.types.presumptive'),
      description: t('tax.types.presumptiveDesc'),
      icon: Receipt,
      color: "text-amber-500",
    },
    {
      id: "vat",
      name: t('tax.types.vat'),
      description: t('tax.types.vatDesc'),
      icon: ShoppingCart,
      color: "text-purple-500",
    },
  ];

  return (
    <MainLayout>
      <div className="container max-w-5xl py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-display font-bold flex items-center gap-3">
              <Calculator className="h-6 w-6 text-primary" />
              {t('dashboard.taxCalculator')}
            </h1>
            <Button asChild variant="outline" size="sm">
              <Link to="/tax/templates">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {t('tax.fileTaxReturns')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="text-muted-foreground">
            {t('tax.estimateTax')}
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
                    <Badge variant="default" className="ml-auto text-xs">{t('common.status')}</Badge>
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
              <span className="hidden sm:inline">{t('tax.types.paye')}</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tax.types.income')}</span>
            </TabsTrigger>
            <TabsTrigger value="presumptive" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tax.types.presumptive')}</span>
            </TabsTrigger>
            <TabsTrigger value="vat" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">{t('tax.types.vat')}</span>
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
            <CardTitle className="text-lg">{t('tax.readyToFile')}</CardTitle>
            <CardDescription>
              {t('tax.readyToFileDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/tax/templates">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {t('tax.downloadURATemplates')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/businesses">
                <Building2 className="h-4 w-4 mr-2" />
                {t('tax.manageBusinesses')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}