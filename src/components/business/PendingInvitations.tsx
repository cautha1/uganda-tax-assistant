import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Mail, Clock, RotateCcw, X, SendHorizonal } from "lucide-react";

interface Invitation {
  id: string;
  accountant_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_upload: boolean;
    can_generate_reports: boolean;
  };
}

interface PendingInvitationsProps {
  businessId: string;
  onUpdate?: () => void;
}

export function PendingInvitations({ businessId, onUpdate }: PendingInvitationsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<Invitation | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, [businessId]);

  async function fetchInvitations() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("accountant_invitations")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
    } else {
      // Map the data to our Invitation type
      const mapped = (data || []).map((inv) => ({
        id: inv.id,
        accountant_email: inv.accountant_email,
        status: inv.status,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        permissions: inv.permissions as Invitation["permissions"],
      }));
      setInvitations(mapped);
    }

    setIsLoading(false);
  }

  async function handleResend(invitation: Invitation) {
    setResendingId(invitation.id);

    try {
      const { data, error } = await supabase.functions.invoke("resend-invitation", {
        body: { invitation_id: invitation.id },
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Could not resend",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation resent",
          description: `A new invitation email has been sent to ${invitation.accountant_email}`,
        });
        fetchInvitations();
      }
    } catch (err: any) {
      console.error("Error resending invitation:", err);
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  }

  async function handleRevoke() {
    if (!invitationToRevoke || !user) return;

    setIsRevoking(true);

    try {
      const { error } = await supabase
        .from("accountant_invitations")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq("id", invitationToRevoke.id);

      if (error) throw error;

      // Log to audit trail
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        business_id: businessId,
        action: "INVITE_REVOKED",
        details: {
          invitation_id: invitationToRevoke.id,
          target_email: invitationToRevoke.accountant_email,
        },
      });

      toast({
        title: "Invitation revoked",
        description: `The invitation to ${invitationToRevoke.accountant_email} has been cancelled`,
      });

      fetchInvitations();
      onUpdate?.();
    } catch (err: any) {
      console.error("Error revoking invitation:", err);
      toast({
        title: "Error",
        description: "Failed to revoke invitation",
        variant: "destructive",
      });
    } finally {
      setIsRevoking(false);
      setRevokeDialogOpen(false);
      setInvitationToRevoke(null);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-UG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} left`;
    return "Expiring soon";
  }

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <SendHorizonal className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>
            Invitations waiting to be accepted by accountants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invitations.map((invitation) => {
              const isExpired = new Date(invitation.expires_at) < new Date();
              
              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.accountant_email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {isExpired ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          <span>{getTimeRemaining(invitation.expires_at)}</span>
                        )}
                        <span>•</span>
                        <span>Sent {formatDate(invitation.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isExpired ? "destructive" : "secondary"}>
                      {isExpired ? "Expired" : "Pending"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(invitation)}
                      disabled={resendingId === invitation.id}
                    >
                      {resendingId === invitation.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Resend
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setInvitationToRevoke(invitation);
                        setRevokeDialogOpen(true);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the invitation to{" "}
              <strong>{invitationToRevoke?.accountant_email}</strong>? 
              The invitation link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Revoke Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
