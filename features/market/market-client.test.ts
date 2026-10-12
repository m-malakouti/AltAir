import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchDollarQuote } from './market-client';
const endpoint = new URL('https://market.example.com/api/market/usd');
describe('market transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('does not send credentials or follow redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          instrument: 'USD_FREE_SELL',
          priceToman: 123456,
          updatedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          staleAfterSeconds: 7200,
          fetchFailed: false,
          source: 'نوسان',
          sourceUrl: 'https://www.navasan.net/',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchDollarQuote(endpoint)).priceToman).toBe(123456);
    expect(fetchMock).toHaveBeenCalledWith(
      endpoint.href,
      expect.objectContaining({ credentials: 'omit', redirect: 'error', cache: 'no-store' }),
    );
  });
  it('rejects an unavailable backend without treating its response as a quote', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(fetchDollarQuote(endpoint)).rejects.toThrow('Market service unavailable.');
  });
  it('rejects a malformed successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    await expect(fetchDollarQuote(endpoint)).rejects.toThrow('Invalid market data.');
  });
});
