import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { Building2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  ACCOUNTANT_SESSION_START_KEY, 
  ACCOUNTANT_LAST_ACTIVITY_KEY,
  ACCOUNTANT_REAUTH_EMAIL_KEY 
} from "@/hooks/useAccountantSessionManager";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        variant: "destructive",
        title: t('auth.errors.signInFailed'),
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    // Log audit event and get user roles for redirection
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      // Log the login event
      supabase.from("audit_logs").insert({
        user_id: authUser.id,
        action: "login",
        details: { method: "email" },
      });

      // Fetch user roles to determine redirect destination
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      const roles = userRoles?.map((r) => r.role) || [];
      console.log("User roles after login:", roles);

      // Check if user is accountant-only (not admin or sme_owner)
      const isAccountantOnly = roles.includes("accountant") && 
        !roles.includes("admin") && 
        !roles.includes("sme_owner");

      // Initialize session tracking for accountants
      if (isAccountantOnly) {
        const now = Date.now().toString();
        localStorage.setItem(ACCOUNTANT_SESSION_START_KEY, now);
        localStorage.setItem(ACCOUNTANT_LAST_ACTIVITY_KEY, now);
        // Clear any reauth email from previous session
        localStorage.removeItem(ACCOUNTANT_REAUTH_EMAIL_KEY);
        console.log("Accountant session tracking initialized");
      }

      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.signInSuccess'),
      });

      setIsLoading(false);

      // Role-based redirect - check accountant BEFORE sme_owner
      if (roles.includes("admin")) {
        navigate("/admin", { replace: true });
      } else if (roles.includes("accountant")) {
        navigate("/accountant", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
      return;
    }

    setIsLoading(false);
    toast({
      title: t('auth.welcomeBack'),
      description: t('auth.signInSuccess'),
    });

    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('nav.backToHome')}
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">TaxAudit Uganda</span>
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              {t('auth.signIn')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('auth.noAccount')}{" "}
              <Link
                to="/register"
                className="font-medium text-primary hover:underline"
              >
                {t('auth.registerHere')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('auth.signingIn') : t('auth.signInButton')}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-hero items-center justify-center p-12">
        <div className="max-w-md text-center text-primary-foreground">
          <h2 className="text-3xl font-display font-bold mb-4">
            {t('landing.heroPanel.title')}
          </h2>
          <p className="text-primary-foreground/80">
            {t('landing.heroPanel.description')}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <div className="text-2xl font-bold">10,000+</div>
              <div className="text-primary-foreground/70">{t('landing.stats.smesServed')}</div>
            </div>
            <div className="bg-primary-foreground/10 rounded-lg p-4">
              <div className="text-2xl font-bold">UGX 50B+</div>
              <div className="text-primary-foreground/70">{t('landing.stats.taxFiled')}</div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
