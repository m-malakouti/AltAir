import { describe, expect, it } from 'vitest';
import { parseFavorites } from './currencies';
import { parseDollarQuote } from './dollar-quote';
describe('currency selection', () => {
  it('defaults to USD and preserves an intentionally empty selection', () => {
    expect(parseFavorites(undefined)).toEqual(['USD']);
    expect(parseFavorites({ version: 1, codes: [] })).toEqual([]);
  });
  it('round trips selected currencies in order', () => {
    expect(parseFavorites({ version: 1, codes: ['EUR', 'USD', 'AED'] })).toEqual([
      'EUR',
      'USD',
      'AED',
    ]);
  });
  it.each([
    { version: 2, codes: ['USD'] },
    { version: 1, codes: ['BTC'] },
    { version: 1, codes: ['USD', 'USD'] },
    { version: 1, codes: 'USD' },
  ])('rejects malformed preferences: %j', (value) => {
    expect(() => parseFavorites(value)).toThrow();
  });
});
const now = Date.parse('2026-10-12T08:00:00Z');
const quote = {
  instrument: 'USD_FREE_SELL',
  priceToman: 100,
  updatedAt: '2026-10-12T07:00:00Z',
  fetchedAt: '2026-10-12T07:10:00Z',
  staleAfterSeconds: 7200,
  fetchFailed: false,
  source: 'نوسان',
  sourceUrl: 'https://www.navasan.net/',
};
describe('multi-currency quotes', () => {
  it('keeps each currency price and source timestamp independent', () => {
    const rates = [{ code: 'EUR', priceToman: 115, updatedAt: '2026-10-12T06:00:00Z' }];
    expect(parseDollarQuote({ ...quote, rates }, now).rates).toEqual(rates);
  });
  it.each([
    [{ code: 'EUR', priceToman: -1, updatedAt: quote.updatedAt }],
    [{ code: 'EUR', priceToman: 100, updatedAt: '2027-01-01T00:00:00Z' }],
    [{ code: 'BTC', priceToman: 100, updatedAt: quote.updatedAt }],
    [
      { code: 'EUR', priceToman: 100, updatedAt: quote.updatedAt },
      { code: 'EUR', priceToman: 120, updatedAt: quote.updatedAt },
    ],
  ])('rejects invalid rates', (...rates) => {
    expect(() => parseDollarQuote({ ...quote, rates }, now)).toThrow();
  });
});

describe('daily currency changes', () => {
  it.each([25, -25, 0, null])('preserves signed daily change %s', (changeToman) => {
    const rates = [{ code: 'EUR', priceToman: 115, updatedAt: quote.updatedAt, changeToman }];
    expect(parseDollarQuote({ ...quote, rates }, now).rates?.[0]?.changeToman).toBe(changeToman);
  });
  it.each([NaN, Infinity, '25', 115])('rejects invalid change %s', (changeToman) => {
    expect(() =>
      parseDollarQuote(
        {
          ...quote,
          rates: [{ code: 'EUR', priceToman: 115, updatedAt: quote.updatedAt, changeToman }],
        },
        now,
      ),
    ).toThrow();
  });
});
