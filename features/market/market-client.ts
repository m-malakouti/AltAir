import { parseDollarQuote } from './dollar-quote';
import type { DollarQuote } from './dollar-quote';

export async function fetchDollarQuote(endpoint: URL, signal?: AbortSignal): Promise<DollarQuote> {
  const response = await fetch(endpoint.href, {
    signal: signal ?? AbortSignal.timeout(12_000),
    redirect: 'error',
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Market service unavailable.');
  const data: unknown = await response.json();
  return parseDollarQuote(data);
}
