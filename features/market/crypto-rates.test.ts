import { describe, expect, it } from 'vitest';
import { parseCryptoRates, parseCryptoStats } from './crypto-rates';
import { currencyGroup } from './currencies';
describe('market segments and crypto rates', () => {
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
