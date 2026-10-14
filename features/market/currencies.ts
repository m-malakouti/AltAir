export const currencies = [
  { code: 'USD', name: 'دلار', symbol: '$' },
  { code: 'EUR', name: 'یورو', symbol: '€' },
  { code: 'GBP', name: 'پوند', symbol: '£' },
  { code: 'AED', name: 'درهم', symbol: 'AED' },
  { code: 'TRY', name: 'لیر', symbol: '₺' },
  { code: 'CAD', name: 'دلار کانادا', symbol: 'C$' },
  { code: 'AUD', name: 'دلار استرالیا', symbol: 'A$' },
  { code: 'CHF', name: 'فرانک', symbol: 'CHF' },
  { code: 'CNY', name: 'یوان', symbol: '¥' },
  { code: 'GOLD_18', name: 'طلای ۱۸ عیار', symbol: '18K' },
  { code: 'GOLD_MELTED', name: 'طلای آب‌شده', symbol: 'Gold' },
  { code: 'COIN_IMAMI', name: 'سکه امامی', symbol: 'Coin' },
  { code: 'COIN_BAHAR', name: 'بهار آزادی', symbol: 'Coin' },
  { code: 'COIN_HALF', name: 'نیم‌سکه', symbol: '½' },
  { code: 'COIN_QUARTER', name: 'ربع‌سکه', symbol: '¼' },
  { code: 'COIN_GRAM', name: 'سکه گرمی', symbol: '1g' },
] as const;
export type CurrencyCode = (typeof currencies)[number]['code'];
export const currencyGroup = (code: CurrencyCode) =>
  code.startsWith('GOLD_') || code.startsWith('COIN_') ? 'metals' : 'fiat';
export function moveCurrency(
  codes: CurrencyCode[],
  source: CurrencyCode,
  target: CurrencyCode,
): CurrencyCode[] {
  const from = codes.indexOf(source);
  const to = codes.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...codes];
  const next = codes.filter((code) => code !== source);
  next.splice(to, 0, source);
  return next;
}
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return currencies.some((currency) => currency.code === value);
}
export function parseFavorites(value: unknown): CurrencyCode[] {
  if (value === undefined || value === null) return ['USD'];
  if (
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('codes' in value) ||
    !Array.isArray(value.codes) ||
    !value.codes.every(isCurrencyCode) ||
    new Set(value.codes).size !== value.codes.length
  )
    throw new Error('Invalid currency preferences.');
  return [...value.codes] as CurrencyCode[];
}

export function instrumentBasis(code: CurrencyCode): string {
  if (code === 'GOLD_18') return 'هر گرم طلای ۱۸ عیار';
  if (code === 'GOLD_MELTED') return 'هر مثقال طلای آب‌شده';
  if (code.startsWith('COIN_')) return 'هر قطعه سکه';
  return 'هر واحد ارز';
}
