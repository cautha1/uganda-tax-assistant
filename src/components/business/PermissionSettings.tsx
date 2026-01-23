import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Eye, Edit, Upload, FileText, Settings } from "lucide-react";

interface Permission {
  key: "can_view" | "can_edit" | "can_upload" | "can_generate_reports";
  label: string;
  description: string;
  icon: React.ReactNode;
}

const PERMISSIONS: Permission[] = [
  {
    key: "can_view",
    label: "View Data",
    description: "View business data and tax forms",
    icon: <Eye className="h-4 w-4" />,
  },
  {
    key: "can_edit",
    label: "Edit Forms",
    description: "Edit tax forms in draft or validated status",
    icon: <Edit className="h-4 w-4" />,
  },
  {
    key: "can_upload",
    label: "Upload Documents",
    description: "Upload supporting documents",
    icon: <Upload className="h-4 w-4" />,
  },
  {
    key: "can_generate_reports",
    label: "Generate Reports",
    description: "Generate audit and compliance reports",
    icon: <FileText className="h-4 w-4" />,
  },
];

interface AccountantWithPermissions {
  id: string;
  accountant_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_upload: boolean;
  can_generate_reports: boolean;
  profile: {
    name: string;
    email: string;
  } | null;
}

interface PermissionSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountant: AccountantWithPermissions;
  businessId: string;
  businessName: string;
  onUpdate: () => void;
}

export function PermissionSettings({
  open,
  onOpenChange,
  accountant,
  businessId,
  businessName,
  onUpdate,
}: PermissionSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState({
    can_view: accountant.can_view,
    can_edit: accountant.can_edit,
    can_upload: accountant.can_upload,
    can_generate_reports: accountant.can_generate_reports,
  });

  const handlePermissionChange = (key: keyof typeof permissions, checked: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("business_accountants")
        .update({
          can_view: permissions.can_view,
          can_edit: permissions.can_edit,
          can_upload: permissions.can_upload,
          can_generate_reports: permissions.can_generate_reports,
        })
        .eq("id", accountant.id);

      if (error) throw error;

      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        business_id: businessId,
        action: "accountant_permissions_updated",
        details: {
          accountant_id: accountant.accountant_id,
          accountant_email: accountant.profile?.email,
          permissions,
        },
      });

      toast({
        title: "Permissions updated",
        description: `Updated permissions for ${accountant.profile?.name || "accountant"}.`,
      });

      onOpenChange(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast({
        title: "Update failed",
        description: "Failed to update permissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Permissions
          </DialogTitle>
          <DialogDescription>
            Set what {accountant.profile?.name || "this accountant"} can do for {businessName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {PERMISSIONS.map((permission) => (
            <div
              key={permission.key}
              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={permission.key}
                checked={permissions[permission.key]}
                onCheckedChange={(checked) =>
                  handlePermissionChange(permission.key, checked as boolean)
                }
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={permission.key}
                  className="flex items-center gap-2 cursor-pointer font-medium"
                >
                  {permission.icon}
                  {permission.label}
                </Label>
                <p className="text-sm text-muted-foreground">{permission.description}</p>
              </div>
            </div>
          ))}

          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Accountants can never submit tax returns or delete businesses.
              Only the business owner can perform final submissions.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
