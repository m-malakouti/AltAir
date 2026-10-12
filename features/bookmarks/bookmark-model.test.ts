import { describe, expect, it } from 'vitest';
import {
  emptyBookmarkData,
  normalizeBookmarkTitle,
  normalizeBookmarkUrl,
  parseBookmarkData,
} from './bookmark-model';
import { addBookmark, addCategory } from './bookmark-operations';

const stamp = '2026-10-12T08:00:00.000Z';
const base = addCategory(emptyBookmarkData(), 'کار', { id: 'category-1', timestamp: stamp });
const valid = addBookmark(
  base,
  { title: 'GitHub', url: 'https://github.com', categoryId: 'category-1' },
  { id: 'bookmark-1', timestamp: stamp },
);

describe('bookmark schema', () => {
  it('initializes only an absent storage key as empty', () => {
    expect(parseBookmarkData(undefined)).toEqual(emptyBookmarkData());
    expect(() => parseBookmarkData(null)).toThrow(
      expect.objectContaining({ code: 'invalid-data' }),
    );
  });
  it('round-trips a versioned snapshot with stable IDs and category references', () => {
    expect(parseBookmarkData(JSON.parse(JSON.stringify(valid)) as unknown)).toEqual(valid);
  });
  it('rejects future schemas without resetting them', () => {
    expect(() => parseBookmarkData({ ...valid, version: 2 })).toThrow(
      expect.objectContaining({ code: 'unsupported-version' }),
    );
  });
  it.each([
    { ...valid, bookmarks: 'bad' },
    { ...valid, extra: true },
    { ...valid, categories: [...valid.categories, valid.categories[0]] },
    { ...valid, bookmarks: [valid.bookmarks[0], valid.bookmarks[0]] },
    { ...valid, bookmarks: [{ ...valid.bookmarks[0], categoryId: 'missing' }] },
    { ...valid, bookmarks: [{ ...valid.bookmarks[0], url: 'javascript:alert(1)' }] },
    { ...valid, bookmarks: [{ ...valid.bookmarks[0], updatedAt: '2026-10-11T08:00:00.000Z' }] },
    { ...valid, bookmarks: [{ ...valid.bookmarks[0], createdAt: 'bad' }] },
    { ...valid, bookmarks: [{ ...valid.bookmarks[0], extra: true }] },
  ])('rejects malformed snapshots: %j', (value) => {
    expect(() => parseBookmarkData(value)).toThrow(
      expect.objectContaining({ code: 'invalid-data' }),
    );
  });
});
describe('bookmark input validation', () => {
  it('normalizes a safe URL while retaining its path, query, and fragment', () => {
    expect(normalizeBookmarkUrl(' HTTPS://Example.COM:443/docs?q=One#two ')).toBe(
      'https://example.com/docs?q=One#two',
    );
    expect(normalizeBookmarkTitle('  یک عنوان  ')).toBe('یک عنوان');
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'file:///private.txt',
    'chrome://settings',
    'https://user:password@example.com',
    'not a url',
  ])('rejects unsupported or credential-bearing URLs: %s', (url) => {
    expect(() => normalizeBookmarkUrl(url)).toThrow(
      expect.objectContaining({ code: 'invalid-url' }),
    );
  });
  it.each(['', '   ', 'x'.repeat(301)])('rejects invalid titles', (title) => {
    expect(() => normalizeBookmarkTitle(title)).toThrow(
      expect.objectContaining({ code: 'invalid-title' }),
    );
  });
});
