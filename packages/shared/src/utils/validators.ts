export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone);
}

export function isValidPrice(price: number): boolean {
  return price > 0 && Number.isInteger(price);
}

export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

export function isValidDate(date: string): boolean {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validateOrderItems(
  items: { menu_item_id: string; quantity: number }[]
): { valid: boolean; error?: string } {
  if (!items || items.length === 0) {
    return { valid: false, error: 'Le panier est vide' };
  }

  for (const item of items) {
    if (!item.menu_item_id) {
      return { valid: false, error: 'Article invalide dans le panier' };
    }
    if (!item.quantity || item.quantity < 1 || item.quantity > 99) {
      return { valid: false, error: 'Quantité invalide' };
    }
  }

  return { valid: true };
}
