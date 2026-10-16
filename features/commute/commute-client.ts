import { parseMarketEndpoint } from '@/features/market/market-endpoint';
import { parseRoute } from './commute-model';
const configured: unknown = import.meta.env.WXT_MARKET_API_URL;
const endpoint = parseMarketEndpoint(configured);
export const commuteBackendConfigured = Boolean(endpoint);
async function request(
  path: string,
  signal: AbortSignal,
  body?: { origin: string; destination: string },
): Promise<unknown> {
  if (!endpoint) throw new Error('commute_not_configured');
  const response = await fetch(new URL('/api/commute/' + path, endpoint), {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('commute_rate_limited');
    if (response.status === 422) {
      const error: unknown = await response.json();
      throw new Error(
        error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'commute_ambiguous_address'
          ? 'commute_ambiguous_address'
          : 'commute_no_route',
      );
    }
    if (response.status === 503) throw new Error('commute_unavailable');
    throw new Error('commute_failed');
  }
  return (await response.json()) as unknown;
}
export async function checkCommuteService(signal: AbortSignal): Promise<boolean> {
  const value = await request('status', signal);
  return Boolean(
    value && typeof value === 'object' && 'configured' in value && value.configured === true,
  );
}
export async function fetchCommuteRoute(origin: string, destination: string, signal: AbortSignal) {
  return parseRoute(await request('route', signal, { origin, destination }));
}
