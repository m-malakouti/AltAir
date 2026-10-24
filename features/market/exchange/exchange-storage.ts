import { useCallback, useEffect, useState } from 'react';
import {
  readWorkspaceValue,
  writeWorkspaceValue,
  watchWorkspaceValue,
} from '@/lib/browser/workspace-storage';
import type { ExchangeAsset } from './exchange-model';
export interface ExchangePreferences {
  favorites: string[];
  palette: 'classic' | 'accessible';
  sizing: 'change' | 'favorites' | 'equal';
}
const PREFS_KEY = 'altAir.exchange.preferences.v1';
const defaults: ExchangePreferences = {
  favorites: ['usd_sell', '18ayar', 'sekkeh', 'btc', 'eth', 'usdt'],
  palette: 'classic',
  sizing: 'change',
};
export function parseExchangePreferences(value: unknown): ExchangePreferences {
  if (!value || typeof value !== 'object') return defaults;
  const raw = value as Record<string, unknown>;
  return {
    favorites: Array.isArray(raw.favorites)
      ? [
          ...new Set(
            raw.favorites.filter(
              (id): id is string => typeof id === 'string' && /^[a-z0-9_]{1,60}$/.test(id),
            ),
          ),
        ].slice(0, 500)
      : defaults.favorites,
    palette: raw.palette === 'accessible' ? 'accessible' : 'classic',
    sizing: raw.sizing === 'favorites' || raw.sizing === 'equal' ? raw.sizing : 'change',
  };
}
export function useExchangePreferences() {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      try {
        const next = parseExchangePreferences(await readWorkspaceValue(PREFS_KEY));
        if (alive && current === revision) {
          setPreferences(next);
          setReady(true);
          setError('');
        }
      } catch {
        if (alive) setError('خواندن دلخواه‌ها انجام نشد؛ صفحه را دوباره باز کن.');
      }
    };
    const refresh = () => {
      void load();
    };
    refresh();
    const stop = watchWorkspaceValue(PREFS_KEY, refresh);
    return () => {
      alive = false;
      stop();
    };
  }, []);
  const update = useCallback(
    async (change: (current: ExchangePreferences) => ExchangePreferences) => {
      setSaving(true);
      try {
        await navigator.locks.request(PREFS_KEY, async () => {
          const next = change(parseExchangePreferences(await readWorkspaceValue(PREFS_KEY)));
          await writeWorkspaceValue(PREFS_KEY, next);
          setPreferences(next);
          setReady(true);
        });
        setError('');
      } catch {
        setError('تنظیمات ذخیره نشد؛ دوباره تلاش کن.');
      } finally {
        setSaving(false);
      }
    },
    [],
  );
  return { preferences, ready, saving, error, update };
}
export interface PriceObservation {
  time: string;
  price: number;
}
export function parseObservations(value: unknown): PriceObservation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p: unknown): p is PriceObservation =>
      Boolean(
        p &&
        typeof p === 'object' &&
        'time' in p &&
        typeof p.time === 'string' &&
        Number.isFinite(Date.parse(p.time)) &&
        Date.parse(p.time) >= 0 &&
        Date.parse(p.time) <= Date.now() + 300000 &&
        'price' in p &&
        typeof p.price === 'number' &&
        Number.isFinite(p.price) &&
        Math.abs(p.price) <= 1e16,
      ),
    )
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    .slice(-48);
}
export function useObservedHistory(asset: ExchangeAsset | null) {
  const [history, setHistory] = useState<{ key: string; points: PriceObservation[] }>({
    key: '',
    points: [],
  });
  const [error, setError] = useState('');
  const id = asset?.id,
    unit = asset?.unit,
    price = asset?.price,
    time = asset?.updatedAt;
  useEffect(() => {
    if (id === undefined || unit === undefined || price === undefined || time === undefined) return;
    let alive = true;
    const key = `altAir.exchange.observed.navasan.${id}.${unit}`;
    const load = async () => {
      try {
        await navigator.locks.request(key, async () => {
          const saved = parseObservations(await readWorkspaceValue(key));
          const next = [...saved.filter((p) => p.time !== time), { time, price }]
            .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
            .slice(-48);
          if (!saved.some((p) => p.time === time && p.price === price))
            await writeWorkspaceValue(key, next);
          if (alive) {
            setHistory({ key, points: next });
            setError('');
          }
        });
      } catch {
        if (alive) {
          setHistory({ key, points: [] });
          setError('ذخیرهٔ روند روی این مرورگر انجام نشد.');
        }
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [id, unit, price, time]);
  return {
    points: history.key === `altAir.exchange.observed.navasan.${id}.${unit}` ? history.points : [],
    error,
  };
}
