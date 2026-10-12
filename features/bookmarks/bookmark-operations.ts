import {
  BookmarkError,
  normalizeBookmarkTitle,
  normalizeBookmarkUrl,
  normalizeCategoryName,
  parseBookmarkData,
  searchText,
} from './bookmark-model';
import type { Bookmark, BookmarkData, BookmarkInput, RecordMetadata } from './bookmark-model';

function ensureCategory(data: BookmarkData, categoryId: string | null) {
  if (categoryId !== null && !data.categories.some((category) => category.id === categoryId))
    throw new BookmarkError('category-not-found');
}
function ensureNewId(data: BookmarkData, id: string) {
  if ([...data.bookmarks, ...data.categories].some((item) => item.id === id))
    throw new BookmarkError('id-conflict');
}
export function addBookmark(
  data: BookmarkData,
  input: BookmarkInput,
  meta: RecordMetadata,
): BookmarkData {
  const title = normalizeBookmarkTitle(input.title);
  const url = normalizeBookmarkUrl(input.url);
  const categoryId = input.categoryId ?? null;
  ensureCategory(data, categoryId);
  ensureNewId(data, meta.id);
  if (data.bookmarks.some((item) => item.url === url)) throw new BookmarkError('duplicate-url');
  const bookmark: Bookmark = {
    id: meta.id,
    title,
    url,
    categoryId,
    createdAt: meta.timestamp,
    updatedAt: meta.timestamp,
  };
  return parseBookmarkData({ ...data, bookmarks: [bookmark, ...data.bookmarks] });
}
export function updateBookmark(
  data: BookmarkData,
  id: string,
  input: BookmarkInput,
  timestamp: string,
): BookmarkData {
  const current = data.bookmarks.find((item) => item.id === id);
  if (!current) throw new BookmarkError('bookmark-not-found');
  const title = normalizeBookmarkTitle(input.title);
  const url = normalizeBookmarkUrl(input.url);
  const categoryId = input.categoryId ?? null;
  ensureCategory(data, categoryId);
  if (data.bookmarks.some((item) => item.id !== id && item.url === url))
    throw new BookmarkError('duplicate-url');
  const updated = {
    ...current,
    title,
    url,
    categoryId,
    updatedAt: timestamp < current.updatedAt ? current.updatedAt : timestamp,
  };
  return parseBookmarkData({
    ...data,
    bookmarks: data.bookmarks.map((item) => (item.id === id ? updated : item)),
  });
}
export function deleteBookmark(data: BookmarkData, id: string): BookmarkData {
  if (!data.bookmarks.some((item) => item.id === id)) throw new BookmarkError('bookmark-not-found');
  return { ...data, bookmarks: data.bookmarks.filter((item) => item.id !== id) };
}
export function addCategory(data: BookmarkData, name: string, meta: RecordMetadata): BookmarkData {
  const normalized = normalizeCategoryName(name);
  ensureNewId(data, meta.id);
  if (data.categories.some((item) => searchText(item.name) === searchText(normalized)))
    throw new BookmarkError('duplicate-category');
  const category = {
    id: meta.id,
    name: normalized,
    createdAt: meta.timestamp,
    updatedAt: meta.timestamp,
  };
  return parseBookmarkData({ ...data, categories: [...data.categories, category] });
}
export function renameCategory(
  data: BookmarkData,
  id: string,
  name: string,
  timestamp: string,
): BookmarkData {
  const current = data.categories.find((item) => item.id === id);
  if (!current) throw new BookmarkError('category-not-found');
  const normalized = normalizeCategoryName(name);
  if (
    data.categories.some(
      (item) => item.id !== id && searchText(item.name) === searchText(normalized),
    )
  )
    throw new BookmarkError('duplicate-category');
  return parseBookmarkData({
    ...data,
    categories: data.categories.map((item) =>
      item.id === id
        ? {
            ...item,
            name: normalized,
            updatedAt: timestamp < item.updatedAt ? item.updatedAt : timestamp,
          }
        : item,
    ),
  });
}
export function deleteCategory(data: BookmarkData, id: string, timestamp: string): BookmarkData {
  if (!data.categories.some((item) => item.id === id))
    throw new BookmarkError('category-not-found');
  return parseBookmarkData({
    ...data,
    categories: data.categories.filter((item) => item.id !== id),
    bookmarks: data.bookmarks.map((item) =>
      item.categoryId === id
        ? {
            ...item,
            categoryId: null,
            updatedAt: timestamp < item.updatedAt ? item.updatedAt : timestamp,
          }
        : item,
    ),
  });
}
export function searchBookmarks(
  data: BookmarkData,
  query: string,
  categoryId?: string | null,
): readonly Bookmark[] {
  const terms = searchText(query).split(' ').filter(Boolean);
  return data.bookmarks.filter(
    (item) =>
      (categoryId === undefined || item.categoryId === categoryId) &&
      terms.every((term) => searchText(`${item.title} ${item.url}`).includes(term)),
  );
}
