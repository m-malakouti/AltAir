import { browser } from 'wxt/browser';
import { parseBackground, type BackgroundPreference } from './background';

const key = 'altAir.background';
const listeners = new Set<() => void>();
let snapshot = { ...parseBackground(null), error: '' };
let initialized = false;
let revision = 0;
let pending = 0;
let queue = Promise.resolve();
const hasStorage = () => Boolean(browser.runtime?.id && browser.storage?.local);

function publish(value: unknown, error = '') {
  snapshot = { ...parseBackground(value), error };
  document.documentElement.dataset.background = snapshot.id;
  document.documentElement.style.setProperty('--custom-background', snapshot.color);
  listeners.forEach((listener) => listener());
}
function cache(value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(parseBackground(value)));
  } catch {
    // Extension storage remains the source of truth if the cache is unavailable.
  }
}
function readCache(): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as unknown;
  } catch {
    return null;
  }
}
export function initializeBackground() {
  if (initialized) return;
  initialized = true;
  publish(readCache());
  if (hasStorage()) {
    const initialRevision = revision;
    void browser.storage.local
      .get(key)
      .then((values) => {
        if (revision !== initialRevision) return;
        cache(values[key]);
        publish(values[key]);
      })
      .catch(() => {
        if (revision === initialRevision)
          publish(snapshot, 'خواندن پس‌زمینه انجام نشد. دوباره انتخاب کنید.');
      });
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !(key in changes) || pending) return;
      revision++;
      cache(changes[key].newValue);
      publish(changes[key].newValue);
    });
  } else {
    window.addEventListener('storage', (event) => {
      if (event.key === key || event.key === null) {
        revision++;
        publish(readCache());
      }
    });
  }
}
export function setBackground(value: BackgroundPreference) {
  const current = ++revision;
  publish(value);
  pending++;
  queue = queue.then(async () => {
    try {
      if (hasStorage()) {
        await browser.storage.local.set({ [key]: value });
        cache(value);
      } else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      if (revision === current)
        publish(value, 'پس‌زمینه تغییر کرد، اما ذخیره نشد. دوباره انتخاب کنید.');
    } finally {
      pending--;
    }
  });
}
export const getBackground = () => snapshot;
export function subscribeBackground(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
