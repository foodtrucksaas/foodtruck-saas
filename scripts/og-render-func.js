/**
 * Vercel Edge Function: og-render
 *
 * Intercepts the SPA fallback for client subdomains (*.onmange.app),
 * fetches foodtruck data from Supabase, and injects Open Graph meta tags
 * into the HTML before serving it. This enables rich social media previews
 * when sharing foodtruck links on Facebook, Twitter, LinkedIn, etc.
 *
 * This file is NOT executed directly — combine-dist.js reads it,
 * embeds the built index.html as HTML_TEMPLATE, and writes the final
 * function to .vercel/output/functions/.
 */

// __HTML_TEMPLATE__ is replaced at build time by combine-dist.js
const HTML_TEMPLATE = '__HTML_TEMPLATE__';

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

export default async function handler(request) {
  const host = request.headers.get('host') || '';

  // Extract slug from subdomain
  const parts = host.split('.');
  let slug = null;
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'pro' && sub !== 'dashboard' && sub !== 'app') {
      slug = sub;
    }
  }

  let html = HTML_TEMPLATE;

  if (slug) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/foodtrucks?slug=eq.${encodeURIComponent(slug)}&select=name,description,cuisine_types,logo_url,cover_image_url`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const ft = data[0];
            const title = escapeAttr(`${ft.name} — Commander en ligne`);
            const description = escapeAttr(
              ft.description || `Commandez en ligne chez ${ft.name}`
            );
            const image = ft.cover_image_url || ft.logo_url || '';
            const pageUrl = `https://${slug}.onmange.app`;

            html = html
              .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(ft.name)} — Commander en ligne</title>`)
              .replace(
                /name="description" content="[^"]*"/,
                `name="description" content="${description}"`
              )
              .replace(
                /property="og:title" content="[^"]*"/,
                `property="og:title" content="${title}"`
              )
              .replace(
                /property="og:description" content="[^"]*"/,
                `property="og:description" content="${description}"`
              )
              .replace(
                /property="og:image" content="[^"]*"/,
                `property="og:image" content="${escapeAttr(image)}"`
              )
              .replace(
                /property="og:url" content="[^"]*"/,
                `property="og:url" content="${pageUrl}"`
              )
              .replace(
                /name="twitter:title" content="[^"]*"/,
                `name="twitter:title" content="${title}"`
              )
              .replace(
                /name="twitter:description" content="[^"]*"/,
                `name="twitter:description" content="${description}"`
              )
              .replace(
                /name="twitter:image" content="[^"]*"/,
                `name="twitter:image" content="${escapeAttr(image)}"`
              );
          }
        }
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
