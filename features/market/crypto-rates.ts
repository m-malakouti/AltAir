export const cryptoCoins = [
  { code: 'BTC', name: 'بیت‌کوین', symbol: '₿' },
  { code: 'ETH', name: 'اتریوم', symbol: 'Ξ' },
  { code: 'SOL', name: 'سولانا', symbol: '◎' },
  { code: 'USDT', name: 'تتر', symbol: '₮' },
  { code: 'XRP', name: 'ریپل', symbol: 'X' },
  { code: 'DOGE', name: 'دوج‌کوین', symbol: 'Ð' },
  { code: 'ADA', name: 'کاردانو', symbol: '₳' },
  { code: 'AVAX', name: 'آوالانچ', symbol: 'A' },
] as const;
export interface CryptoQuote {
  price: number;
  change: number;
  percent: number;
}
export interface CryptoRate {
  code: string;
  priceUsd: number;
  updatedAt: string;
  changeUsd: number | null;
  percent: number | null;
  priceToman?: number;
  tomanUpdatedAt?: string;
}

export function parseNavasanCryptoRates(value: unknown, now = Date.now()): CryptoRate[] {
  if (!Array.isArray(value)) return [];
  const rates: CryptoRate[] = [];
  for (const raw of value.slice(0, cryptoCoins.length)) {
    if (!raw || typeof raw !== 'object') continue;
    const rate = raw as Record<string, unknown>;
    if (
      typeof rate.code !== 'string' ||
      !cryptoCoins.some((coin) => coin.code === rate.code) ||
      rates.some((item) => item.code === rate.code) ||
      typeof rate.priceUsd !== 'number' ||
      !Number.isFinite(rate.priceUsd) ||
      rate.priceUsd <= 0 ||
      rate.priceUsd > 1e12 ||
      typeof rate.updatedAt !== 'string' ||
      !Number.isFinite(Date.parse(rate.updatedAt)) ||
      Date.parse(rate.updatedAt) < 0 ||
      Date.parse(rate.updatedAt) > now + 300_000
    )
      continue;
    const percent =
      typeof rate.percent === 'number' &&
      Number.isFinite(rate.percent) &&
      rate.percent > -100 &&
      rate.percent <= 1_000_000
        ? rate.percent
        : null;
    const change =
      typeof rate.changeUsd === 'number' &&
      Number.isFinite(rate.changeUsd) &&
      rate.priceUsd - rate.changeUsd > 0
        ? rate.changeUsd
        : null;
    rates.push({
      code: rate.code,
      priceUsd: rate.priceUsd,
      updatedAt: rate.updatedAt,
      percent,
      changeUsd: percent === null ? null : change,
      ...(typeof rate.priceToman === 'number' &&
      Number.isFinite(rate.priceToman) &&
      rate.priceToman > 0 &&
      rate.priceToman <= 1e12 &&
      typeof rate.tomanUpdatedAt === 'string' &&
      Number.isFinite(Date.parse(rate.tomanUpdatedAt)) &&
      Date.parse(rate.tomanUpdatedAt) >= 0 &&
      Date.parse(rate.tomanUpdatedAt) <= now + 300_000
        ? { priceToman: rate.priceToman, tomanUpdatedAt: rate.tomanUpdatedAt }
        : {}),
    });
  }
  return rates;
}
export function parseCryptoStats(value: unknown): CryptoQuote {
  if (!value || typeof value !== 'object' || !('open' in value) || !('last' in value))
    throw new Error('Invalid crypto stats');
  const open = typeof value.open === 'string' && value.open.trim() ? Number(value.open) : NaN;
  const price = typeof value.last === 'string' && value.last.trim() ? Number(value.last) : NaN;
  const change = price - open;
  const percent = (change / open) * 100;
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(open) ||
    open <= 0 ||
    !Number.isFinite(percent)
  )
    throw new Error('Invalid crypto price');
  return { price, change, percent };
}
export function parseCryptoRates(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || !('data' in value))
    throw new Error('Invalid crypto response');
  const data = value.data;
  if (
    !data ||
    typeof data !== 'object' ||
    !('currency' in data) ||
    data.currency !== 'USD' ||
    !('rates' in data) ||
    !data.rates ||
    typeof data.rates !== 'object'
  )
    throw new Error('Invalid crypto currency');
  const rates = data.rates as Record<string, unknown>;
  const result: Record<string, number> = {};
  for (const coin of cryptoCoins) {
    const raw = rates[coin.code];
    const rate = typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    if (Number.isFinite(rate) && rate > 0 && Number.isFinite(1 / rate))
      result[coin.code] = 1 / rate;
  }
  if (!Object.keys(result).length) throw new Error('No valid crypto prices');
  return result;
}
