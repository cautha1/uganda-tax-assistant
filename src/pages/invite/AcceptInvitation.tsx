import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  Mail, 
  Eye, 
  Edit, 
  Upload, 
  FileText,
  LogIn,
  UserPlus,
  AlertCircle
} from "lucide-react";

interface InvitationDetails {
  id: string;
  accountant_email: string;
  business_name: string;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_upload: boolean;
    can_generate_reports: boolean;
  };
  expires_at: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailMismatch, setEmailMismatch] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setIsVerifying(false);
      return;
    }

    verifyToken();
  }, [token]);

  // Check email match when user logs in
  useEffect(() => {
    if (user && invitation) {
      const userEmail = user.email?.toLowerCase();
      const inviteEmail = invitation.accountant_email.toLowerCase();
      setEmailMismatch(userEmail !== inviteEmail);
    }
  }, [user, invitation]);

  async function verifyToken() {
    if (!token) return;

    setIsVerifying(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-invitation-token", {
        body: { token },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.valid) {
        setError(data.error || "Invalid invitation");
        setInvitation(null);
      } else {
        setInvitation(data.invitation);
      }
    } catch (err: any) {
      console.error("Error verifying token:", err);
      setError("Failed to verify invitation. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleAccept() {
    if (!token || !user) return;

    setIsAccepting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("accept-invitation", {
        body: { token },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        toast({
          title: "Could not accept invitation",
          description: data.error,
          variant: "destructive",
        });
        setIsAccepting(false);
        return;
      }

      toast({
        title: "Invitation accepted!",
        description: `You now have access to ${invitation?.business_name}`,
      });

      // Redirect to accountant dashboard
      navigate("/accountant");
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast({
        title: "Error",
        description: "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
      setIsAccepting(false);
    }
  }

  // Redirect URL for after auth
  const returnUrl = `/invite/accept?token=${token}`;
  const loginUrl = `/login?redirect=${encodeURIComponent(returnUrl)}`;
  const registerUrl = `/register?redirect=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(invitation?.accountant_email || "")}`;

  // Loading state
  if (isVerifying || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              The invitation link may have expired or already been used.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild>
                <Link to="/accountant">Go to Dashboard</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Contact the business owner to request a new invitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation, user not signed in
  if (!user && invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              Sign in or create an account to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Business</p>
                  <p className="font-medium">{invitation.business_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Invitation sent to</p>
                  <p className="font-medium">{invitation.accountant_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {new Date(invitation.expires_at).toLocaleDateString("en-UG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                You must sign in with <strong>{invitation.accountant_email}</strong> to accept this invitation.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild size="lg">
                <Link to={loginUrl}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link to={registerUrl}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User signed in but email doesn't match
  if (user && invitation && emailMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Email Mismatch</CardTitle>
            <CardDescription>
              You're signed in with a different email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Invitation sent to:</span>
                <br />
                <strong>{invitation.accountant_email}</strong>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">You're signed in as:</span>
                <br />
                <strong>{user.email}</strong>
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Please sign out and sign in with <strong>{invitation.accountant_email}</strong> to accept this invitation.
            </p>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut();
                // Page will re-render to unauthenticated state
              }}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User signed in with correct email
  if (user && invitation && !emailMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              You've been invited to manage tax filings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold text-lg">{invitation.business_name}</p>
                  <p className="text-sm text-muted-foreground">is inviting you to join as an accountant</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Your Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {invitation.permissions.can_view && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> View Data
                    </Badge>
                  )}
                  {invitation.permissions.can_edit && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Edit className="h-3 w-3" /> Edit Forms
                    </Badge>
                  )}
                  {invitation.permissions.can_upload && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Upload className="h-3 w-3" /> Upload Docs
                    </Badge>
                  )}
                  {invitation.permissions.can_generate_reports && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Reports
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                onClick={handleAccept} 
                disabled={isAccepting}
                className="w-full"
              >
                {isAccepting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Invitation
                  </>
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/accountant">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
