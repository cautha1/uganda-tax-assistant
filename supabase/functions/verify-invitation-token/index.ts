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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the provided token
    const tokenHash = await hashToken(token);

    // Use service role to query invitations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find invitation by token hash
    const { data: invitation, error } = await supabaseAdmin
      .from("accountant_invitations")
      .select(`
        id,
        business_id,
        accountant_email,
        status,
        permissions,
        expires_at,
        token_used_at,
        businesses:business_id (
          name
        )
      `)
      .eq("token_hash", tokenHash)
      .single();

    if (error || !invitation) {
      console.log("Invitation not found for token hash");
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired invitation link" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already used
    if (invitation.token_used_at) {
      return new Response(
        JSON.stringify({ valid: false, error: "This invitation has already been used" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check status
    if (invitation.status !== "pending") {
      const statusMessages: Record<string, string> = {
        accepted: "This invitation has already been accepted",
        expired: "This invitation has expired",
        revoked: "This invitation has been cancelled",
      };
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: statusMessages[invitation.status] || "This invitation is no longer valid" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      // Update status to expired
      await supabaseAdmin
        .from("accountant_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(
        JSON.stringify({ valid: false, error: "This invitation has expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business name safely (join returns array)
    const businessesArray = invitation.businesses as Array<{ name: string }> | null;
    const businessName = businessesArray?.[0]?.name || "Unknown Business";

    // Return invitation details (no sensitive data)
    return new Response(
      JSON.stringify({
        valid: true,
        invitation: {
          id: invitation.id,
          accountant_email: invitation.accountant_email,
          business_name: businessName,
          permissions: invitation.permissions,
          expires_at: invitation.expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-invitation-token:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "An error occurred while verifying the invitation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
