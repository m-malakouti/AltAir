import { describe, expect, it } from 'vitest';
import { googleMapUrl } from './google-map-url';

describe('Google Maps embed URLs', () => {
  it('does not request a map without a key', () => {
    expect(googleMapUrl('  ', null)).toBeNull();
  });
  it('shows Tehran before addresses are saved', () => {
    const url = new URL(googleMapUrl('public-key', null)!);
    expect(url.pathname).toBe('/maps/embed/v1/view');
    expect(url.searchParams.get('center')).toBe('35.6892,51.3890');
  });
  it('preserves Persian addresses and prevents parameters being injected', () => {
    const endpoints = { origin: 'تهران، خانه &mode=walking', destination: '35.7,51.4' };
    const url = new URL(googleMapUrl('public-key', endpoints)!);
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/embed/v1/directions');
    expect(url.searchParams.get('origin')).toBe(endpoints.origin);
    expect(url.searchParams.get('destination')).toBe(endpoints.destination);
    expect(url.searchParams.getAll('mode')).toEqual(['driving']);
  });
});
