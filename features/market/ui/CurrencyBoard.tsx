import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { readFavorites, setFavorite, watchFavorites } from '@/lib/browser/currency-favorites';
import { currencies } from '../currencies';
import type { CurrencyCode } from '../currencies';
import { DollarCard } from './DollarCard';

export function CurrencyBoard() {
  const [selected, setSelected] = useState<CurrencyCode[]>(['USD']);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
      {selected.map((code) => (
        <DollarCard key={code} code={code} />
      ))}
      {ready && selected.length === 0 && (
        <p className="helper-text">با + ارز، طلا یا سکهٔ دلخواهت را انتخاب کن.</p>
      )}
    </section>
  );
}
