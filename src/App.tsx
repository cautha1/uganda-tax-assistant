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
import BusinessesList from "./pages/businesses/BusinessesList";
import CreateBusiness from "./pages/businesses/CreateBusiness";
import BusinessDetail from "./pages/businesses/BusinessDetail";
import TaxFormWizard from "./components/tax/TaxFormWizard";
import TaxTemplates from "./pages/tax/TaxTemplates";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AuditTrail from "./pages/admin/AuditTrail";
import AccountantDashboard from "./pages/accountant/AccountantDashboard";
import NotFound from "./pages/NotFound";

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
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/businesses" element={<ProtectedRoute><BusinessesList /></ProtectedRoute>} />
            <Route path="/businesses/new" element={<ProtectedRoute><CreateBusiness /></ProtectedRoute>} />
            <Route path="/businesses/:businessId" element={<ProtectedRoute><BusinessDetail /></ProtectedRoute>} />
            <Route path="/businesses/:businessId/tax/new" element={<ProtectedRoute><TaxFormWizard /></ProtectedRoute>} />
            <Route path="/tax/templates" element={<ProtectedRoute><TaxTemplates /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute requiredRoles={["admin"]}><AuditTrail /></ProtectedRoute>} />
            <Route path="/accountant" element={<ProtectedRoute requiredRoles={["accountant"]}><AccountantDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
