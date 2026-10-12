import { browser } from 'wxt/browser';

function extension() {
  return Boolean(browser.runtime?.id && browser.storage?.local);
}
export async function readWorkspaceValue(key: string): Promise<unknown> {
  if (extension()) return (await browser.storage.local.get(key))[key];
  return JSON.parse(localStorage.getItem(key) ?? 'null') as unknown;
}
export async function writeWorkspaceValue(key: string, value: unknown): Promise<void> {
  if (extension()) await browser.storage.local.set({ [key]: value });
  else {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(key));
  }
}
export function watchWorkspaceValue(key: string, callback: () => void): () => void {
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
