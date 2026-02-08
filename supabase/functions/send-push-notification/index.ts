import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

interface PushPayload {
  foodtruck_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  try {
    // Verify authentication - caller must be authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: PushPayload = await req.json();
    const { foodtruck_id, title, body, data } = payload;

    if (!foodtruck_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: foodtruck_id, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller owns this foodtruck
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ownership
    const { data: foodtruck, error: ftError } = await supabase
      .from('foodtrucks')
      .select('user_id')
      .eq('id', foodtruck_id)
      .single();

    if (ftError || !foodtruck || foodtruck.user_id !== user.id) {
      return new Response(
        JSON.stringify({
          error: 'You do not have permission to send notifications for this foodtruck',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device tokens for this foodtruck
    console.log('Fetching device tokens for foodtruck:', foodtruck_id);
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('foodtruck_id', foodtruck_id);

    console.log('Tokens found:', tokens?.length || 0);
    if (tokens && tokens.length > 0) {
      console.log(
        'Token platforms:',
        tokens.map((t) => t.platform)
      );
    }

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      return new Response(JSON.stringify({ error: 'Failed to fetch device tokens' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      console.log('No tokens found for this foodtruck!');
      return new Response(
        JSON.stringify({ message: 'No device tokens found for this foodtruck' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Send to iOS devices via APNs
    const iosTokens = tokens.filter((t) => t.platform === 'ios');
    if (iosTokens.length > 0) {
      const apnsResults = await sendApnsNotifications(
        iosTokens.map((t) => t.token),
        title,
        body,
        data
      );
      results.sent += apnsResults.sent;
      results.failed += apnsResults.failed;
      results.errors.push(...apnsResults.errors);
    }

    // TODO: Add Android FCM support here

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${results.sent} notifications, ${results.failed} failed`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendApnsNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = { sent: 0, failed: 0, errors: [] as string[] };

  // APNs configuration from environment
  const apnsKeyId = Deno.env.get('APNS_KEY_ID');
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID');
  const apnsKeyBase64 = Deno.env.get('APNS_KEY_BASE64');
  const bundleId = 'com.foodtruck.manager';

  // Use production APNs server
  const apnsProduction = Deno.env.get('APNS_PRODUCTION');
  const apnsHost = apnsProduction === 'true' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';

  // Validate APNs configuration FIRST before trying to log
  if (!apnsKeyId || !apnsTeamId || !apnsKeyBase64) {
    console.error(
      'APNs configuration missing! APNS_KEY_ID, APNS_TEAM_ID, and APNS_KEY_BASE64 are required.'
    );
    results.errors.push('APNs configuration missing');
    results.failed = tokens.length;
    return results;
  }

  console.log('=== APNs CONFIG ===');
  console.log('APNS_KEY_ID:', `${apnsKeyId.substring(0, 4)}...`);
  console.log('APNS_TEAM_ID:', `${apnsTeamId.substring(0, 4)}...`);
  console.log('APNS_KEY_BASE64:', `${apnsKeyBase64.substring(0, 20)}...`);
  console.log('APNS_PRODUCTION:', apnsProduction);
  console.log('Using APNs host:', apnsHost);

  try {
    // Decode the base64-encoded private key
    const apnsKey = atob(apnsKeyBase64);

    // Create JWT for APNs authentication
    const jwt = await createApnsJwt(apnsKey, apnsKeyId, apnsTeamId);

    // Send to each token
    for (const token of tokens) {
      console.log('Sending to token:', token.substring(0, 20) + '...');
      try {
        const response = await fetch(`https://${apnsHost}/3/device/${token}`, {
          method: 'POST',
          headers: {
            Authorization: `bearer ${jwt}`,
            'apns-topic': bundleId,
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
              badge: 1,
            },
            ...data,
          }),
        });

        console.log('APNs response status:', response.status);
        if (response.ok) {
          console.log('SUCCESS - notification sent!');
          results.sent++;
        } else {
          const errorText = await response.text();
          console.error('APNs ERROR:', response.status, errorText);
          results.failed++;
          results.errors.push(
            `Token ${token.substring(0, 10)}...: ${response.status} - ${errorText}`
          );
        }
      } catch (error) {
        console.error('Fetch error:', error.message);
        results.failed++;
        results.errors.push(`Token ${token.substring(0, 10)}...: ${error.message}`);
      }
    }
  } catch (error) {
    results.errors.push(`APNs JWT creation failed: ${error.message}`);
    results.failed = tokens.length;
  }

  return results;
}

async function createApnsJwt(
  privateKeyPem: string,
  keyId: string,
  teamId: string
): Promise<string> {
  // Import the private key
  const privateKey = await jose.importPKCS8(privateKeyPem, 'ES256');

  // Create the JWT
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey);

  return jwt;
}
