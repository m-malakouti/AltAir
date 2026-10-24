export const exchangeCategories = {
  all: 'همهٔ بازارها',
  fiat: 'ارز',
  metals: 'طلا و سکه',
  crypto: 'رمزارز',
  remittance: 'حواله و نرخ‌های ویژه',
  bubbles: 'حباب',
} as const;
export type ExchangeCategory = Exclude<keyof typeof exchangeCategories, 'all'>;
export interface ExchangeAsset {
  id: string;
  symbol: string;
  name: string;
  category: ExchangeCategory;
  basis: string;
  price: number;
  unit: 'toman' | 'USD' | 'source';
  updatedAt: string;
  change: number | null;
  percent: number | null;
  changePeriod: 'day' | '24h';
  variant: boolean;
  unitVerified: boolean;
  priceToman?: number;
  tomanUpdatedAt?: string;
  changeToman?: number | null;
  percentToman?: number | null;
  volumeUsd?: number;
}
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e16;
const date = (value: unknown, now: number): value is string =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  Date.parse(value) >= 0 &&
  Date.parse(value) <= now + 300000;
export function parseExchangeAssets(value: unknown, now = Date.now()): ExchangeAsset[] {
  if (!Array.isArray(value)) return [];
  const result: ExchangeAsset[] = [];
  for (const raw of value.slice(0, 500)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.id !== 'string' ||
      !/^[a-z0-9_]{1,60}$/.test(item.id) ||
      result.some((asset) => asset.id === item.id) ||
      typeof item.symbol !== 'string' ||
      item.symbol.length > 60 ||
      typeof item.name !== 'string' ||
      !item.name ||
      item.name.length > 140 ||
      typeof item.basis !== 'string' ||
      item.basis.length > 200 ||
      !Object.hasOwn(exchangeCategories, String(item.category)) ||
      item.category === 'all' ||
      !['toman', 'USD', 'source'].includes(String(item.unit)) ||
      !finite(item.price) ||
      (item.price <= 0 && item.category !== 'bubbles') ||
      !date(item.updatedAt, now) ||
      !['day', '24h'].includes(String(item.changePeriod)) ||
      typeof item.variant !== 'boolean' ||
      typeof item.unitVerified !== 'boolean'
    )
      continue;
    const change = finite(item.change) && item.price - item.change > 0 ? item.change : null;
    const percent =
      finite(item.percent) && item.percent >= -100 && item.percent <= 1e6 ? item.percent : null;
    result.push({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      category: item.category as ExchangeCategory,
      basis: item.basis,
      price: item.price,
      unit: item.unit as ExchangeAsset['unit'],
      updatedAt: item.updatedAt,
      change,
      percent,
      changePeriod: item.changePeriod as ExchangeAsset['changePeriod'],
      variant: item.variant,
      unitVerified: item.unitVerified,
      ...(finite(item.priceToman) && item.priceToman > 0 && date(item.tomanUpdatedAt, now)
        ? {
            priceToman: item.priceToman,
            tomanUpdatedAt: item.tomanUpdatedAt,
            changeToman:
              finite(item.changeToman) && item.priceToman - item.changeToman > 0
                ? item.changeToman
                : null,
            percentToman:
              finite(item.percentToman) && item.percentToman >= -100 && item.percentToman <= 1e6
                ? item.percentToman
                : null,
          }
        : {}),
      ...(finite(item.volumeUsd) && item.volumeUsd >= 0 ? { volumeUsd: item.volumeUsd } : {}),
    });
  }
  return result;
}
export function localAsset(asset: ExchangeAsset, preferToman: boolean): ExchangeAsset {
  return preferToman && asset.unit === 'USD' && asset.priceToman != null && asset.tomanUpdatedAt
    ? {
        ...asset,
        price: asset.priceToman,
        unit: 'toman',
        updatedAt: asset.tomanUpdatedAt,
        change: asset.changeToman ?? null,
        percent: asset.percentToman ?? null,
        changePeriod: 'day',
      }
    : asset;
}
export const unitLabel = (unit: ExchangeAsset['unit']) =>
  ({ toman: 'تومان', USD: 'دلار', source: 'واحد منبع' })[unit];
export const periodLabel = (asset: ExchangeAsset) =>
  asset.changePeriod === '24h' ? '۲۴ ساعت گذشته' : 'نسبت به پایان روز قبل';
export const isAssetStale = (asset: ExchangeAsset, seconds: number, now = Date.now()) =>
  now - Date.parse(asset.updatedAt) > seconds * 1000;
export function changeTone(asset: ExchangeAsset, stale: boolean) {
  return stale || !asset.unitVerified || asset.percent === null
    ? 'unknown'
    : asset.percent > 0
      ? 'up'
      : asset.percent < 0
        ? 'down'
        : 'flat';
}
export function formatPrice(value: number, unit: ExchangeAsset['unit']) {
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits:
      magnitude > 0 && magnitude < 1
        ? Math.min(12, Math.max(unit === 'USD' ? 8 : 6, Math.ceil(-Math.log10(magnitude)) + 3))
        : unit === 'USD'
          ? magnitude < 100
            ? 4
            : 2
          : magnitude < 100
            ? 2
            : 0,
  }).format(value);
}
export function formatPercent(value: number | null) {
  return value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}
export interface Tile {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function layoutTiles(
  items: { id: string; weight: number }[],
  width = 1000,
  height = 600,
): Tile[] {
  const result: Tile[] = [];
  function split(
    rows: { id: string; weight: number }[],
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!rows.length) return;
    if (rows.length === 1) {
      result.push({ id: rows[0]!.id, x, y, width: w, height: h });
      return;
    }
    const total = rows.reduce((sum, row) => sum + row.weight, 0);
    let amount = 0,
      index = 0;
    while (index < rows.length - 1 && amount < total / 2) {
      amount += rows[index]!.weight;
      index++;
    }
    const ratio = amount / total;
    if (w >= h) {
      split(rows.slice(0, index), x, y, w * ratio, h);
      split(rows.slice(index), x + w * ratio, y, w * (1 - ratio), h);
    } else {
      split(rows.slice(0, index), x, y, w, h * ratio);
      split(rows.slice(index), x, y + h * ratio, w, h * (1 - ratio));
    }
  }
  split(
    items.map((item) => ({
      ...item,
      weight: Number.isFinite(item.weight) ? Math.max(0.5, Math.min(8, item.weight)) : 1,
    })),
    0,
    0,
    width,
    height,
  );
  return result;
}
