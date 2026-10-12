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
] as const;
export type CurrencyCode = (typeof currencies)[number]['code'];
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
