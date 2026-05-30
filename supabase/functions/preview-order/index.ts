import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { successResponse, errorResponse, setCurrentRequest } from '../_shared/responses.ts';
import { createLogger, generateRequestId } from '../_shared/logger.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import { calculateOrderTotal } from '../_shared/pricing-engine/calculate-order-total.ts';
import type { ClientLineItem } from '../_shared/pricing-engine/types.ts';

// ============================================
// RATE LIMITING (persistent via PostgreSQL)
// ============================================
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 60; // Higher than create-order — preview is called often

async function checkRateLimit(identifier: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: `preview:${identifier}`,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
    });
    if (error) {
      console.error('Rate limit check failed:', error.message);
      return true; // Fail open
    }
    return data as boolean;
  } catch {
    return true; // Fail open
  }
}

// ============================================
// INPUT VALIDATION
// ============================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PreviewRequestBody {
  foodtruck_id: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    selected_option_ids?: string[];
    notes?: string;
    bundle_id?: string;
  }>;
  customer?: { email?: string; phone?: string };
  promo_code?: string;
  use_loyalty_reward?: boolean;
  loyalty_reward_count?: number;
}

function validatePreviewRequest(body: unknown): {
  error: string | null;
  parsed: PreviewRequestBody | null;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Corps de requête invalide', parsed: null };
  }

  const b = body as Record<string, unknown>;

  if (!b.foodtruck_id || typeof b.foodtruck_id !== 'string') {
    return { error: 'foodtruck_id est requis', parsed: null };
  }
  if (!UUID_REGEX.test(b.foodtruck_id)) {
    return { error: 'foodtruck_id invalide', parsed: null };
  }

  if (!Array.isArray(b.items)) {
    return { error: 'items doit être un tableau', parsed: null };
  }
  if (b.items.length > 100) {
    return { error: "Trop d'articles (max 100)", parsed: null };
  }

  for (const item of b.items) {
    if (!item || typeof item !== 'object') {
      return { error: 'Item invalide', parsed: null };
    }
    if (!item.menu_item_id || !UUID_REGEX.test(item.menu_item_id)) {
      return { error: `menu_item_id invalide: ${item.menu_item_id}`, parsed: null };
    }
    if (
      typeof item.quantity !== 'number' ||
      item.quantity < 1 ||
      !Number.isInteger(item.quantity)
    ) {
      return { error: `Quantité invalide pour ${item.menu_item_id}`, parsed: null };
    }
    if (item.selected_option_ids) {
      if (!Array.isArray(item.selected_option_ids)) {
        return { error: 'selected_option_ids doit être un tableau', parsed: null };
      }
      for (const optId of item.selected_option_ids) {
        if (!UUID_REGEX.test(optId)) {
          return { error: `Option ID invalide: ${optId}`, parsed: null };
        }
      }
    }
  }

  // Validate customer if provided
  if (b.customer && typeof b.customer === 'object') {
    const cust = b.customer as Record<string, unknown>;
    if (cust.email && (typeof cust.email !== 'string' || !EMAIL_REGEX.test(cust.email))) {
      return { error: 'Email client invalide', parsed: null };
    }
  }

  // Build parsed object
  const parsed: PreviewRequestBody = {
    foodtruck_id: b.foodtruck_id as string,
    items: (b.items as Array<Record<string, unknown>>).map((item) => ({
      menu_item_id: item.menu_item_id as string,
      quantity: item.quantity as number,
      selected_option_ids: (item.selected_option_ids as string[] | undefined) ?? [],
      notes: item.notes as string | undefined,
      bundle_id: item.bundle_id as string | undefined,
    })),
    customer: b.customer
      ? {
          email: (b.customer as Record<string, unknown>).email as string | undefined,
          phone: (b.customer as Record<string, unknown>).phone as string | undefined,
        }
      : undefined,
    promo_code: b.promo_code as string | undefined,
    use_loyalty_reward: b.use_loyalty_reward as boolean | undefined,
    loyalty_reward_count: b.loyalty_reward_count as number | undefined,
  };

  return { error: null, parsed };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  const logger = createLogger('preview-order');
  const requestId = generateRequestId();
  logger.setRequestId(requestId);

  setCurrentRequest(req);

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Rate limiting
    const clientIP =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!(await checkRateLimit(clientIP))) {
      logger.warn('Rate limit exceeded', { clientIP });
      return errorResponse('Trop de requêtes. Veuillez réessayer dans une minute.', 429);
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse('JSON invalide', 400);
    }

    // Validate input
    const { error: validationError, parsed } = validatePreviewRequest(body);
    if (validationError || !parsed) {
      return errorResponse(validationError ?? 'Requête invalide', 400);
    }

    logger.setContext({ foodtruckId: parsed.foodtruck_id });

    // Check foodtruck exists and is active
    const supabase = createSupabaseAdmin();
    const { data: foodtruck, error: ftError } = await supabase
      .from('foodtrucks')
      .select('id, is_active')
      .eq('id', parsed.foodtruck_id)
      .single();

    if (ftError || !foodtruck) {
      return errorResponse('Foodtruck introuvable', 404);
    }
    if (!foodtruck.is_active) {
      return errorResponse("Ce foodtruck n'est pas actif", 404);
    }

    // Empty cart shortcut
    if (parsed.items.length === 0) {
      return successResponse({
        line_items: [],
        subtotal: 0,
        discounts: [],
        total: 0,
        loyalty_points_earned: 0,
        warnings: [],
      });
    }

    // Build input for calculateOrderTotal
    const clientItems: ClientLineItem[] = parsed.items.map((item) => ({
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      selected_option_ids: item.selected_option_ids ?? [],
      notes: item.notes,
      bundle_id: item.bundle_id,
    }));

    const warnings: string[] = [];

    // Calculate order total — catch item-level errors as warnings
    try {
      const result = await calculateOrderTotal(supabase, {
        foodtruckId: parsed.foodtruck_id,
        items: clientItems,
        customer: parsed.customer?.email
          ? { email: parsed.customer.email, phone: parsed.customer.phone }
          : undefined,
        promoCode: parsed.promo_code,
        useLoyaltyReward: parsed.use_loyalty_reward,
        loyaltyRewardCount: parsed.loyalty_reward_count,
      });

      logger.info('Preview calculated', {
        subtotal: result.subtotal as unknown as string,
        total: result.total as unknown as string,
        discountCount: result.discounts.length as unknown as string,
      });

      return successResponse({
        ...result,
        warnings,
      });
    } catch (calcError) {
      const message = calcError instanceof Error ? calcError.message : 'Erreur de calcul';

      // Item-level errors (not found, unavailable) → return partial result with warning
      if (message.includes('not found') || message.includes('no longer available')) {
        logger.warn('Preview item error, returning warning', {
          error: message,
        });
        return successResponse({
          line_items: [],
          subtotal: 0,
          discounts: [],
          total: 0,
          loyalty_points_earned: 0,
          warnings: [message],
        });
      }

      // Unexpected errors → 500
      throw calcError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    logger.error('Preview order failed', error instanceof Error ? error : undefined);
    return errorResponse(message, 500);
  }
});
