import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/onboarding/Onboarding";
import BusinessesList from "./pages/businesses/BusinessesList";
import CreateBusiness from "./pages/businesses/CreateBusiness";
import BusinessDetail from "./pages/businesses/BusinessDetail";
import TaxFormWizard from "./components/tax/TaxFormWizard";
import TaxFormDetail from "./pages/tax/TaxFormDetail";
import TaxTemplates from "./pages/tax/TaxTemplates";
import TaxCalculator from "./pages/tax/TaxCalculator";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AuditTrail from "./pages/admin/AuditTrail";
import AccountantDashboard from "./pages/accountant/AccountantDashboard";
import AccountantWelcome from "./pages/accountant/AccountantWelcome";
import Profile from "./pages/profile/Profile";
import ExpensesList from "./pages/expenses/ExpensesList";
import BusinessExpenses from "./pages/expenses/BusinessExpenses";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute requiredRoles={["sme_owner", "admin"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/businesses" element={<ProtectedRoute><BusinessesList /></ProtectedRoute>} />
            <Route path="/businesses/new" element={<ProtectedRoute><CreateBusiness /></ProtectedRoute>} />
            <Route path="/businesses/:businessId" element={<ProtectedRoute><BusinessDetail /></ProtectedRoute>} />
            <Route path="/businesses/:businessId/tax/new" element={<ProtectedRoute><TaxFormWizard /></ProtectedRoute>} />
            <Route path="/tax/:formId" element={<ProtectedRoute><TaxFormDetail /></ProtectedRoute>} />
            <Route path="/tax/templates" element={<ProtectedRoute><TaxTemplates /></ProtectedRoute>} />
            <Route path="/tax/calculator" element={<ProtectedRoute><TaxCalculator /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute requiredRoles={["sme_owner", "admin"]}><ExpensesList /></ProtectedRoute>} />
            <Route path="/businesses/:businessId/expenses" element={<ProtectedRoute><BusinessExpenses /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute requiredRoles={["admin"]}><AuditTrail /></ProtectedRoute>} />
            <Route path="/accountant" element={<ProtectedRoute requiredRoles={["accountant"]}><AccountantDashboard /></ProtectedRoute>} />
            <Route path="/accountant/welcome" element={<ProtectedRoute requiredRoles={["accountant"]}><AccountantWelcome /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
