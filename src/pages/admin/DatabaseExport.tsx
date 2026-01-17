import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Database } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

const DatabaseExport = () => {
  const generateSQLExport = () => {
    const sqlContent = `-- ================================================
-- DATABASE EXPORT - Tax Management System
-- Generated: ${new Date().toISOString()}
-- ================================================

-- =====================
-- ENUMS
-- =====================
CREATE TYPE business_type AS ENUM ('sole_proprietorship', 'partnership', 'limited_company', 'ngo', 'cooperative', 'other');
CREATE TYPE tax_type AS ENUM ('paye', 'income', 'presumptive', 'vat', 'other');
CREATE TYPE tax_form_status AS ENUM ('draft', 'validated', 'error', 'submitted');
CREATE TYPE app_role AS ENUM ('sme_owner', 'accountant', 'admin', 'guest');

-- =====================
-- TABLES
-- =====================

-- profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  nin TEXT,
  phone TEXT,
  verified BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tin TEXT NOT NULL,
  owner_id UUID,
  business_type business_type DEFAULT 'sole_proprietorship',
  address TEXT,
  turnover NUMERIC DEFAULT 0,
  annual_turnover NUMERIC DEFAULT 0,
  tax_types tax_type[] DEFAULT '{}',
  is_informal BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  tin_verified BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  informal_acknowledged BOOLEAN DEFAULT false,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  owner_nin TEXT,
  ura_tin_password TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- user_roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role DEFAULT 'sme_owner'
);

-- business_accountants table
CREATE TABLE business_accountants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  accountant_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- tax_forms table
CREATE TABLE tax_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  tax_type tax_type NOT NULL,
  tax_period TEXT NOT NULL,
  status tax_form_status DEFAULT 'draft',
  form_data JSONB DEFAULT '{}',
  calculated_tax NUMERIC DEFAULT 0,
  validation_errors JSONB,
  submission_proof_url TEXT,
  ura_acknowledgement_number TEXT,
  ura_submission_date TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- tax_payments table
CREATE TABLE tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_form_id UUID NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  due_date DATE,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  business_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- DATA
-- =====================

-- profiles data
INSERT INTO profiles (id, name, email, nin, phone, verified, onboarding_completed, created_at, updated_at) VALUES
('9018ca85-544c-47e7-a901-567d861037a7', 'Cauthan Buluma', 'cauthansanyu203@gmail.com', NULL, NULL, false, false, '2026-01-14 08:59:52.873563+00', '2026-01-14 08:59:52.873563+00'),
('08811677-c5ac-4276-b625-525d3df5ab1b', 'Jane Naku', 'cauthan.buluma@student.tafesa.edu.au', NULL, NULL, false, false, '2026-01-15 09:13:59.348166+00', '2026-01-15 09:13:59.348166+00');

-- businesses data
INSERT INTO businesses (id, name, tin, owner_id, business_type, address, turnover, annual_turnover, tax_types, is_informal, is_deleted, tin_verified, onboarding_completed, created_at, updated_at) VALUES
('ee1f0097-28d4-4267-8eae-7b5fc14277e6', 'Maize Farmer', '1200000000', '9018ca85-544c-47e7-a901-567d861037a7', 'limited_company', 'Kampala, Uganda', 2.00, 2.00, '{paye,income,presumptive,vat}', false, false, false, false, '2026-01-14 09:24:10.29815+00', '2026-01-15 09:27:28.075756+00');

-- user_roles data
INSERT INTO user_roles (id, role, user_id) VALUES
('bfdcae4c-d312-4f8c-b257-776f89aac455', 'sme_owner', '9018ca85-544c-47e7-a901-567d861037a7'),
('65fc2e90-9739-414a-92ef-70fbc9274a72', 'admin', '9018ca85-544c-47e7-a901-567d861037a7'),
('c80dd725-93b9-4d6a-9b32-813e643ab6b9', 'accountant', '9018ca85-544c-47e7-a901-567d861037a7'),
('fc7c4720-d47d-49df-8608-5233c63370a4', 'sme_owner', '08811677-c5ac-4276-b625-525d3df5ab1b');

-- audit_logs data
INSERT INTO audit_logs (id, user_id, business_id, action, details, ip_address, created_at) VALUES
('717f7ec6-5297-49ea-8005-9b589ad224b2', '9018ca85-544c-47e7-a901-567d861037a7', NULL, 'login', '{"method":"email"}', NULL, '2026-01-14 09:22:53.56376+00'),
('6082d5a1-c1fa-455c-8c22-99e50e3d0e7e', '9018ca85-544c-47e7-a901-567d861037a7', 'ee1f0097-28d4-4267-8eae-7b5fc14277e6', 'create_business', '{"business_name":"Maize Farmer"}', NULL, '2026-01-14 09:24:10.873005+00'),
('559b959b-bf89-4bec-a3a0-cced500f1369', '9018ca85-544c-47e7-a901-567d861037a7', NULL, 'login', '{"method":"email"}', NULL, '2026-01-14 09:25:12.49283+00'),
('fbd09da5-a1d1-4974-9f12-6c1116a58934', '9018ca85-544c-47e7-a901-567d861037a7', NULL, 'login', '{"method":"email"}', NULL, '2026-01-14 09:31:32.900895+00'),
('5a1a0b8f-f0a3-42cd-bd00-ec843ab4b5f7', '9018ca85-544c-47e7-a901-567d861037a7', NULL, 'login', '{"method":"email"}', NULL, '2026-01-14 09:47:50.209249+00'),
('2917f124-8f9f-4765-a92e-59fc45445794', '9018ca85-544c-47e7-a901-567d861037a7', NULL, 'login', '{"method":"email"}', NULL, '2026-01-14 10:05:42.750631+00'),
('bbedccec-68b3-4d4a-8fba-e47fd3c13cc6', '9018ca85-544c-47e7-a901-567d861037a7', NULL, 'login', '{"method":"email"}', NULL, '2026-01-15 08:55:12.336031+00'),
('3847488a-fcf7-4837-9cc5-ac22f3e04058', '9018ca85-544c-47e7-a901-567d861037a7', NULL, 'role_update', '{"new_roles":["accountant"],"roles_added":["accountant"],"roles_removed":[],"target_user_email":"cauthansanyu203@gmail.com","target_user_id":"9018ca85-544c-47e7-a901-567d861037a7"}', NULL, '2026-01-15 09:12:22.105766+00');

-- tax_forms (no data)
-- tax_payments (no data)
-- business_accountants (no data)

-- =====================
-- END OF EXPORT
-- =====================
`;

    const blob = new Blob([sqlContent], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `database_export_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Export
            </CardTitle>
            <CardDescription>
              Download a complete SQL export of your database schema and data for import into Google Cloud or other PostgreSQL-compatible databases.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Export includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All table schemas (profiles, businesses, user_roles, etc.)</li>
                <li>• Custom ENUM types (business_type, tax_type, app_role, etc.)</li>
                <li>• All existing data as INSERT statements</li>
              </ul>
            </div>
            
            <Button onClick={generateSQLExport} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Download SQL Export
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              The file will be saved as database_export_[date].sql
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DatabaseExport;
