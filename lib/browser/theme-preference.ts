import { browser } from 'wxt/browser';
import type { ThemePreference } from '@/features/appearance/theme';

export const THEME_KEY = 'altAir.theme';

function hasExtensionStorage(): boolean {
  return Boolean(browser.runtime?.id && browser.storage?.local);
}

export function readThemeCache(): unknown {
  try {
    return JSON.parse(localStorage.getItem(THEME_KEY) ?? 'null') as unknown;
  } catch {
    return undefined;
  }
}

export function cacheThemePreference(value: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(value));
  } catch {
    /* A failed cache must not prevent extension storage from working. */
  }
}

export async function loadThemePreference(): Promise<unknown> {
  if (!hasExtensionStorage()) return readThemeCache();
  const values = await browser.storage.local.get(THEME_KEY);
  return values[THEME_KEY];
}

export async function saveThemePreference(value: ThemePreference): Promise<void> {
  if (hasExtensionStorage()) {
    await browser.storage.local.set({ [THEME_KEY]: value });
    cacheThemePreference(value);
  } else {
    localStorage.setItem(THEME_KEY, JSON.stringify(value));
  }
}

export function watchThemePreference(onChange: (value: unknown) => void): () => void {
  if (hasExtensionStorage()) {
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && THEME_KEY in changes) onChange(changes[THEME_KEY]?.newValue);
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }
  const listener = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    onChange(readThemeCache());
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
