import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import {
  readFavorites,
  setFavorite,
  watchFavorites,
  moveFavorite,
} from '@/lib/browser/currency-favorites';
import { currencies, currencyGroup } from '../currencies';
import { CryptoPrices } from './CryptoPrices';
import type { CurrencyCode } from '../currencies';
import { DollarCard } from './DollarCard';

export function CurrencyBoard() {
  const [selected, setSelected] = useState<CurrencyCode[]>(['USD']);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<CurrencyCode | null>(null);
  const [over, setOver] = useState<CurrencyCode | null>(null);
  const [announcement, setAnnouncement] = useState('');
  async function move(source: CurrencyCode, target: CurrencyCode) {
    if (busy || source === target || currencyGroup(source) !== currencyGroup(target)) return;
    setBusy(true);
    setError('');
    try {
      setSelected(await moveFavorite(source, target));
      setAnnouncement('ترتیب نرخ‌ها ذخیره شد.');
    } catch {
      setError('ترتیب نرخ‌ها ذخیره نشد؛ دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const codes = await readFavorites();
        if (alive && current === revision) {
          setSelected(codes);
          setReady(true);
          setError('');
        }
      } catch {
        if (alive && current === revision) {
          setReady(false);
          setError('خواندن نرخ‌های دلخواه انجام نشد؛ پنل را دوباره باز کن.');
        }
      }
    }
    const stop = watchFavorites(() => {
      void load();
    });
    void load();
    return () => {
      alive = false;
      stop();
    };
  }, []);
  async function change(code: CurrencyCode, checked: boolean) {
    setBusy(true);
    setError('');
    try {
      setSelected(await setFavorite(code, checked));
    } catch {
      setError('انتخاب نرخ ذخیره نشد. دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="currency-board" aria-label="نرخ‌های دلخواه">
      <details className="currency-picker">
        <summary className="icon-button" aria-label="افزودن یا حذف نرخ" title="افزودن یا حذف نرخ">
          <Icon name="plus" />
        </summary>
        <fieldset disabled={!ready || busy}>
          <legend>نرخ‌های دلخواه</legend>
          {currencies.map((item) => (
            <label key={item.code}>
              <input
                type="checkbox"
                checked={selected.includes(item.code)}
                onChange={(event) => {
                  void change(item.code, event.target.checked);
                }}
              />
              <span>{item.name}</span>
              <small dir="ltr">{item.symbol}</small>
            </label>
          ))}
        </fieldset>
      </details>
      {error && <Notice>{error}</Notice>}
      <span className="sr-only" role="status">
        {announcement}
      </span>
      {(['fiat', 'metals'] as const).map((group) => (
        <section
          className="market-segment"
          key={group}
          aria-label={group === 'fiat' ? 'ارزها' : 'طلا و سکه'}
        >
          <h3 className="market-segment-title">
            {group === 'fiat' ? 'ارزها' : 'طلا و سکه'}
            <small>تومان</small>
          </h3>
          {!selected.some((code) => currencyGroup(code) === group) && (
            <p className="helper-text">از دکمهٔ + موارد دلخواه را اضافه کن.</p>
          )}
          {selected
            .filter((code) => currencyGroup(code) === group)
            .map((code, index, groupCodes) => (
              <div
                key={code}
                className={`currency-sort-row ${dragging === code ? 'is-dragging' : ''} ${over === code && dragging !== code ? 'is-drop-target' : ''}`}
                draggable={ready && !busy}
                onDragStart={(event) => {
                  if (!ready || busy) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', code);
                  setDragging(code);
                }}
                onDragOver={(event) => {
                  if (!dragging || busy || currencyGroup(dragging) !== group) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setOver(code);
                }}
                onDrop={(event) => {
                  if (!dragging || busy || currencyGroup(dragging) !== group) return;
                  event.preventDefault();
                  void move(dragging, code);
                  setDragging(null);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
              >
                <button
                  className="currency-drag-handle"
                  type="button"
                  disabled={!ready || busy}
                  aria-label={`جابه‌جایی ${currencies.find((item) => item.code === code)?.name}؛ با کلید بالا و پایین`}
                  title="برای جابه‌جایی بکش؛ یا از کلیدهای ↑ و ↓ استفاده کن"
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    event.preventDefault();
                    const target = groupCodes[index + (event.key === 'ArrowUp' ? -1 : 1)];
                    if (target) void move(code, target);
                  }}
                >
                  ⠿
                </button>
                <DollarCard code={code} />
              </div>
            ))}
        </section>
      ))}
      <CryptoPrices />
      {ready && selected.length === 0 && (
        <p className="helper-text">با + ارز، طلا یا سکهٔ دلخواهت را انتخاب کن.</p>
      )}
    </section>
  );
}
