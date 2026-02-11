/**
 * Vercel Edge Function: og-render
 *
 * Intercepts the SPA fallback for:
 * 1. Client subdomains (slug.onmange.app)
 * 2. Legacy client paths (www.onmange.app/client/UUID or /client/slug)
 *
 * Fetches foodtruck data from Supabase and injects Open Graph meta tags
 * into the HTML before serving it. This enables rich social media previews
 * when sharing foodtruck links on Facebook, Twitter, LinkedIn, etc.
 *
 * This file is NOT executed directly — combine-dist.js reads it,
 * embeds the built index.html as HTML_TEMPLATE, and writes the final
 * function to .vercel/output/functions/.
 */

// __HTML_TEMPLATE__ is replaced at build time by combine-dist.js
const HTML_TEMPLATE = '__HTML_TEMPLATE__';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Fetch foodtruck from Supabase by slug or UUID.
 */
async function fetchFoodtruck(identifier) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const isUUID = UUID_RE.test(identifier);
  const filter = isUUID
    ? `id=eq.${encodeURIComponent(identifier)}`
    : `slug=eq.${encodeURIComponent(identifier)}`;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/foodtrucks?${filter}&select=name,slug,description,cuisine_types,logo_url,cover_image_url`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data && data.length > 0 ? data[0] : null;
}

function injectMeta(html, ft) {
  const title = escapeAttr(`${ft.name} — Commander en ligne`);
  const description = escapeAttr(ft.description || `Commandez en ligne chez ${ft.name}`);
  const image = ft.cover_image_url || ft.logo_url || '';
  const pageUrl = `https://${ft.slug}.onmange.app`;

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(ft.name)} — Commander en ligne</title>`)
    .replace(/name="description" content="[^"]*"/, `name="description" content="${description}"`)
    .replace(/property="og:title" content="[^"]*"/, `property="og:title" content="${title}"`)
    .replace(
      /property="og:description" content="[^"]*"/,
      `property="og:description" content="${description}"`
    )
    .replace(
      /property="og:image" content="[^"]*"/,
      `property="og:image" content="${escapeAttr(image)}"`
    )
    .replace(/property="og:url" content="[^"]*"/, `property="og:url" content="${pageUrl}"`)
    .replace(/name="twitter:title" content="[^"]*"/, `name="twitter:title" content="${title}"`)
    .replace(
      /name="twitter:description" content="[^"]*"/,
      `name="twitter:description" content="${description}"`
    )
    .replace(
      /name="twitter:image" content="[^"]*"/,
      `name="twitter:image" content="${escapeAttr(image)}"`
    );
}

export default async function handler(request) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || '';

  let identifier = null;

  // 1. Check for subdomain (slug.onmange.app)
  const hostParts = host.split('.');
  if (hostParts.length >= 3) {
    const sub = hostParts[0];
    if (sub !== 'www' && sub !== 'pro' && sub !== 'dashboard' && sub !== 'app') {
      identifier = sub;
    }
  }

  // 2. Check for legacy path (/client/UUID or /client/slug)
  if (!identifier) {
    const pathMatch = url.pathname.match(/^\/client\/([^/]+)/);
    if (pathMatch) {
      identifier = pathMatch[1];
    }
  }

  let html = HTML_TEMPLATE;

  if (identifier) {
    try {
      const ft = await fetchFoodtruck(identifier);
      if (ft) {
        html = injectMeta(html, ft);
      }
    } catch (e) {
      // Silently fail — serve generic HTML
      console.error('OG render error:', e);
    }
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
