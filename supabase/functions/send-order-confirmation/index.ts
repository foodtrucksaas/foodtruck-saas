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

    // Fetch order with items and options
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

    const { data: schedule } = await supabase
      .from('schedules')
      .select('location:locations (name, address)')
      .eq('foodtruck_id', order.foodtruck_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single();

    const location = schedule?.location as { name: string; address: string | null } | null;

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

    // Build items HTML with options
    const items = (order.order_items as OrderItem[])
      .filter((item) => item.menu_item) // Skip items without menu_item
      .map((item) => {
        const itemTotal = (item.unit_price * item.quantity) / 100;

        // Build options list
        let optionsHtml = '';
        if (item.order_item_options && item.order_item_options.length > 0) {
          const optionsList = item.order_item_options
            .map((opt) => {
              const modifier =
                opt.price_modifier !== 0
                  ? ` (${opt.price_modifier > 0 ? '+' : ''}${(opt.price_modifier / 100).toFixed(2)}€)`
                  : '';
              return `${escapeHtml(opt.option_name)}${modifier}`;
            })
            .join(', ');
          optionsHtml = `<div style="font-size:13px;color:#6b7280;margin-top:2px;padding-left:20px">${optionsList}</div>`;
        }

        // Add item notes if present
        let notesHtml = '';
        if (item.notes) {
          notesHtml = `<div style="font-size:12px;color:#9ca3af;font-style:italic;margin-top:2px;padding-left:20px">Note : ${escapeHtml(item.notes)}</div>`;
        }

        return `
          <div style="padding:12px 0;border-bottom:1px solid #e5e7eb">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <strong>${item.quantity}x</strong> ${escapeHtml(item.menu_item.name)}
              </div>
              <div style="font-weight:500;white-space:nowrap">${itemTotal.toFixed(2)}€</div>
            </div>
            ${optionsHtml}
            ${notesHtml}
          </div>`;
      })
      .join('');

    const total = (order.total_amount / 100).toFixed(2);

    // Build location section if available
    let locationHtml = '';
    if (location) {
      locationHtml = `
        <div style="background:#dbeafe;padding:15px;border-radius:8px;margin:20px 0">
          <strong style="color:#1e40af">Lieu de retrait :</strong><br>
          <span style="color:#1e3a8a">${escapeHtml(location.name)}${location.address ? ` - ${escapeHtml(location.address)}` : ''}</span>
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

    // Build discount section if applicable
    let discountHtml = '';
    if (order.discount_amount && order.discount_amount > 0) {
      discountHtml = `
        <div style="display:flex;justify-content:space-between;color:#059669;margin-top:10px">
          <span>Réduction</span>
          <span>-${(order.discount_amount / 100).toFixed(2)}€</span>
        </div>`;
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
          <div style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:white;padding:40px 30px;text-align:center;border-radius:12px 12px 0 0">
            <h1 style="margin:0;font-size:28px;font-weight:600">Commande confirmée !</h1>
            <p style="margin:10px 0 0;opacity:0.9;font-size:16px">Votre commande a été acceptée</p>
          </div>

          <!-- Content -->
          <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
            <p style="font-size:16px;color:#374151;margin:0 0 20px">
              Bonjour <strong>${escapeHtml(order.customer_name)}</strong>,
            </p>
            <p style="font-size:16px;color:#374151;margin:0 0 20px">
              Votre commande chez <strong style="color:#f97316">${escapeHtml(order.foodtruck.name)}</strong> a été acceptée.
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
              <div style="font-size:20px;font-weight:700;color:#f97316;margin-top:15px;padding-top:15px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between">
                <span>Total</span>
                <span>${total}€</span>
              </div>
              <p style="font-size:13px;color:#6b7280;margin:10px 0 0;text-align:center">
                Montant à régler sur place
              </p>
            </div>

            ${orderNotesHtml}

            <!-- Contact -->
            ${
              order.foodtruck.phone
                ? `
              <p style="font-size:14px;color:#6b7280;margin:20px 0 0;text-align:center">
                Une question ? Contactez-nous au <a href="tel:${escapeHtml(order.foodtruck.phone)}" style="color:#f97316;text-decoration:none;font-weight:500">${escapeHtml(order.foodtruck.phone)}</a>
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
    const emailPayload = {
      from: `${order.foodtruck.name} <commandes@${resendDomain}>`,
      to: [order.customer_email],
      subject: `Commande confirmée - ${order.foodtruck.name}`,
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
