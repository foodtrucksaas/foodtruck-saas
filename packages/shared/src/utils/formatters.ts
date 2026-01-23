import { safeNumber } from './numbers';

export function formatPrice(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(safeNumber(price) / 100);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    ...options,
  }).format(d);
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours}h${minutes}`;
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

export function formatOrderId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Extract city or short location from a full French address
 * Returns the city name (between postal code and country)
 * Example: "123 Rue de Paris, 75001 Paris, France" -> "Paris"
 */
export function extractCityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;

  // Try to match French postal code pattern: XXXXX CityName
  const postalCodeMatch = address.match(/\d{5}\s+([A-Za-zÀ-ÿ\s-]+?)(?:,|\s*$)/);
  if (postalCodeMatch) {
    return postalCodeMatch[1].trim();
  }

  // Fallback: split by comma and get second-to-last part (usually city)
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const potentialCity = parts[parts.length - 2];
    // Remove postal code if present at start
    const cityOnly = potentialCity.replace(/^\d{5}\s*/, '');
    if (cityOnly) return cityOnly;
  }

  return null;
}

/**
 * Format address for display - returns short (city) and full versions
 */
export function formatAddress(address: string | null | undefined): {
  short: string | null;
  full: string | null;
} {
  if (!address) return { short: null, full: null };

  const city = extractCityFromAddress(address);
  return {
    short: city,
    full: address,
  };
}
