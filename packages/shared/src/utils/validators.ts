/**
 * Validate email format with null/undefined check and trim
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (!trimmed) return false;
  // RFC 5322 simplified - requires at least 2 chars in TLD
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Validate French phone number (métropole + DOM-TOM)
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed) return false;
  // France métropolitaine + DOM-TOM (0262, 0590, 0596, etc.)
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(trimmed);
}

/**
 * Validate price in centimes (allows 0 for free items)
 */
export function isValidPrice(price: number | null | undefined): boolean {
  if (price === null || price === undefined) return false;
  if (typeof price !== 'number') return false;
  // Must be finite (not Infinity/-Infinity/NaN) and a non-negative integer
  return Number.isFinite(price) && price >= 0 && Number.isInteger(price);
}

/**
 * Validate time format HH:MM
 */
export function isValidTime(time: string | null | undefined): boolean {
  if (!time || typeof time !== 'string') return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Validate ISO date string
 */
export function isValidDate(date: string | null | undefined): boolean {
  if (!date || typeof date !== 'string') return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate order items array
 */
export function validateOrderItems(
  items: { menu_item_id: string; quantity: number }[] | null | undefined
): { valid: boolean; error?: string } {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Le panier est vide' };
  }

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { valid: false, error: 'Article invalide dans le panier' };
    }
    if (!item.menu_item_id || typeof item.menu_item_id !== 'string') {
      return { valid: false, error: 'Article invalide dans le panier' };
    }
    if (typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 99) {
      return { valid: false, error: 'Quantité invalide' };
    }
  }

  return { valid: true };
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
