import { browser } from 'wxt/browser';
const KEY = 'altAir.market.usd';
function hasExtensionStorage() {
  return Boolean(browser.runtime?.id && browser.storage?.local);
}
export async function loadMarketCache(): Promise<unknown> {
  if (hasExtensionStorage()) {
    const data = await browser.storage.local.get(KEY);
    return data[KEY];
  }
  return JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown;
}
export async function saveMarketCache(value: unknown): Promise<void> {
  if (hasExtensionStorage()) await browser.storage.local.set({ [KEY]: value });
  else localStorage.setItem(KEY, JSON.stringify(value));
}
