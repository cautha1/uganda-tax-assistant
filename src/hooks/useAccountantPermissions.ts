import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface AccountantPermissions {
  can_view: boolean;
  can_edit: boolean;
  can_upload: boolean;
  can_generate_reports: boolean;
}

interface UseAccountantPermissionsResult {
  permissions: AccountantPermissions | null;
  isAccountant: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  canSubmit: boolean; // Only owners can submit
  refetch: () => Promise<void>;
}

export function useAccountantPermissions(businessId: string): UseAccountantPermissionsResult {
  const { user, hasRole } = useAuth();
  const [permissions, setPermissions] = useState<AccountantPermissions | null>(null);
  const [isAccountant, setIsAccountant] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = hasRole("admin");

  const fetchPermissions = useCallback(async () => {
    if (!user || !businessId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Check if user is the business owner
      const { data: business } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", businessId)
        .single();

      const ownerStatus = business?.owner_id === user.id;
      setIsOwner(ownerStatus);

      // If owner or admin, they have full permissions
      if (ownerStatus || isAdmin) {
        setPermissions({
          can_view: true,
          can_edit: true,
          can_upload: true,
          can_generate_reports: true,
        });
        setIsAccountant(false);
        setIsLoading(false);
        return;
      }

      // Check if user is an assigned accountant with permissions
      const { data: assignment } = await supabase
        .from("business_accountants")
        .select("can_view, can_edit, can_upload, can_generate_reports")
        .eq("business_id", businessId)
        .eq("accountant_id", user.id)
        .single();

      if (assignment) {
        setIsAccountant(true);
        setPermissions({
          can_view: assignment.can_view,
          can_edit: assignment.can_edit,
          can_upload: assignment.can_upload,
          can_generate_reports: assignment.can_generate_reports,
        });
      } else {
        setIsAccountant(false);
        setPermissions(null);
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, businessId, isAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    isAccountant,
    isOwner,
    isAdmin,
    isLoading,
    canSubmit: isOwner || isAdmin, // Only owners and admins can submit
    refetch: fetchPermissions,
  };
}
