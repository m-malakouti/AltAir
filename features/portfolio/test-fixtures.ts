import type { DollarQuote } from '@/features/market/dollar-quote';
import type { ExchangeAsset } from '@/features/market/exchange/exchange-model';
import type { Portfolio } from './portfolio-model';

export const testTime = '2026-10-27T09:00:00Z';
export const testNow = Date.parse('2026-10-27T09:30:00Z');
export function testQuote(): DollarQuote {
  const asset = (id: string, priceToman: number): ExchangeAsset => ({
    id,
    symbol: id.toUpperCase(),
    name: id,
    category: 'crypto',
    basis: 'هر واحد',
    price: 1,
    unit: 'USD',
    priceToman,
    tomanUpdatedAt: testTime,
    updatedAt: testTime,
    change: null,
    percent: null,
    changePeriod: '24h',
    variant: false,
    unitVerified: true,
  });
  return {
    instrument: 'USD_FREE_SELL',
    priceToman: 100000,
    updatedAt: testTime,
    fetchedAt: testTime,
    staleAfterSeconds: 7200,
    fetchFailed: false,
    source: 'نوسان',
    sourceUrl: 'https://www.navasan.net/',
    rates: [
      { code: 'USD', priceToman: 100000, updatedAt: testTime },
      { code: 'COIN_HALF', priceToman: 8000000, updatedAt: testTime },
      { code: 'GOLD_18', priceToman: 1000000, updatedAt: testTime },
    ],
    assets: [asset('btc', 1000000000), asset('xrp', 100000)],
  };
}
export function testPortfolio(): Portfolio {
  return {
    version: 1,
    hidden: false,
    unit: 'toman',
    holdings: [
      { code: 'BTC', quantity: '0.02' },
      { code: 'XRP', quantity: '150' },
      { code: 'COIN_HALF', quantity: '2' },
      { code: 'GOLD_18', quantity: '5.5' },
    ],
  };
}
