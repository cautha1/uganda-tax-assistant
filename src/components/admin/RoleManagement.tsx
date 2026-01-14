import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ShieldCheck, UserCog } from "lucide-react";

type AppRole = "sme_owner" | "accountant" | "admin" | "guest";

interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  roles: AppRole[];
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "sme_owner", label: "Business Owner", description: "Can create and manage their own businesses" },
  { value: "accountant", label: "Accountant", description: "Can be assigned to businesses to manage tax filings" },
  { value: "admin", label: "Administrator", description: "Full platform access and user management" },
];

interface RoleManagementDialogProps {
  user: UserWithRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRolesUpdated: () => void;
}

export function RoleManagementDialog({
  user,
  open,
  onOpenChange,
  onRolesUpdated,
}: RoleManagementDialogProps) {
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialRoles, setInitialRoles] = useState<AppRole[]>([]);

  // Update selected roles when user changes
  useState(() => {
    if (user) {
      setSelectedRoles(user.roles);
      setInitialRoles(user.roles);
    }
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && user) {
      setSelectedRoles(user.roles);
      setInitialRoles(user.roles);
    }
    onOpenChange(newOpen);
  };

  const handleRoleToggle = (role: AppRole, checked: boolean) => {
    if (checked) {
      setSelectedRoles((prev) => [...prev, role]);
    } else {
      setSelectedRoles((prev) => prev.filter((r) => r !== role));
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Find roles to add and remove
      const rolesToAdd = selectedRoles.filter((r) => !initialRoles.includes(r));
      const rolesToRemove = initialRoles.filter((r) => !selectedRoles.includes(r));

      // Remove roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .in("role", rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase.from("user_roles").insert(
          rolesToAdd.map((role) => ({
            user_id: user.id,
            role,
          }))
        );

        if (insertError) throw insertError;
      }

      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "role_update",
        details: {
          target_user_id: user.id,
          target_user_email: user.email,
          roles_added: rolesToAdd,
          roles_removed: rolesToRemove,
          new_roles: selectedRoles,
        },
      });

      toast({
        title: "Roles updated",
        description: `Successfully updated roles for ${user.name}`,
      });

      onRolesUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating roles:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update roles. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    selectedRoles.length !== initialRoles.length ||
    selectedRoles.some((r) => !initialRoles.includes(r));

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Manage User Roles
          </DialogTitle>
          <DialogDescription>
            Assign roles to {user.name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {AVAILABLE_ROLES.map((role) => (
            <div
              key={role.value}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={role.value}
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={(checked) =>
                  handleRoleToggle(role.value, checked as boolean)
                }
              />
              <div className="flex-1">
                <Label
                  htmlFor={role.value}
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  {role.label}
                  {role.value === "admin" && (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  )}
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {role.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Role badge component for displaying user roles
export function RoleBadges({ roles }: { roles: AppRole[] }) {
  const roleColors: Record<AppRole, string> = {
    admin: "bg-primary/10 text-primary",
    sme_owner: "bg-secondary/10 text-secondary",
    accountant: "bg-info/10 text-info",
    guest: "bg-muted text-muted-foreground",
  };

  const roleLabels: Record<AppRole, string> = {
    admin: "Admin",
    sme_owner: "Owner",
    accountant: "Accountant",
    guest: "Guest",
  };

  if (roles.length === 0) {
    return <span className="text-muted-foreground text-sm">No roles</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge key={role} className={roleColors[role]}>
          {roleLabels[role]}
        </Badge>
      ))}
    </div>
  );
}
