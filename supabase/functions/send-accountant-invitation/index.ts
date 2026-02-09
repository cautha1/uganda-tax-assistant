import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InvitationRequest {
  business_id: string;
  accountant_email: string;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_upload: boolean;
    can_generate_reports: boolean;
  };
}

// Generate a cryptographically secure random token
async function generateSecureToken(): Promise<string> {
  const buffer = new Uint8Array(32); // 256 bits of entropy
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

// Send email via Mailgun
async function sendMailgunEmail(
  apiKey: string,
  to: string,
  subject: string,
  htmlBody: string,
  from: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("from", from);
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("html", htmlBody);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Mailgun error:", errorData);
      return { success: false, error: errorData || "Failed to send email" };
    }

    const result = await response.json();
    console.log("Mailgun email sent successfully, ID:", result.id);
    return { success: true };
  } catch (err) {
    console.error("Mailgun sending exception:", err);
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
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mailgunApiKey = Deno.env.get("Mailgun_API");

    if (!mailgunApiKey) {
      console.error("Mailgun_API not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mailgunDomain = "cacaisolutions.tech";
    const fromEmail = "SME Tax Aid <info@cacaisolutions.tech>";

    // Create Supabase client with user's token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const { business_id, accountant_email, permissions }: InvitationRequest = await req.json();

    if (!business_id || !accountant_email) {
      return new Response(
        JSON.stringify({ error: "business_id and accountant_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = accountant_email.trim().toLowerCase();

    // Use service role to bypass RLS for certain checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns the business
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, name, owner_id")
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (business.owner_id !== userId) {
      // Check if admin
      const { data: userRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      const isAdmin = userRoles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Only business owners can invite accountants" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for existing pending invitation — replace it if found (email may have failed)
    const { data: existingInvite } = await supabaseAdmin
      .from("accountant_invitations")
      .select("id, status")
      .eq("business_id", business_id)
      .eq("accountant_email", normalizedEmail)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      console.log(`Replacing existing pending invitation ${existingInvite.id} for ${normalizedEmail}`);
      await supabaseAdmin
        .from("accountant_invitations")
        .delete()
        .eq("id", existingInvite.id);
    }

    // Check if accountant is already assigned
    const { data: existingAccountant } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .single();

    if (existingAccountant) {
      const { data: existingAssignment } = await supabaseAdmin
        .from("business_accountants")
        .select("id")
        .eq("business_id", business_id)
        .eq("accountant_id", existingAccountant.id)
        .single();

      if (existingAssignment) {
        return new Response(
          JSON.stringify({ error: "This accountant is already assigned to this business" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate secure token
    const rawToken = await generateSecureToken();
    const tokenHash = await hashToken(rawToken);

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("accountant_invitations")
      .insert({
        business_id,
        accountant_email: normalizedEmail,
        token_hash: tokenHash,
        permissions: permissions || {
          can_view: true,
          can_edit: true,
          can_upload: true,
          can_generate_reports: true,
        },
        created_by: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating invitation:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the app URL based on environment
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
          <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            <strong>${business.name}</strong> has invited you to manage their tax filings on SME Tax Aid Uganda.
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
          
          <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
            If you don't have an account yet, you'll be prompted to register with this email address.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">SME Tax Aid Uganda</p>
          <p style="margin: 5px 0 0 0;">Simplifying tax compliance for small businesses</p>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendMailgunEmail(
      mailgunApiKey,
      normalizedEmail,
      "You've been invited as an Accountant",
      emailHtml,
      fromEmail,
      mailgunDomain
    );

    if (!emailResult.success) {
      console.error("Failed to send invitation email:", emailResult.error);
    }

    // Log to audit trail
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      business_id,
      action: "INVITE_CREATED",
      details: {
        invitation_id: invitation.id,
        target_email: normalizedEmail,
        permissions,
        expires_at: expiresAt.toISOString(),
      },
    });

    console.log(`Invitation created for ${normalizedEmail} to business ${business.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        message: `Invitation sent to ${normalizedEmail}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-accountant-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
