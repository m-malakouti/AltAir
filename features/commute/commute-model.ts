export interface CommutePlaces {
  home: string;
  work: string;
}
export type CommuteDirection = 'toWork' | 'toHome';
export interface CommuteRoute {
  durationSeconds: number;
  baselineSeconds: number | null;
  distanceMeters: number;
  fetchedAt: string;
  description: string;
  warnings: string[];
  encodedPolyline: string;
}
export const ROUTE_FRESH_MS = 5 * 60_000;
export function validAddress(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length >= 3 &&
    value.trim().length <= 240 &&
    !Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  );
}
export function parsePlaces(value: unknown): CommutePlaces | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  return validAddress(item.home) && validAddress(item.work) && item.home.trim() !== item.work.trim()
    ? { home: item.home.trim(), work: item.work.trim() }
    : null;
}
export function routeEndpoints(places: CommutePlaces, direction: CommuteDirection) {
  return direction === 'toWork'
    ? { origin: places.home, destination: places.work }
    : { origin: places.work, destination: places.home };
}
export function parseRoute(value: unknown, now = Date.now()): CommuteRoute {
  if (!value || typeof value !== 'object') throw new Error('invalid_route');
  const item = value as Record<string, unknown>;
  for (const field of ['durationSeconds', 'distanceMeters']) {
    const number = item[field];
    if (
      typeof number !== 'number' ||
      !Number.isFinite(number) ||
      number <= 0 ||
      number > 10_000_000
    )
      throw new Error('invalid_route');
  }
  if (
    item.baselineSeconds !== null &&
    (typeof item.baselineSeconds !== 'number' ||
      !Number.isFinite(item.baselineSeconds) ||
      item.baselineSeconds <= 0 ||
      item.baselineSeconds > 10_000_000)
  )
    throw new Error('invalid_route');
  if (typeof item.encodedPolyline !== 'string') throw new Error('invalid_route');
  decodeRoutePolyline(item.encodedPolyline);
  if (
    typeof item.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(item.fetchedAt)) ||
    Date.parse(item.fetchedAt) > now + 60_000 ||
    now - Date.parse(item.fetchedAt) > ROUTE_FRESH_MS ||
    typeof item.description !== 'string' ||
    item.description.length > 500 ||
    !Array.isArray(item.warnings) ||
    item.warnings.length > 20 ||
    !item.warnings.every(
      (warning: unknown) => typeof warning === 'string' && warning.length <= 1000,
    )
  )
    throw new Error('invalid_route');
  return item as unknown as CommuteRoute;
}
export function trafficImpact(route: CommuteRoute) {
  if (route.baselineSeconds === null) return null;
  const delay = Math.max(0, route.durationSeconds - route.baselineSeconds);
  const ratio = delay / route.baselineSeconds;
  return {
    delayMinutes: Math.ceil(delay / 60),
    level: ratio >= 0.5 ? 'high' : ratio >= 0.2 ? 'medium' : 'low',
    label: ratio >= 0.5 ? 'تأخیر زیاد' : ratio >= 0.2 ? 'تأخیر متوسط' : 'تأخیر کم',
  };
}

/** Neshan overview_polyline uses precision 5; return GeoJSON order [longitude, latitude]. */
export function decodeRoutePolyline(encoded: string): [number, number][] {
  if (encoded.length < 4 || encoded.length > 100_000) throw new Error('invalid_polyline');
  let index = 0,
    lat = 0,
    lon = 0;
  const points: [number, number][] = [];
  const delta = () => {
    let result = 0,
      shift = 0;
    while (true) {
      if (index >= encoded.length || shift > 30) throw new Error('invalid_polyline');
      const value = encoded.charCodeAt(index++) - 63;
      if (value < 0 || value > 63) throw new Error('invalid_polyline');
      result += (value & 31) * 2 ** shift;
      if (value < 32) break;
      shift += 5;
    }
    return result % 2 ? -(Math.floor(result / 2) + 1) : result / 2;
  };
  while (index < encoded.length) {
    lat += delta();
    lon += delta();
    if (Math.abs(lat) > 9_000_000 || Math.abs(lon) > 18_000_000 || points.length >= 25_000)
      throw new Error('invalid_polyline');
    points.push([lon / 1e5, lat / 1e5]);
  }
  if (points.length < 2) throw new Error('invalid_polyline');
  return points;
}
