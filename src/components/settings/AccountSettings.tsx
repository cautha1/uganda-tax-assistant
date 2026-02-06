import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { LogOut, Loader2, AlertTriangle, UserX } from "lucide-react";

export function AccountSettings() {
  const navigate = useNavigate();
  const { signOut, user, hasRole } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Log the sign out
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "user_signed_out",
        details: { timestamp: new Date().toISOString() },
      });

      await signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('errors.generic'),
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
      setShowSignOutDialog(false);
    }
  };

  const userRole = hasRole("admin") ? "Admin" : hasRole("accountant") ? "Accountant" : "Business Owner";

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.account.overview')}</CardTitle>
          <CardDescription>{t('settings.account.overviewDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">{t('settings.account.email')}</dt>
              <dd className="font-medium mt-1">{user?.email}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">{t('settings.account.role')}</dt>
              <dd className="font-medium mt-1">{userRole}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">{t('settings.account.lastSignIn')}</dt>
              <dd className="font-medium mt-1">
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString("en-UG")
                  : "N/A"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            {t('settings.account.signOutTitle')}
          </CardTitle>
          <CardDescription>{t('settings.account.signOutDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setShowSignOutDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('nav.signOut')}
          </Button>
        </CardContent>
      </Card>

      {/* Data & Privacy Notice */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5" />
            {t('settings.account.dataPrivacy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('settings.account.dataPrivacyDesc')}
          </p>
        </CardContent>
      </Card>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.account.signOutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.account.signOutConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.signOut')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
