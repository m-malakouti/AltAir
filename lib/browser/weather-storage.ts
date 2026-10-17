import { browser } from 'wxt/browser';
const CITY = 'altAir.weather.city';
const CACHE = 'altAir.weather.cache';
function extension() {
  return Boolean(browser.runtime?.id && browser.storage?.local);
}
async function read(key: string): Promise<unknown> {
  if (extension()) {
    const values = await browser.storage.local.get(key);
    return values[key];
  }
  return JSON.parse(localStorage.getItem(key) ?? 'null') as unknown;
}
async function write(key: string, value: unknown): Promise<void> {
  if (extension()) await browser.storage.local.set({ [key]: value });
  else {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(key));
  }
}
export const readWeatherCity = () => read(CITY);
export const saveWeatherCity = (city: unknown) => write(CITY, city);
export const readWeatherCache = () => read(CACHE);
export const saveWeatherCache = (value: unknown) => write(CACHE, value);
export function watchWeatherCity(callback: () => void): () => void {
  return watchWeatherKey(CITY, callback);
}
export function watchWeatherCache(callback: () => void): () => void {
  return watchWeatherKey(CACHE, callback);
}
function watchWeatherKey(key: string, callback: () => void): () => void {
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
