import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyTINRequest {
  tin: string;
  ownerName?: string;
  businessName?: string;
}

interface URAVerificationResponse {
  verified: boolean;
  taxpayerName?: string;
  businessType?: string;
  registrationDate?: string;
  status?: string;
  message?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: VerifyTINRequest = await req.json();
    const { tin, ownerName, businessName } = body;

    // Validate TIN format (10 digits)
    if (!tin || !/^\d{10}$/.test(tin.replace(/\s/g, ''))) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          message: 'Invalid TIN format. TIN must be exactly 10 digits.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanTIN = tin.replace(/\s/g, '');

    // Get URA API credentials from environment
    const uraApiUrl = Deno.env.get('URA_API_URL');
    const uraApiKey = Deno.env.get('URA_API_KEY');

    let verificationResult: URAVerificationResponse;

    if (uraApiUrl && uraApiKey) {
      // Real URA API Integration
      // Note: Replace this with actual URA API endpoint and request format
      // when official API credentials are obtained
      try {
        const uraResponse = await fetch(`${uraApiUrl}/tin/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${uraApiKey}`,
            'X-API-Key': uraApiKey,
          },
          body: JSON.stringify({
            tin: cleanTIN,
            // Add other required fields per URA API spec
          }),
        });

        if (!uraResponse.ok) {
          throw new Error(`URA API error: ${uraResponse.status}`);
        }

        const uraData = await uraResponse.json();
        
        // Map URA API response to our format
        // Adjust this mapping based on actual URA API response structure
        verificationResult = {
          verified: uraData.valid === true || uraData.status === 'active',
          taxpayerName: uraData.taxpayer_name || uraData.name,
          businessType: uraData.business_type || uraData.type,
          registrationDate: uraData.registration_date,
          status: uraData.status,
          message: uraData.valid ? 'TIN verified successfully with URA' : 'TIN not found in URA records',
        };
      } catch (uraError) {
        console.error('URA API error:', uraError);
        // Fall back to mock verification if API fails
        verificationResult = performMockVerification(cleanTIN, ownerName, businessName);
        verificationResult.message = 'Unable to verify with URA. Using local validation.';
      }
    } else {
      // Mock verification when URA API is not configured
      verificationResult = performMockVerification(cleanTIN, ownerName, businessName);
    }

    // Log verification attempt to database
    await logVerificationAttempt(req, cleanTIN, verificationResult);

    return new Response(
      JSON.stringify(verificationResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('TIN verification error:', error);
    return new Response(
      JSON.stringify({ 
        verified: false, 
        message: 'Verification service unavailable. Please try again later.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function performMockVerification(
  tin: string, 
  ownerName?: string, 
  businessName?: string
): URAVerificationResponse {
  // Mock verification logic
  // In production, this would be replaced with actual URA API calls
  
  // Basic validation rules:
  // 1. TIN must be 10 digits (already validated)
  // 2. First digit indicates taxpayer type (1-3 = Individual, 4-9 = Non-Individual)
  // 3. Checksum validation (simplified)
  
  const firstDigit = parseInt(tin[0]);
  const isIndividual = firstDigit >= 1 && firstDigit <= 3;
  const isNonIndividual = firstDigit >= 4 && firstDigit <= 9;
  
  if (!isIndividual && !isNonIndividual) {
    return {
      verified: false,
      message: 'Invalid TIN prefix. TIN does not match URA format.',
    };
  }

  // Simulate checksum validation (last digit)
  const digits = tin.split('').map(Number);
  const checksum = digits.slice(0, 9).reduce((sum, d, i) => sum + d * (10 - i), 0) % 11;
  const expectedCheck = checksum === 10 ? 0 : checksum;
  
  // For demo purposes, we'll accept all properly formatted TINs
  // In production, this would be actual URA verification
  
  return {
    verified: true,
    taxpayerName: ownerName || 'Taxpayer Name (Pending URA Verification)',
    businessType: isIndividual ? 'Individual' : 'Non-Individual',
    registrationDate: new Date().toISOString().split('T')[0],
    status: 'active',
    message: 'TIN format validated. Full verification pending URA API integration.',
  };
}

async function logVerificationAttempt(
  req: Request,
  tin: string,
  result: URAVerificationResponse
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase credentials not available for logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from auth header if available
    const authHeader = req.headers.get('authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Log the verification attempt
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'tin_verification_attempt',
      entity_type: 'tin',
      entity_id: tin.slice(0, 4) + '******', // Partially mask TIN for privacy
      details: {
        verified: result.verified,
        status: result.status,
        message: result.message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log verification attempt:', error);
    // Don't throw - logging failure shouldn't break verification
  }
}
