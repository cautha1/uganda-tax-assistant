import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useToast } from "@/hooks/use-toast";
import { Building2, ShieldCheck, Mail, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import { 
  ACCOUNTANT_REAUTH_EMAIL_KEY, 
  ACCOUNTANT_SESSION_START_KEY,
  ACCOUNTANT_LAST_ACTIVITY_KEY 
} from "@/hooks/useAccountantSessionManager";

// Rate limiting constants
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_RESENDS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const OTP_LAST_SEND_KEY = "accountant_otp_last_send";
const OTP_SEND_HISTORY_KEY = "accountant_otp_send_history";

export default function Reauth() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const { user, roles, rolesLoaded } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Prefill email from localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem(ACCOUNTANT_REAUTH_EMAIL_KEY);
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  // If user is already logged in, redirect appropriately
  useEffect(() => {
    if (user && rolesLoaded) {
      // Clear reauth storage
      localStorage.removeItem(ACCOUNTANT_REAUTH_EMAIL_KEY);
      
      // Log reauth success
      supabase.functions.invoke("accountant-session-event", {
        body: {
          action: "reauth_success",
          email: user.email,
          user_id: user.id,
        },
      }).catch(console.error);

      // Redirect based on role
      if (roles.includes("accountant")) {
        // Reset session tracking for new session
        localStorage.setItem(ACCOUNTANT_SESSION_START_KEY, Date.now().toString());
        localStorage.setItem(ACCOUNTANT_LAST_ACTIVITY_KEY, Date.now().toString());
        navigate("/accountant", { replace: true });
      } else if (roles.includes("admin")) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, roles, rolesLoaded, navigate]);

  // Cooldown timer
  useEffect(() => {
    const lastSend = localStorage.getItem(OTP_LAST_SEND_KEY);
    if (lastSend) {
      const elapsed = Date.now() - parseInt(lastSend);
      const remaining = Math.max(0, OTP_COOLDOWN_MS - elapsed);
      setCooldownRemaining(Math.ceil(remaining / 1000));
    }

    const interval = setInterval(() => {
      const lastSend = localStorage.getItem(OTP_LAST_SEND_KEY);
      if (lastSend) {
        const elapsed = Date.now() - parseInt(lastSend);
        const remaining = Math.max(0, OTP_COOLDOWN_MS - elapsed);
        setCooldownRemaining(Math.ceil(remaining / 1000));
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check rate limiting
  const checkRateLimit = (): boolean => {
    const historyStr = localStorage.getItem(OTP_SEND_HISTORY_KEY);
    const history: number[] = historyStr ? JSON.parse(historyStr) : [];
    
    // Filter to only include sends within the rate limit window
    const now = Date.now();
    const recentSends = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    
    return recentSends.length < MAX_RESENDS_PER_WINDOW;
  };

  // Record OTP send
  const recordOtpSend = () => {
    const now = Date.now();
    localStorage.setItem(OTP_LAST_SEND_KEY, now.toString());

    const historyStr = localStorage.getItem(OTP_SEND_HISTORY_KEY);
    const history: number[] = historyStr ? JSON.parse(historyStr) : [];
    history.push(now);
    
    // Keep only recent sends
    const recentSends = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    localStorage.setItem(OTP_SEND_HISTORY_KEY, JSON.stringify(recentSends));
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email) {
      setError(t('validation.required'));
      return;
    }

    // Check cooldown
    if (cooldownRemaining > 0) {
      setError(t('auth.resendIn', { seconds: cooldownRemaining }));
      return;
    }

    // Check rate limit
    if (!checkRateLimit()) {
      setError(t('errors.generic'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call edge function to send OTP and log event
      const { data, error: fnError } = await supabase.functions.invoke("accountant-session-event", {
        body: {
          action: "resend_otp",
          email,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Record the send
      recordOtpSend();
      setOtpSent(true);
      
      toast({
        title: t('auth.signInLink'),
        description: t('auth.checkEmailForLink'),
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('errors.generic');
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const securityMeasures = [
    t('auth.autoSignOut'),
    t('auth.idleTimeout'),
    t('auth.oneTimeVerification'),
    t('auth.completeAuditTrail'),
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('nav.backToLogin')}
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
            
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-6 w-6 text-amber-500" />
              <h1 className="text-2xl font-display font-bold tracking-tight">
                {t('auth.sessionExpired')}
              </h1>
            </div>
            
            <p className="text-muted-foreground">
              {t('auth.sessionExpiredDesc')}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {otpSent && (
            <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('auth.checkEmailForLink')}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSendOtp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || cooldownRemaining > 0}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.sending')}
                </>
              ) : cooldownRemaining > 0 ? (
                t('auth.resendIn', { seconds: cooldownRemaining })
              ) : otpSent ? (
                t('auth.resendSignInLink')
              ) : (
                t('auth.sendSignInLink')
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.differentAccount')}{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t('auth.signInWithPassword')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-hero items-center justify-center p-12">
        <div className="max-w-md text-center text-primary-foreground">
          <ShieldCheck className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-display font-bold mb-4">
            {t('auth.securityFirst')}
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            {t('auth.securityDesc')}
          </p>
          <div className="bg-primary-foreground/10 rounded-lg p-4 text-sm text-left">
            <p className="font-medium mb-2">{t('auth.sessionSecurityMeasures')}</p>
            <ul className="space-y-1 text-primary-foreground/70">
              {securityMeasures.map((measure, i) => (
                <li key={i}>• {measure}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
