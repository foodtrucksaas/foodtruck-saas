/**
 * Generates a URL-friendly slug from a name
 * @param name The name to convert to a slug
 * @returns A lowercase, hyphenated slug without accents
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with -
    .replace(/^-|-$/g, ''); // Trim leading/trailing -
}

/**
 * Validates a slug for use as a subdomain
 * @param slug The slug to validate
 * @returns Whether the slug is valid (3-50 chars, alphanumeric with hyphens)
 */
export function isValidSlug(slug: string): boolean {
  // Must be 3-50 chars, start and end with alphanumeric, can contain hyphens
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}
