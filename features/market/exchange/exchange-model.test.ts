import { describe, expect, it, vi } from 'vitest';
vi.mock('wxt/browser', () => ({ browser: { runtime: {} } }));
import {
  changeTone,
  formatPrice,
  isAssetStale,
  layoutTiles,
  localAsset,
  parseExchangeAssets,
  type ExchangeAsset,
} from './exchange-model';
import { parseExchangePreferences, parseObservations } from './exchange-storage';

const now = Date.parse('2026-10-24T08:00:00Z');
const asset: ExchangeAsset = {
  id: 'btc',
  symbol: 'BTC',
  name: 'بیت‌کوین',
  category: 'crypto',
  basis: 'هر بیت‌کوین',
  price: 100,
  unit: 'USD',
  updatedAt: new Date(now).toISOString(),
  change: 10,
  percent: 10,
  changePeriod: '24h',
  variant: false,
  unitVerified: true,
  priceToman: 9000000,
  tomanUpdatedAt: new Date(now - 86400000).toISOString(),
  changeToman: -1000,
  percentToman: -0.1,
};

describe('exchange data integrity', () => {
  it('keeps fractional small prices readable instead of rounding to zero or a whole toman', () => {
    expect(formatPrice(1.17, 'toman')).toBe('1.17');
    expect(formatPrice(0.00000000312, 'USD')).toBe('0.00000000312');
  });
  it('keeps valid instruments when optional entries are malformed and removes duplicates', () => {
    const parsed = parseExchangeAssets(
      [
        asset,
        { ...asset, id: 'bad', price: Infinity },
        { ...asset, id: 'future', updatedAt: new Date(now + 3600000).toISOString() },
        asset,
      ],
      now,
    );
    expect(parsed).toEqual([asset]);
  });
  it('preserves signed bubble values while rejecting negative currency prices', () => {
    const bubble = {
      ...asset,
      id: 'bub_sekkeh',
      category: 'bubbles',
      price: -12,
      unit: 'source',
      unitVerified: false,
    };
    expect(parseExchangeAssets([bubble, { ...asset, id: 'eur', price: -12 }], now)).toHaveLength(1);
    expect(changeTone(parseExchangeAssets([bubble], now)[0]!, false)).toBe('unknown');
  });
  it('switches local price, timestamp and change period together without estimating an exchange rate', () => {
    const local = localAsset(asset, true);
    expect(local.price).toBe(9000000);
    expect(local.unit).toBe('toman');
    expect(local.percent).toBe(-0.1);
    expect(local.changePeriod).toBe('day');
    expect(local.updatedAt).toBe(asset.tomanUpdatedAt);
    expect(isAssetStale(local, 7200, now)).toBe(true);
    expect(isAssetStale(asset, 7200, now)).toBe(false);
    expect(localAsset({ ...asset, priceToman: undefined }, true).unit).toBe('USD');
    expect(localAsset({ ...asset, percentToman: undefined }, true).percent).toBeNull();
  });
  it('does not color old, unverified, missing or unchanged data as growth', () => {
    expect(changeTone(asset, true)).toBe('unknown');
    expect(changeTone({ ...asset, unitVerified: false }, false)).toBe('unknown');
    expect(changeTone({ ...asset, percent: null }, false)).toBe('unknown');
    expect(changeTone({ ...asset, percent: 0 }, false)).toBe('flat');
    expect(changeTone({ ...asset, percent: -1 }, false)).toBe('down');
  });
});

describe('weighted market layout', () => {
  it.each([
    [1000, 600],
    [280, 1400],
  ])('covers %i × %i without overlaps or missing instruments', (width, height) => {
    const tiles = layoutTiles(
      Array.from({ length: 301 }, (_, i) => ({ id: String(i), weight: (i % 8) + 1 })),
      width,
      height,
    );
    expect(tiles).toHaveLength(301);
    expect(new Set(tiles.map((tile) => tile.id)).size).toBe(301);
    expect(tiles.reduce((sum, tile) => sum + tile.width * tile.height, 0)).toBeCloseTo(
      width * height,
      5,
    );
    for (const [index, tile] of tiles.entries()) {
      expect(tile.width).toBeGreaterThan(0);
      expect(tile.height).toBeGreaterThan(0);
      expect(tile.x + tile.width).toBeLessThanOrEqual(width + 1e-8);
      expect(tile.y + tile.height).toBeLessThanOrEqual(height + 1e-8);
      for (const other of tiles.slice(index + 1)) {
        const overlap =
          Math.min(tile.x + tile.width, other.x + other.width) - Math.max(tile.x, other.x);
        const vertical =
          Math.min(tile.y + tile.height, other.y + other.height) - Math.max(tile.y, other.y);
        expect(overlap <= 1e-8 || vertical <= 1e-8).toBe(true);
      }
    }
  });
  it('honors explicit weights and safely handles empty or invalid weights', () => {
    const tiles = layoutTiles([
      { id: 'a', weight: 2 },
      { id: 'b', weight: 1 },
    ]);
    expect((tiles[0]!.width * tiles[0]!.height) / (tiles[1]!.width * tiles[1]!.height)).toBeCloseTo(
      2,
    );
    expect(layoutTiles([])).toEqual([]);
    expect(layoutTiles([{ id: 'a', weight: NaN }])[0]!.width).toBe(1000);
  });
});

describe('exchange preferences and observed history', () => {
  it('preserves deliberately empty favorites and validates stored ids', () => {
    expect(parseExchangePreferences({ favorites: [] }).favorites).toEqual([]);
    expect(
      parseExchangePreferences({
        favorites: ['btc', 'btc', '<script>', 3],
        palette: 'bad',
        sizing: 'bad',
      }),
    ).toEqual({ favorites: ['btc'], palette: 'classic', sizing: 'change' });
  });
  it('keeps only actual valid observations, ordered and bounded', () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const points = Array.from({ length: 60 }, (_, index) => ({
      time: new Date(now - index * 60000).toISOString(),
      price: index,
    }));
    const result = parseObservations([
      ...points,
      { time: 'invalid', price: 100 },
      { time: new Date().toISOString(), price: Infinity },
    ]);
    expect(result).toHaveLength(48);
    expect(Date.parse(result[0]!.time)).toBeLessThan(Date.parse(result.at(-1)!.time));
    expect(parseObservations(null)).toEqual([]);
  });
});
