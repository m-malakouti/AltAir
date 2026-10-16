import { describe, expect, it } from 'vitest';
import { parseCryptoRates, parseCryptoStats, parseNavasanCryptoRates } from './crypto-rates';
import { currencyGroup } from './currencies';
describe('market segments and crypto rates', () => {
  it('preserves a validated local tether price with its independent timestamp', () => {
    const updatedAt = '2026-10-15T10:00:00Z';
    const rate = {
      code: 'USDT',
      priceUsd: 0.999,
      updatedAt,
      changeUsd: null,
      percent: null,
      priceToman: 123456,
      tomanUpdatedAt: '2026-10-15T09:00:00Z',
    };
    const now = Date.parse(updatedAt);
    expect(parseNavasanCryptoRates([rate], now)).toEqual([rate]);
    for (const invalid of [
      { priceToman: -1 },
      { priceToman: Infinity },
      { tomanUpdatedAt: 'invalid' },
      { tomanUpdatedAt: '2026-10-16T10:00:00Z' },
    ]) {
      expect(parseNavasanCryptoRates([{ ...rate, ...invalid }], now)).toEqual([
        { code: 'USDT', priceUsd: 0.999, updatedAt, changeUsd: null, percent: null },
      ]);
    }
  });
  it('validates server crypto prices independently and preserves fractional USD prices', () => {
    const updatedAt = '2026-10-15T10:00:00Z';
    const now = Date.parse(updatedAt);
    const rate = { code: 'DOGE', priceUsd: 0.080382, changeUsd: -0.004, percent: -4.7, updatedAt };
    expect(parseNavasanCryptoRates([rate, { ...rate, code: 'BTC', priceUsd: 0 }], now)).toEqual([
      rate,
    ]);
    expect(parseNavasanCryptoRates([rate, rate], now)).toHaveLength(1);
    expect(parseNavasanCryptoRates([{ ...rate, updatedAt: 'invalid' }], now)).toEqual([]);
    expect(parseNavasanCryptoRates([{ ...rate, updatedAt: '2026-10-16T10:00:00Z' }], now)).toEqual(
      [],
    );
    expect(parseNavasanCryptoRates(undefined, now)).toEqual([]);
  });
  it('keeps missing crypto changes unavailable rather than inventing zero', () => {
    const rate = { code: 'USDT', priceUsd: 0.999077, updatedAt: '2026-10-15T10:00:00Z' };
    expect(parseNavasanCryptoRates([rate], Date.parse(rate.updatedAt))).toEqual([
      { ...rate, changeUsd: null, percent: null },
    ]);
    expect(
      parseNavasanCryptoRates(
        [{ ...rate, percent: -100, changeUsd: 1 }],
        Date.parse(rate.updatedAt),
      )[0]?.percent,
    ).toBeNull();
  });
  it('calculates daily changes from the provider opening and latest price', () => {
    expect(parseCryptoStats({ open: '100', last: '110' })).toEqual({
      price: 110,
      change: 10,
      percent: 10,
    });
    expect(parseCryptoStats({ open: '100', last: '90' })).toEqual({
      price: 90,
      change: -10,
      percent: -10,
    });
    expect(() => parseCryptoStats({ open: '0', last: '110' })).toThrow();
    expect(() => parseCryptoStats({ open: 'NaN', last: '110' })).toThrow();
  });
  it('keeps coins and gold separate from national currencies', () => {
    expect(currencyGroup('USD')).toBe('fiat');
    expect(currencyGroup('GOLD_18')).toBe('metals');
    expect(currencyGroup('COIN_IMAMI')).toBe('metals');
  });
  it('inverts USD base rates to USD per coin', () => {
    expect(
      parseCryptoRates({
        data: { currency: 'USD', rates: { BTC: '0.00002', ETH: '0.0005', USDT: '1' } },
      }),
    ).toEqual({ BTC: 49999.99999999999, ETH: 2000, USDT: 1 });
  });
  it('omits invalid individual quotes and rejects unusable responses', () => {
    expect(
      parseCryptoRates({
        data: { currency: 'USD', rates: { BTC: '0', ETH: '-1', SOL: 'NaN', USDT: '1' } },
      }),
    ).toEqual({ USDT: 1 });
    expect(() => parseCryptoRates({ data: { currency: 'EUR', rates: { BTC: '1' } } })).toThrow();
    expect(() =>
      parseCryptoRates({ data: { currency: 'USD', rates: { BTC: 'Infinity' } } }),
    ).toThrow();
  });
});
