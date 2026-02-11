import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import { successResponse, errorResponse, setCurrentRequest } from '../_shared/responses.ts';

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface OrderItem {
  quantity: number;
  unit_price: number;
  notes: string | null;
  menu_item: { name: string };
  order_item_options: Array<{
    option_name: string;
    option_group_name: string;
    price_modifier: number;
  }>;
}

serve(async (req) => {
  setCurrentRequest(req);

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { order_id } = await req.json();
    if (!order_id) return errorResponse('Paramètre manquant');

    const supabase = createSupabaseAdmin();

    // Fetch order with items, options, and offer uses
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        *,
        foodtruck:foodtrucks (name, phone),
        order_items (
          quantity,
          unit_price,
          notes,
          menu_item:menu_items (name),
          order_item_options (option_name, option_group_name, price_modifier)
        ),
        offer_uses (
          id,
          discount_amount,
          free_item_name,
          offer:offers (name, offer_type)
        )
      `
      )
      .eq('id', order_id)
      .single();

    if (error || !order) {
      console.error('Failed to fetch order:', error);
      return errorResponse('Order not found', 404);
    }

    // Order fetched successfully - log only order ID, not customer data

    // Skip manual orders (surplace@local)
    if (order.customer_email === 'surplace@local') {
      return successResponse({ success: true, message: 'Email skipped (manual order)' });
    }

    // Get location for pickup time
    const pickupDate = new Date(order.pickup_time);
    const dayOfWeek = pickupDate.getDay(); // 0 = Sunday, 6 = Saturday

    const { data: schedules } = await supabase
      .from('schedules')
      .select('location:locations (name, address)')
      .eq('foodtruck_id', order.foodtruck_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .limit(1);

    const location = (schedules?.[0]?.location as { name: string; address: string | null }) || null;

    // Format pickup date
    const pickupDateStr = pickupDate.toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Validate required fields
    if (!order.foodtruck) {
      console.error('Foodtruck not found for order:', order.id);
      return errorResponse('Foodtruck not found', 404);
    }

    // Build items HTML with options, grouping bundles
    const orderItems = (order.order_items as OrderItem[]).filter((item) => item.menu_item);

    // Separate manual bundles from solo items
    const bundleMap = new Map<string, OrderItem[]>();
    const soloItems: OrderItem[] = [];
    for (const item of orderItems) {
      const match = item.notes?.match(/^\[(.+)\]$/);
      if (match) {
        const bundleName = match[1];
        if (!bundleMap.has(bundleName)) bundleMap.set(bundleName, []);
        bundleMap.get(bundleName)!.push(item);
      } else {
        soloItems.push(item);
      }
    }

    // Helper to build options HTML for an item (no price modifiers — already in total)
    const buildOptionsHtml = (item: OrderItem) => {
      if (!item.order_item_options || item.order_item_options.length === 0) return '';
      const optionsList = item.order_item_options
        .map((opt) => escapeHtml(opt.option_name))
        .join(', ');
      return `<div style="font-size:13px;color:#6b7280;margin-top:2px;padding-left:20px">${optionsList}</div>`;
    };

    // Extract offer uses for discount breakdown and free items
    const offerUses = ((order as Record<string, unknown>).offer_uses || []) as Array<{
      id: string;
      discount_amount: number;
      free_item_name: string | null;
      offer: { name: string; offer_type: string } | null;
    }>;
    const discountAmount = (order.discount_amount as number) || 0;

    // Calculate loyalty discount (total minus all tracked offer discounts)
    const trackedOfferDiscount = offerUses.reduce((sum, u) => sum + (u.discount_amount || 0), 0);
    const loyaltyDiscount = Math.max(0, discountAmount - trackedOfferDiscount);

    // Visible offers (not bundles or buy_x_get_y which are shown inline)
    const visibleOfferUses = offerUses.filter(
      (u) =>
        u.discount_amount > 0 &&
        u.offer?.offer_type !== 'bundle' &&
        u.offer?.offer_type !== 'buy_x_get_y'
    );
    const visibleDiscount =
      visibleOfferUses.reduce((sum, u) => sum + u.discount_amount, 0) + loyaltyDiscount;

    // Free items from buy_x_get_y offers
    const freeItemNames = offerUses
      .filter((u) => u.offer?.offer_type === 'buy_x_get_y' && u.free_item_name)
      .map((u) => u.free_item_name!);

    // Order ID (inline — can't import shared in Deno)
    const orderId = order.id ? `#${(order.id as string).slice(0, 8).toUpperCase()}` : '';

    // Build bundle HTML
    const bundleHtml = Array.from(bundleMap.entries())
      .map(([bundleName, bundleItems]) => {
        const bundleTotal = bundleItems.reduce(
          (sum, i) => sum + (i.unit_price * i.quantity) / 100,
          0
        );
        const bundleCount = bundleItems.filter((i) => i.unit_price > 0).length || 1;
        // Aggregate identical items within a bundle
        const agg: { name: string; options: string; qty: number }[] = [];
        bundleItems.forEach((item) => {
          const opts = item.order_item_options?.map((o) => o.option_name).join(', ') || '';
          const key = `${item.menu_item.name}|${opts}`;
          const existing = agg.find((a) => `${a.name}|${a.options}` === key);
          if (existing) {
            existing.qty += item.quantity;
          } else {
            agg.push({ name: item.menu_item.name, options: opts, qty: item.quantity });
          }
        });
        const cleanName = bundleName.replace(/#\d+$/, '');
        const itemsDetail = agg
          .map((a) => {
            const optHtml = a.options
              ? `<br/><span style="font-size:12px;color:#9ca3af;padding-left:30px">${escapeHtml(a.options)}</span>`
              : '';
            return `<div style="font-size:13px;color:#6b7280;padding-left:20px;margin-top:2px">${a.qty > 1 ? `${a.qty}× ` : ''}${escapeHtml(a.name)}${optHtml}</div>`;
          })
          .join('');
        return `
          <div style="padding:12px 0;border-bottom:1px solid #e5e7eb">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr>
                <td style="text-align:left;font-weight:600">${bundleCount > 1 ? `${bundleCount}× ` : ''}${escapeHtml(cleanName)}</td>
                <td style="text-align:right;font-weight:500;white-space:nowrap">${bundleTotal.toFixed(2)}€</td>
              </tr>
            </table>
            ${itemsDetail}
          </div>`;
      })
      .join('');

    // Build solo items HTML (free items last, with "Offert" badge)
    const remainingFree = [...freeItemNames];
    const taggedItems = soloItems.map((item) => {
      const freeIdx = remainingFree.indexOf(item.menu_item.name);
      const isFree = freeIdx !== -1;
      if (isFree) remainingFree.splice(freeIdx, 1);
      return { item, isFree };
    });
    taggedItems.sort((a, b) => (a.isFree === b.isFree ? 0 : a.isFree ? 1 : -1));

    const soloHtml = taggedItems
      .map(({ item, isFree }) => {
        const itemTotal = (item.unit_price * item.quantity) / 100;
        const optionsHtml = buildOptionsHtml(item);
        const priceHtml = isFree
          ? `<span style="text-decoration:line-through;color:#9ca3af;font-size:13px">${itemTotal.toFixed(2)}€</span>
             <span style="background:#dcfce7;color:#16a34a;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;margin-left:4px">Offert</span>`
          : `${itemTotal.toFixed(2)}€`;

        return `
          <div style="padding:12px 0;border-bottom:1px solid #e5e7eb">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr>
                <td style="text-align:left">
                  <strong>${item.quantity}x</strong> ${escapeHtml(item.menu_item.name)}
                </td>
                <td style="text-align:right;font-weight:500;white-space:nowrap">${priceHtml}</td>
              </tr>
            </table>
            ${optionsHtml}
          </div>`;
      })
      .join('');

    const items = bundleHtml + soloHtml;

    const total = (order.total_amount / 100).toFixed(2);

    // Build location section if available, with clickable address for directions
    let locationHtml = '';
    if (location) {
      const addressText = location.address
        ? `${escapeHtml(location.name)} - ${escapeHtml(location.address)}`
        : escapeHtml(location.name);
      const mapsQuery = encodeURIComponent(
        location.address ? `${location.name}, ${location.address}` : location.name
      );
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
      locationHtml = `
        <div style="background:#dbeafe;padding:15px;border-radius:8px;margin:20px 0">
          <strong style="color:#1e40af">Lieu de retrait :</strong><br>
          <a href="${mapsUrl}" style="color:#1e3a8a;text-decoration:underline;font-size:15px" target="_blank">${addressText}</a>
          <div style="margin-top:8px">
            <a href="${mapsUrl}" style="display:inline-block;background:#1e40af;color:white;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none" target="_blank">Voir l'itinéraire</a>
          </div>
        </div>`;
    }

    // Build order notes section if present
    let orderNotesHtml = '';
    if (order.notes) {
      orderNotesHtml = `
        <div style="background:#fef9c3;padding:12px;border-radius:8px;margin-top:15px">
          <strong style="color:#854d0e">Note :</strong>
          <span style="color:#713f12">${escapeHtml(order.notes)}</span>
        </div>`;
    }

    // Build discount section with detailed breakdown
    let discountHtml = '';
    if (visibleDiscount > 0) {
      // Subtotal line
      discountHtml += `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px">
          <tr>
            <td style="text-align:left;color:#6b7280;font-size:14px">Sous-total</td>
            <td style="text-align:right;color:#6b7280;font-size:14px">${((order.total_amount + visibleDiscount) / 100).toFixed(2)}€</td>
          </tr>
        </table>`;
      // Individual offer lines
      for (const u of visibleOfferUses) {
        discountHtml += `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:4px">
          <tr>
            <td style="text-align:left;color:#d97706;font-size:14px">${escapeHtml(u.offer?.name || 'Offre')}</td>
            <td style="text-align:right;color:#d97706;font-size:14px">-${(u.discount_amount / 100).toFixed(2)}€</td>
          </tr>
        </table>`;
      }
      // Loyalty line
      if (loyaltyDiscount > 0) {
        discountHtml += `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:4px">
          <tr>
            <td style="text-align:left;color:#d97706;font-size:14px">Fidélité</td>
            <td style="text-align:right;color:#d97706;font-size:14px">-${(loyaltyDiscount / 100).toFixed(2)}€</td>
          </tr>
        </table>`;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f3f4f6">
        <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#F97066 0%,#C94D3A 100%);color:white;padding:40px 30px;text-align:center;border-radius:12px 12px 0 0">
            <h1 style="margin:0;font-size:28px;font-weight:600">Commande confirmée !</h1>
            <p style="margin:10px 0 0;opacity:0.9;font-size:16px">Votre commande a été acceptée</p>
          </div>

          <!-- Content -->
          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
            <p style="font-size:16px;color:#374151;margin:0 0 20px">
              Bonjour <strong>${escapeHtml(order.customer_name)}</strong>,
            </p>
            <p style="font-size:16px;color:#374151;margin:0 0 20px">
              Votre commande chez <strong style="color:#F97066">${escapeHtml(order.foodtruck.name)}</strong> a été acceptée.
            </p>

            <!-- Pickup time -->
            <div style="background:#fef3c7;padding:15px;border-radius:8px;margin:20px 0">
              <strong style="color:#92400e">Heure de retrait :</strong><br>
              <span style="color:#78350f;font-size:18px">${pickupDateStr}</span>
            </div>

            ${locationHtml}

            <!-- Order summary -->
            <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0">
              <h3 style="margin:0 0 15px;color:#111827;font-size:18px">Récapitulatif de votre commande</h3>
              ${items}
              ${discountHtml}
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:15px;padding-top:15px;border-top:2px solid #e5e7eb">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#F97066;text-align:left">Total</td>
                  <td style="font-size:20px;font-weight:700;color:#F97066;text-align:right">${total}€</td>
                </tr>
              </table>
              <p style="font-size:13px;color:#6b7280;margin:10px 0 0;text-align:center">
                Montant à régler sur place
              </p>
            </div>

            ${orderNotesHtml}

            <!-- Order ID & Contact -->
            <p style="font-family:monospace;font-size:14px;color:#9ca3af;margin:20px 0 0;text-align:center">
              Commande ${orderId}
            </p>
            ${
              order.foodtruck.phone
                ? `
              <p style="font-size:14px;color:#6b7280;margin:8px 0 0;text-align:center">
                Une question ? Contactez-nous au <a href="tel:${escapeHtml(order.foodtruck.phone)}" style="color:#F97066;text-decoration:none;font-weight:500">${escapeHtml(order.foodtruck.phone)}</a>
              </p>
            `
                : ''
            }

            <p style="font-size:16px;color:#374151;margin:30px 0 0;text-align:center">
              À bientôt !
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
            <p style="margin:0">Cet email a été envoyé par ${escapeHtml(order.foodtruck.name)}</p>
          </div>
        </div>
      </body>
      </html>`;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey)
      return successResponse({ success: true, message: 'Email skipped (no API key)' });

    // Sending confirmation email for order

    const resendDomain = Deno.env.get('RESEND_DOMAIN') || 'resend.dev';
    // Sanitize foodtruck name for email headers (prevents header injection)
    const safeFromName =
      (order.foodtruck.name || 'FoodTruck')
        .replace(/[^a-zA-Z0-9\s\-\u00C0-\u024F']/g, '')
        .substring(0, 100)
        .trim() || 'FoodTruck';
    const emailPayload = {
      from: `${safeFromName} <commandes@${resendDomain}>`,
      to: [order.customer_email],
      subject: `Commande confirmée - ${safeFromName}`,
      html,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      console.error('Email API error:', res.status);
      // Don't fail the request, just log the error - return generic message
      return successResponse({ success: false, message: 'Email failed to send' });
    }

    return successResponse({ success: true });
  } catch {
    console.error('Email service error');
    return errorResponse('Une erreur est survenue', 500);
  }
});
