import { currencies } from '@/features/market/currencies';
import { cryptoCoins } from '@/features/market/crypto-rates';
import type { DollarQuote } from '@/features/market/dollar-quote';

const sourceIds: Record<string, string> = {
  USD: 'usd_sell',
  AED: 'aed_sell',
  GOLD_18: '18ayar',
  GOLD_MELTED: 'abshodeh',
  COIN_IMAMI: 'sekkeh',
  COIN_BAHAR: 'bahar',
  COIN_HALF: 'nim',
  COIN_QUARTER: 'rob',
  COIN_GRAM: 'gerami',
};
export const portfolioAssets = [
  ...currencies.map((asset) => ({
    code: asset.code,
    name: asset.name,
    sourceId: sourceIds[asset.code] ?? asset.code.toLowerCase(),
    unit:
      asset.code === 'GOLD_18'
        ? 'گرم'
        : asset.code === 'GOLD_MELTED'
          ? 'مثقال'
          : asset.code.startsWith('COIN_')
            ? 'عدد'
            : 'واحد',
    decimals: asset.code.startsWith('COIN_') ? 0 : 6,
    crypto: false,
  })),
  ...cryptoCoins.map((asset) => ({
    code: asset.code,
    name: asset.name,
    sourceId: asset.code.toLowerCase(),
    unit: 'واحد',
    decimals: 8,
    crypto: true,
  })),
];
export const portfolioUnits = {
  toman: 'تومان',
  rial: 'ریال',
  USD: 'دلار',
  BTC: 'بیت‌کوین',
} as const;
export type PortfolioUnit = keyof typeof portfolioUnits;
export interface Holding {
  code: string;
  quantity: string;
}
export interface Portfolio {
  version: 1;
  hidden: boolean;
  unit: PortfolioUnit;
  holdings: Holding[];
}
export const emptyPortfolio = (): Portfolio => ({
  version: 1,
  hidden: false,
  unit: 'toman',
  holdings: [],
});

export function parseQuantity(input: string, code: string): string {
  const asset = portfolioAssets.find((item) => item.code === code);
  const normalized = input
    .trim()
    .replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) - (digit >= '۰' ? 1776 : 1632)))
    .replace('٫', '.');
  if (!asset || !/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error('invalid_quantity');
  const [whole = '', fraction = ''] = normalized.split('.');
  if (
    fraction.length > asset.decimals ||
    normalized.length > 30 ||
    Number(normalized) <= 0 ||
    Number(normalized) > 1e9
  )
    throw new Error('invalid_quantity');
  const decimals = fraction.replace(/0+$/, '');
  return `${whole.replace(/^0+(?=\d)/, '')}${decimals ? '.' + decimals : ''}`;
}

export function parsePortfolio(value: unknown): Portfolio {
  if (value == null) return emptyPortfolio();
  if (!value || typeof value !== 'object') throw new Error('invalid_portfolio');
  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    typeof raw.hidden !== 'boolean' ||
    typeof raw.unit !== 'string' ||
    !Object.hasOwn(portfolioUnits, raw.unit) ||
    !Array.isArray(raw.holdings) ||
    raw.holdings.length > portfolioAssets.length
  )
    throw new Error('invalid_portfolio');
  const holdings = raw.holdings.map((value: unknown): Holding => {
    if (!value || typeof value !== 'object') throw new Error('invalid_portfolio');
    const item = value as Record<string, unknown>;
    if (typeof item.code !== 'string' || typeof item.quantity !== 'string')
      throw new Error('invalid_portfolio');
    return { code: item.code, quantity: parseQuantity(item.quantity, item.code) };
  });
  if (new Set(holdings.map((item) => item.code)).size !== holdings.length)
    throw new Error('invalid_portfolio');
  return { version: 1, hidden: raw.hidden, unit: raw.unit as PortfolioUnit, holdings };
}

export interface PortfolioRate {
  price: number;
  time: string;
  stale: boolean;
}
export function portfolioRate(
  code: string,
  quote: DollarQuote | null,
  now: number,
): PortfolioRate | null {
  if (!quote) return null;
  const asset = portfolioAssets.find((item) => item.code === code);
  if (!asset) return null;
  const rate = quote.rates?.find((item) => item.code === code);
  const raw = quote.assets?.find(
    (item) => item.id === asset.sourceId && item.unitVerified && !item.variant,
  );
  const coin = quote.cryptoRates?.find((item) => item.code === code);
  const local = rate
    ? { price: rate.priceToman, time: rate.updatedAt }
    : code === 'USD'
      ? { price: quote.priceToman, time: quote.updatedAt }
      : raw?.unit === 'toman'
        ? { price: raw.price, time: raw.updatedAt }
        : raw?.unit === 'USD' && raw.priceToman != null && raw.tomanUpdatedAt
          ? { price: raw.priceToman, time: raw.tomanUpdatedAt }
          : asset.crypto && coin?.priceToman != null && coin.tomanUpdatedAt
            ? { price: coin.priceToman, time: coin.tomanUpdatedAt }
            : null;
  if (
    !local ||
    !Number.isFinite(local.price) ||
    local.price <= 0 ||
    !Number.isFinite(Date.parse(local.time)) ||
    Date.parse(local.time) < 0 ||
    Date.parse(local.time) > now + 300000
  )
    return null;
  return {
    ...local,
    stale: quote.fetchFailed || now - Date.parse(local.time) > quote.staleAfterSeconds * 1000,
  };
}

export function valuePortfolio(portfolio: Portfolio, quote: DollarQuote | null, now = Date.now()) {
  let sum = 0;
  let priced = 0;
  const rows = portfolio.holdings.map((holding) => {
    const rate = portfolioRate(holding.code, quote, now);
    const candidate = rate ? Number(holding.quantity) * rate.price : null;
    // Keep the whole-rial representation within JavaScript's safe integer range.
    const value =
      candidate !== null &&
      Number.isFinite(candidate) &&
      candidate > 0 &&
      sum + candidate <= Number.MAX_SAFE_INTEGER / 10
        ? candidate
        : null;
    if (value !== null) {
      sum += value;
      priced++;
    }
    return { ...holding, rate, value };
  });
  const total = rows.length === 0 || priced > 0 ? sum : null;
  const usd = portfolioRate('USD', quote, now);
  const btc = portfolioRate('BTC', quote, now);
  const times = rows.flatMap((row) => (row.value !== null && row.rate ? [row.rate.time] : []));
  const convert = (rate: PortfolioRate | null) => {
    if (total === null || !rate) return null;
    const value = total / rate.price;
    return Number.isFinite(value) ? value : null;
  };
  return {
    rows,
    missing: rows.length - priced,
    stale: rows.some((row) => row.rate?.stale),
    oldestAt: times.length
      ? times.reduce((oldest, time) => (Date.parse(time) < Date.parse(oldest) ? time : oldest))
      : null,
    totals: {
      toman: total,
      rial: total === null ? null : total * 10,
      USD: convert(usd),
      BTC: convert(btc),
    },
    conversions: { toman: null, rial: null, USD: usd, BTC: btc },
  };
}

export function formatPortfolioValue(value: number, unit: PortfolioUnit): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: unit === 'BTC' ? 8 : unit === 'USD' ? 2 : 0,
  }).format(value);
}
