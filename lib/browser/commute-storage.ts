import { browser } from 'wxt/browser';
import { parsePlaces, type CommutePlaces } from '@/features/commute/commute-model';
const key = 'altAir.commute.places';
const extension = () => Boolean(browser.runtime?.id && browser.storage?.local);
export async function readCommutePlaces(): Promise<CommutePlaces | null> {
  const value: unknown = extension()
    ? (await browser.storage.local.get(key))[key]
    : JSON.parse(localStorage.getItem(key) ?? 'null');
  return parsePlaces(value);
}
export async function saveCommutePlaces(places: CommutePlaces | null) {
  if (places !== null && !parsePlaces(places)) throw new Error('invalid_places');
  if (extension()) {
    if (places) await browser.storage.local.set({ [key]: places });
    else await browser.storage.local.remove(key);
  } else {
    if (places) localStorage.setItem(key, JSON.stringify(places));
    else localStorage.removeItem(key);
    window.dispatchEvent(new Event(key));
  }
}
export function watchCommutePlaces(callback: () => void): () => void {
  if (extension()) {
    const listener = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && key in changes) callback();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }
  const listener = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };
  window.addEventListener('storage', listener);
  window.addEventListener(key, callback);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(key, callback);
  };
}
