import {
  readBookmarkStorage,
  watchBookmarkStorage,
  withBookmarkWriteLock,
  writeBookmarkStorage,
} from '@/lib/browser/bookmark-storage';
import { BookmarkError, parseBookmarkData } from './bookmark-model';
import type { Bookmark, BookmarkCategory, BookmarkData, BookmarkInput } from './bookmark-model';
import * as operations from './bookmark-operations';

async function mutate<T>(
  change: (data: BookmarkData) => { data: BookmarkData; result: T },
): Promise<T> {
  return withBookmarkWriteLock(async () => {
    const data = parseBookmarkData(await readBookmarkStorage());
    const next = change(data);
    await writeBookmarkStorage(next.data);
    return next.result;
  });
}
function metadata() {
  return { id: crypto.randomUUID(), timestamp: new Date().toISOString() };
}

export const bookmarkRepository = {
  async read(): Promise<BookmarkData> {
    return parseBookmarkData(await readBookmarkStorage());
  },
  watch: watchBookmarkStorage,
  async add(input: BookmarkInput): Promise<Bookmark> {
    return mutate((data) => {
      const meta = metadata();
      const next = operations.addBookmark(data, input, meta);
      const bookmark = next.bookmarks.find((item) => item.id === meta.id);
      if (!bookmark) throw new BookmarkError('invalid-data');
      return { data: next, result: bookmark };
    });
  },
  async update(id: string, input: BookmarkInput): Promise<Bookmark> {
    return mutate((data) => {
      const next = operations.updateBookmark(data, id, input, new Date().toISOString());
      const bookmark = next.bookmarks.find((item) => item.id === id);
      if (!bookmark) throw new BookmarkError('invalid-data');
      return { data: next, result: bookmark };
    });
  },
  async delete(id: string): Promise<void> {
    return mutate((data) => ({ data: operations.deleteBookmark(data, id), result: undefined }));
  },
  async addCategory(name: string): Promise<BookmarkCategory> {
    return mutate((data) => {
      const meta = metadata();
      const next = operations.addCategory(data, name, meta);
      const category = next.categories.find((item) => item.id === meta.id);
      if (!category) throw new BookmarkError('invalid-data');
      return { data: next, result: category };
    });
  },
  async renameCategory(id: string, name: string): Promise<BookmarkCategory> {
    return mutate((data) => {
      const next = operations.renameCategory(data, id, name, new Date().toISOString());
      const category = next.categories.find((item) => item.id === id);
      if (!category) throw new BookmarkError('invalid-data');
      return { data: next, result: category };
    });
  },
  async deleteCategory(id: string): Promise<void> {
    return mutate((data) => ({
      data: operations.deleteCategory(data, id, new Date().toISOString()),
      result: undefined,
    }));
  },
};
