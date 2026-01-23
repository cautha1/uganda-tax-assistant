import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, X, Users, Mail, AlertCircle, Settings, Eye, Edit, Upload, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PermissionSettings } from "./PermissionSettings";

interface AccountantWithPermissions {
  id: string;
  accountant_id: string;
  assigned_at: string;
  can_view: boolean;
  can_edit: boolean;
  can_upload: boolean;
  can_generate_reports: boolean;
  profile: {
    name: string;
    email: string;
  } | null;
}

interface AccountantManagementProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
  isAdmin?: boolean;
}

export function AccountantManagement({ businessId, businessName, isOwner, isAdmin = false }: AccountantManagementProps) {
  const canManage = isOwner || isAdmin;
  const [accountants, setAccountants] = useState<AccountantWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [accountantToRemove, setAccountantToRemove] = useState<AccountantWithPermissions | null>(null);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedAccountant, setSelectedAccountant] = useState<AccountantWithPermissions | null>(null);
  
  // Initial permissions for new invites
  const [initialPermissions, setInitialPermissions] = useState({
    can_view: true,
    can_edit: true,
    can_upload: true,
    can_generate_reports: true,
  });
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAccountants();
  }, [businessId]);

  async function fetchAccountants() {
    setIsLoading(true);
    
    // Fetch accountant assignments with permissions
    const { data: assignments, error: assignError } = await supabase
      .from("business_accountants")
      .select("id, accountant_id, assigned_at, can_view, can_edit, can_upload, can_generate_reports")
      .eq("business_id", businessId);

    if (assignError) {
      console.error("Error fetching accountants:", assignError);
      setIsLoading(false);
      return;
    }

    // Fetch profiles for each accountant
    const accountantsWithProfiles: AccountantWithPermissions[] = [];
    for (const assignment of assignments || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", assignment.accountant_id)
        .single();
      
      accountantsWithProfiles.push({
        ...assignment,
        profile: profile || null,
      });
    }

    setAccountants(accountantsWithProfiles);
    setIsLoading(false);
  }

  async function handleInviteAccountant() {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter the accountant's email address.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("email", inviteEmail.trim().toLowerCase())
      .single();

    if (profileError || !profile) {
      toast({
        title: "User not found",
        description: "No user found with this email address. They must register first.",
        variant: "destructive",
      });
      setIsInviting(false);
      return;
    }

    // Check if user has accountant role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id);

    const hasAccountantRole = roles?.some((r) => r.role === "accountant");
    
    if (!hasAccountantRole) {
      toast({
        title: "Not an accountant",
        description: "This user does not have the accountant role. Contact an admin to assign the role.",
        variant: "destructive",
      });
      setIsInviting(false);
      return;
    }

    // Check if already assigned
    const existingAssignment = accountants.find((a) => a.accountant_id === profile.id);
    if (existingAssignment) {
      toast({
        title: "Already assigned",
        description: "This accountant is already assigned to your business.",
        variant: "destructive",
      });
      setIsInviting(false);
      return;
    }

    // Create assignment with granular permissions
    const { error: insertError } = await supabase
      .from("business_accountants")
      .insert({
        business_id: businessId,
        accountant_id: profile.id,
        assigned_by: user?.id,
        can_view: initialPermissions.can_view,
        can_edit: initialPermissions.can_edit,
        can_upload: initialPermissions.can_upload,
        can_generate_reports: initialPermissions.can_generate_reports,
      });

    if (insertError) {
      toast({
        title: "Assignment failed",
        description: insertError.message,
        variant: "destructive",
      });
      setIsInviting(false);
      return;
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      business_id: businessId,
      action: "accountant_assigned",
      details: {
        accountant_id: profile.id,
        accountant_email: profile.email,
        accountant_name: profile.name,
      },
    });

    toast({
      title: "Accountant assigned",
      description: `${profile.name} can now manage tax filings for ${businessName}.`,
    });

    setInviteEmail("");
    setDialogOpen(false);
    setIsInviting(false);
    fetchAccountants();
  }

  async function handleRemoveAccountant() {
    if (!accountantToRemove) return;

    const { error } = await supabase
      .from("business_accountants")
      .delete()
      .eq("id", accountantToRemove.id);

    if (error) {
      toast({
        title: "Removal failed",
        description: error.message,
        variant: "destructive",
      });
      setRemoveDialogOpen(false);
      setAccountantToRemove(null);
      return;
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user?.id,
      business_id: businessId,
      action: "accountant_removed",
      details: {
        accountant_id: accountantToRemove.accountant_id,
        accountant_email: accountantToRemove.profile?.email,
        accountant_name: accountantToRemove.profile?.name,
      },
    });

    toast({
      title: "Accountant removed",
      description: `${accountantToRemove.profile?.name || "Accountant"} no longer has access to this business.`,
    });

    setRemoveDialogOpen(false);
    setAccountantToRemove(null);
    fetchAccountants();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigned Accountants
          </CardTitle>
          <CardDescription>
            Accountants who can manage tax filings for this business
          </CardDescription>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Accountant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Accountant</DialogTitle>
                <DialogDescription>
                  Enter the email of a registered accountant to give them access to manage tax filings for {businessName}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="accountant-email">Accountant Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="accountant-email"
                      type="email"
                      placeholder="accountant@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Initial Permissions</Label>
                  <div className="grid gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perm-view"
                        checked={initialPermissions.can_view}
                        onCheckedChange={(checked) =>
                          setInitialPermissions((prev) => ({ ...prev, can_view: !!checked }))
                        }
                      />
                      <Label htmlFor="perm-view" className="flex items-center gap-2 cursor-pointer">
                        <Eye className="h-4 w-4" /> View Data
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perm-edit"
                        checked={initialPermissions.can_edit}
                        onCheckedChange={(checked) =>
                          setInitialPermissions((prev) => ({ ...prev, can_edit: !!checked }))
                        }
                      />
                      <Label htmlFor="perm-edit" className="flex items-center gap-2 cursor-pointer">
                        <Edit className="h-4 w-4" /> Edit Forms
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perm-upload"
                        checked={initialPermissions.can_upload}
                        onCheckedChange={(checked) =>
                          setInitialPermissions((prev) => ({ ...prev, can_upload: !!checked }))
                        }
                      />
                      <Label htmlFor="perm-upload" className="flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" /> Upload Documents
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="perm-reports"
                        checked={initialPermissions.can_generate_reports}
                        onCheckedChange={(checked) =>
                          setInitialPermissions((prev) => ({ ...prev, can_generate_reports: !!checked }))
                        }
                      />
                      <Label htmlFor="perm-reports" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="h-4 w-4" /> Generate Reports
                      </Label>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    The accountant must be registered on the platform and have the accountant role. They can never submit tax returns – only you can.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteAccountant} disabled={isInviting}>
                  {isInviting ? "Inviting..." : "Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading accountants...</div>
        ) : accountants.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No accountants assigned</h3>
            <p className="text-muted-foreground mb-4">
              {canManage
                ? "Invite an accountant to help manage your tax filings."
                : "No accountants have been assigned to this business yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accountants.map((accountant) => (
              <div
                key={accountant.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">
                      {accountant.profile?.name?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{accountant.profile?.name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{accountant.profile?.email || "No email"}</p>
                    <div className="flex gap-1 mt-1">
                      {accountant.can_view && (
                        <Badge variant="outline" className="text-xs py-0">
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Badge>
                      )}
                      {accountant.can_edit && (
                        <Badge variant="outline" className="text-xs py-0">
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Badge>
                      )}
                      {accountant.can_upload && (
                        <Badge variant="outline" className="text-xs py-0">
                          <Upload className="h-3 w-3 mr-1" /> Upload
                        </Badge>
                      )}
                      {accountant.can_generate_reports && (
                        <Badge variant="outline" className="text-xs py-0">
                          <FileText className="h-3 w-3 mr-1" /> Reports
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    Assigned {formatDate(accountant.assigned_at)}
                  </Badge>
                  {canManage && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedAccountant(accountant);
                          setPermissionDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setAccountantToRemove(accountant);
                          setRemoveDialogOpen(true);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Accountant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {accountantToRemove?.profile?.name || "this accountant"} from {businessName}? They will no longer be able to view or manage tax filings for this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAccountant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permission Settings Dialog */}
      {selectedAccountant && (
        <PermissionSettings
          open={permissionDialogOpen}
          onOpenChange={setPermissionDialogOpen}
          accountant={selectedAccountant}
          businessId={businessId}
          businessName={businessName}
          onUpdate={fetchAccountants}
        />
      )}
    </Card>
  );
}
