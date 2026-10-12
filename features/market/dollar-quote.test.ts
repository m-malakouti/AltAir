import { describe, expect, it } from 'vitest';
import { isQuoteStale, parseDollarQuote } from './dollar-quote';
import { parseMarketEndpoint } from './market-endpoint';

const now = Date.parse('2026-10-12T08:00:00Z');
const quote = {
  instrument: 'USD_FREE_SELL',
  priceToman: 123456,
  updatedAt: '2026-10-12T07:00:00Z',
  fetchedAt: '2026-10-12T07:01:00Z',
  staleAfterSeconds: 7200,
  fetchFailed: false,
  source: 'نوسان',
  sourceUrl: 'https://www.navasan.net/',
};
describe('market quote validation', () => {
  it('accepts a valid free-market sell quote in toman', () => {
    expect(parseDollarQuote(quote, now)).toEqual(quote);
  });
  it.each([
    { instrument: 'USD_OFFICIAL' },
    { priceToman: 0 },
    { priceToman: -1 },
    { priceToman: NaN },
    { priceToman: '123' },
    { updatedAt: 'bad' },
    { updatedAt: '2026-10-13T08:00:00Z' },
    { fetchedAt: 'bad' },
    { staleAfterSeconds: 0 },
    { fetchFailed: 'false' },
    { sourceUrl: 'javascript:alert(1)' },
    { source: 'unknown' },
  ])('rejects malformed or incorrect market data: %j', (change) => {
    expect(() => parseDollarQuote({ ...quote, ...change }, now)).toThrow('Invalid market data.');
  });
  it('distinguishes aging source data and failed refreshes', () => {
    const valid = parseDollarQuote(quote, now);
    expect(isQuoteStale(valid, now)).toBe(false);
    expect(isQuoteStale(valid, now + 7200_000)).toBe(true);
    expect(isQuoteStale({ ...valid, fetchFailed: true }, now)).toBe(true);
  });
});
describe('market endpoint configuration', () => {
  it('leaves the unconfigured connection disabled', () => {
    expect(parseMarketEndpoint(undefined)).toBeNull();
    expect(parseMarketEndpoint('')).toBeNull();
  });
  it('allows HTTPS and local development HTTP', () => {
    expect(parseMarketEndpoint('https://market.example.com/api/market/usd')?.origin).toBe(
      'https://market.example.com',
    );
    expect(parseMarketEndpoint('http://127.0.0.1:5279/api/market/usd')?.port).toBe('5279');
  });
  it.each([
    'http://example.com/api',
    'https://user:secret@example.com/api',
    'https://example.com/api?key=secret',
    'https://example.com/api#key',
    'javascript:alert(1)',
  ])('rejects unsafe or credential-bearing endpoints: %s', (value) => {
    expect(() => parseMarketEndpoint(value)).toThrow();
  });
});
