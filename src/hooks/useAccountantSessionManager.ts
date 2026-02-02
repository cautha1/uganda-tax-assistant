import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

// Session timing constants (TEMPORARY: reduced to 1 minute for testing)
const HARD_SESSION_LIMIT_MS = 1 * 60 * 1000; // 1 minute (TODO: restore to 2 hours)
const IDLE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute (TODO: restore to 2 hours)
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

// LocalStorage keys
export const ACCOUNTANT_REAUTH_EMAIL_KEY = "accountant_reauth_email";
export const ACCOUNTANT_SESSION_START_KEY = "accountant_session_start";
export const ACCOUNTANT_LAST_ACTIVITY_KEY = "accountant_last_activity";

interface UseAccountantSessionManagerOptions {
  enabled?: boolean;
}

export function useAccountantSessionManager(options: UseAccountantSessionManagerOptions = {}) {
  const { enabled = true } = options;
  const { user, profile, roles, rolesLoaded, signOut } = useAuth();
  const navigate = useNavigate();
  
  const hardLimitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isExpiringRef = useRef(false);

  // Check if user is accountant-only (not admin or sme_owner)
  const isAccountantOnly = rolesLoaded && 
    roles.includes("accountant") && 
    !roles.includes("admin") && 
    !roles.includes("sme_owner");

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    if (isAccountantOnly && user) {
      localStorage.setItem(ACCOUNTANT_LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }, [isAccountantOnly, user]);

  // Handle session expiry
  const handleSessionExpiry = useCallback(async (reason: "hard_limit" | "idle_timeout") => {
    if (isExpiringRef.current) return;
    isExpiringRef.current = true;

    const email = profile?.email;
    const userId = user?.id;
    const sessionStart = localStorage.getItem(ACCOUNTANT_SESSION_START_KEY);

    console.log(`Accountant session expired: ${reason}`, { email, userId });

    // Store email for reauth page
    if (email) {
      localStorage.setItem(ACCOUNTANT_REAUTH_EMAIL_KEY, email);
    }

    // Clear session tracking
    localStorage.removeItem(ACCOUNTANT_SESSION_START_KEY);
    localStorage.removeItem(ACCOUNTANT_LAST_ACTIVITY_KEY);

    // Call edge function to log event and send OTP
    try {
      await supabase.functions.invoke("accountant-session-event", {
        body: {
          action: "session_expired",
          email,
          reason,
          user_id: userId,
          session_start: sessionStart ? parseInt(sessionStart) : null,
        },
      });
    } catch (error) {
      console.error("Failed to log session expiry:", error);
    }

    // Sign out user
    await signOut();

    // Redirect to reauth page
    navigate("/reauth", { replace: true });
  }, [profile, user, signOut, navigate]);

  // Check if idle timeout exceeded
  const checkIdleTimeout = useCallback(() => {
    const lastActivity = localStorage.getItem(ACCOUNTANT_LAST_ACTIVITY_KEY);
    if (!lastActivity) return;

    const idleTime = Date.now() - parseInt(lastActivity);
    if (idleTime >= IDLE_TIMEOUT_MS) {
      handleSessionExpiry("idle_timeout");
    }
  }, [handleSessionExpiry]);

  // Handle visibility change (tab hidden/shown)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible" && isAccountantOnly && user) {
      // Re-check idle timeout when tab becomes visible
      checkIdleTimeout();
    }
  }, [isAccountantOnly, user, checkIdleTimeout]);

  // Initialize session tracking when accountant logs in
  useEffect(() => {
    if (!enabled || !isAccountantOnly || !user) {
      return;
    }

    // Get or set session start time
    let sessionStart = localStorage.getItem(ACCOUNTANT_SESSION_START_KEY);
    if (!sessionStart) {
      sessionStart = Date.now().toString();
      localStorage.setItem(ACCOUNTANT_SESSION_START_KEY, sessionStart);
    }

    // Initialize last activity
    if (!localStorage.getItem(ACCOUNTANT_LAST_ACTIVITY_KEY)) {
      localStorage.setItem(ACCOUNTANT_LAST_ACTIVITY_KEY, Date.now().toString());
    }

    // Check if session already expired (e.g., page refresh after expiry)
    const sessionDuration = Date.now() - parseInt(sessionStart);
    if (sessionDuration >= HARD_SESSION_LIMIT_MS) {
      handleSessionExpiry("hard_limit");
      return;
    }

    // Check if idle timeout already exceeded
    checkIdleTimeout();

    // Set up hard limit timer
    const remainingTime = HARD_SESSION_LIMIT_MS - sessionDuration;
    hardLimitTimerRef.current = setTimeout(() => {
      handleSessionExpiry("hard_limit");
    }, remainingTime);

    // Set up idle check interval
    idleCheckIntervalRef.current = setInterval(checkIdleTimeout, ACTIVITY_CHECK_INTERVAL_MS);

    // Set up activity listeners
    const activityEvents = ["mousemove", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateLastActivity, { passive: true });
    });

    // Set up visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Cleanup timers
      if (hardLimitTimerRef.current) {
        clearTimeout(hardLimitTimerRef.current);
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }

      // Cleanup event listeners
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateLastActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, isAccountantOnly, user, handleSessionExpiry, checkIdleTimeout, updateLastActivity, handleVisibilityChange]);

  // Cleanup when user logs out or role changes
  useEffect(() => {
    if (!isAccountantOnly || !user) {
      isExpiringRef.current = false;
      if (hardLimitTimerRef.current) {
        clearTimeout(hardLimitTimerRef.current);
        hardLimitTimerRef.current = null;
      }
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
        idleCheckIntervalRef.current = null;
      }
    }
  }, [isAccountantOnly, user]);

  return {
    isAccountantOnly,
    isMonitoring: enabled && isAccountantOnly && !!user,
  };
}
