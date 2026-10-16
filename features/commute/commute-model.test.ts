import { describe, expect, it } from 'vitest';
import {
  decodeRoutePolyline,
  parsePlaces,
  parseRoute,
  routeEndpoints,
  trafficImpact,
} from './commute-model';

const places = { home: 'تهران، میدان ونک', work: 'تهران، میدان ولیعصر' };
const now = Date.parse('2026-10-15T12:00:00Z');
const route = {
  durationSeconds: 1800,
  baselineSeconds: 1200,
  distanceMeters: 12000,
  fetchedAt: new Date(now).toISOString(),
  description: 'مسیر اصلی',
  warnings: [],
  encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
};
describe('commute data', () => {
  it('restores distinct addresses and rejects corrupt or overlong data', () => {
    expect(parsePlaces(places)).toEqual(places);
    for (const value of [
      null,
      { home: 'a', work: 'xyz' },
      { home: 'xyz', work: 'xyz' },
      { home: 'x'.repeat(241), work: 'xyz' },
      { home: 'abc\n', work: 'def' },
    ])
      expect(parsePlaces(value)).toBeNull();
  });
  it('reverses API endpoints without mixing addresses', () => {
    expect(routeEndpoints(places, 'toHome')).toEqual({
      origin: places.work,
      destination: places.home,
    });
    expect(routeEndpoints(places, 'toWork')).toEqual({
      origin: places.home,
      destination: places.work,
    });
  });
  it('decodes precision-5 geometry into longitude/latitude for the map', () => {
    expect(decodeRoutePolyline(route.encodedPolyline)).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
    for (const polyline of ['', '????_', '~~~~~~~????', 'abcd\n', 'x'.repeat(100_001)])
      expect(() => decodeRoutePolyline(polyline)).toThrow();
  });
  it('accepts fresh real metrics and rejects missing or misleading responses', () => {
    expect(parseRoute(route, now)).toEqual(route);
    for (const patch of [
      { durationSeconds: 0 },
      { baselineSeconds: NaN },
      { distanceMeters: -2 },
      { fetchedAt: 'invalid' },
      { fetchedAt: new Date(now - 360_000).toISOString() },
      { fetchedAt: new Date(now + 120_000).toISOString() },
      { warnings: [4] },
    ])
      expect(() => parseRoute({ ...route, ...patch }, now)).toThrow();
  });
  it('describes additional travel time rather than claiming a traffic density', () => {
    expect(trafficImpact(route)).toMatchObject({ delayMinutes: 10, level: 'high' });
    expect(trafficImpact({ ...route, durationSeconds: 1300 })).toMatchObject({ level: 'low' });
    expect(trafficImpact({ ...route, durationSeconds: 1500 })).toMatchObject({ level: 'medium' });
    expect(trafficImpact({ ...route, durationSeconds: 1100 })?.delayMinutes).toBe(0);
    expect(trafficImpact({ ...route, baselineSeconds: null })).toBeNull();
    expect(parseRoute({ ...route, baselineSeconds: null }, now).baselineSeconds).toBeNull();
  });
});
