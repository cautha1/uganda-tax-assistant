import { useAccountantSessionManager } from "@/hooks/useAccountantSessionManager";

/**
 * AccountantSessionMonitor
 * 
 * A component that monitors accountant sessions for security compliance.
 * - Enforces 2-hour hard session limit
 * - Enforces 2-hour idle timeout
 * - Forces sign-out and redirect to /reauth on expiry
 * 
 * This component renders nothing (null) and only provides session monitoring.
 * It should be placed inside AuthProvider but wrapping the main routes.
 */
export function AccountantSessionMonitor({ children }: { children: React.ReactNode }) {
  // The hook handles all session monitoring logic
  useAccountantSessionManager({ enabled: true });

  return <>{children}</>;
}
