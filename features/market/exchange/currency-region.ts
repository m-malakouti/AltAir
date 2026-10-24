import { currencyRegions, sharedCurrencies } from './currency-regions';
import type { ExchangeAsset } from './exchange-model';

export function currencyRegion(
  asset: Pick<ExchangeAsset, 'id' | 'category'>,
): string | null | undefined {
  if (asset.category !== 'fiat' && asset.category !== 'remittance') return undefined;
  const id = asset.id;
  const code = /^(harat_|dolar_harat)/.test(id)
    ? 'usd'
    : id === 'dirham_dubai'
      ? 'aed'
      : /^(mex|mob|hav)_/.test(id)
        ? id.split('_')[1]!
        : id.split('_')[0]!;
  return sharedCurrencies.has(code) ? null : (currencyRegions[code] ?? null);
}
