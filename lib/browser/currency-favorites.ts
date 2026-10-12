import { browser } from 'wxt/browser';
import { parseFavorites } from '@/features/market/currencies';
import type { CurrencyCode } from '@/features/market/currencies';
const KEY = 'altAir.market.favorites';
function extension() {
  return Boolean(browser.runtime?.id && browser.storage?.local);
}
export async function readFavorites(): Promise<CurrencyCode[]> {
  if (extension()) {
    const values = await browser.storage.local.get(KEY);
    return parseFavorites(values[KEY]);
  }
  return parseFavorites(JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown);
}
export async function setFavorite(code: CurrencyCode, selected: boolean): Promise<CurrencyCode[]> {
  return navigator.locks.request(KEY, async () => {
    const current = await readFavorites();
    const codes = selected
      ? [...new Set([...current, code])]
      : current.filter((item) => item !== code);
    const value = { version: 1, codes };
    if (extension()) await browser.storage.local.set({ [KEY]: value });
    else localStorage.setItem(KEY, JSON.stringify(value));
    return codes;
  });
}
export function watchFavorites(listener: () => void): () => void {
  if (extension()) {
    const onChanged = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && KEY in changes) listener();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
