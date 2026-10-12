export interface Bookmark {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly categoryId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface BookmarkCategory {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface BookmarkData {
  readonly version: 1;
  readonly bookmarks: readonly Bookmark[];
  readonly categories: readonly BookmarkCategory[];
}
export interface BookmarkInput {
  title: string;
  url: string;
  categoryId?: string | null;
}
export interface RecordMetadata {
  id: string;
  timestamp: string;
}
export type BookmarkErrorCode =
  | 'invalid-title'
  | 'invalid-url'
  | 'invalid-category-name'
  | 'invalid-data'
  | 'unsupported-version'
  | 'duplicate-url'
  | 'duplicate-category'
  | 'bookmark-not-found'
  | 'category-not-found'
  | 'id-conflict'
  | 'storage-unavailable'
  | 'storage-read-failed'
  | 'storage-write-failed';

export class BookmarkError extends Error {
  constructor(
    public readonly code: BookmarkErrorCode,
    cause?: unknown,
  ) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = 'BookmarkError';
  }
}
export function emptyBookmarkData(): BookmarkData {
  return { version: 1, bookmarks: [], categories: [] };
}

export function normalizeBookmarkUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      value.length > 8192
    ) {
      throw new Error('Unsupported URL.');
    }
    return url.href;
  } catch {
    throw new BookmarkError('invalid-url');
  }
}
export function normalizeBookmarkTitle(value: string): string {
  const result = value.trim().normalize('NFC');
  if (!result || result.length > 300) throw new BookmarkError('invalid-title');
  return result;
}
export function normalizeCategoryName(value: string): string {
  const result = value.trim().normalize('NFC');
  if (!result || result.length > 100) throw new BookmarkError('invalid-category-name');
  return result;
}
export function searchText(value: string): string {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('fa-IR')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[\u200c\s]+/g, ' ')
    .trim();
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new BookmarkError('invalid-data');
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: string[]): void {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw new BookmarkError('invalid-data');
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 256 || value !== value.trim())
    throw new BookmarkError('invalid-data');
  return value;
}
function timestamp(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new BookmarkError('invalid-data');
  return value;
}
function metadata(value: Record<string, unknown>) {
  const createdAt = timestamp(value.createdAt);
  const updatedAt = timestamp(value.updatedAt);
  if (updatedAt < createdAt) throw new BookmarkError('invalid-data');
  return { id: id(value.id), createdAt, updatedAt };
}
export function parseBookmarkData(value: unknown): BookmarkData {
  if (value === undefined) return emptyBookmarkData();
  const data = record(value);
  if (typeof data.version === 'number' && data.version !== 1)
    throw new BookmarkError('unsupported-version');
  if (data.version !== 1 || !Array.isArray(data.bookmarks) || !Array.isArray(data.categories))
    throw new BookmarkError('invalid-data');
  exactKeys(data, ['version', 'bookmarks', 'categories']);
  try {
    const categories = data.categories.map((raw: unknown): BookmarkCategory => {
      const category = record(raw);
      exactKeys(category, ['id', 'name', 'createdAt', 'updatedAt']);
      if (typeof category.name !== 'string') throw new BookmarkError('invalid-data');
      return { ...metadata(category), name: normalizeCategoryName(category.name) };
    });
    const bookmarks = data.bookmarks.map((raw: unknown): Bookmark => {
      const bookmark = record(raw);
      exactKeys(bookmark, ['id', 'title', 'url', 'categoryId', 'createdAt', 'updatedAt']);
      if (
        typeof bookmark.title !== 'string' ||
        typeof bookmark.url !== 'string' ||
        (bookmark.categoryId !== null && typeof bookmark.categoryId !== 'string')
      )
        throw new BookmarkError('invalid-data');
      return {
        ...metadata(bookmark),
        title: normalizeBookmarkTitle(bookmark.title),
        url: normalizeBookmarkUrl(bookmark.url),
        categoryId: bookmark.categoryId,
      };
    });
    const ids = [...categories, ...bookmarks].map((item) => item.id);
    const names = categories.map((item) => searchText(item.name));
    const urls = bookmarks.map((item) => item.url);
    if (
      new Set(ids).size !== ids.length ||
      new Set(names).size !== names.length ||
      new Set(urls).size !== urls.length ||
      bookmarks.some(
        (item) =>
          item.categoryId !== null &&
          !categories.some((category) => category.id === item.categoryId),
      )
    )
      throw new BookmarkError('invalid-data');
    return { version: 1, bookmarks, categories };
  } catch (error) {
    if (error instanceof BookmarkError && error.code === 'invalid-data') throw error;
    throw new BookmarkError('invalid-data', error);
  }
}
