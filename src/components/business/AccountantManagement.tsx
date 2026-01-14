import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserPlus, X, Users, Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Accountant {
  id: string;
  accountant_id: string;
  assigned_at: string;
  profile: {
    name: string;
    email: string;
  } | null;
}

interface AccountantManagementProps {
  businessId: string;
  businessName: string;
  isOwner: boolean;
}

export function AccountantManagement({ businessId, businessName, isOwner }: AccountantManagementProps) {
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [accountantToRemove, setAccountantToRemove] = useState<Accountant | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAccountants();
  }, [businessId]);

  async function fetchAccountants() {
    setIsLoading(true);
    
    // Fetch accountant assignments
    const { data: assignments, error: assignError } = await supabase
      .from("business_accountants")
      .select("id, accountant_id, assigned_at")
      .eq("business_id", businessId);

    if (assignError) {
      console.error("Error fetching accountants:", assignError);
      setIsLoading(false);
      return;
    }

    // Fetch profiles for each accountant
    const accountantsWithProfiles: Accountant[] = [];
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

    // Create assignment
    const { error: insertError } = await supabase
      .from("business_accountants")
      .insert({
        business_id: businessId,
        accountant_id: profile.id,
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
        {isOwner && (
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
                <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    The accountant must be registered on the platform and have the accountant role assigned by an admin.
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
              {isOwner
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
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    Assigned {formatDate(accountant.assigned_at)}
                  </Badge>
                  {isOwner && (
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
    </Card>
  );
}
