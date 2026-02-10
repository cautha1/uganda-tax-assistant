import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { Building2, Eye, EyeOff, ArrowLeft, CheckCircle2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

type UserRole = "sme_owner" | "accountant";

interface RoleOption {
  value: UserRole;
  labelKey: string;
  descKey: string;
  icon: typeof Building2;
}

const roleOptions: RoleOption[] = [
  {
    value: "sme_owner",
    labelKey: "auth.businessOwner",
    descKey: "auth.businessOwnerDesc",
    icon: Building2,
  },
  {
    value: "accountant",
    labelKey: "auth.accountantAuditor",
    descKey: "auth.accountantDesc",
    icon: Briefcase,
  },
];

export default function Register() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("sme_owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waitingForRoles, setWaitingForRoles] = useState(false);
  const [registeredRole, setRegisteredRole] = useState<UserRole | null>(null);
  const { signUp, user, roles } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wait for roles to be loaded after successful registration, then navigate
  useEffect(() => {
    if (waitingForRoles && user && roles.length > 0 && registeredRole) {
      setWaitingForRoles(false);
      if (registeredRole === "accountant" && roles.includes("accountant")) {
        navigate("/accountant/welcome");
      } else if (registeredRole === "sme_owner" && roles.includes("sme_owner")) {
        navigate("/onboarding");
      } else {
        // Fallback - navigate based on what role they have
        if (roles.includes("accountant")) {
          navigate("/accountant/welcome");
        } else {
          navigate("/onboarding");
        }
      }
    }
  }, [waitingForRoles, user, roles, registeredRole, navigate]);

  const passwordRequirements = [
    { met: password.length >= 8, text: t('auth.passwordRequirements.minLength') },
    { met: /[A-Z]/.test(password), text: t('auth.passwordRequirements.uppercase') },
    { met: /[0-9]/.test(password), text: t('auth.passwordRequirements.number') },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t('auth.errors.passwordsDontMatch'),
        description: t('auth.errors.passwordsDontMatchDesc'),
      });
      return;
    }

    if (!isPasswordValid) {
      toast({
        variant: "destructive",
        title: t('auth.errors.passwordTooWeak'),
        description: t('auth.errors.passwordTooWeakDesc'),
      });
      return;
    }

    if (!acceptTerms) {
      toast({
        variant: "destructive",
        title: t('auth.errors.termsRequired'),
        description: t('auth.errors.termsRequiredDesc'),
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, name, selectedRole);

    if (error) {
      toast({
        variant: "destructive",
        title: t('auth.errors.registrationFailed'),
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: t('auth.accountCreated'),
      description: selectedRole === "accountant" 
        ? t('auth.welcomeAccountant')
        : t('auth.welcomeSME'),
    });

    // Set state to wait for roles to be loaded before navigating
    setRegisteredRole(selectedRole);
    setWaitingForRoles(true);
    // Keep isLoading true while waiting for navigation
  };

  const benefits = [
    t('landing.benefits.easyGeneration'),
    t('landing.benefits.assignAccountants'),
    t('landing.benefits.auditTrail'),
    t('landing.benefits.mobileFriendly'),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-hero items-center justify-center p-12">
        <div className="max-w-md">
          <h2 className="text-3xl font-display font-bold mb-6 text-primary-foreground">
            {t('landing.benefits.title')}
          </h2>
          <ul className="space-y-4">
            {benefits.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-primary-foreground/90"
              >
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 py-8 overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('nav.backToHome')}
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">TaxAudit Uganda</span>
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              {t('auth.signUp')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('auth.haveAccount')}{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                {t('auth.signInHere')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>{t('auth.iAmA')}</Label>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedRole === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedRole(option.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={cn("font-medium text-sm", isSelected && "text-primary")}>
                          {t(option.labelKey)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                          {t(option.descKey)}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-primary absolute top-2 right-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.fullName')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.fullNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

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
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
              {password && (
                <ul className="mt-2 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <li
                      key={i}
                      className={`text-xs flex items-center gap-2 ${
                        req.met ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {req.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) =>
                  setAcceptTerms(checked as boolean)
                }
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-tight cursor-pointer"
              >
                {t('auth.termsAccept')}{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  {t('auth.termsOfService')}
                </Link>{" "}
                {t('common.and')}{" "}
                <Link to="/privacy" className="text-primary hover:underline">
                  {t('auth.privacyPolicy')}
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !acceptTerms}
            >
              {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </Button>
          </form>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
