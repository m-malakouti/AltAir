import { browser } from 'wxt/browser';
import { parseSession } from './auth-model';
import type { Session } from './auth-model';
const KEY = 'altAir.auth.session';
const extension = () => Boolean(browser.runtime?.id && browser.storage?.session);
export async function readSession(): Promise<Session | null> {
  const value: unknown = extension()
    ? (await browser.storage.session.get(KEY))[KEY]
    : JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
  if (value == null) return null;
  const session = parseSession(value);
  return Date.parse(session.expiresAt) > Date.now() ? session : null;
}
export async function saveSession(session: Session | null) {
  if (extension()) {
    if (session) await browser.storage.session.set({ [KEY]: session });
    else await browser.storage.session.remove(KEY);
  } else {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
    else sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event(KEY));
  }
}
export function watchSession(callback: () => void) {
  if (extension()) {
    const listener = (changes: Record<string, unknown>, area: string) => {
      if (area === 'session' && KEY in changes) callback();
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }
  window.addEventListener(KEY, callback);
  return () => window.removeEventListener(KEY, callback);
}
