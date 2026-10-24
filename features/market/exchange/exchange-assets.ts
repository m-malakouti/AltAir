import type { DollarQuote } from '../dollar-quote';
import { currencies, instrumentBasis } from '../currencies';
import { cryptoCoins } from '../crypto-rates';
import type { ExchangeAsset } from './exchange-model';
export function assetsFromQuote(quote: DollarQuote | null): ExchangeAsset[] {
  if (!quote) return [];
  if (quote.assets?.length) return quote.assets;
  const rates = quote.rates?.length
    ? quote.rates
    : [{ code: 'USD' as const, priceToman: quote.priceToman, updatedAt: quote.updatedAt }];
  return [
    ...rates.map((rate): ExchangeAsset => {
      const percent =
        rate.changeToman != null && rate.priceToman - rate.changeToman > 0
          ? (rate.changeToman / (rate.priceToman - rate.changeToman)) * 100
          : null;
      return {
        id: rate.code.toLowerCase(),
        symbol: rate.code,
        name: currencies.find((item) => item.code === rate.code)?.name ?? rate.code,
        category:
          rate.code.startsWith('GOLD_') || rate.code.startsWith('COIN_') ? 'metals' : 'fiat',
        basis: instrumentBasis(rate.code),
        price: rate.priceToman,
        unit: 'toman',
        updatedAt: rate.updatedAt,
        change: rate.changeToman ?? null,
        percent,
        changePeriod: 'day',
        variant: false,
        unitVerified: true,
      };
    }),
    ...(quote.cryptoRates ?? []).map((rate): ExchangeAsset => ({
      id: rate.code.toLowerCase(),
      symbol: rate.code,
      name: cryptoCoins.find((item) => item.code === rate.code)?.name ?? rate.code,
      category: 'crypto',
      basis: 'هر واحد رمزارز',
      price: rate.priceUsd,
      unit: 'USD',
      updatedAt: rate.updatedAt,
      change: rate.changeUsd,
      percent: rate.percent,
      changePeriod: '24h',
      variant: false,
      unitVerified: true,
      priceToman: rate.priceToman,
      tomanUpdatedAt: rate.tomanUpdatedAt,
    })),
  ];
}
