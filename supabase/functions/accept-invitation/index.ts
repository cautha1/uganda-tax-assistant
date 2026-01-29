import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hash the token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

    // Create Supabase client with user's token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's JWT
    const jwtToken = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(jwtToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email as string;

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided token
    const tokenHash = await hashToken(token);

    // Use service role for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find invitation by token hash
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("accountant_invitations")
      .select(`
        id,
        business_id,
        accountant_email,
        status,
        permissions,
        expires_at,
        token_used_at,
        created_by
      `)
      .eq("token_hash", tokenHash)
      .single();

    if (invError || !invitation) {
      console.log("Invitation not found for token hash");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired invitation link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (invitation.token_used_at) {
      return new Response(
        JSON.stringify({ success: false, error: "This invitation has already been used" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check status
    if (invitation.status !== "pending") {
      return new Response(
        JSON.stringify({ success: false, error: "This invitation is no longer valid" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      await supabaseAdmin
        .from("accountant_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ success: false, error: "This invitation has expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Verify email matches (case-insensitive)
    if (userEmail.toLowerCase() !== invitation.accountant_email.toLowerCase()) {
      console.log(`Email mismatch: ${userEmail} vs ${invitation.accountant_email}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `This invitation was sent to ${invitation.accountant_email}. Please sign in with that email address.` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has accountant role, if not add it
    const { data: userRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const hasAccountantRole = userRoles?.some((r) => r.role === "accountant");
    
    if (!hasAccountantRole) {
      // Add accountant role
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "accountant",
      });
      console.log(`Added accountant role to user ${userId}`);
    }

    // Check if already assigned to this business
    const { data: existingAssignment } = await supabaseAdmin
      .from("business_accountants")
      .select("id")
      .eq("business_id", invitation.business_id)
      .eq("accountant_id", userId)
      .single();

    if (existingAssignment) {
      // Already assigned, just mark invitation as accepted
      await supabaseAdmin
        .from("accountant_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
          token_used_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ success: true, message: "You're already assigned to this business" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const permissions = invitation.permissions as {
      can_view: boolean;
      can_edit: boolean;
      can_upload: boolean;
      can_generate_reports: boolean;
    };

    // Create business_accountant assignment
    const { error: assignError } = await supabaseAdmin
      .from("business_accountants")
      .insert({
        business_id: invitation.business_id,
        accountant_id: userId,
        assigned_by: invitation.created_by,
        can_view: permissions.can_view ?? true,
        can_edit: permissions.can_edit ?? true,
        can_upload: permissions.can_upload ?? true,
        can_generate_reports: permissions.can_generate_reports ?? true,
      });

    if (assignError) {
      console.error("Error creating assignment:", assignError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to accept invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update invitation status
    await supabaseAdmin
      .from("accountant_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
        token_used_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    // Log to audit trail
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      business_id: invitation.business_id,
      action: "INVITE_ACCEPTED",
      details: {
        invitation_id: invitation.id,
        permissions,
      },
    });

    console.log(`Invitation accepted: user ${userId} joined business ${invitation.business_id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Invitation accepted successfully!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in accept-invitation:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
