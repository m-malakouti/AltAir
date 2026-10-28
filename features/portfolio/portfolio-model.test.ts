import { describe, expect, it } from 'vitest';
import {
  emptyPortfolio,
  parsePortfolio,
  parseQuantity,
  portfolioRate,
  valuePortfolio,
} from './portfolio-model';
import { testNow, testPortfolio, testQuote, testTime } from './test-fixtures';

describe('portfolio amounts and storage', () => {
  it('accepts Persian and Arabic digits and preserves exact normalized quantities', () => {
    expect(parseQuantity(' ۰۰۰۵٫۵۰۰ ', 'GOLD_18')).toBe('5.5');
    expect(parseQuantity('٠.٠٠٠٠٠٠٠١', 'BTC')).toBe('0.00000001');
    expect(parseQuantity('۲', 'COIN_HALF')).toBe('2');
    expect(parsePortfolio(null)).toEqual(emptyPortfolio());
    expect(parsePortfolio(testPortfolio())).toEqual(testPortfolio());
  });
  it.each([
    '0',
    '-1',
    'NaN',
    'Infinity',
    '1e8',
    '1,000',
    '1.2.3',
    '.5',
    '1000000001',
    '0.000000001',
  ])('rejects ambiguous or unsafe crypto amount %s', (value) => {
    expect(() => parseQuantity(value, 'BTC')).toThrow();
  });
  it('rejects fractional coins and unknown or duplicate holdings without discarding them', () => {
    expect(() => parseQuantity('1.5', 'COIN_HALF')).toThrow();
    expect(() => parseQuantity('1', 'unknown')).toThrow();
    expect(() => parsePortfolio({ ...testPortfolio(), version: 2 })).toThrow();
    expect(() => parsePortfolio({ ...testPortfolio(), unit: '__proto__' })).toThrow();
    expect(() =>
      parsePortfolio({
        ...testPortfolio(),
        holdings: [
          { code: 'BTC', quantity: '1' },
          { code: 'BTC', quantity: '2' },
        ],
      }),
    ).toThrow();
  });
});

describe('portfolio valuation', () => {
  it('values crypto units, whole coins and gold grams using the shared normalized quote', () => {
    const result = valuePortfolio(testPortfolio(), testQuote(), testNow);
    expect(result.rows.map((row) => row.value)).toEqual([20000000, 15000000, 16000000, 5500000]);
    expect(result.totals).toEqual({ toman: 56500000, rial: 565000000, USD: 565, BTC: 0.0565 });
    expect(result.missing).toBe(0);
    expect(result.stale).toBe(false);
    expect(result.oldestAt).toBe(testTime);
  });
  it('marks missing rates and partial totals instead of treating them as a complete portfolio', () => {
    const quote = testQuote();
    quote.assets = quote.assets?.filter((asset) => asset.id !== 'xrp');
    const result = valuePortfolio(testPortfolio(), quote, testNow);
    expect(result.missing).toBe(1);
    expect(result.totals.toman).toBe(41500000);
    expect(result.rows[1]?.value).toBeNull();
    expect(valuePortfolio(testPortfolio(), null, testNow).totals.toman).toBeNull();
  });
  it('does not synthesize local crypto prices from dollar rates or use ambiguous source units', () => {
    const quote = testQuote();
    quote.assets![0]!.priceToman = undefined;
    expect(portfolioRate('BTC', quote, testNow)).toBeNull();
    quote.assets![1]!.unitVerified = false;
    expect(portfolioRate('XRP', quote, testNow)).toBeNull();
  });
  it('evaluates the time of the local crypto price and conversion rates independently', () => {
    const quote = testQuote();
    quote.assets![0]!.tomanUpdatedAt = '2026-10-27T05:00:00Z';
    quote.fetchedAt = new Date(testNow).toISOString();
    expect(portfolioRate('BTC', quote, testNow)?.stale).toBe(true);
    const goldOnly = { ...emptyPortfolio(), holdings: [{ code: 'GOLD_18', quantity: '1' }] };
    const result = valuePortfolio(goldOnly, quote, testNow);
    expect(result.stale).toBe(false);
    expect(result.conversions.BTC?.stale).toBe(true);
    quote.rates![0]!.updatedAt = '2026-10-27T05:00:00Z';
    expect(valuePortfolio(goldOnly, quote, testNow).conversions.USD?.stale).toBe(true);
  });
  it('marks cached rates after provider failure and excludes values outside the safe rial range', () => {
    const quote = { ...testQuote(), fetchFailed: true };
    expect(valuePortfolio(testPortfolio(), quote, testNow).stale).toBe(true);
    const huge = { ...emptyPortfolio(), holdings: [{ code: 'BTC', quantity: '1000000000' }] };
    const result = valuePortfolio(huge, quote, testNow);
    expect(result.missing).toBe(1);
    expect(result.totals.toman).toBeNull();
  });
  it('preserves empty and tiny portfolios and does not mutate source data', () => {
    const quote = testQuote();
    const before = structuredClone(quote);
    const result = valuePortfolio(
      { ...emptyPortfolio(), holdings: [{ code: 'BTC', quantity: '0.00000001' }] },
      quote,
      testNow,
    );
    expect(result.totals.toman).toBe(10);
    expect(valuePortfolio(emptyPortfolio(), quote, testNow).totals.toman).toBe(0);
    expect(quote).toEqual(before);
  });
  it('does not expose infinite conversion results for an invalidly tiny reference price', () => {
    const quote = testQuote();
    quote.assets![0]!.priceToman = Number.MIN_VALUE;
    const portfolio = { ...emptyPortfolio(), holdings: [{ code: 'GOLD_18', quantity: '1' }] };
    expect(valuePortfolio(portfolio, quote, testNow).totals.BTC).toBeNull();
  });
});
