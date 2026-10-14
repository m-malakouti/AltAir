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
  const [picker, setPicker] = useState<'fiat' | 'metals' | null>(null);
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
      {error && <Notice>{error}</Notice>}
      <span className="sr-only" role="status">
        {announcement}
      </span>
      <div className="market-table-head" aria-hidden="true">
        <span>نماد</span>
        <span>آخرین</span>
        <span>تغییر</span>
        <span>تغییر٪</span>
      </div>
      {(['fiat', 'metals'] as const).map((group) => (
        <section
          className="market-segment"
          key={group}
          aria-label={group === 'fiat' ? 'ارزها' : 'طلا و سکه'}
        >
          <h3 className="market-segment-title">
            {group === 'fiat' ? 'ارزها' : 'طلا و سکه'}
            <button
              className="icon-button market-add"
              title={group === 'fiat' ? 'افزودن ارز' : 'افزودن طلا و سکه'}
              aria-label={group === 'fiat' ? 'افزودن ارز' : 'افزودن طلا و سکه'}
              aria-expanded={picker === group}
              onClick={() => setPicker((current) => (current === group ? null : group))}
            >
              <Icon name={picker === group ? 'close' : 'plus'} />
            </button>
            <small>تومان</small>
          </h3>
          {picker === group && (
            <div className="currency-picker market-inline-picker">
              <fieldset disabled={!ready || busy}>
                <legend>{group === 'fiat' ? 'ارزهای دلخواه' : 'طلا و سکهٔ دلخواه'}</legend>
                {currencies
                  .filter((item) => currencyGroup(item.code) === group)
                  .map((item) => (
                    <label key={item.code}>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.code)}
                        onChange={(event) => {
                          void change(item.code, event.target.checked);
                        }}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
              </fieldset>
            </div>
          )}
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
                <DollarCard code={code} table />
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
