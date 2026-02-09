import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate a cryptographically secure random token
async function generateSecureToken(): Promise<string> {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Hash the token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Send email via Postmark
async function sendPostmarkEmail(
  apiKey: string,
  to: string,
  subject: string,
  htmlBody: string,
  from: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": apiKey,
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: "outbound",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Postmark error:", errorData);
      return { success: false, error: errorData.Message || "Failed to send email" };
    }

    const result = await response.json();
    console.log("Postmark email sent successfully, MessageID:", result.MessageID);
    return { success: true };
  } catch (err) {
    console.error("Postmark sending exception:", err);
    return { success: false, error: String(err) };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const postmarkApiKey = Deno.env.get("POST_API");

    if (!postmarkApiKey) {
      console.error("POST_API (Postmark) not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const { invitation_id } = await req.json();

    if (!invitation_id) {
      return new Response(
        JSON.stringify({ success: false, error: "invitation_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the invitation
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("accountant_invitations")
      .select(`
        id,
        business_id,
        accountant_email,
        status,
        permissions,
        businesses:business_id (
          name,
          owner_id
        )
      `)
      .eq("id", invitation_id)
      .single();

    if (invError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is the business owner or admin
    const businessesArray = invitation.businesses as Array<{ name: string; owner_id: string }> | null;
    const businessData = businessesArray?.[0] || null;
    
    if (businessData?.owner_id !== userId) {
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      const isAdmin = userRoles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, error: "Only business owners can resend invitations" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Can only resend pending or expired invitations
    if (invitation.status !== "pending" && invitation.status !== "expired") {
      return new Response(
        JSON.stringify({ success: false, error: "Cannot resend this invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new secure token
    const rawToken = await generateSecureToken();
    const tokenHash = await hashToken(rawToken);

    // Calculate new expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update invitation with new token and expiry
    await supabaseAdmin
      .from("accountant_invitations")
      .update({
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        token_used_at: null,
      })
      .eq("id", invitation_id);

    // Determine the app URL
    const appUrl = Deno.env.get("APP_URL") || "https://sms-tax-aid.lovable.app";
    const inviteLink = `${appUrl}/invite/accept?token=${rawToken}`;

    // Send email via Postmark
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Invitation Reminder</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            This is a reminder that <strong>${businessData?.name || "A business"}</strong> has invited you to manage their tax filings on SME Tax Aid Uganda.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">
            This invitation expires in <strong>7 days</strong>.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">SME Tax Aid Uganda</p>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendPostmarkEmail(
      postmarkApiKey,
      invitation.accountant_email,
      "Reminder: You've been invited as an Accountant",
      emailHtml,
      "SME Tax Aid <noreply@sms-tax-aid.lovable.app>"
    );

    if (!emailResult.success) {
      console.error("Failed to send reminder email:", emailResult.error);
    }

    // Log to audit trail
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      business_id: invitation.business_id,
      action: "INVITE_RESENT",
      details: {
        invitation_id,
        target_email: invitation.accountant_email,
        new_expires_at: expiresAt.toISOString(),
      },
    });

    console.log(`Invitation resent to ${invitation.accountant_email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Invitation resent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in resend-invitation:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
