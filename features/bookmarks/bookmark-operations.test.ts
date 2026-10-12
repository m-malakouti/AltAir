import { describe, expect, it } from 'vitest';
import { emptyBookmarkData } from './bookmark-model';
import {
  addBookmark,
  addCategory,
  deleteBookmark,
  deleteCategory,
  renameCategory,
  searchBookmarks,
  updateBookmark,
} from './bookmark-operations';

const first = '2026-10-12T08:00:00.000Z';
const later = '2026-10-12T09:00:00.000Z';
const categorized = addCategory(emptyBookmarkData(), 'کار', { id: 'cat', timestamp: first });
const data = addBookmark(
  categorized,
  { title: 'GitHub', url: 'https://github.com', categoryId: 'cat' },
  { id: 'one', timestamp: first },
);

describe('bookmark behavior', () => {
  it('adds without mutating existing snapshots', () => {
    const next = addBookmark(
      data,
      { title: 'MDN', url: 'https://developer.mozilla.org' },
      { id: 'two', timestamp: later },
    );
    expect(data.bookmarks).toHaveLength(1);
    expect(next.bookmarks.map((item) => item.id)).toEqual(['two', 'one']);
    expect(next.bookmarks[0]?.categoryId).toBeNull();
  });
  it('prevents duplicate normalized URLs instead of overwriting a bookmark', () => {
    expect(() =>
      addBookmark(
        data,
        { title: 'Other', url: 'https://GITHUB.com:443/' },
        { id: 'two', timestamp: later },
      ),
    ).toThrow(expect.objectContaining({ code: 'duplicate-url' }));
    expect(data.bookmarks[0]?.title).toBe('GitHub');
  });
  it('retains IDs and creation time while updating title, URL, and category', () => {
    const next = updateBookmark(
      data,
      'one',
      { title: 'GitHub Docs', url: 'https://docs.github.com', categoryId: null },
      later,
    );
    expect(next.bookmarks[0]).toMatchObject({
      id: 'one',
      title: 'GitHub Docs',
      categoryId: null,
      createdAt: first,
      updatedAt: later,
    });
  });
  it('rejects an edit that duplicates another bookmark', () => {
    const two = addBookmark(
      data,
      { title: 'MDN', url: 'https://developer.mozilla.org' },
      { id: 'two', timestamp: later },
    );
    expect(() =>
      updateBookmark(two, 'two', { title: 'Other', url: 'https://github.com' }, later),
    ).toThrow(expect.objectContaining({ code: 'duplicate-url' }));
  });
  it('does not move update times backwards when the device clock changes', () => {
    const next = updateBookmark(
      data,
      'one',
      { title: 'GitHub', url: 'https://github.com' },
      '2026-01-01T00:00:00.000Z',
    );
    expect(next.bookmarks[0]?.updatedAt).toBe(first);
  });
  it('rejects a nonexistent category or colliding ID', () => {
    expect(() =>
      addBookmark(
        data,
        { title: 'MDN', url: 'https://developer.mozilla.org', categoryId: 'missing' },
        { id: 'two', timestamp: later },
      ),
    ).toThrow(expect.objectContaining({ code: 'category-not-found' }));
    expect(() =>
      addBookmark(
        data,
        { title: 'MDN', url: 'https://developer.mozilla.org' },
        { id: 'cat', timestamp: later },
      ),
    ).toThrow(expect.objectContaining({ code: 'id-conflict' }));
  });
  it('deletes only the requested bookmark', () => {
    expect(deleteBookmark(data, 'one').bookmarks).toHaveLength(0);
    expect(data.bookmarks).toHaveLength(1);
  });
  it('rejects updates/deletes for missing records', () => {
    expect(() =>
      updateBookmark(data, 'missing', { title: 'x', url: 'https://example.com' }, later),
    ).toThrow(expect.objectContaining({ code: 'bookmark-not-found' }));
    expect(() => deleteBookmark(data, 'missing')).toThrow(
      expect.objectContaining({ code: 'bookmark-not-found' }),
    );
    expect(() => deleteCategory(data, 'missing', later)).toThrow(
      expect.objectContaining({ code: 'category-not-found' }),
    );
  });
  it('renames categories while retaining stable references', () => {
    const next = renameCategory(data, 'cat', 'پروژه‌ها', later);
    expect(next.categories[0]).toMatchObject({
      id: 'cat',
      name: 'پروژه‌ها',
      createdAt: first,
      updatedAt: later,
    });
    expect(next.bookmarks[0]?.categoryId).toBe('cat');
  });
  it('prevents equivalent Persian/Arabic category names', () => {
    const original = addCategory(emptyBookmarkData(), 'كُد', { id: 'a', timestamp: first });
    expect(() => addCategory(original, 'کد', { id: 'b', timestamp: later })).toThrow(
      expect.objectContaining({ code: 'duplicate-category' }),
    );
  });
  it('keeps bookmarks when their category is deleted', () => {
    const next = deleteCategory(data, 'cat', later);
    expect(next.categories).toHaveLength(0);
    expect(next.bookmarks[0]).toMatchObject({ id: 'one', categoryId: null, updatedAt: later });
    expect(data.bookmarks[0]?.categoryId).toBe('cat');
  });
  it('searches Persian variants and URL text with optional category filtering', () => {
    const next = addBookmark(
      data,
      { title: 'برنامه‌نویسی كُد', url: 'https://example.com/docs' },
      { id: 'two', timestamp: later },
    );
    expect(searchBookmarks(next, 'برنامه نویسی کد').map((item) => item.id)).toEqual(['two']);
    expect(searchBookmarks(next, 'GITHUB').map((item) => item.id)).toEqual(['one']);
    expect(searchBookmarks(next, '', null).map((item) => item.id)).toEqual(['two']);
    expect(searchBookmarks(next, '', 'cat').map((item) => item.id)).toEqual(['one']);
  });
});
