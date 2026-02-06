import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { PageLoader } from "@/components/ui/LoadingSpinner";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: Array<"sme_owner" | "accountant" | "admin" | "guest">;
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, roles, rolesLoaded, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth state
  if (isLoading) {
    return <PageLoader />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we have required roles, wait for roles to be loaded
  if (requiredRoles && requiredRoles.length > 0) {
    // Wait for roles to be fetched from DB
    if (!rolesLoaded) {
      return <PageLoader />;
    }

    const hasRequiredRole = requiredRoles.some((role) => roles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
