import { safeNumber } from './numbers';

const VALID_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD'] as const;

/**
 * Format price in centimes to currency string
 * @param price - Price in centimes (e.g., 1250 = 12.50€)
 * @param currency - Currency code (defaults to EUR)
 */
export function formatPrice(price: number, currency: string = 'EUR'): string {
  // Validate currency to avoid Intl.NumberFormat crash
  const validCurrency = VALID_CURRENCIES.includes(currency as (typeof VALID_CURRENCIES)[number])
    ? currency
    : 'EUR';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: validCurrency,
  }).format(safeNumber(price) / 100);
}

/**
 * Format date to French locale string
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    ...options,
  }).format(d);
}

/**
 * Format time string HH:MM to HHhMM
 * @param time - Time in HH:MM format
 * @returns Formatted time string or empty string if invalid
 */
export function formatTime(time: string | null | undefined): string {
  if (!time || typeof time !== 'string') return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const [hours, minutes] = parts;
  if (!hours || !minutes) return time;
  return `${hours}h${minutes}`;
}

/**
 * Format date and time to French locale string
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/**
 * Format French phone number with spaces
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

/**
 * Format order ID to short display format
 * @param id - UUID order ID
 * @returns Formatted ID like #ABC12345
 */
export function formatOrderId(id: string | null | undefined): string {
  if (!id || typeof id !== 'string') return '';
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
  const parts = address.split(',').map((p) => p.trim());
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
