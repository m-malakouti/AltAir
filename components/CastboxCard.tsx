import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui/Icon';
import { Notice } from './ui/Notice';
import { readCastbox, updateCastbox } from '@/features/podcasts/castbox-store';
import {
  castboxPage,
  castboxPlayer,
  emptyLibrary,
  parseCastboxLink,
} from '@/features/podcasts/castbox-model';

export function CastboxCard() {
  const [library, setLibrary] = useState(emptyLibrary);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const writing = useRef(false);
  const playing = library.items.find((item) => item.id === active);
  useEffect(() => {
    let alive = true;
    void readCastbox()
      .then((saved) => {
        if (alive) {
          setLibrary(saved);
          setReady(true);
        }
      })
      .catch(() => {
        if (alive) setError('خواندن کتابخانه انجام نشد؛ صفحه را تازه کن.');
      });
    return () => {
      alive = false;
    };
  }, []);
  async function save() {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      const item = { ...parseCastboxLink(link), title: title.trim() };
      if (!item.title) throw new Error('نام پادکست را بنویس.');
      const saved = await updateCastbox((current) => ({
        ...current,
        items: current.items.some((entry) => entry.id === item.id)
          ? current.items.map((entry) => (entry.id === item.id ? item : entry))
          : [...current.items, item],
        selected: item.id,
      }));
      setLibrary(saved);
      setActive(item.id);
      setAdding(false);
      setTitle('');
      setLink('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیره انجام نشد.');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="castbox-card">
      <div className="castbox-actions">
        <a
          className="castbox-account"
          href="https://castbox.fm/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="user" /> حساب Castbox ↗
        </a>
        <button
          className="icon-button"
          title="افزودن پادکست"
          aria-label="افزودن پادکست"
          disabled={!ready || busy}
          onClick={() => setAdding((value) => !value)}
        >
          <Icon name={adding ? 'close' : 'plus'} />
        </button>
      </div>
      {!ready && !error && <p className="helper-text">خواندن کتابخانه…</p>}
      {ready && !library.items.length && !adding && (
        <div className="castbox-empty">
          <span aria-hidden="true">◉</span>
          <strong>اینجا گوش بده</strong>
          <p>پادکست را یک‌بار اضافه کن؛ همیشه از همین کارت بازش کن.</p>
          <button
            className="icon-button"
            aria-label="افزودن پادکست"
            title="افزودن پادکست"
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" />
          </button>
        </div>
      )}
      {adding && (
        <form
          className="castbox-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            نام پادکست
            <input
              required
              maxLength={120}
              value={title}
              disabled={busy}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            لینک Castbox یا کد Embed
            <textarea
              required
              dir="ltr"
              rows={2}
              maxLength={12000}
              value={link}
              disabled={busy}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://castbox.fm/channel/..."
            />
          </label>
          <button
            className="icon-button"
            aria-label="ذخیره و باز کردن پلیر"
            title="ذخیره و باز کردن پلیر"
            disabled={busy || !ready}
          >
            <Icon name="save" />
          </button>
        </form>
      )}
      {!!library.items.length && (
        <>
          <label className="castbox-select">
            پادکست‌های من
            <select
              value={active ?? ''}
              onChange={(event) => {
                const id = event.target.value;
                setActive(id);
                void updateCastbox((current) => ({ ...current, selected: id }))
                  .then(setLibrary)
                  .catch(() => setError('انتخاب پادکست ذخیره نشد.'));
              }}
            >
              <option value="" disabled>
                انتخاب برای شنیدن
              </option>
              {library.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {!playing && (
            <button
              className="icon-button"
              aria-label="باز کردن آخرین پادکست"
              title="باز کردن آخرین پادکست"
              onClick={() => setActive(library.selected ?? library.items[0]?.id ?? null)}
            >
              <Icon name="play" />
            </button>
          )}
        </>
      )}
      {playing && (
        <div className="castbox-player-area">
          <div className="castbox-actions">
            <strong>{playing.title}</strong>
            <div className="castbox-actions">
              <button
                className="icon-button"
                title="بازخوانی پلیر"
                aria-label="بازخوانی پلیر"
                onClick={() => setReload((value) => value + 1)}
              >
                <Icon name="refresh" />
              </button>
              <button
                className="icon-button"
                title="توقف و بستن پلیر"
                aria-label="توقف و بستن پلیر"
                onClick={() => setActive(null)}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
          <iframe
            key={`${playing.id}:${reload}`}
            className="castbox-player castbox-player--list"
            title={`پخش ${playing.title}`}
            src={castboxPlayer(playing, true)}
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <a
            className="castbox-external"
            href={castboxPage(playing)}
            target="_blank"
            rel="noopener noreferrer"
          >
            پلیر باز نشد؟ شنیدن در Castbox ↗
          </a>
        </div>
      )}
      {error && <Notice>{error}</Notice>}
      <details className="castbox-settings">
        <summary className="icon-button" aria-label="راهنمای شنیدن" title="راهنمای شنیدن">
          <Icon name="info" />
        </summary>
        <div className="castbox-help">
          <p>
            در Castbox از Share لینک کانال یا قسمت را کپی کن و اینجا اضافه کن. سپس دکمهٔ پخش داخل
            پلیر را بزن.
          </p>
          <p>
            کتابخانهٔ این کارت روی مرورگر ذخیره می‌شود؛ اشتراک‌های حساب خودکار وارد نمی‌شوند. ورود
            به حساب در سایت Castbox انجام می‌شود.
          </p>
          <p>با بستن این تب یا خروج از بخش، پخش داخل کارت متوقف می‌شود.</p>
        </div>
      </details>
    </div>
  );
}
