import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSubdomain } from './subdomain';

describe('getSubdomain', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Delete location to allow mocking
    // @ts-expect-error - mocking window.location
    delete window.location;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('should return null for localhost', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'localhost' };
    expect(getSubdomain()).toBe(null);
  });

  it('should return null for IP addresses', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: '192.168.1.1' };
    expect(getSubdomain()).toBe(null);

    // @ts-expect-error - mocking partial Location
    window.location = { hostname: '127.0.0.1' };
    expect(getSubdomain()).toBe(null);
  });

  it('should return subdomain for valid subdomain.onmange.app', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'le-gourmet.onmange.app' };
    expect(getSubdomain()).toBe('le-gourmet');
  });

  it('should return null for www.onmange.app', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'www.onmange.app' };
    expect(getSubdomain()).toBe(null);
  });

  it('should return null for app.onmange.app', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'app.onmange.app' };
    expect(getSubdomain()).toBe(null);
  });

  it('should return null for dashboard.onmange.app', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'dashboard.onmange.app' };
    expect(getSubdomain()).toBe(null);
  });

  it('should return null for bare onmange.app', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'onmange.app' };
    expect(getSubdomain()).toBe(null);
  });

  it('should handle multi-level subdomains', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'test.subdomain.onmange.app' };
    expect(getSubdomain()).toBe('test');
  });

  it('should return null for other domains', () => {
    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'example.com' };
    expect(getSubdomain()).toBe(null);

    // @ts-expect-error - mocking partial Location
    window.location = { hostname: 'test.example.com' };
    expect(getSubdomain()).toBe(null);
  });
});
