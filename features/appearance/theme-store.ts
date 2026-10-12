import {
  cacheThemePreference,
  loadThemePreference,
  readThemeCache,
  saveThemePreference,
  watchThemePreference,
} from '@/lib/browser/theme-preference';
import { parseThemePreference, resolveTheme } from './theme';
import type { ThemeMode, ResolvedTheme } from './theme';

interface ThemeSnapshot {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  error: string | null;
}
let snapshot: ThemeSnapshot = { mode: 'system', resolved: 'dark', error: null };
const listeners = new Set<() => void>();
let initialized = false;
let revision = 0;
let pendingWrites = 0;
let writeQueue = Promise.resolve();
let media: MediaQueryList;

function publish(mode: ThemeMode, error: string | null = null) {
  snapshot = { mode, resolved: resolveTheme(mode, media.matches), error };
  document.documentElement.dataset.theme = snapshot.resolved;
  for (const listener of listeners) listener();
}

export function initializeTheme(): void {
  if (initialized) return;
  initialized = true;
  media = window.matchMedia('(prefers-color-scheme: dark)');
  publish(parseThemePreference(readThemeCache()).mode);
  media.addEventListener('change', () => {
    if (snapshot.mode === 'system') publish('system', snapshot.error);
  });
  watchThemePreference((value) => {
    if (pendingWrites > 0) return;
    revision++;
    const preference = parseThemePreference(value);
    cacheThemePreference(preference);
    publish(preference.mode);
  });
  const initialRevision = revision;
  void loadThemePreference()
    .then((value) => {
      if (revision !== initialRevision) return;
      const preference = parseThemePreference(value);
      cacheThemePreference(preference);
      publish(preference.mode);
    })
    .catch(() => {
      if (revision === initialRevision)
        publish(snapshot.mode, 'تنظیم ظاهر خوانده نشد. دوباره انتخاب کنید.');
    });
}

export function setThemeMode(mode: ThemeMode): void {
  if (snapshot.mode === mode && !snapshot.error) return;
  const currentRevision = ++revision;
  publish(mode);
  pendingWrites++;
  writeQueue = writeQueue.then(async () => {
    try {
      await saveThemePreference({ version: 1, mode });
      if (revision === currentRevision) publish(mode);
    } catch {
      if (revision === currentRevision)
        publish(mode, 'ظاهر تغییر کرد، اما ذخیره نشد. دوباره انتخاب کنید.');
    } finally {
      pendingWrites--;
    }
  });
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getThemeSnapshot(): ThemeSnapshot {
  return snapshot;
}
