import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  roles: ("sme_owner" | "accountant")[];
  phone?: string;
  nin?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with anon key to verify the user's JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the caller is authenticated and get their claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.claims.sub as string;
    console.log("Caller ID:", callerId);

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller has admin role
    const { data: callerRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    if (rolesError) {
      console.error("Role check error:", rolesError);
      return new Response(
        JSON.stringify({ error: "Failed to verify admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAdmin = callerRoles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      console.error("User is not admin:", callerId);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { email, name, password, roles, phone, nin } = body;

    // Validate required fields
    if (!email || !name || !password || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Email, name, password, and at least one role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate roles
    const validRoles = ["sme_owner", "accountant"];
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        return new Response(
          JSON.stringify({ error: `Invalid role: ${role}. Must be one of: ${validRoles.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Creating user:", email);

    // Create user using admin auth API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { name, role: roles[0] }, // Primary role for trigger
    });

    if (createError) {
      console.error("User creation error:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;
    console.log("User created:", userId);

    // Update profile with additional fields if provided
    if (phone || nin) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ phone, nin })
        .eq("id", userId);

      if (profileError) {
        console.error("Profile update error:", profileError);
        // Non-fatal, continue
      }
    }

    // Add additional roles if user has multiple roles
    // The trigger already adds the first role, so we add any additional ones
    if (roles.length > 1) {
      for (let i = 1; i < roles.length; i++) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: roles[i] });

        if (roleError) {
          console.error("Additional role insert error:", roleError);
          // Non-fatal, continue
        }
      }
    }

    // Log to audit trail
    await supabaseAdmin.from("audit_logs").insert({
      user_id: callerId,
      action: "admin_created_user",
      details: {
        created_user_id: userId,
        created_user_email: email,
        created_user_name: name,
        assigned_roles: roles,
      },
    });

    console.log("User creation complete:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: newUser.user.email,
          name,
          roles,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
