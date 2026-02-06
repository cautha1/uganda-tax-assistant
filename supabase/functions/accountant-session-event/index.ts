import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SessionEventRequest {
  action: "session_expired" | "resend_otp" | "reauth_success";
  email?: string;
  reason?: "hard_limit" | "idle_timeout";
  user_id?: string;
  session_start?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: SessionEventRequest = await req.json();
    const { action, email, reason, user_id, session_start } = body;

    console.log("Accountant session event:", { action, email, reason, user_id });

    // Validate required fields
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "session_expired") {
      // Determine the audit event type
      const eventType = reason === "hard_limit" 
        ? "ACCOUNTANT_SESSION_EXPIRED_HARD" 
        : "ACCOUNTANT_SESSION_EXPIRED_IDLE";

      // Calculate session duration
      const sessionDuration = session_start 
        ? Math.floor((Date.now() - session_start) / 1000) 
        : null;

      // Log the session expiry event
      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: user_id || null,
        action: eventType,
        details: {
          email,
          reason,
          session_duration_seconds: sessionDuration,
          timestamp: new Date().toISOString(),
        },
      });

      if (auditError) {
        console.error("Failed to log audit event:", auditError);
      }

      // Send OTP email if we have an email
      if (email) {
        const redirectUrl = `${req.headers.get("origin") || supabaseUrl.replace(".supabase.co", ".lovable.app")}/accountant`;
        
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (otpError) {
          console.error("Failed to send OTP:", otpError);
          // Handle Supabase's built-in rate limit gracefully (45 seconds between sends)
          if (otpError.status === 429 || otpError.message?.includes("after 45 seconds")) {
            // OTP was already sent recently, this is fine - just log it
            console.log("OTP already sent within 45 seconds, skipping duplicate send");
          } else {
            return new Response(
              JSON.stringify({ error: "Failed to send sign-in link", details: otpError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Log OTP sent event only if actually sent
          await supabase.from("audit_logs").insert({
            user_id: user_id || null,
            action: "ACCOUNTANT_OTP_SENT",
            details: {
              email,
              trigger: reason,
              timestamp: new Date().toISOString(),
            },
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Session expired, OTP sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "resend_otp") {
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Email is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Server-side rate limiting: Check recent OTP sends for this email
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      // Use text cast for JSONB field comparison
      const { data: recentSends, error: rateCheckError } = await supabase
        .from("audit_logs")
        .select("id, details")
        .in("action", ["ACCOUNTANT_OTP_SENT", "ACCOUNTANT_OTP_RESENT"])
        .gte("created_at", fifteenMinutesAgo);

      if (rateCheckError) {
        console.error("Rate check error:", rateCheckError);
      }

      // Filter by email in JavaScript since JSONB comparison is tricky
      const emailMatches = recentSends?.filter(
        (log: { details: { email?: string } }) => log.details?.email === email
      ) || [];

      if (emailMatches.length >= 5) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send OTP email
      const redirectUrl = `${req.headers.get("origin") || supabaseUrl.replace(".supabase.co", ".lovable.app")}/accountant`;
      
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (otpError) {
        console.error("Failed to send OTP:", otpError);
        // Handle Supabase's built-in rate limit gracefully (45 seconds between sends)
        if (otpError.status === 429 || otpError.message?.includes("after 45 seconds")) {
          return new Response(
            JSON.stringify({ error: "Please wait 45 seconds before requesting another sign-in link." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Failed to send sign-in link", details: otpError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log OTP resent event
      await supabase.from("audit_logs").insert({
        action: "ACCOUNTANT_OTP_RESENT",
        details: {
          email,
          resend_count: emailMatches.length + 1,
          timestamp: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Sign-in link sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reauth_success") {
      // Log successful re-authentication
      await supabase.from("audit_logs").insert({
        user_id: user_id || null,
        action: "ACCOUNTANT_REAUTH_SUCCESS",
        details: {
          email,
          auth_method: "otp_magic_link",
          timestamp: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ success: true, message: "Re-authentication logged" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in accountant-session-event:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
