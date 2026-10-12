import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyBookmarkData } from './bookmark-model';
import type { BookmarkData } from './bookmark-model';
import { bookmarkRepository } from './bookmark-repository';

const storage = vi.hoisted(() => ({
  readBookmarkStorage: vi.fn<() => Promise<unknown>>(),
  writeBookmarkStorage: vi.fn<(value: BookmarkData) => Promise<void>>(),
  watchBookmarkStorage: vi.fn(),
  withBookmarkWriteLock: vi.fn<(operation: () => Promise<unknown>) => Promise<unknown>>(),
}));
vi.mock('@/lib/browser/bookmark-storage', () => storage);

describe('bookmark repository persistence', () => {
  let saved: unknown;
  beforeEach(() => {
    vi.resetAllMocks();
    saved = undefined;
    let queue = Promise.resolve();
    storage.withBookmarkWriteLock.mockImplementation((operation) => {
      const result = queue.then(operation);
      queue = result.then(
        () => {},
        () => {},
      );
      return result;
    });
    storage.readBookmarkStorage.mockImplementation(() => Promise.resolve(structuredClone(saved)));
    storage.writeBookmarkStorage.mockImplementation((value) => {
      saved = structuredClone(value);
      return Promise.resolve();
    });
  });
  it('reads an absent store without writing or requiring a login', async () => {
    expect(await bookmarkRepository.read()).toEqual(emptyBookmarkData());
    expect(storage.writeBookmarkStorage).not.toHaveBeenCalled();
  });
  it('persists CRUD operations with stable IDs', async () => {
    const created = await bookmarkRepository.add({ title: 'GitHub', url: 'https://github.com' });
    const updated = await bookmarkRepository.update(created.id, {
      title: 'Docs',
      url: 'https://docs.github.com',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect((await bookmarkRepository.read()).bookmarks).toEqual([updated]);
    await bookmarkRepository.delete(created.id);
    expect((await bookmarkRepository.read()).bookmarks).toHaveLength(0);
  });
  it('persists category rename/delete without deleting its bookmarks', async () => {
    const category = await bookmarkRepository.addCategory('کار');
    const bookmark = await bookmarkRepository.add({
      title: 'GitHub',
      url: 'https://github.com',
      categoryId: category.id,
    });
    await bookmarkRepository.renameCategory(category.id, 'پروژه');
    await bookmarkRepository.deleteCategory(category.id);
    expect((await bookmarkRepository.read()).bookmarks[0]).toMatchObject({
      id: bookmark.id,
      categoryId: null,
    });
  });
  it('reads the latest stored document inside the lock for concurrent changes', async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        bookmarkRepository.add({ title: `Site ${index}`, url: `https://example.com/${index}` }),
      ),
    );
    const result = await bookmarkRepository.read();
    expect(result.bookmarks).toHaveLength(12);
    expect(new Set(result.bookmarks.map((item) => item.id)).size).toBe(12);
  });
  it('does not erase corrupt data on an attempted write', async () => {
    saved = { version: 1, bookmarks: 'corrupt', categories: [] };
    await expect(
      bookmarkRepository.add({ title: 'GitHub', url: 'https://github.com' }),
    ).rejects.toMatchObject({ code: 'invalid-data' });
    expect(storage.writeBookmarkStorage).not.toHaveBeenCalled();
    expect(saved).toEqual({ version: 1, bookmarks: 'corrupt', categories: [] });
  });
  it('does not downgrade an unknown schema on an attempted write', async () => {
    saved = { version: 2, bookmarks: [], categories: [] };
    await expect(
      bookmarkRepository.add({ title: 'GitHub', url: 'https://github.com' }),
    ).rejects.toMatchObject({ code: 'unsupported-version' });
    expect(storage.writeBookmarkStorage).not.toHaveBeenCalled();
  });
  it('rejects failed persistence and permits a later retry', async () => {
    storage.writeBookmarkStorage.mockRejectedValueOnce(new Error('Quota exceeded'));
    await expect(
      bookmarkRepository.add({ title: 'GitHub', url: 'https://github.com' }),
    ).rejects.toThrow('Quota exceeded');
    expect(saved).toBeUndefined();
    await bookmarkRepository.add({ title: 'GitHub', url: 'https://github.com' });
    expect((await bookmarkRepository.read()).bookmarks).toHaveLength(1);
  });
  it('does not write after a failed read', async () => {
    storage.readBookmarkStorage.mockRejectedValueOnce(new Error('Storage blocked'));
    await expect(
      bookmarkRepository.add({ title: 'GitHub', url: 'https://github.com' }),
    ).rejects.toThrow('Storage blocked');
    expect(storage.writeBookmarkStorage).not.toHaveBeenCalled();
  });
  it('rejects duplicates after a concurrent first write succeeds', async () => {
    const results = await Promise.allSettled([
      bookmarkRepository.add({ title: 'One', url: 'https://github.com' }),
      bookmarkRepository.add({ title: 'Two', url: 'https://GITHUB.com/' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await bookmarkRepository.read()).bookmarks).toHaveLength(1);
  });
});
