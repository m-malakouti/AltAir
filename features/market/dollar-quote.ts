import { currencies, isCurrencyCode } from './currencies';
import type { CurrencyCode } from './currencies';
import { parseNavasanCryptoRates, type CryptoRate } from './crypto-rates';
export interface CurrencyRate {
  code: CurrencyCode;
  changeToman?: number | null;
  priceToman: number;
  updatedAt: string;
}
export interface DollarQuote {
  rates?: CurrencyRate[];
  cryptoRates?: CryptoRate[];
  instrument: 'USD_FREE_SELL';
  priceToman: number;
  updatedAt: string;
  fetchedAt: string;
  staleAfterSeconds: number;
  fetchFailed: boolean;
  source: string;
  sourceUrl: string;
}
export function parseDollarQuote(value: unknown, now = Date.now()): DollarQuote {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid market data.');
  const data = value as Record<string, unknown>;
  if (
    data.instrument !== 'USD_FREE_SELL' ||
    typeof data.priceToman !== 'number' ||
    !Number.isFinite(data.priceToman) ||
    data.priceToman <= 0 ||
    data.priceToman > 1e12 ||
    typeof data.updatedAt !== 'string' ||
    typeof data.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.updatedAt)) ||
    !Number.isFinite(Date.parse(data.fetchedAt)) ||
    Date.parse(data.updatedAt) > now + 300_000 ||
    Date.parse(data.fetchedAt) > now + 300_000 ||
    typeof data.staleAfterSeconds !== 'number' ||
    !Number.isInteger(data.staleAfterSeconds) ||
    data.staleAfterSeconds < 60 ||
    data.staleAfterSeconds > 2_592_000 ||
    typeof data.fetchFailed !== 'boolean' ||
    data.source !== 'نوسان' ||
    data.sourceUrl !== 'https://www.navasan.net/'
  )
    throw new Error('Invalid market data.');
  let rates: CurrencyRate[] | undefined;
  if (data.rates !== undefined && data.rates !== null) {
    if (!Array.isArray(data.rates) || data.rates.length > currencies.length)
      throw new Error('Invalid rates.');
    rates = data.rates.map((raw: unknown) => {
      if (typeof raw !== 'object' || raw === null) throw new Error('Invalid rate.');
      const rate = raw as Record<string, unknown>;
      if (!isCurrencyCode(rate.code)) throw new Error('Unknown currency.');
      const checked = parseDollarQuote(
        { ...data, rates: undefined, priceToman: rate.priceToman, updatedAt: rate.updatedAt },
        now,
      );
      const change = rate.changeToman;
      if (
        change !== undefined &&
        change !== null &&
        (typeof change !== 'number' ||
          !Number.isFinite(change) ||
          Math.abs(change) > 1e12 ||
          checked.priceToman - change <= 0)
      )
        throw new Error('Invalid daily change.');
      return {
        code: rate.code,
        priceToman: checked.priceToman,
        updatedAt: checked.updatedAt,
        ...(change !== undefined ? { changeToman: change } : {}),
      };
    });
    if (new Set(rates.map((rate) => rate.code)).size !== rates.length)
      throw new Error('Duplicate rates.');
  }
  return {
    ...(rates ? { rates } : {}),
    ...(data.cryptoRates != null
      ? { cryptoRates: parseNavasanCryptoRates(data.cryptoRates, now) }
      : {}),
    instrument: 'USD_FREE_SELL',
    priceToman: data.priceToman,
    updatedAt: data.updatedAt,
    fetchedAt: data.fetchedAt,
    staleAfterSeconds: data.staleAfterSeconds,
    fetchFailed: data.fetchFailed,
    source: data.source,
    sourceUrl: data.sourceUrl,
  };
}
export function isQuoteStale(quote: DollarQuote, now = Date.now()): boolean {
  return quote.fetchFailed || now - Date.parse(quote.updatedAt) > quote.staleAfterSeconds * 1000;
}
