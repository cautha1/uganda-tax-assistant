import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Key, Eye, EyeOff, Loader2, Check, X } from "lucide-react";

export function SecuritySettings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });
  const [passwords, setPasswords] = useState({
    new: "",
    confirm: "",
  });

  const passwordRequirements = {
    minLength: passwords.new.length >= 8,
    hasUppercase: /[A-Z]/.test(passwords.new),
    hasNumber: /[0-9]/.test(passwords.new),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = passwords.new === passwords.confirm && passwords.confirm.length > 0;

  const handlePasswordChange = async () => {
    if (!isPasswordValid || !passwordsMatch) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      // Log the password change
      await supabase.from("audit_logs").insert({
        user_id: user?.id,
        action: "password_changed",
        details: { timestamp: new Date().toISOString() },
      });

      toast({
        title: t('settings.security.passwordChanged'),
        description: t('settings.security.passwordChangedDesc'),
      });

      setPasswords({ new: "", confirm: "" });
      setIsChangingPassword(false);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('errors.generic'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('settings.security.passwordTitle')}
          </CardTitle>
          <CardDescription>{t('settings.security.passwordDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isChangingPassword ? (
            <Button onClick={() => setIsChangingPassword(true)} variant="outline">
              <Key className="mr-2 h-4 w-4" />
              {t('settings.security.changePassword')}
            </Button>
          ) : (
            <div className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('settings.security.newPassword')}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwords.new}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, new: e.target.value }))}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {/* Password Requirements */}
                <div className="space-y-1 text-sm">
                  <div className={`flex items-center gap-2 ${passwordRequirements.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordRequirements.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {t('auth.passwordRequirements.minLength')}
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordRequirements.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {t('auth.passwordRequirements.uppercase')}
                  </div>
                  <div className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordRequirements.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {t('auth.passwordRequirements.number')}
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                    placeholder="••••••••"
                    className={`pr-10 ${passwords.confirm && !passwordsMatch ? 'border-destructive' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {passwords.confirm && !passwordsMatch && (
                  <p className="text-sm text-destructive">{t('auth.errors.passwordsDontMatch')}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handlePasswordChange}
                  disabled={!isPasswordValid || !passwordsMatch || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('settings.security.updatePassword')
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswords({ new: "", confirm: "" });
                  }}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.security.infoTitle')}
          </CardTitle>
          <CardDescription>{t('settings.security.infoDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">{t('settings.security.emailVerified')}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">{t('settings.security.rlsProtection')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.security.rlsProtectionDesc')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
