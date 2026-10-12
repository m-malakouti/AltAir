import { useCallback, useEffect, useRef, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Notice } from '@/components/ui/Notice';
import { Icon } from '@/components/ui/Icon';
import { BookmarkPreview } from './BookmarkPreview';
import { BookmarkError } from '../bookmark-model';
import type { Bookmark, BookmarkData } from '../bookmark-model';
import { searchBookmarks } from '../bookmark-operations';
import { bookmarkRepository as repository } from '../bookmark-repository';

function errorMessage(error: unknown): string {
  if (error instanceof BookmarkError) {
    switch (error.code) {
      case 'duplicate-url':
        return 'این لینک قبلاً ذخیره شده است.';
      case 'invalid-url':
        return 'آدرس کامل با https:// یا http:// وارد کن؛ بدون نام کاربری و رمز عبور.';
      case 'invalid-title':
        return 'عنوان باید بین ۱ تا ۳۰۰ نویسه باشد.';
      case 'bookmark-not-found':
        return 'این بوکمارک در نمای دیگری حذف شده است.';
      case 'category-not-found':
        return 'اطلاعات بوکمارک تغییر کرده است؛ فرم را دوباره باز کن.';
      case 'unsupported-version':
        return 'این داده‌ها به نسخهٔ جدیدتری از آلت ایر نیاز دارند.';
      case 'invalid-data':
        return 'داده‌های ذخیره‌شده قابل خواندن نیستند. برای حفظ اطلاعات، تغییری اعمال نشد.';
      case 'storage-write-failed':
        return 'ذخیره انجام نشد؛ فضای ذخیره‌سازی یا دسترسی مرورگر را بررسی کن.';
      case 'storage-unavailable':
        return 'ذخیره‌سازی در این مرورگر در دسترس نیست.';
    }
  }
  return 'خواندن یا ذخیرهٔ اطلاعات انجام نشد. دوباره تلاش کن.';
}
export function BookmarkManager() {
  const [data, setData] = useState<BookmarkData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const alive = useRef(false);
  const revision = useRef(0);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<'new' | Bookmark | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [deleting, setDeleting] = useState<Bookmark | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    try {
      const next = await repository.read();
      if (alive.current && current === revision.current) {
        setData(next);
        setLoadError('');
      }
    } catch (cause) {
      if (alive.current && current === revision.current) setLoadError(errorMessage(cause));
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const stop = repository.watch(() => {
      void reload();
    });
    void Promise.resolve().then(reload);
    return () => {
      alive.current = false;
      stop();
    };
  }, [reload]);
  useEffect(() => {
    if (editor) titleInput.current?.focus();
  }, [editor]);
  useEffect(() => {
    if (deleting) confirmButton.current?.focus();
  }, [deleting]);
  useEffect(() => {
    if (!busy && !editor && !deleting && restoreFocus.current) {
      addButton.current?.focus();
      restoreFocus.current = false;
    }
  }, [busy, editor, deleting]);
  async function run(action: () => Promise<unknown>, message: string, after: () => void) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await action();
      if (alive.current) {
        after();
        setStatus(message);
        restoreFocus.current = true;
      }
      await reload();
    } catch (cause) {
      if (alive.current) setError(errorMessage(cause));
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function closeEditor() {
    restoreFocus.current = true;
    setEditor(null);
  }
  function openEditor(item: 'new' | Bookmark) {
    setError('');
    setStatus('');
    setDeleting(null);
    setTitle(item === 'new' ? '' : item.title);
    setUrl(item === 'new' ? '' : item.url);
    setEditor(item);
  }
  const unavailable = busy || !data || Boolean(loadError);
  const items = data ? searchBookmarks(data, query) : [];
  return (
    <GlassCard className="bookmark-manager" aria-label="بوکمارک‌ها">
      <div className="bookmark-toolbar">
        <h3>بوکمارک‌ها</h3>
        {Boolean(data?.bookmarks.length) && (
          <label className="bookmark-search">
            <Icon name="search" />
            <span className="sr-only">جست‌وجوی بوکمارک</span>
            <input
              type="search"
              placeholder="جست‌وجو…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
      </div>
      {loadError && (
        <div className="bookmark-load-error">
          <Notice>{loadError}</Notice>
          <button
            className="icon-button"
            aria-label="تلاش دوباره"
            title="تلاش دوباره"
            onClick={() => {
              void reload();
            }}
          >
            <Icon name="refresh" />
          </button>
        </div>
      )}
      {!data && !loadError && (
        <p className="helper-text" role="status">
          در حال خواندن…
        </p>
      )}
      {error && <Notice>{error}</Notice>}
      <span className="sr-only" role="status">
        {status}
      </span>
      {editor && (
        <form
          className="bookmark-form"
          onSubmit={(event) => {
            event.preventDefault();
            const input = { title, url, categoryId: editor === 'new' ? null : editor.categoryId };
            void run(
              () =>
                editor === 'new' ? repository.add(input) : repository.update(editor.id, input),
              'بوکمارک ذخیره شد.',
              closeEditor,
            );
          }}
        >
          <fieldset disabled={unavailable}>
            <label>
              عنوان
              <input
                ref={titleInput}
                required
                maxLength={300}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              آدرس
              <input
                type="url"
                dir="ltr"
                required
                maxLength={8192}
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <div className="bookmark-actions">
              <button
                className="icon-button icon-button--primary"
                type="submit"
                aria-label="ذخیرهٔ بوکمارک"
                title="ذخیرهٔ بوکمارک"
                aria-busy={busy}
              >
                <Icon name="check" />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="انصراف"
                title="انصراف"
                onClick={closeEditor}
              >
                <Icon name="close" />
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {deleting && (
        <div className="bookmark-confirm" role="group" aria-label="تأیید حذف">
          <p>«{deleting.title}» حذف شود؟</p>
          <div className="bookmark-actions">
            <button
              ref={confirmButton}
              className="icon-button"
              disabled={unavailable}
              aria-label="تأیید حذف"
              title="تأیید حذف"
              onClick={() => {
                void run(
                  () => repository.delete(deleting.id),
                  'حذف انجام شد.',
                  () => setDeleting(null),
                );
              }}
            >
              <Icon name="trash" />
            </button>
            <button
              className="icon-button"
              disabled={busy}
              aria-label="انصراف از حذف"
              title="انصراف از حذف"
              onClick={() => {
                restoreFocus.current = true;
                setDeleting(null);
              }}
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}
      <ul className="bookmark-list">
        <li className="bookmark-add-cell">
          <button
            ref={addButton}
            type="button"
            className="bookmark-add"
            disabled={unavailable}
            aria-label="افزودن بوکمارک"
            title="افزودن بوکمارک"
            onClick={() => openEditor('new')}
          >
            <Icon name="plus" />
          </button>
        </li>
        {items.map((item) => (
          <li key={item.id} className="bookmark-tile">
            <a
              className="bookmark-link"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title={item.title + '\n' + item.url}
            >
              <BookmarkPreview key={item.url} url={item.url} title={item.title} />
              <strong>{item.title}</strong>
              <span className="sr-only">، باز شدن در برگهٔ جدید</span>
            </a>
            <div className="bookmark-actions">
              <button
                className="icon-button"
                disabled={unavailable}
                aria-label={`ویرایش ${item.title}`}
                title="ویرایش"
                onClick={() => openEditor(item)}
              >
                <Icon name="edit" />
              </button>
              <button
                className="icon-button"
                disabled={unavailable}
                aria-label={`حذف ${item.title}`}
                title="حذف"
                onClick={() => {
                  setEditor(null);
                  setDeleting(item);
                  setError('');
                }}
              >
                <Icon name="trash" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {data && query && items.length === 0 && <p className="helper-text">نتیجه‌ای پیدا نشد.</p>}
    </GlassCard>
  );
}
