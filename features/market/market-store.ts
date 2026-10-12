import { loadMarketCache, saveMarketCache } from '@/lib/browser/market-cache';
import { parseDollarQuote } from './dollar-quote';
import type { DollarQuote } from './dollar-quote';
import { fetchDollarQuote } from './market-client';
import { parseMarketEndpoint } from './market-endpoint';

interface MarketSnapshot {
  status: 'loading' | 'ready' | 'error' | 'unavailable';
  quote: DollarQuote | null;
  error: string | null;
}
const configuredEndpoint: unknown = import.meta.env.WXT_MARKET_API_URL;
const endpoint = parseMarketEndpoint(configuredEndpoint);
let snapshot: MarketSnapshot = {
  status: endpoint ? 'loading' : 'unavailable',
  quote: null,
  error: null,
};
const listeners = new Set<() => void>();
let started = false;
let pending: Promise<void> | null = null;
let cacheLoaded = false;

function publish(state: MarketSnapshot) {
  snapshot = state;
  for (const listener of listeners) listener();
}
export function refreshMarket(): Promise<void> {
  if (!endpoint) return Promise.resolve();
  if (pending) return pending;
  publish({ ...snapshot, status: 'loading', error: null });
  pending = (async () => {
    if (!cacheLoaded) {
      cacheLoaded = true;
      try {
        const cache: unknown = await loadMarketCache();
        if (
          typeof cache === 'object' &&
          cache !== null &&
          'version' in cache &&
          cache.version === 1 &&
          'endpoint' in cache &&
          cache.endpoint === endpoint.href &&
          'quote' in cache
        ) {
          const quote = parseDollarQuote(cache.quote);
          publish({ status: 'loading', quote, error: null });
        }
      } catch {
        /* Corrupt or inaccessible cached data is not a market quote. */
      }
    }
    try {
      const quote = await fetchDollarQuote(endpoint);
      publish({ status: 'ready', quote, error: null });
      try {
        await saveMarketCache({ version: 1, endpoint: endpoint.href, quote });
      } catch {
        publish({ status: 'ready', quote, error: 'قیمت دریافت شد، اما ذخیرهٔ آفلاین انجام نشد.' });
      }
    } catch {
      publish({
        ...snapshot,
        status: 'error',
        error: snapshot.quote
          ? 'به‌روزرسانی انجام نشد؛ آخرین قیمت ذخیره‌شده نمایش داده می‌شود.'
          : 'قیمت فعلاً در دسترس نیست. کمی بعد دوباره تلاش کنید.',
      });
    }
  })().finally(() => {
    pending = null;
  });
  return pending;
}
export function subscribeMarket(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) {
    started = true;
    void refreshMarket();
  }
  return () => listeners.delete(listener);
}
export function getMarketSnapshot(): MarketSnapshot {
  return snapshot;
}
