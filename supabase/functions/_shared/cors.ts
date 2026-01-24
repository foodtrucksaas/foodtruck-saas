// Allowed origins for CORS - set via environment variables
// Default includes localhost for development and specific production domains
// SECURITY: Never use wildcards like *.vercel.app - always specify exact domains
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:5173,http://localhost:5174,https://foodtruck-saas-client.vercel.app,https://foodtruck-saas-dashboard.vercel.app,https://client.montruck.fr,https://dashboard.montruck.fr').split(',');

// Add production domains from environment
const DASHBOARD_URL = Deno.env.get('DASHBOARD_URL');
const CLIENT_URL = Deno.env.get('CLIENT_URL');
if (DASHBOARD_URL) ALLOWED_ORIGINS.push(DASHBOARD_URL);
if (CLIENT_URL) ALLOWED_ORIGINS.push(CLIENT_URL);

export function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin is in allowed list (exact match only - no wildcards for security)
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

// Legacy export for backwards compatibility during migration
export const corsHeaders = getCorsHeaders(null);

export function handleCors(req: Request): Response | null {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }
  return null;
}

// Helper to add CORS headers to a response
export function withCors(response: Response, req: Request): Response {
  const origin = req.headers.get('origin');
  const headers = getCorsHeaders(origin);

  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
