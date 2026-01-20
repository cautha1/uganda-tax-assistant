import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationResult {
  verified: boolean;
  status: "active" | "inactive" | "not_found" | "suspended";
  businessName: string | null;
  registrationDate: string | null;
  taxTypes: string[];
  message: string;
}

// Mock business names for random TINs
const mockBusinessNames = [
  "Kampala Trading Co. Ltd",
  "Uganda Coffee Exporters",
  "Entebbe Fresh Foods",
  "Jinja Steel Works",
  "Mbarara Dairy Farms",
  "Gulu Transport Services",
  "Fort Portal Tourism Ltd",
  "Masaka Agricultural Co.",
];

// Mock tax types
const mockTaxTypes = ["Income Tax", "VAT", "PAYE", "Withholding Tax"];

function generateMockResult(tin: string): VerificationResult {
  // TINs starting with 100 → Active & Verified
  if (tin.startsWith("100")) {
    return {
      verified: true,
      status: "active",
      businessName: "Uganda Enterprises Ltd",
      registrationDate: "2019-03-15",
      taxTypes: ["Income Tax", "VAT", "PAYE"],
      message: "TIN verified successfully. Business is registered and active with URA.",
    };
  }

  // TINs starting with 200 → Verified but Inactive/Suspended
  if (tin.startsWith("200")) {
    return {
      verified: true,
      status: "inactive",
      businessName: "Dormant Traders Ltd",
      registrationDate: "2015-08-22",
      taxTypes: ["Income Tax"],
      message: "TIN found but business status is INACTIVE. Contact URA to reactivate.",
    };
  }

  // TINs starting with 300 → Suspended
  if (tin.startsWith("300")) {
    return {
      verified: true,
      status: "suspended",
      businessName: "Suspended Business Co.",
      registrationDate: "2018-01-10",
      taxTypes: ["Income Tax", "VAT"],
      message: "TIN found but business is SUSPENDED. Contact URA for resolution.",
    };
  }

  // TINs starting with 999 → Not found
  if (tin.startsWith("999")) {
    return {
      verified: false,
      status: "not_found",
      businessName: null,
      registrationDate: null,
      taxTypes: [],
      message: "TIN not found in URA registry. Please verify the number or register at URA.",
    };
  }

  // All other valid TINs → Random success
  const randomName = mockBusinessNames[Math.floor(Math.random() * mockBusinessNames.length)];
  const randomTaxTypes = mockTaxTypes.slice(0, Math.floor(Math.random() * 3) + 1);
  const randomYear = 2015 + Math.floor(Math.random() * 8);
  const randomMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const randomDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");

  return {
    verified: true,
    status: "active",
    businessName: randomName,
    registrationDate: `${randomYear}-${randomMonth}-${randomDay}`,
    taxTypes: randomTaxTypes,
    message: "TIN verified successfully. Business is registered and active with URA.",
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tin } = await req.json();

    console.log(`[verify-tin-mock] Verifying TIN: ${tin}`);

    // Validate TIN format
    if (!tin || !/^\d{10}$/.test(tin.replace(/\s/g, ""))) {
      console.log(`[verify-tin-mock] Invalid TIN format: ${tin}`);
      return new Response(
        JSON.stringify({
          error: "Invalid TIN format",
          message: "TIN must be exactly 10 digits",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanTin = tin.replace(/\s/g, "");

    // Simulate API delay (1-2 seconds)
    const delay = 1000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const result = generateMockResult(cleanTin);

    console.log(`[verify-tin-mock] Verification result for ${cleanTin}:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[verify-tin-mock] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({
        error: "Verification failed",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
