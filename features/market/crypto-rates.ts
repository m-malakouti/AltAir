export const cryptoCoins = [
  { code: 'BTC', name: 'بیت‌کوین', symbol: '₿' },
  { code: 'ETH', name: 'اتریوم', symbol: 'Ξ' },
  { code: 'SOL', name: 'سولانا', symbol: '◎' },
  { code: 'USDT', name: 'تتر', symbol: '₮' },
] as const;
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
