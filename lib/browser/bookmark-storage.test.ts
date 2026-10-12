import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyBookmarkData } from '@/features/bookmarks/bookmark-model';
import {
  BOOKMARK_STORAGE_KEY,
  readBookmarkStorage,
  watchBookmarkStorage,
  withBookmarkWriteLock,
  writeBookmarkStorage,
} from './bookmark-storage';

const { browserMock, get, set, addListener, removeListener } = vi.hoisted(() => {
  const get = vi.fn<(key: string) => Promise<Record<string, unknown>>>();
  const set = vi.fn<(data: Record<string, unknown>) => Promise<void>>();
  const addListener = vi.fn();
  const removeListener = vi.fn();
  const runtime: { id: string | undefined } = { id: 'extension' };
  return {
    get,
    set,
    addListener,
    removeListener,
    browserMock: {
      runtime,
      storage: { local: { get, set }, onChanged: { addListener, removeListener } },
    },
  };
});
vi.mock('wxt/browser', () => ({ browser: browserMock }));
describe('bookmark browser storage adapter', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    vi.resetAllMocks();
    browserMock.runtime.id = 'extension';
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
  it('uses only the bookmark key in extension local storage', async () => {
    const data = emptyBookmarkData();
    get.mockResolvedValue({ [BOOKMARK_STORAGE_KEY]: data });
    expect(await readBookmarkStorage()).toEqual(data);
    await writeBookmarkStorage(data);
    expect(set).toHaveBeenCalledWith({ [BOOKMARK_STORAGE_KEY]: data });
    expect(values.size).toBe(0);
  });
  it('uses web storage only for a non-extension preview', async () => {
    browserMock.runtime.id = undefined;
    expect(await readBookmarkStorage()).toBeUndefined();
    await writeBookmarkStorage(emptyBookmarkData());
    expect(await readBookmarkStorage()).toEqual(emptyBookmarkData());
    expect(set).not.toHaveBeenCalled();
  });
  it('reports failed reads and writes without replacing stored data', async () => {
    get.mockRejectedValue(new Error('Denied'));
    await expect(readBookmarkStorage()).rejects.toMatchObject({ code: 'storage-read-failed' });
    set.mockRejectedValue(new Error('Quota'));
    await expect(writeBookmarkStorage(emptyBookmarkData())).rejects.toMatchObject({
      code: 'storage-write-failed',
    });
  });
  it('reports malformed preview JSON instead of treating it as empty', async () => {
    browserMock.runtime.id = undefined;
    values.set(BOOKMARK_STORAGE_KEY, '{bad');
    await expect(readBookmarkStorage()).rejects.toMatchObject({ code: 'storage-read-failed' });
    expect(values.get(BOOKMARK_STORAGE_KEY)).toBe('{bad');
  });
  it('runs a write inside an origin-scoped exclusive Web Lock', async () => {
    const request = vi.fn((_name: string, _options: unknown, operation: () => Promise<number>) =>
      operation(),
    );
    vi.stubGlobal('navigator', { locks: { request } });
    const operation = vi.fn().mockResolvedValue(42);
    expect(await withBookmarkWriteLock(operation)).toBe(42);
    expect(request).toHaveBeenCalledWith(
      'altAir.bookmarks.write',
      { mode: 'exclusive' },
      operation,
    );
  });
  it('does not attempt an unsafe write when Web Locks are unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const operation = vi.fn();
    await expect(withBookmarkWriteLock(operation)).rejects.toMatchObject({
      code: 'storage-unavailable',
    });
    expect(operation).not.toHaveBeenCalled();
  });
  it('filters change notifications and removes its extension listener', () => {
    const onChange = vi.fn();
    const stop = watchBookmarkStorage(onChange);
    const listener = addListener.mock.calls[0]?.[0] as (
      changes: Record<string, unknown>,
      area: string,
    ) => void;
    listener({ other: {} }, 'local');
    listener({ [BOOKMARK_STORAGE_KEY]: {} }, 'sync');
    expect(onChange).not.toHaveBeenCalled();
    listener({ [BOOKMARK_STORAGE_KEY]: {} }, 'local');
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
    expect(removeListener).toHaveBeenCalledWith(listener);
  });
});
