import { browser } from 'wxt/browser';
import { BookmarkError } from '@/features/bookmarks/bookmark-model';
import type { BookmarkData } from '@/features/bookmarks/bookmark-model';

export const BOOKMARK_STORAGE_KEY = 'altAir.bookmarks';
const LOCK_NAME = 'altAir.bookmarks.write';

function hasExtensionStorage(): boolean {
  return Boolean(browser.runtime?.id && browser.storage?.local);
}
export async function readBookmarkStorage(): Promise<unknown> {
  try {
    if (hasExtensionStorage()) {
      const values = await browser.storage.local.get(BOOKMARK_STORAGE_KEY);
      return values[BOOKMARK_STORAGE_KEY];
    }
    const value = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return value === null ? undefined : (JSON.parse(value) as unknown);
  } catch (error) {
    throw new BookmarkError('storage-read-failed', error);
  }
}
export async function writeBookmarkStorage(value: BookmarkData): Promise<void> {
  try {
    if (hasExtensionStorage()) await browser.storage.local.set({ [BOOKMARK_STORAGE_KEY]: value });
    else localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    throw new BookmarkError('storage-write-failed', error);
  }
}
export async function withBookmarkWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks?.request)
    throw new BookmarkError('storage-unavailable');
  return navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, operation);
}
export function watchBookmarkStorage(onChange: () => void): () => void {
  if (hasExtensionStorage()) {
    const listener = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && BOOKMARK_STORAGE_KEY in changes) onChange();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }
  const listener = (event: StorageEvent) => {
    if (event.key === BOOKMARK_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}
