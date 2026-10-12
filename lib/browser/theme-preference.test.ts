import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheThemePreference,
  loadThemePreference,
  readThemeCache,
  saveThemePreference,
  THEME_KEY,
  watchThemePreference,
} from './theme-preference';

const { browserMock, get, set, addListener, removeListener } = vi.hoisted(() => {
  const get = vi.fn<(key: string) => Promise<Record<string, unknown>>>();
  const set = vi.fn<(values: Record<string, unknown>) => Promise<void>>();
  const addListener = vi.fn();
  const removeListener = vi.fn();
  const browserMock = {
    runtime: { id: 'test-extension' as string | undefined },
    storage: { local: { get, set }, onChanged: { addListener, removeListener } },
  };
  return { browserMock, get, set, addListener, removeListener };
});
vi.mock('wxt/browser', () => ({ browser: browserMock }));

describe('theme persistence', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    vi.resetAllMocks();
    browserMock.runtime.id = 'test-extension';
    get.mockResolvedValue({});
    set.mockResolvedValue(undefined);
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('loads canonical data from extension local storage', async () => {
    const preference = { version: 1, mode: 'dark' };
    get.mockResolvedValue({ [THEME_KEY]: preference });
    expect(await loadThemePreference()).toEqual(preference);
    expect(get).toHaveBeenCalledWith(THEME_KEY);
  });
  it('persists a versioned preference and updates the startup cache', async () => {
    const preference = { version: 1, mode: 'light' } as const;
    await saveThemePreference(preference);
    expect(set).toHaveBeenCalledWith({ [THEME_KEY]: preference });
    expect(readThemeCache()).toEqual(preference);
  });
  it('propagates storage failure without caching an unsaved preference', async () => {
    set.mockRejectedValue(new Error('Quota exceeded'));
    await expect(saveThemePreference({ version: 1, mode: 'light' })).rejects.toThrow(
      'Quota exceeded',
    );
    expect(values.has(THEME_KEY)).toBe(false);
  });
  it('does not let an unavailable web cache block extension saving', async () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Blocked');
      },
    });
    await expect(saveThemePreference({ version: 1, mode: 'dark' })).resolves.toBeUndefined();
  });
  it('uses local web storage in the browser preview', async () => {
    browserMock.runtime.id = undefined;
    await saveThemePreference({ version: 1, mode: 'dark' });
    expect(await loadThemePreference()).toEqual({ version: 1, mode: 'dark' });
    expect(set).not.toHaveBeenCalled();
  });
  it('safely ignores malformed cache data', () => {
    values.set(THEME_KEY, '{invalid');
    expect(readThemeCache()).toBeUndefined();
  });
  it('subscribes only to local theme changes and cleans up', () => {
    const onChange = vi.fn();
    const stop = watchThemePreference(onChange);
    const listener = addListener.mock.calls[0]?.[0] as (
      changes: Record<string, { newValue?: unknown }>,
      area: string,
    ) => void;
    listener({ other: { newValue: 'x' } }, 'local');
    listener({ [THEME_KEY]: { newValue: 'x' } }, 'sync');
    expect(onChange).not.toHaveBeenCalled();
    listener({ [THEME_KEY]: { newValue: { version: 1, mode: 'dark' } } }, 'local');
    expect(onChange).toHaveBeenCalledWith({ version: 1, mode: 'dark' });
    stop();
    expect(removeListener).toHaveBeenCalledWith(listener);
  });
  it('allows cache writing without an available localStorage implementation', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => cacheThemePreference({ version: 1, mode: 'system' })).not.toThrow();
  });
});
