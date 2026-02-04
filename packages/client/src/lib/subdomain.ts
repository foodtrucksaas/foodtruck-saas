/**
 * Extracts the subdomain from the current URL if it's a foodtruck subdomain
 * @returns The subdomain slug or null if on main domain
 */
export function getSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Dev: localhost or IP address - no subdomain support
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  // Prod: check for subdomain.onmange.app
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts.slice(-2).join('.') === 'onmange.app') {
    const subdomain = parts[0];
    // Exclude reserved subdomains
    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'dashboard') {
      return subdomain;
    }
  }

  return null;
}
