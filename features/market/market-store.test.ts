import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DollarQuote } from './dollar-quote';
const dependencies = vi.hoisted(() => ({
  loadMarketCache: vi.fn<() => Promise<unknown>>(),
  saveMarketCache: vi.fn<() => Promise<void>>(),
  fetchDollarQuote: vi.fn<() => Promise<DollarQuote>>(),
}));
vi.mock('@/lib/browser/market-cache', () => dependencies);
vi.mock('./market-client', () => dependencies);
const quote: DollarQuote = {
  instrument: 'USD_FREE_SELL',
  priceToman: 123456,
  updatedAt: '2026-01-01T07:00:00Z',
  fetchedAt: '2026-01-01T07:01:00Z',
  staleAfterSeconds: 7200,
  fetchFailed: false,
  source: 'نوسان',
  sourceUrl: 'https://www.navasan.net/',
};
describe('market state', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv('WXT_MARKET_API_URL', 'https://market.example.com/api/market/usd');
    dependencies.loadMarketCache.mockResolvedValue(null);
    dependencies.saveMarketCache.mockResolvedValue(undefined);
    dependencies.fetchDollarQuote.mockResolvedValue(quote);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it('makes no request when no endpoint is configured', async () => {
    vi.stubEnv('WXT_MARKET_API_URL', '');
    const store = await import('./market-store');
    await store.refreshMarket();
    expect(store.getMarketSnapshot().status).toBe('unavailable');
    expect(dependencies.fetchDollarQuote).not.toHaveBeenCalled();
  });
  it('preserves cached quote timestamps when a refresh fails', async () => {
    dependencies.loadMarketCache.mockResolvedValue({
      version: 1,
      endpoint: 'https://market.example.com/api/market/usd',
      quote,
    });
    dependencies.fetchDollarQuote.mockRejectedValue(new Error('Offline'));
    const store = await import('./market-store');
    await store.refreshMarket();
    expect(store.getMarketSnapshot().status).toBe('error');
    expect(store.getMarketSnapshot().quote).toEqual(quote);
    expect(dependencies.saveMarketCache).not.toHaveBeenCalled();
  });
  it('does not use a cache belonging to a different endpoint', async () => {
    dependencies.loadMarketCache.mockResolvedValue({
      version: 1,
      endpoint: 'https://other.example.com',
      quote,
    });
    dependencies.fetchDollarQuote.mockRejectedValue(new Error('Offline'));
    const store = await import('./market-store');
    await store.refreshMarket();
    expect(store.getMarketSnapshot().quote).toBeNull();
  });
  it('keeps a newly received quote visible when caching fails', async () => {
    dependencies.saveMarketCache.mockRejectedValue(new Error('Storage blocked'));
    const store = await import('./market-store');
    await store.refreshMarket();
    expect(store.getMarketSnapshot().status).toBe('ready');
    expect(store.getMarketSnapshot().quote).toEqual(quote);
    expect(store.getMarketSnapshot().error).not.toBeNull();
  });
  it('deduplicates concurrent refresh actions', async () => {
    const store = await import('./market-store');
    await Promise.all([store.refreshMarket(), store.refreshMarket(), store.refreshMarket()]);
    expect(dependencies.fetchDollarQuote).toHaveBeenCalledTimes(1);
  });
});
