import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutocompleteRequest {
  action: 'autocomplete';
  input: string;
  sessionToken?: string;
}

interface DetailsRequest {
  action: 'details';
  placeId: string;
  sessionToken?: string;
}

type RequestBody = AutocompleteRequest | DetailsRequest;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const body: RequestBody = await req.json();

    if (body.action === 'autocomplete') {
      const { input, sessionToken } = body as AutocompleteRequest;

      if (!input || input.length < 3) {
        return new Response(JSON.stringify({ predictions: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const params = new URLSearchParams({
        input,
        key: apiKey,
        components: 'country:fr',
        types: 'establishment|geocode',
        language: 'fr',
      });

      if (sessionToken) {
        params.append('sessiontoken', sessionToken);
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
      );

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places Autocomplete error:', data);
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const predictions = (data.predictions || []).map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        structured_formatting: {
          main_text: p.structured_formatting?.main_text || p.description,
          secondary_text: p.structured_formatting?.secondary_text || '',
        },
      }));

      return new Response(JSON.stringify({ predictions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'details') {
      const { placeId, sessionToken } = body as DetailsRequest;

      if (!placeId) {
        throw new Error('placeId is required');
      }

      const params = new URLSearchParams({
        place_id: placeId,
        key: apiKey,
        fields: 'formatted_address,geometry',
        language: 'fr',
      });

      if (sessionToken) {
        params.append('sessiontoken', sessionToken);
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`
      );

      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Places Details error:', data);
        throw new Error(`Google Places API error: ${data.status}`);
      }

      const result = {
        placeId,
        address: data.result?.formatted_address || '',
        latitude: data.result?.geometry?.location?.lat || 0,
        longitude: data.result?.geometry?.location?.lng || 0,
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use "autocomplete" or "details"');
  } catch (error) {
    console.error('Google Places function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
