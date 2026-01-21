import { getCorsHeaders } from './cors.ts';

// Store the current request for CORS header generation
let currentRequest: Request | null = null;

export function setCurrentRequest(req: Request): void {
  currentRequest = req;
}

export function jsonResponse(data: unknown, status = 200): Response {
  const origin = currentRequest?.headers.get('origin') || null;
  const corsHeaders = getCorsHeaders(origin);

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export function successResponse(data: unknown): Response {
  return jsonResponse(data, 200);
}
